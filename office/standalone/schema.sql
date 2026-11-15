-- StartDotCom HQ virtual office: Supabase database setup.
-- Paste this whole file into Supabase > SQL Editor > New query, and click Run. Safe to run again.

-- 1. Tables ---------------------------------------------------------------
create table if not exists public.members (
  ws text not null,                                   -- workspace (one per company), set in config.js
  user_id uuid not null references auth.users on delete cascade,
  email text, name text,
  role text not null default 'member' check (role in ('owner','admin','member')),
  status text not null default 'pending' check (status in ('pending','approved','blocked')),
  created_at timestamptz not null default now(),
  primary key (ws, user_id)
);
create table if not exists public.invites (
  ws text not null, email text not null,
  role text not null default 'member' check (role in ('admin','member')),
  used boolean not null default false, created_at timestamptz not null default now(),
  primary key (ws, email)
);
create table if not exists public.docs (                 -- everything in the office: profiles, chat, boards, rooms, games...
  ws text not null, path text not null, col text not null, data jsonb not null,
  updated_at timestamptz not null default now(), updated_by uuid default auth.uid(),
  primary key (ws, path)
);
create index if not exists docs_ws_col on public.docs (ws, col);
alter table public.docs replica identity full;

-- 2. Who you are in a workspace (null unless approved) ----------------------
create or replace function public.office_role(p_ws text) returns text
language sql stable security definer set search_path = public as $$
  select role from public.members where ws = p_ws and user_id = auth.uid() and status = 'approved'
$$;

-- 3. Joining: the first person becomes owner; invited emails and allowed domains are approved; everyone else waits
create or replace function public.members_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare inv public.invites%rowtype; allow jsonb;
begin
  new.user_id := auth.uid();
  new.email := lower(coalesce((select email from auth.users where id = auth.uid()), new.email));
  new.created_at := now();
  if not exists (select 1 from public.members where ws = new.ws) then
    new.role := 'owner'; new.status := 'approved';
  else
    select * into inv from public.invites where ws = new.ws and email = new.email;
    if found then
      new.role := inv.role; new.status := 'approved';
      update public.invites set used = true where ws = new.ws and email = new.email;
    else
      select data -> 'allow' into allow from public.docs where ws = new.ws and path = 'office/config';
      new.role := 'member';
      new.status := case when allow is not null and allow ? split_part(new.email, '@', 2) then 'approved' else 'pending' end;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists members_bi on public.members;
create trigger members_bi before insert on public.members for each row execute function public.members_before_insert();

-- the owner cannot be demoted or blocked by an admin
create or replace function public.members_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'owner' and (new.role <> 'owner' or new.status <> 'approved') and public.office_role(old.ws) <> 'owner' then
    raise exception 'Only the owner can change the owner account';
  end if;
  if new.role = 'owner' and old.role <> 'owner' and public.office_role(old.ws) <> 'owner' then
    raise exception 'Only the owner can hand over ownership';
  end if;
  new.user_id := old.user_id; new.ws := old.ws; new.email := old.email;
  return new;
end $$;
drop trigger if exists members_bu on public.members;
create trigger members_bu before update on public.members for each row execute function public.members_before_update();

-- 4. Row level security ------------------------------------------------------
alter table public.members enable row level security;
alter table public.invites enable row level security;
alter table public.docs enable row level security;

drop policy if exists m_select on public.members; drop policy if exists m_insert on public.members;
drop policy if exists m_update on public.members; drop policy if exists m_delete on public.members;
create policy m_select on public.members for select using (user_id = auth.uid() or public.office_role(ws) is not null);
create policy m_insert on public.members for insert with check (auth.uid() is not null and user_id = auth.uid());
create policy m_update on public.members for update using (public.office_role(ws) in ('owner','admin')) with check (public.office_role(ws) in ('owner','admin'));
create policy m_delete on public.members for delete using (public.office_role(ws) in ('owner','admin') and role <> 'owner');

drop policy if exists i_all on public.invites;
create policy i_all on public.invites for all using (public.office_role(ws) in ('owner','admin')) with check (public.office_role(ws) in ('owner','admin'));

drop policy if exists d_select on public.docs; drop policy if exists d_insert on public.docs;
drop policy if exists d_update on public.docs; drop policy if exists d_delete on public.docs;
create policy d_select on public.docs for select using (public.office_role(ws) is not null);
create policy d_insert on public.docs for insert with check (
  public.office_role(ws) is not null
  and (col <> 'office' or public.office_role(ws) in ('owner','admin'))
  and (col <> 'people' or split_part(path, '/', 2) = auth.uid()::text or public.office_role(ws) in ('owner','admin')));
create policy d_update on public.docs for update using (public.office_role(ws) is not null) with check (
  public.office_role(ws) is not null
  and (col <> 'office' or public.office_role(ws) in ('owner','admin'))
  and (col <> 'people' or split_part(path, '/', 2) = auth.uid()::text or public.office_role(ws) in ('owner','admin')));
create policy d_delete on public.docs for delete using (
  public.office_role(ws) is not null
  and (col <> 'office' or public.office_role(ws) in ('owner','admin'))
  and (col <> 'people' or split_part(path, '/', 2) = auth.uid()::text or public.office_role(ws) in ('owner','admin')));

-- 5. Live updates ------------------------------------------------------------
do $$ begin
  begin alter publication supabase_realtime add table public.docs; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.members; exception when duplicate_object then null; end;
end $$;

-- presence channels are private: only approved members of that workspace can join "office:<workspace>"
drop policy if exists office_presence_read on realtime.messages;
drop policy if exists office_presence_write on realtime.messages;
create policy office_presence_read on realtime.messages for select to authenticated
  using (realtime.topic() like 'office:%' and public.office_role(split_part(realtime.topic(), ':', 2)) is not null);
create policy office_presence_write on realtime.messages for insert to authenticated
  with check (realtime.topic() like 'office:%' and public.office_role(split_part(realtime.topic(), ':', 2)) is not null);

-- 6. Shared files ------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('office-files', 'office-files', true) on conflict (id) do nothing;
drop policy if exists office_files_insert on storage.objects;
drop policy if exists office_files_delete on storage.objects;
create policy office_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'office-files' and public.office_role(split_part(name, '/', 1)) is not null);
create policy office_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'office-files' and public.office_role(split_part(name, '/', 1)) is not null);
