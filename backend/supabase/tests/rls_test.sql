-- Security tests for Row Level Security and the safe-door functions.
-- Runs inside one transaction and rolls everything back, so nothing stays in the database.
-- Run (from backend/): npx supabase db query --linked -f supabase/tests/rls_test.sql
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

-- Sign-in is by email; Eve's account is an older one made with a phone number
insert into auth.users (id, aud, role, email, phone) values
  ('00000000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', 'umm@example.com', null),
  ('00000000-0000-4000-a000-000000000002', 'authenticated', 'authenticated', 'khalid@example.com', null),
  ('00000000-0000-4000-a000-000000000003', 'authenticated', 'authenticated', 'rahul@example.com', null),
  ('00000000-0000-4000-a000-000000000004', 'authenticated', 'authenticated', null, '999000000004');

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
select pg_temp.check_('new list: a family list unless chosen otherwise',
  (select kind from public.households where id = pg_temp.get('hhA')::uuid) = 'family');
select pg_temp.check_('manager: can change who the list is for',
  pg_temp.affected(format($q$ update public.households set kind = 'friends' where id = %L $q$, pg_temp.get('hhA'))) = 1);
select pg_temp.check_('manager: can change it back',
  pg_temp.affected(format($q$ update public.households set kind = 'family' where id = %L $q$, pg_temp.get('hhA'))) = 1);
select pg_temp.check_('a list is only for family, friends, work or other',
  pg_temp.blocked(format($q$ update public.households set kind = 'party' where id = %L $q$, pg_temp.get('hhA'))));
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
select pg_temp.check_('member: cannot change who the list is for',
  pg_temp.affected($q$ update public.households set kind = 'work' $q$) <= 0);
select pg_temp.check_('member: cannot pretend someone else added an item',
  pg_temp.blocked(format($q$ insert into public.items (household_id, name, added_by) values (%L, 'x', %L) $q$,
    pg_temp.get('hhA'), pg_temp.get('ummMember'))));
select pg_temp.check_('member: cannot change who added an item',
  pg_temp.blocked(format($q$ update public.items set added_by = %L where id = %L $q$,
    pg_temp.get('khalidMember'), pg_temp.get('itemA'))));
select pg_temp.check_('member: cannot delete someone else''s item',
  pg_temp.affected(format($q$ delete from public.items where id = %L $q$, pg_temp.get('itemA'))) <= 0);
select pg_temp.check_('member: cannot delete even an item he added himself (undo marks it removed instead)',
  pg_temp.affected(format($q$ delete from public.items where household_id = %L $q$, pg_temp.get('hhA'))) <= 0);
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

-- ---------- Photos («صوّرها عشان ما يغلط») ----------
select pg_temp.act('umm');
select pg_temp.check_('photos: a member can put a photo from her family''s folder on an item',
  pg_temp.affected(format($q$ update public.items set photo_path = %L where id = %L $q$,
    pg_temp.get('hhA') || '/products/c1.jpg', pg_temp.get('itemA'))) = 1);
select pg_temp.check_('photos: an item cannot point at another family''s photo',
  pg_temp.affected(format($q$ update public.items set photo_path = %L where id = %L $q$,
    pg_temp.get('hhB') || '/products/c1.jpg', pg_temp.get('itemA'))) = -1);
select pg_temp.check_('photos: a member can upload to her family''s folder',
  not pg_temp.blocked(format($q$ insert into storage.objects (bucket_id, name) values ('family-photos', %L) $q$,
    pg_temp.get('hhA') || '/products/c1.jpg')));
select pg_temp.check_('photos: a member cannot upload to another family''s folder',
  pg_temp.blocked(format($q$ insert into storage.objects (bucket_id, name) values ('family-photos', %L) $q$,
    pg_temp.get('hhB') || '/products/c1.jpg')));
select pg_temp.check_('photos: a member can make it her family''s picture of the product',
  not pg_temp.blocked(format($q$ insert into public.household_product_photos (household_id, catalog_id, photo_path, updated_by)
    values (%L, 'c1', %L, %L) $q$, pg_temp.get('hhA'), pg_temp.get('hhA') || '/products/c1.jpg', pg_temp.get('ummMember'))));
