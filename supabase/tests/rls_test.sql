-- Security tests for Row Level Security and the safe-door functions.
-- Runs inside one transaction and rolls everything back, so nothing stays in the database.
-- Run: npx supabase db query --linked -f supabase/tests/rls_test.sql
--
-- People:
--   umm    — manager of household A («بيت أبو خالد»)
--   khalid — member of A (joins with an invite)
--   rahul  — helper in A (joins with a helper invite)
--   eve    — a stranger with her own household B

begin;

create temp table results (n serial, test text, pass boolean) on commit drop;
create temp table ctx (k text primary key, v text) on commit drop;
grant all on results, ctx to authenticated, anon;
grant usage on sequence results_n_seq to authenticated, anon;

insert into auth.users (id, aud, role, phone) values
  ('00000000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', '999000000001'),
  ('00000000-0000-4000-a000-000000000002', 'authenticated', 'authenticated', '999000000002'),
  ('00000000-0000-4000-a000-000000000003', 'authenticated', 'authenticated', '999000000003'),
  ('00000000-0000-4000-a000-000000000004', 'authenticated', 'authenticated', '999000000004');

-- Act as someone: act('umm') etc. (sets the role and who auth.uid() returns)
create function pg_temp.act(who text) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object(
    'role', 'authenticated',
    'sub', case who
      when 'umm' then '00000000-0000-4000-a000-000000000001'
      when 'khalid' then '00000000-0000-4000-a000-000000000002'
      when 'rahul' then '00000000-0000-4000-a000-000000000003'
      when 'eve' then '00000000-0000-4000-a000-000000000004'
    end)::text, true);
end $$;

create function pg_temp.check_(test text, pass boolean) returns void language sql as $$
  insert into results (test, pass) values (test, coalesce(pass, false));
$$;

-- Does a statement fail? (true = it was blocked, as it should be)
create function pg_temp.blocked(stmt text) returns boolean language plpgsql as $$
begin
  execute stmt;
  return false;
exception when others then
  return true;
end $$;

-- How many rows a statement changed (0 = quietly blocked by a rule, -1 = refused with an error)
create function pg_temp.affected(stmt text) returns int language plpgsql as $$
declare
  n int;
begin
  execute stmt;
  get diagnostics n = row_count;
  return n;
exception when others then
  return -1;
end $$;

create function pg_temp.get(key text) returns text language sql as $$ select v from ctx where k = key $$;
create function pg_temp.put(key text, val text) returns void language sql as $$
  insert into ctx values (key, val) on conflict (k) do update set v = excluded.v
$$;

-- ---------- Signed out ----------
set local role anon;
select pg_temp.check_('signed out: cannot read items', pg_temp.blocked('select * from public.items'));
select pg_temp.check_('signed out: cannot create a household',
  pg_temp.blocked($q$ select public.create_household('x', 'x', 'f') $q$));

-- ---------- Umm Khalid creates household A, invites Khalid (member) and Rahul (helper) ----------
select pg_temp.act('umm');
select pg_temp.put('hhA', public.create_household('بيت أبو خالد', 'أم خالد', 'f')::text);
select pg_temp.put('codeMember', (select code from public.create_invite(pg_temp.get('hhA')::uuid)));
select pg_temp.put('codeHelper', (select code from public.create_invite(pg_temp.get('hhA')::uuid, 'helper')));
select pg_temp.put('ummMember', (select id::text from public.members where user_id = auth.uid()));
select pg_temp.check_('manager: is owner', (select role from public.members where user_id = auth.uid()) = 'owner');

insert into public.items (household_id, name, added_by)
  values (pg_temp.get('hhA')::uuid, 'طماطم', pg_temp.get('ummMember')::uuid);
select pg_temp.put('itemA', (select id::text from public.items where name = 'طماطم'));
select pg_temp.check_('history: adding an item is logged automatically',
  (select count(*) from public.item_events where item_id = pg_temp.get('itemA')::uuid) = 1);

-- ---------- Khalid joins A ----------
select pg_temp.act('khalid');
select pg_temp.check_('join screen: invite shows the household name',
  (select household_name from public.get_invite(pg_temp.get('codeMember'))) = 'بيت أبو خالد');
select pg_temp.check_('before joining: cannot see household A items', (select count(*) from public.items) = 0);
select public.join_household(pg_temp.get('codeMember'), 'خالد', 'm');
select pg_temp.put('khalidMember', (select id::text from public.members where user_id = auth.uid()));
select pg_temp.check_('after joining: sees the tomatoes', (select count(*) from public.items) = 1);
select pg_temp.check_('member: can tick an item',
  not pg_temp.blocked(format($q$ update public.items set status = 'bought' where id = %L $q$, pg_temp.get('itemA'))));
select pg_temp.check_('member: cannot make himself manager',
  pg_temp.blocked(format($q$ select public.set_member_role(%L, 'owner') $q$, pg_temp.get('khalidMember'))));
select pg_temp.check_('member: cannot change his role column directly',
  pg_temp.blocked(format($q$ update public.members set role = 'owner' where id = %L $q$, pg_temp.get('khalidMember'))));
select pg_temp.check_('member: cannot rename the household',
  pg_temp.affected($q$ update public.households set name = 'hacked' $q$) <= 0);
select pg_temp.check_('member: cannot pretend someone else added an item',
  pg_temp.blocked(format($q$ insert into public.items (household_id, name, added_by) values (%L, 'x', %L) $q$,
    pg_temp.get('hhA'), pg_temp.get('ummMember'))));
select pg_temp.check_('member: cannot change who added an item',
  pg_temp.blocked(format($q$ update public.items set added_by = %L where id = %L $q$,
    pg_temp.get('khalidMember'), pg_temp.get('itemA'))));
