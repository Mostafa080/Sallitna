-- Sallitna core schema: households, members, invites, catalog, items, trips, questions,
-- item_events, voice_jobs — with Row Level Security on every table.
--
-- Rules of thumb:
-- • You can only see and change your own household's data (helpers in private.*).
-- • Some changes (create a household, invite, join, roles, removing someone) only happen through
--   the security-definer functions at the bottom, which check who's asking.
-- • Column grants decide which columns a member may update directly.

create schema if not exists private;

-- ============================================================================================
-- Tables
-- ============================================================================================

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  gender text not null check (gender in ('f', 'm')),
  role text not null default 'member' check (role in ('owner', 'member', 'helper')),
  view_language text not null default 'ar' check (view_language in ('ar', 'en', 'hi')),
  speaks text[] not null default '{ar}' check (cardinality(speaks) > 0 and speaks <@ array['ar', 'en', 'hi']),
  dialect text not null default 'saudi'
    check (dialect in ('saudi', 'emirati', 'kuwaiti', 'egyptian', 'levantine', 'other')),
  avatar_color text not null default 'accent'
    check (avatar_color in ('ink', 'info', 'accent', 'success', 'line', 'danger')),
  settings jsonb not null default '{}'::jsonb, -- notification and voice preferences
  joined_at timestamptz not null default now(),
  left_at timestamptz, -- removed or left; the row stays so old items still show who added them
  unique (household_id, user_id)
);
create index members_user_idx on public.members (user_id) where left_at is null;
create unique index members_one_owner on public.members (household_id) where role = 'owner' and left_at is null;

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{8}$'),
  role text not null default 'member' check (role in ('member', 'helper')), -- what the new person becomes
  created_by uuid references public.members (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);
create index invites_household_idx on public.invites (household_id);

-- Shared product catalog (same for every household) + dialect words that mean each product
create table public.catalog (
  id text primary key,
  name text not null unique,
  category text not null check (category in ('produce', 'dairy', 'bakery', 'pantry', 'cleaning', 'other')),
  default_qty numeric(8, 2) not null default 1 check (default_qty > 0),
  default_unit text not null default 'count' check (default_unit in ('count', 'kg', 'piece', 'box', 'carton', 'bag')),
  translations jsonb not null default '{}'::jsonb, -- {"en": "...", "hi": "..."}
  alternative_id text references public.catalog (id) on delete set null -- suggested when it's not in the shop
);

create table public.catalog_aliases (
  id bigint generated always as identity primary key,
  catalog_id text not null references public.catalog (id) on delete cascade,
  alias text not null,
  dialect text check (dialect in ('saudi', 'emirati', 'kuwaiti', 'egyptian', 'levantine', 'other')), -- null = everyone
  unique nulls not distinct (catalog_id, alias, dialect)
);
create index catalog_aliases_alias_idx on public.catalog_aliases (alias);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  shopper_id uuid not null references public.members (id) on delete cascade,
  store text not null check (store in ('supermarket', 'grocery', 'pharmacy', 'bakery')),
  mode text not null default 'solo' check (mode in ('solo', 'split')),
  partner_id uuid references public.members (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  handoff boolean not null default false, -- ended early, asked someone else to finish
  amount_paid numeric(10, 2) check (amount_paid >= 0)
);
create index trips_active_idx on public.trips (household_id) where ended_at is null;