select pg_temp.check_('photos: a non-admin cannot upload official product pictures',
  pg_temp.blocked($q$ insert into storage.objects (bucket_id, name) values ('product-photos', 'c1.jpg') $q$));
select pg_temp.check_('photos: a non-admin cannot see the official picture files list',
  (select count(*) from storage.objects where bucket_id = 'product-photos') = 0);
select pg_temp.check_('photos: a non-admin cannot list photo suggestions',
  pg_temp.blocked($q$ select * from public.admin_photo_suggestions() $q$));
select pg_temp.check_('photos: a non-admin cannot set a product''s official picture',
  pg_temp.blocked($q$ select public.admin_set_product_image('c1', 'c1.jpg') $q$));

select pg_temp.act('eve');
select pg_temp.check_('photos: a stranger sees none of A''s product pictures',
  (select count(*) from public.household_product_photos where household_id = pg_temp.get('hhA')::uuid) = 0);
select pg_temp.check_('photos: a stranger cannot see A''s photo files',
  (select count(*) from storage.objects where bucket_id = 'family-photos' and name like pg_temp.get('hhA') || '/%') = 0);
select pg_temp.check_('photos: a stranger cannot set A''s product picture',
  pg_temp.blocked(format($q$ insert into public.household_product_photos (household_id, catalog_id, photo_path, updated_by)
    values (%L, 'c2', %L, %L) $q$, pg_temp.get('hhA'), pg_temp.get('hhA') || '/products/c2.jpg', pg_temp.get('eveMember'))));
select pg_temp.check_('photos: a stranger cannot replace A''s photo files',
  pg_temp.affected(format($q$ update storage.objects set name = name where bucket_id = 'family-photos' and name like %L $q$,
    pg_temp.get('hhA') || '/%')) <= 0);
select pg_temp.check_('photos: a stranger cannot change A''s product picture',
  pg_temp.affected(format($q$ update public.household_product_photos set photo_path = photo_path where household_id = %L $q$,
    pg_temp.get('hhA'))) <= 0);

-- ---------- Helper invite ----------
select pg_temp.check_('helper invite: the join screen sees it is for a helper',
  (select role from public.get_invite(pg_temp.get('codeHelper'))) = 'helper'
  and (select role from public.get_invite(pg_temp.get('codeMember'))) = 'member');

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

-- ---------- Trips and questions ----------
select pg_temp.act('khalid');
select pg_temp.put('khalidNow', (select id::text from public.members where user_id = auth.uid() and left_at is null));
insert into public.trips (household_id, shopper_id, store) values (pg_temp.get('hhA')::uuid, pg_temp.get('khalidNow')::uuid, 'supermarket');
select pg_temp.put('tripA', (select id::text from public.trips where household_id = pg_temp.get('hhA')::uuid limit 1));
insert into public.items (household_id, name, added_by) values (pg_temp.get('hhA')::uuid, 'هيل', pg_temp.get('khalidNow')::uuid);
select pg_temp.put('itemHeel', (select id::text from public.items where name = 'هيل'));
select pg_temp.check_('shopper: can ask the manager about an item',
  not pg_temp.blocked(format($q$ insert into public.questions (household_id, trip_id, item_id, from_member, to_member) values (%L, %L, %L, %L, %L) $q$,
    pg_temp.get('hhA'), pg_temp.get('tripA'), pg_temp.get('itemHeel'), pg_temp.get('khalidNow'), pg_temp.get('ummMember'))));
select pg_temp.check_('shopper: cannot ask pretending to be someone else',
  pg_temp.blocked(format($q$ insert into public.questions (household_id, item_id, from_member, to_member) values (%L, %L, %L, %L) $q$,
    pg_temp.get('hhA'), pg_temp.get('itemHeel'), pg_temp.get('ummMember'), pg_temp.get('khalidNow'))));
select pg_temp.check_('shopper: cannot start a trip as someone else',
  pg_temp.blocked(format($q$ insert into public.trips (household_id, shopper_id, store) values (%L, %L, 'grocery') $q$,
    pg_temp.get('hhA'), pg_temp.get('ummMember'))));

select pg_temp.act('rahul');
select pg_temp.check_('someone not asked: cannot answer the question',
  pg_temp.affected($q$ update public.questions set answer = 'no' $q$) <= 0);

