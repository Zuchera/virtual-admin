-- Hosted workspace foundation. Apply to a fresh staging project.
-- The legacy standalone client does not use these tables.
begin;

create table public.hosted_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.hosted_subscriptions (
  stripe_subscription_id text primary key check (stripe_subscription_id ~ '^sub_[A-Za-z0-9]+$'),
  workspace_id uuid not null unique references public.hosted_workspaces(id),
  seat_limit integer not null check (seat_limit > 0),
  status text not null check (status in ('trialing', 'active', 'inactive'))
);

create table public.hosted_memberships (
  workspace_id uuid not null references public.hosted_workspaces(id),
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('owner', 'member')),
  primary key (workspace_id, user_id)
);

create unique index hosted_one_owner_per_workspace
  on public.hosted_memberships (workspace_id) where role = 'owner';

create table public.hosted_invitations (
  token_hash bytea primary key,
  workspace_id uuid not null references public.hosted_workspaces(id),
  email text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz
);

alter table public.hosted_workspaces enable row level security;
alter table public.hosted_subscriptions enable row level security;
alter table public.hosted_memberships enable row level security;
alter table public.hosted_invitations enable row level security;

revoke all on public.hosted_workspaces, public.hosted_subscriptions,
  public.hosted_memberships, public.hosted_invitations from public, anon, authenticated;
grant select on public.hosted_workspaces, public.hosted_memberships,
  public.hosted_subscriptions to authenticated;

create policy hosted_memberships_read_self on public.hosted_memberships
  for select to authenticated using (user_id = (select auth.uid()));

create policy hosted_workspaces_read_member on public.hosted_workspaces
  for select to authenticated using (exists (
    select 1 from public.hosted_memberships m
    where m.workspace_id = hosted_workspaces.id and m.user_id = (select auth.uid())
  ));

create policy hosted_subscriptions_read_owner on public.hosted_subscriptions
  for select to authenticated using (exists (
    select 1 from public.hosted_memberships m
    where m.workspace_id = hosted_subscriptions.workspace_id
      and m.user_id = (select auth.uid()) and m.role = 'owner'
  ));

-- Call only from a backend that has verified the Stripe subscription, its
-- account binding and its purchased seat count. A return URL grants no access.
create function public.hosted_provision_workspace(
  p_subscription text, p_owner uuid, p_name text, p_seat_limit integer, p_status text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  workspace uuid;
begin
  if p_subscription is null or p_subscription !~ '^sub_[A-Za-z0-9]+$'
    or p_owner is null or p_status is null or p_status not in ('trialing', 'active') then
    raise exception 'Invalid verified subscription';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('hosted_subscription:' || p_subscription, 0));
  select s.workspace_id into workspace from public.hosted_subscriptions s
    where s.stripe_subscription_id = p_subscription;
  if found then
    if not exists (
      select 1 from public.hosted_memberships m where m.workspace_id = workspace
        and m.user_id = p_owner and m.role = 'owner'
    ) then
      raise exception 'Subscription is already linked';
    end if;
    return workspace;
  end if;

  insert into public.hosted_workspaces (name) values (btrim(p_name)) returning id into workspace;
  insert into public.hosted_subscriptions (stripe_subscription_id, workspace_id, seat_limit, status)
    values (p_subscription, workspace, p_seat_limit, p_status);
  insert into public.hosted_memberships (workspace_id, user_id, role)
    values (workspace, p_owner, 'owner');
  return workspace;
end;
$$;

create function public.hosted_create_invitation(p_workspace uuid, p_email text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  recipient text := lower(btrim(p_email));
begin
  if recipient is null or char_length(recipient) > 254 or
    recipient !~ '^[^@[:space:]]+@[^@[:space:]]+$' then
    raise exception 'Enter a valid email address';
  end if;
  if not exists (
    select 1 from public.hosted_memberships m
      join public.hosted_subscriptions s on s.workspace_id = m.workspace_id
    where m.workspace_id = p_workspace and m.user_id = auth.uid()
      and m.role = 'owner' and s.status in ('trialing', 'active')
  ) then
    raise exception 'Workspace invitation unavailable';
  end if;

  insert into public.hosted_invitations (token_hash, workspace_id, email, expires_at)
    values (sha256(convert_to(token, 'UTF8')), p_workspace, recipient, now() + interval '7 days');
  return token;
end;
$$;

create function public.hosted_accept_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  invitation public.hosted_invitations%rowtype;
  entitlement public.hosted_subscriptions%rowtype;
  recipient text;
  member_id uuid := auth.uid();
begin
  if member_id is null or p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid or expired invitation';
  end if;
  select lower(u.email) into recipient from auth.users u
    where u.id = member_id and u.email_confirmed_at is not null;
  select * into invitation from public.hosted_invitations i
    where i.token_hash = sha256(convert_to(p_token, 'UTF8')) for update;
  if not found or recipient is distinct from invitation.email
    or invitation.accepted_at is not null or invitation.expires_at <= now() then
    raise exception 'Invalid or expired invitation';
  end if;

  -- Serialize seat allocation across different invitations to the same office.
  select * into entitlement from public.hosted_subscriptions s
    where s.workspace_id = invitation.workspace_id for update;
  if not found or entitlement.status not in ('trialing', 'active') then
    raise exception 'Workspace subscription unavailable';
  end if;
  if not exists (
    select 1 from public.hosted_memberships m
    where m.workspace_id = invitation.workspace_id and m.user_id = member_id
  ) then
    if (select count(*) from public.hosted_memberships m
        where m.workspace_id = invitation.workspace_id) >= entitlement.seat_limit then
      raise exception 'Workspace seat limit reached';
    end if;
    insert into public.hosted_memberships (workspace_id, user_id, role)
      values (invitation.workspace_id, member_id, 'member');
  end if;
  update public.hosted_invitations set accepted_at = now()
    where token_hash = invitation.token_hash;
  return invitation.workspace_id;
end;
$$;

revoke execute on function public.hosted_provision_workspace(text, uuid, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.hosted_provision_workspace(text, uuid, text, integer, text)
  to service_role;

revoke execute on function public.hosted_create_invitation(uuid, text),
  public.hosted_accept_invitation(text) from public, anon, authenticated;
grant execute on function public.hosted_create_invitation(uuid, text),
  public.hosted_accept_invitation(text) to authenticated;

commit;