create table public.items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  catalog_id text references public.catalog (id) on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  qty numeric(8, 2) not null default 1 check (qty > 0),
  unit text not null default 'count' check (unit in ('count', 'kg', 'piece', 'box', 'carton', 'bag')),
  category text not null default 'other' check (category in ('produce', 'dairy', 'bakery', 'pantry', 'cleaning', 'other')),
  status text not null default 'open' check (status in ('open', 'in_cart', 'bought', 'not_found', 'removed')),
  note text not null default '' check (char_length(note) <= 200),
  added_by uuid references public.members (id) on delete set null,
  added_via text not null default 'text' check (added_via in ('voice', 'text')),
  voice_transcript text check (char_length(voice_transcript) <= 500),
  requested_by uuid[] not null default '{}', -- member ids; more than one when several people asked
  claimed_by uuid references public.members (id) on delete set null, -- "I'll get it"
  trip_id uuid references public.trips (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index items_household_status_idx on public.items (household_id, status);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  trip_id uuid references public.trips (id) on delete set null,
  item_id uuid not null references public.items (id) on delete cascade,
  from_member uuid references public.members (id) on delete set null,
  to_member uuid references public.members (id) on delete set null,
  alt_name text check (char_length(alt_name) <= 80),
  answer text check (answer in ('alt', 'no', 'next')),
  reply text check (char_length(reply) <= 200),
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
create index questions_household_idx on public.questions (household_id);

-- Every change to an item, written by a trigger (activity feed + undo)
create table public.item_events (
  id bigint generated always as identity primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  member_id uuid references public.members (id) on delete set null,
  kind text not null check (kind in ('added', 'changed')),
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index item_events_household_idx on public.item_events (household_id, created_at desc);

create table public.voice_jobs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  member_id uuid references public.members (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  dialect text,
  transcript text check (char_length(transcript) <= 2000),
  parse_result jsonb,
  corrections jsonb,
  created_at timestamptz not null default now()
);
create index voice_jobs_household_idx on public.voice_jobs (household_id);

-- ============================================================================================
-- Helpers used by the rules (private schema: not reachable through the API)
-- ============================================================================================

grant usage on schema private to authenticated;

-- Households I'm currently in
create function private.my_household_ids()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select household_id from public.members
  where user_id = (select auth.uid()) and left_at is null
$$;

-- My member id in a household (null if I'm not in it)
create function private.my_member_id(hh uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select id from public.members
  where household_id = hh and user_id = (select auth.uid()) and left_at is null
$$;

create function private.has_role(hh uuid, roles text[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.members
    where household_id = hh and user_id = (select auth.uid()) and left_at is null and role = any (roles)
  )
$$;

-- Is this member id part of that household (and still in it)?
create function private.in_household(member uuid, hh uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.members where id = member and household_id = hh and left_at is null)
$$;

revoke all on function private.my_household_ids() from public;
revoke all on function private.my_member_id(uuid) from public;
revoke all on function private.has_role(uuid, text[]) from public;
revoke all on function private.in_household(uuid, uuid) from public;
grant execute on function private.my_household_ids() to authenticated;
grant execute on function private.my_member_id(uuid) to authenticated;
grant execute on function private.has_role(uuid, text[]) to authenticated;
grant execute on function private.in_household(uuid, uuid) to authenticated;

-- ============================================================================================
-- Triggers
-- ============================================================================================

create function private.touch_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger items_touch before update on public.items
  for each row execute function private.touch_updated_at();

-- An item can only point at people and trips from its own household
create function private.check_item_refs()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  m uuid;
begin
  if new.added_by is not null and not exists (
    select 1 from public.members where id = new.added_by and household_id = new.household_id
  ) then
    raise exception 'added_by is not in this household';
  end if;
  if new.claimed_by is not null and not private.in_household(new.claimed_by, new.household_id) then
    raise exception 'claimed_by is not in this household';
  end if;
  if new.trip_id is not null and not exists (
    select 1 from public.trips where id = new.trip_id and household_id = new.household_id
  ) then
    raise exception 'trip_id is not in this household';
  end if;
  foreach m in array new.requested_by loop
    if not exists (select 1 from public.members where id = m and household_id = new.household_id) then
      raise exception 'requested_by has someone from another household';
    end if;
  end loop;
  return new;
end;
$$;

create trigger items_check_refs before insert or update on public.items
  for each row execute function private.check_item_refs();

-- Same idea for trips and questions
create function private.check_trip_refs()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.in_household(new.shopper_id, new.household_id) then
    raise exception 'shopper is not in this household';
  end if;
  if new.partner_id is not null and not private.in_household(new.partner_id, new.household_id) then
    raise exception 'partner is not in this household';
  end if;
  return new;
end;
$$;

create trigger trips_check_refs before insert or update on public.trips
  for each row execute function private.check_trip_refs();

create function private.check_question_refs()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.items where id = new.item_id and household_id = new.household_id) then
    raise exception 'item is not in this household';
  end if;
  if new.trip_id is not null and not exists (
    select 1 from public.trips where id = new.trip_id and household_id = new.household_id
  ) then
    raise exception 'trip is not in this household';
  end if;
  if new.to_member is not null and not private.in_household(new.to_member, new.household_id) then
    raise exception 'to_member is not in this household';
  end if;
  return new;
end;
$$;

create trigger questions_check_refs before insert or update on public.questions
  for each row execute function private.check_question_refs();

-- Write the item's history (who did what) on every insert/update
create function private.log_item_event()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.item_events (household_id, item_id, member_id, kind, before, after)
  values (
    new.household_id,
    new.id,
    private.my_member_id(new.household_id),
    case when tg_op = 'INSERT' then 'added' else 'changed' end,
    case when tg_op = 'UPDATE' then to_jsonb(old) end,
    to_jsonb(new)
  );
  return new;
end;
$$;

create trigger items_log after insert or update on public.items
  for each row execute function private.log_item_event();

-- ============================================================================================
-- Row Level Security
-- ============================================================================================

alter table public.households enable row level security;
alter table public.members enable row level security;
alter table public.invites enable row level security;
alter table public.catalog enable row level security;
alter table public.catalog_aliases enable row level security;
alter table public.trips enable row level security;
alter table public.items enable row level security;
alter table public.questions enable row level security;
alter table public.item_events enable row level security;
alter table public.voice_jobs enable row level security;

-- Start from nothing: signed-out visitors get no table access at all,
-- signed-in people only what's granted below (and then only their household's rows).
revoke all on public.households, public.members, public.invites, public.catalog, public.catalog_aliases,
  public.trips, public.items, public.questions, public.item_events, public.voice_jobs
  from anon, authenticated;

-- households: read mine; only the manager renames
grant select on public.households to authenticated;
grant update (name) on public.households to authenticated;
create policy "members read their household" on public.households
  for select to authenticated using (id in (select private.my_household_ids()));
create policy "manager renames the household" on public.households
  for update to authenticated
  using ((select private.has_role(id, '{owner}')))
  with check ((select private.has_role(id, '{owner}')));

-- members: read everyone in my household; edit my own profile, or anyone's if I'm the manager.
-- Role and leaving/removing only through the functions below (those columns aren't granted).
grant select on public.members to authenticated;
grant update (display_name, gender, view_language, speaks, dialect, avatar_color, settings)
  on public.members to authenticated;
create policy "members read their household's members" on public.members
  for select to authenticated using (household_id in (select private.my_household_ids()));
create policy "edit own profile, or anyone's as manager" on public.members
  for update to authenticated
  using (
    left_at is null and (user_id = (select auth.uid()) or (select private.has_role(household_id, '{owner}')))
  )
  with check (
    left_at is null and (user_id = (select auth.uid()) or (select private.has_role(household_id, '{owner}')))
  );

-- invites: members (not helpers) see their household's invite links; created via create_invite()
grant select on public.invites to authenticated;
create policy "members read their invites" on public.invites
  for select to authenticated using ((select private.has_role(household_id, '{owner,member}')));

-- catalog: read-only for everyone signed in
grant select on public.catalog, public.catalog_aliases to authenticated;
create policy "catalog is readable" on public.catalog for select to authenticated using (true);
create policy "aliases are readable" on public.catalog_aliases for select to authenticated using (true);

-- items: everyone in the household reads, adds and edits. Who added it, how and where can't be changed later.
-- Deleting is only for taking back your own addition (undo); otherwise status = 'removed'.
grant select, insert, delete on public.items to authenticated;
grant update (catalog_id, name, qty, unit, category, status, note, requested_by, claimed_by, trip_id)
  on public.items to authenticated;
create policy "members read items" on public.items
  for select to authenticated using (household_id in (select private.my_household_ids()));
create policy "members add items as themselves" on public.items
  for insert to authenticated
  with check (
    household_id in (select private.my_household_ids())
    and added_by = (select private.my_member_id(household_id))
  );
create policy "members edit items" on public.items
  for update to authenticated
  using (household_id in (select private.my_household_ids()))
  with check (household_id in (select private.my_household_ids()));
create policy "take back your own addition" on public.items
  for delete to authenticated
  using (
    household_id in (select private.my_household_ids())
    and added_by = (select private.my_member_id(household_id))
  );

-- trips: everyone in the household reads; you start trips as yourself; anyone in the household can update
grant select, insert on public.trips to authenticated;
grant update (store, mode, partner_id, ended_at, handoff, amount_paid) on public.trips to authenticated;
create policy "members read trips" on public.trips
  for select to authenticated using (household_id in (select private.my_household_ids()));
create policy "start a trip as yourself" on public.trips
  for insert to authenticated
  with check (
    household_id in (select private.my_household_ids())
    and shopper_id = (select private.my_member_id(household_id))
  );
create policy "members update trips" on public.trips
  for update to authenticated
  using (household_id in (select private.my_household_ids()))
  with check (household_id in (select private.my_household_ids()));

-- questions: household reads; you ask as yourself; only the person asked can answer
grant select, insert on public.questions to authenticated;
grant update (answer, reply, answered_at) on public.questions to authenticated;
create policy "members read questions" on public.questions
  for select to authenticated using (household_id in (select private.my_household_ids()));
create policy "ask as yourself" on public.questions
  for insert to authenticated
  with check (
    household_id in (select private.my_household_ids())
    and from_member = (select private.my_member_id(household_id))
  );
create policy "the person asked answers" on public.questions
  for update to authenticated
  using (to_member = (select private.my_member_id(household_id)))
  with check (to_member = (select private.my_member_id(household_id)));

-- item_events: read-only (written by the trigger)
grant select on public.item_events to authenticated;
create policy "members read history" on public.item_events
  for select to authenticated using (household_id in (select private.my_household_ids()));

-- voice_jobs: household reads; you create and update your own
grant select, insert on public.voice_jobs to authenticated;
grant update (status, dialect, transcript, parse_result, corrections) on public.voice_jobs to authenticated;
create policy "members read voice jobs" on public.voice_jobs
  for select to authenticated using (household_id in (select private.my_household_ids()));
create policy "create your own voice jobs" on public.voice_jobs
  for insert to authenticated
  with check (
    household_id in (select private.my_household_ids())
    and member_id = (select private.my_member_id(household_id))
  );
create policy "update your own voice jobs" on public.voice_jobs
  for update to authenticated
  using (member_id = (select private.my_member_id(household_id)))
  with check (member_id = (select private.my_member_id(household_id)));

-- ============================================================================================
-- Safe doors: actions that need more checks than a table rule can express
-- ============================================================================================

-- Start a new household; I become its manager
create function public.create_household(
  household_name text,
  display_name text,
  gender text,
  dialect text default 'saudi',
  view_language text default 'ar'
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  hh uuid;
begin
  if uid is null then
    raise exception 'sign in first';
  end if;
  insert into public.households (name, created_by) values (btrim(household_name), uid) returning id into hh;
  insert into public.members (household_id, user_id, display_name, gender, role, view_language, speaks, dialect, avatar_color)
  values (hh, uid, btrim(display_name), gender, 'owner', view_language, array[view_language], dialect, 'ink');
  return hh;
end;
$$;

-- New invite link for my household (managers and members; helpers can't invite)
create function public.create_invite(hh uuid, invite_role text default 'member')
returns table (code text, expires_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O or 1/I
  new_code text;
begin
  if not private.has_role(hh, '{owner,member}') then
    raise exception 'only members of this household can invite';
  end if;
  if invite_role not in ('member', 'helper') then
    raise exception 'invalid role';
  end if;
  loop
    select string_agg(substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1), '')
      into new_code from generate_series(1, 8);
    exit when not exists (select 1 from public.invites i where i.code = new_code);
  end loop;
  return query
    insert into public.invites (household_id, code, role, created_by)
    values (hh, new_code, invite_role, private.my_member_id(hh))
    returning invites.code, invites.expires_at;
end;
$$;

-- What the join screen shows for a link — works before signing in, reveals only names and initials
create function public.get_invite(invite_code text)
returns table (
  household_name text,
  inviter_name text,
  inviter_gender text,
  member_count int,
  members jsonb,
  expired boolean
)
language sql stable security definer set search_path = ''
as $$
  select
    h.name,
    inviter.display_name,
    inviter.gender,
    (select count(*)::int from public.members m where m.household_id = h.id and m.left_at is null),
    (select coalesce(jsonb_agg(jsonb_build_object('initial', left(m.display_name, 1), 'color', m.avatar_color)
        order by m.joined_at), '[]'::jsonb)
       from public.members m where m.household_id = h.id and m.left_at is null),
    i.expires_at < now()
  from public.invites i
  join public.households h on h.id = i.household_id
  left join public.members inviter on inviter.id = i.created_by
  where i.code = upper(btrim(invite_code))
$$;

-- Join a household with an invite code
create function public.join_household(
  invite_code text,
  display_name text,
  gender text,
  dialect text default 'saudi',
  view_language text default 'ar'
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  inv public.invites;
  colors constant text[] := array['info', 'accent', 'success', 'danger', 'line'];
begin
  if uid is null then
    raise exception 'sign in first';
  end if;
  select * into inv from public.invites where code = upper(btrim(invite_code));
  if inv.id is null then
    raise exception 'invite not found';
  end if;
  if inv.expires_at < now() then
    raise exception 'invite expired';
  end if;

  insert into public.members as m (household_id, user_id, display_name, gender, role, view_language, speaks, dialect, avatar_color)
  values (
    inv.household_id, uid, btrim(display_name), gender, inv.role, view_language, array[view_language], dialect,
    colors[1 + floor(random() * array_length(colors, 1))::int]
  )
  on conflict (household_id, user_id) do update
    set left_at = null,
        display_name = excluded.display_name,
        gender = excluded.gender,
        view_language = excluded.view_language,
        dialect = excluded.dialect,
        role = case when m.role = 'owner' then 'owner' else excluded.role end;
  return inv.household_id;
end;
$$;

-- Manager changes someone's role. Making someone else manager hands it over (I become a member).
create function public.set_member_role(member uuid, new_role text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  target public.members;
begin
  select * into target from public.members where id = member and left_at is null;
  if target.id is null or not private.has_role(target.household_id, '{owner}') then
    raise exception 'only the manager can change roles';
  end if;
  if new_role not in ('owner', 'member', 'helper') then
    raise exception 'invalid role';
  end if;
  if target.user_id = (select auth.uid()) then
    raise exception 'hand over to someone else instead';
  end if;
  if new_role = 'owner' then
    update public.members set role = 'member'
      where household_id = target.household_id and user_id = (select auth.uid());
  end if;
  update public.members set role = new_role where id = member;
end;
$$;

-- Manager removes someone (restore_member undoes it)
create function public.remove_member(member uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  target public.members;
begin
  select * into target from public.members where id = member and left_at is null;
  if target.id is null or not private.has_role(target.household_id, '{owner}') then
    raise exception 'only the manager can remove people';
  end if;
  if target.user_id = (select auth.uid()) then
    raise exception 'use leave_household to leave';
  end if;
  update public.members set left_at = now() where id = member;
end;
$$;

create function public.restore_member(member uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  target public.members;
begin
  select * into target from public.members where id = member and left_at is not null;
  if target.id is null or not private.has_role(target.household_id, '{owner}') then
    raise exception 'only the manager can bring people back';
  end if;
  update public.members set left_at = null where id = member;
end;
$$;

-- Leave a household myself. The manager has to hand over first if anyone else is still there.
create function public.leave_household(hh uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me public.members;
begin
  select * into me from public.members where household_id = hh and user_id = (select auth.uid()) and left_at is null;
  if me.id is null then
    raise exception 'not in this household';
  end if;
  if me.role = 'owner' and exists (
    select 1 from public.members where household_id = hh and left_at is null and id <> me.id
  ) then
    raise exception 'hand over to someone else first';
  end if;
  update public.members set left_at = now() where id = me.id;
end;
$$;

-- Only signed-in people may use the doors (get_invite also works signed out, for the join screen)
revoke all on function public.create_household(text, text, text, text, text) from public, anon;
revoke all on function public.create_invite(uuid, text) from public, anon;
revoke all on function public.get_invite(text) from public;
revoke all on function public.join_household(text, text, text, text, text) from public, anon;
revoke all on function public.set_member_role(uuid, text) from public, anon;
revoke all on function public.remove_member(uuid) from public, anon;
revoke all on function public.restore_member(uuid) from public, anon;
revoke all on function public.leave_household(uuid) from public, anon;
grant execute on function public.create_household(text, text, text, text, text) to authenticated;
grant execute on function public.create_invite(uuid, text) to authenticated;
grant execute on function public.get_invite(text) to anon, authenticated;
grant execute on function public.join_household(text, text, text, text, text) to authenticated;
grant execute on function public.set_member_role(uuid, text) to authenticated;
grant execute on function public.remove_member(uuid) to authenticated;
grant execute on function public.restore_member(uuid) to authenticated;
grant execute on function public.leave_household(uuid) to authenticated;