select pg_temp.act('umm');
select pg_temp.check_('the person asked: can answer',
  pg_temp.affected($q$ update public.questions set answer = 'alt', reply = 'إيه جيبه', answered_at = now() $q$) = 1);

select pg_temp.act('eve');
select pg_temp.check_('stranger: sees no trips', (select count(*) from public.trips where household_id = pg_temp.get('hhA')::uuid) = 0);
select pg_temp.check_('stranger: sees no questions', (select count(*) from public.questions) = 0);
select pg_temp.check_('stranger: cannot end their trip',
  pg_temp.affected(format($q$ update public.trips set ended_at = now() where id = %L $q$, pg_temp.get('tripA'))) <= 0);
select pg_temp.check_('nobody: can delete trips or questions',
  pg_temp.blocked('delete from public.trips') and pg_temp.blocked('delete from public.questions'));

-- ---------- Deleting a list («امسح القائمة») ----------
-- (Khalid is the manager now — Umm handed over above)
select pg_temp.act('umm');
select pg_temp.check_('member: cannot delete the list',
  pg_temp.blocked(format($q$ select public.delete_household(%L) $q$, pg_temp.get('hhA'))));
select pg_temp.act('eve');
select pg_temp.check_('stranger: cannot delete the list',
  pg_temp.blocked(format($q$ select public.delete_household(%L) $q$, pg_temp.get('hhA'))));
select pg_temp.act('khalid');
select pg_temp.check_('manager: can delete the list',
  not pg_temp.blocked(format($q$ select public.delete_household(%L) $q$, pg_temp.get('hhA'))));
select pg_temp.check_('after deleting: the manager no longer sees its items',
  (select count(*) from public.items where household_id = pg_temp.get('hhA')::uuid) = 0);
select pg_temp.act('umm');
select pg_temp.check_('after deleting: members no longer see the list or its items',
  (select count(*) from public.households where id = pg_temp.get('hhA')::uuid) = 0
  and (select count(*) from public.items where household_id = pg_temp.get('hhA')::uuid) = 0);
select pg_temp.check_('after deleting: its invite link shows nothing',
  (select count(*) from public.get_invite(pg_temp.get('codeMember'))) = 0);
select pg_temp.act('eve');
select pg_temp.check_('after deleting: nobody can join with an old code',
  pg_temp.blocked(format($q$ select public.join_household(%L, 'Eve', 'f') $q$, pg_temp.get('codeMember'))));
reset role;
select pg_temp.check_('after deleting: data is kept, everyone is moved out, trips ended',
  (select count(*) from public.items where household_id = pg_temp.get('hhA')::uuid) > 0
  and (select count(*) from public.members where household_id = pg_temp.get('hhA')::uuid and left_at is null) = 0
  and (select count(*) from public.trips where household_id = pg_temp.get('hhA')::uuid and ended_at is null) = 0);

-- ---------- Admin dashboard doors ----------
reset role;
select pg_temp.check_('signed out: cannot use admin doors',
  pg_temp.blocked('set local role anon; select public.admin_overview()'));
select pg_temp.act('umm');
select pg_temp.check_('normal user: is not an admin', public.admin_me() = false);
select pg_temp.check_('normal user: cannot see admin numbers', pg_temp.blocked('select public.admin_overview()'));
select pg_temp.check_('normal user: cannot list users', pg_temp.blocked('select * from public.admin_users()'));
select pg_temp.check_('normal user: cannot block someone',
  pg_temp.blocked($q$ select public.admin_set_blocked('00000000-0000-4000-a000-000000000004', true) $q$));
select pg_temp.check_('normal user: cannot delete someone',
  pg_temp.blocked($q$ select public.admin_delete_user('00000000-0000-4000-a000-000000000004') $q$));
select pg_temp.check_('normal user: cannot make themselves admin',
  pg_temp.blocked($q$ select public.admin_add_admin('umm@example.com') $q$)
  and pg_temp.blocked($q$ insert into private.admins (user_id) values (auth.uid()) $q$));
reset role;
insert into private.admins (user_id) values ('00000000-0000-4000-a000-000000000001');
select pg_temp.act('umm');
select pg_temp.check_('admin: sees the numbers and the users',
  public.admin_me() and (public.admin_overview() ->> 'users_total')::int >= 4
  and (select count(*) from public.admin_users() where contact like '%•••@example.com') >= 3
  and (select count(*) from public.admin_users() where contact like '+99 90••%') >= 1);
