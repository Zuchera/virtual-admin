begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(9);

insert into auth.users (id, email, email_confirmed_at) values
  ('10000000-0000-0000-0000-000000000001', 'owner-a@example.test', now()),
  ('10000000-0000-0000-0000-000000000002', 'owner-b@example.test', now()),
  ('10000000-0000-0000-0000-000000000003', 'member-a@example.test', now()),
  ('10000000-0000-0000-0000-000000000004', 'extra-a@example.test', now());

select set_config('test.office_a', hosted_provision_workspace('sub_fixtureA',
  '10000000-0000-0000-0000-000000000001', 'Office A', 2, 'trialing')::text, true);
select set_config('test.office_b', hosted_provision_workspace('sub_fixtureB',
  '10000000-0000-0000-0000-000000000002', 'Office B', 2, 'active')::text, true);

select is(hosted_provision_workspace('sub_fixtureA',
  '10000000-0000-0000-0000-000000000001', 'Office A', 2, 'trialing')::text,
  current_setting('test.office_a'), 'Subscription retry returns the same workspace');
select throws_ok($q$select hosted_provision_workspace('sub_fixtureA',
  '10000000-0000-0000-0000-000000000002', 'Office A', 2, 'trialing')$q$,
  'P0001', 'Subscription is already linked', 'Subscription cannot be reassigned');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is((select count(*) from hosted_workspaces), 1::bigint, 'Owner can only list their office');
select is((select count(*) from hosted_workspaces
  where id = current_setting('test.office_b')::uuid), 0::bigint, 'Other office is hidden');
select ok(not has_function_privilege(current_user,
  'public.hosted_provision_workspace(text,uuid,text,integer,text)', 'EXECUTE'),
  'Client cannot provision a workspace');
select set_config('test.invite', hosted_create_invitation(current_setting('test.office_a')::uuid,
  'member-a@example.test'), true);
select set_config('test.extra_invite', hosted_create_invitation(current_setting('test.office_a')::uuid,
  'extra-a@example.test'), true);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select throws_ok($q$select hosted_accept_invitation(current_setting('test.invite'))$q$,
  'P0001', 'Invalid or expired invitation', 'Different account cannot redeem invite');
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select is(hosted_accept_invitation(current_setting('test.invite'))::text,
  current_setting('test.office_a'), 'Verified invite recipient joins');
select is((select count(*) from hosted_subscriptions), 0::bigint, 'Member cannot read billing');
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select throws_ok($q$select hosted_accept_invitation(current_setting('test.extra_invite'))$q$,
  'P0001', 'Workspace seat limit reached', 'Owner and first member use both seats');

reset role;
select * from finish();
rollback;