select pg_temp.check_('member: cannot delete someone else''s item',
  pg_temp.affected(format($q$ delete from public.items where id = %L $q$, pg_temp.get('itemA'))) <= 0);
select pg_temp.check_('member: cannot write history directly',
  pg_temp.blocked(format($q$ insert into public.item_events (household_id, item_id, kind) values (%L, %L, 'added') $q$,
    pg_temp.get('hhA'), pg_temp.get('itemA'))));

-- ---------- Rahul joins A as helper ----------
select pg_temp.act('rahul');
select public.join_household(pg_temp.get('codeHelper'), 'Rahul', 'm', 'saudi', 'en');
select pg_temp.put('rahulMember', (select id::text from public.members where user_id = auth.uid()));
select pg_temp.check_('helper: joined as helper', (select role from public.members where user_id = auth.uid()) = 'helper');
select pg_temp.check_('helper: can add items',
  not pg_temp.blocked(format($q$ insert into public.items (household_id, name, added_by) values (%L, 'Eggs', %L) $q$,
    pg_temp.get('hhA'), pg_temp.get('rahulMember'))));
select pg_temp.check_('helper: cannot remove members',
  pg_temp.blocked(format($q$ select public.remove_member(%L) $q$, pg_temp.get('khalidMember'))));
select pg_temp.check_('helper: cannot create invites',
  pg_temp.blocked(format($q$ select public.create_invite(%L) $q$, pg_temp.get('hhA'))));
select pg_temp.check_('helper: cannot see invite codes', (select count(*) from public.invites) = 0);
select pg_temp.check_('helper: can edit own language',
  not pg_temp.blocked(format($q$ update public.members set view_language = 'hi' where id = %L $q$, pg_temp.get('rahulMember'))));
select pg_temp.check_('helper: cannot edit someone else''s profile',
  pg_temp.affected(format($q$ update public.members set display_name = 'x' where id = %L $q$, pg_temp.get('khalidMember'))) <= 0);

-- ---------- Eve: a stranger with her own household ----------
select pg_temp.act('eve');
select pg_temp.put('hhB', public.create_household('بيت إيف', 'Eve', 'f')::text);
select pg_temp.put('eveMember', (select id::text from public.members where user_id = auth.uid()));
select pg_temp.check_('stranger: sees 0 of household A''s items',
  (select count(*) from public.items where household_id = pg_temp.get('hhA')::uuid) = 0);
select pg_temp.check_('stranger: sees only her own household', (select count(*) from public.households) = 1);
select pg_temp.check_('stranger: sees only her own members', (select count(*) from public.members) = 1);
select pg_temp.check_('stranger: sees no history from A', (select count(*) from public.item_events) = 0);
select pg_temp.check_('stranger: cannot add to household A',
  pg_temp.blocked(format($q$ insert into public.items (household_id, name, added_by) values (%L, 'x', %L) $q$,
    pg_temp.get('hhA'), pg_temp.get('eveMember'))));
select pg_temp.check_('stranger: cannot edit A''s items',
  pg_temp.affected(format($q$ update public.items set name = 'x' where household_id = %L $q$, pg_temp.get('hhA'))) <= 0);
select pg_temp.check_('stranger: cannot point her item at A''s people',
  pg_temp.blocked(format($q$ insert into public.items (household_id, name, added_by, claimed_by) values (%L, 'x', %L, %L) $q$,
    pg_temp.get('hhB'), pg_temp.get('eveMember'), pg_temp.get('khalidMember'))));
select pg_temp.check_('stranger: cannot remove A''s members',
  pg_temp.blocked(format($q$ select public.remove_member(%L) $q$, pg_temp.get('khalidMember'))));
select pg_temp.check_('stranger: cannot invite to A',
  pg_temp.blocked(format($q$ select public.create_invite(%L) $q$, pg_temp.get('hhA'))));
select pg_temp.check_('everyone: can read the catalog', (select count(*) from public.catalog) > 0);
select pg_temp.check_('everyone: cannot change the catalog',
  pg_temp.blocked($q$ update public.catalog set name = 'x' where id = 'c1' $q$));

-- ---------- Manager actions ----------
select pg_temp.act('umm');
select public.remove_member(pg_temp.get('khalidMember')::uuid);
select pg_temp.act('khalid');
select pg_temp.check_('removed member: no longer sees the list', (select count(*) from public.items) = 0);
select pg_temp.act('umm');
select public.restore_member(pg_temp.get('khalidMember')::uuid);
select pg_temp.act('khalid');
select pg_temp.check_('restored member: sees the list again', (select count(*) from public.items) > 0);
select pg_temp.act('umm');
select pg_temp.check_('manager: cannot leave without handing over',
  pg_temp.blocked(format($q$ select public.leave_household(%L) $q$, pg_temp.get('hhA'))));
select public.set_member_role(pg_temp.get('khalidMember')::uuid, 'owner');
select pg_temp.check_('hand over: Khalid is now manager, Umm is member', (
  select bool_and(case when id = pg_temp.get('khalidMember')::uuid then role = 'owner' else role <> 'owner' end)
  from public.members where household_id = pg_temp.get('hhA')::uuid and left_at is null));

-- ---------- Expired invite ----------
reset role;
update public.invites set expires_at = now() - interval '1 day' where code = pg_temp.get('codeMember');
select pg_temp.act('eve');
select pg_temp.check_('expired invite: cannot join',
  pg_temp.blocked(format($q$ select public.join_household(%L, 'Eve', 'f') $q$, pg_temp.get('codeMember'))));

reset role;
select
  count(*) filter (where pass) as passed,
  count(*) filter (where not pass) as failed,
  coalesce(string_agg(test, ' | ') filter (where not pass), '') as failures
from results;

rollback;