select pg_temp.check_('admin: emails and older phone numbers are partly hidden',
  not exists (select 1 from public.admin_users() where contact like '%umm@%' or contact like '%999000000004%'));
select pg_temp.check_('admin: can block someone',
  not pg_temp.blocked($q$ select public.admin_set_blocked('00000000-0000-4000-a000-000000000004', true) $q$));
select pg_temp.check_('admin: blocked person shows as blocked',
  (select blocked from public.admin_users() where id = '00000000-0000-4000-a000-000000000004'));
select pg_temp.check_('admin: can unblock them',
  not pg_temp.blocked($q$ select public.admin_set_blocked('00000000-0000-4000-a000-000000000004', false) $q$));
select pg_temp.check_('admin: unblocked person shows as not blocked',
  not (select blocked from public.admin_users() where id = '00000000-0000-4000-a000-000000000004'));
select pg_temp.check_('admin: cannot block or delete themselves',
  pg_temp.blocked($q$ select public.admin_set_blocked('00000000-0000-4000-a000-000000000001', true) $q$)
  and pg_temp.blocked($q$ select public.admin_delete_user('00000000-0000-4000-a000-000000000001') $q$));
select pg_temp.check_('admin: can add another admin by email (any capitals or spaces)',
  not pg_temp.blocked($q$ select public.admin_add_admin(' Khalid@Example.com ') $q$));
select pg_temp.check_('admin: the new admin is on the team',
  exists (select 1 from public.admin_list_admins() where user_id = '00000000-0000-4000-a000-000000000002'));
select pg_temp.check_('admin: adding an email nobody signed up with is refused',
  pg_temp.blocked($q$ select public.admin_add_admin('nobody@example.com') $q$));
select pg_temp.check_('admin: can delete an account',
  not pg_temp.blocked($q$ select public.admin_delete_user('00000000-0000-4000-a000-000000000004') $q$));
select pg_temp.check_('admin: the deleted account is gone',
  not exists (select 1 from public.admin_users() where id = '00000000-0000-4000-a000-000000000004'));

-- ---------- Product list (admins only) ----------
select pg_temp.act('rahul'); -- not an admin (Khalid was made one above)
select pg_temp.check_('normal user: can read products', (select count(*) from public.catalog) > 0);
select pg_temp.check_('normal user: cannot change products directly',
  pg_temp.blocked($q$ insert into public.catalog (id, name) values ('x1', 'Hack') $q$)
  and pg_temp.affected($q$ update public.catalog set name = 'Hack' where id = 'c1' $q$) <= 0
  and pg_temp.blocked($q$ insert into public.catalog_aliases (catalog_id, alias) values ('c1', 'hack') $q$));
select pg_temp.check_('normal user: cannot use the product doors',
  pg_temp.blocked($q$ select public.admin_save_product('{"name": "Hack"}') $q$)
  and pg_temp.blocked($q$ select public.admin_set_product_hidden('c1', true) $q$)
  and pg_temp.blocked($q$ select public.admin_add_alias('c1', 'hack') $q$));
select pg_temp.act('umm');
select pg_temp.put('newProduct', public.admin_save_product(
  '{"name": "منتج تجربة", "category": "pantry", "default_qty": 2, "default_unit": "kg", "en": "Test product", "hi": "टेस्ट"}'));
select pg_temp.check_('admin: can add a product',
  (select name = 'منتج تجربة' and default_unit = 'kg' and translations ->> 'en' = 'Test product'
     from public.catalog where id = pg_temp.get('newProduct')));
select pg_temp.check_('admin: can edit it',
  not pg_temp.blocked(format($q$ select public.admin_save_product('{"id": "%s", "name": "منتج تجربة 2", "category": "dairy"}') $q$,
    pg_temp.get('newProduct'))));
select pg_temp.check_('admin: edit is saved',
  (select name = 'منتج تجربة 2' and category = 'dairy' from public.catalog where id = pg_temp.get('newProduct')));
select pg_temp.check_('admin: two products cannot share a name',
  pg_temp.blocked($q$ select public.admin_save_product('{"name": "منتج تجربة 2"}') $q$));
select public.admin_add_alias(pg_temp.get('newProduct'), 'تجربة', 'egyptian');
select pg_temp.check_('admin: can add a dialect word',
  (select count(*) from public.catalog_aliases where catalog_id = pg_temp.get('newProduct') and alias = 'تجربة' and dialect = 'egyptian') = 1);
select public.admin_remove_alias((select id from public.catalog_aliases where catalog_id = pg_temp.get('newProduct') limit 1));
select pg_temp.check_('admin: can remove a dialect word',
  (select count(*) from public.catalog_aliases where catalog_id = pg_temp.get('newProduct')) = 0);
select public.admin_set_product_hidden(pg_temp.get('newProduct'), true);
select pg_temp.check_('admin: can hide a product', (select hidden from public.catalog where id = pg_temp.get('newProduct')));
select pg_temp.check_('admin: can upload an official product picture',
  not pg_temp.blocked($q$ insert into storage.objects (bucket_id, name) values ('product-photos', 'test-product.jpg') $q$));
select public.admin_set_product_image(pg_temp.get('newProduct'), 'test-product.jpg');
select pg_temp.put('hhPhotos', public.create_household('بيت الصور', 'أم خالد', 'f')::text);
insert into public.household_product_photos (household_id, catalog_id, photo_path, updated_by)
  values (pg_temp.get('hhPhotos')::uuid, 'c2', pg_temp.get('hhPhotos') || '/products/c2.jpg',
    (select private.my_member_id(pg_temp.get('hhPhotos')::uuid)));
select pg_temp.check_('admin: sees families'' photos as suggestions',
  (select count(*) from public.admin_photo_suggestions() where catalog_id = 'c2' and list_name = 'بيت الصور') = 1);
select pg_temp.check_('admin: photos from a deleted list are not suggested',
  (select count(*) from public.admin_photo_suggestions() where list_name = 'بيت أبو خالد') = 0);
select pg_temp.check_('admin: can open a family photo file to review it',
  (select count(*) from storage.objects where bucket_id = 'family-photos' and name = pg_temp.get('hhA') || '/products/c1.jpg') = 1);
select pg_temp.check_('admin: still cannot change a family''s photo files',
  pg_temp.affected(format($q$ update storage.objects set name = name where bucket_id = 'family-photos' and name like %L $q$,
    pg_temp.get('hhA') || '/%')) <= 0);
-- (Storage refuses direct SQL deletes; seeing the file is what lets the Storage API delete it)
select pg_temp.check_('admin: can see official picture files (needed to delete them)',
  (select count(*) from storage.objects where bucket_id = 'product-photos' and name = 'test-product.jpg') = 1);
select pg_temp.check_('admin: can set a product''s official picture',
  (select image_path = 'test-product.jpg' from public.catalog where id = pg_temp.get('newProduct')));

-- ---------- Deleting an account that added items ----------
reset role;
select pg_temp.check_('deleting Rahul''s account works even though he added items',
  not pg_temp.blocked($q$ delete from auth.users where id = '00000000-0000-4000-a000-000000000003' $q$));
select pg_temp.check_('his items stay on the list (who-added cleared)',
  (select count(*) from public.items where household_id = pg_temp.get('hhA')::uuid and name = 'Eggs' and added_by is null) = 1);
select pg_temp.check_('deleting Khalid''s account works even though he shopped and asked a question',
  not pg_temp.blocked($q$ delete from auth.users where id = '00000000-0000-4000-a000-000000000002' $q$));
select pg_temp.check_('the question stays (who asked cleared)',
  (select count(*) from public.questions where household_id = pg_temp.get('hhA')::uuid and from_member is null) = 1);

-- ---------- Who a list is for ----------
select pg_temp.act('umm');
select pg_temp.put('hhFriends',
  public.create_household('الصحاب', 'أم خالد', 'f', 'egyptian', 'ar', 'friends')::text);
select pg_temp.check_('new list: keeps the chosen kind (friends)',
  (select kind from public.households where id = pg_temp.get('hhFriends')::uuid) = 'friends');

reset role;
select
  count(*) filter (where pass) as passed,
  count(*) filter (where not pass) as failed,
  coalesce(string_agg(test, ' | ') filter (where not pass), '') as failures
from results;

rollback;
