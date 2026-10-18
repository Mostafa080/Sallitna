-- Admin dashboard: a private admin list and admin-only "doors" for the dashboard website.
-- The dashboard uses the same public key as the app; every function below first checks that the caller is
-- an admin (private.is_admin), so a normal signed-in user gets an error. Nothing here is reachable signed out.

create table private.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_by uuid references auth.users (id) on delete set null,
  added_at timestamptz not null default now()
);

create function private.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from private.admins where user_id = (select auth.uid()))
$$;

create function private.require_admin()
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'admins only';
  end if;
end;
$$;

-- "+20 10•• ••• 0001": enough to recognise a number, not enough to copy it
create function private.mask_phone(phone text)
returns text
language sql immutable set search_path = ''
as $$
  select case
    when phone is null or length(phone) < 6 then phone
    else '+' || left(phone, 4) || repeat('•', greatest(length(phone) - 8, 0)) || right(phone, 4)
  end
$$;

-- Am I an admin? (the dashboard asks after sign-in)
create function public.admin_me()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_admin()
$$;

-- The numbers on the overview page
create function public.admin_overview()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.require_admin();
  return jsonb_build_object(
    'users_total', (select count(*) from auth.users),
    'users_today', (select count(*) from auth.users where created_at >= date_trunc('day', now())),
    'users_week', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    'users_month', (select count(*) from auth.users where created_at >= now() - interval '30 days'),
    'users_blocked', (select count(*) from auth.users where banned_until > now()),
    'active_week', (select count(*) from auth.users where last_sign_in_at >= now() - interval '7 days'),
    'lists_active', (select count(*) from public.households where deleted_at is null),
    'lists_with_helper', (select count(distinct m.household_id) from public.members m
        join public.households h on h.id = m.household_id
        where m.role = 'helper' and m.left_at is null and h.deleted_at is null),
    'helpers', (select count(distinct user_id) from public.members where role = 'helper' and left_at is null),
    'items_today', (select count(*) from public.items where created_at >= date_trunc('day', now())),
    'items_week', (select count(*) from public.items where created_at >= now() - interval '7 days'),
    'trips_week', (select count(*) from public.trips where started_at >= now() - interval '7 days'),
    'spent_week', (select coalesce(sum(amount_paid), 0) from public.trips where started_at >= now() - interval '7 days'),
    -- New sign-ups per day for the last 14 days (oldest first)
    'signups_by_day', (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'count', (
          select count(*) from auth.users u where u.created_at >= d and u.created_at < d + interval '1 day'
        )) order by d), '[]'::jsonb)
        from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d),
    'top_items', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'count', n) order by n desc), '[]'::jsonb)
        from (select name, count(*) n from public.items where status <> 'removed'
              group by name order by count(*) desc limit 10) t)
  );
end;
$$;

-- Everyone who signed up, newest first, with their lists
create function public.admin_users()
returns table (
  id uuid,
  phone text,
  name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  blocked boolean,
  is_admin boolean,
  lists jsonb,
  items_added bigint
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
    select
      u.id,
      private.mask_phone(u.phone),
      (select m.display_name from public.members m where m.user_id = u.id order by m.joined_at desc limit 1),
      u.created_at,
      u.last_sign_in_at,
      coalesce(u.banned_until > now(), false),
      exists (select 1 from private.admins a where a.user_id = u.id),
      (select coalesce(jsonb_agg(jsonb_build_object('name', h.name, 'role', m.role) order by m.joined_at), '[]'::jsonb)
         from public.members m join public.households h on h.id = m.household_id
         where m.user_id = u.id and m.left_at is null and h.deleted_at is null),
      (select count(*) from public.items i join public.members m on m.id = i.added_by where m.user_id = u.id)
    from auth.users u
    order by u.created_at desc;
end;
$$;

-- Block (can't sign in; signed out everywhere) or unblock someone
create function public.admin_set_blocked(target uuid, blocked boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.require_admin();
  if target = (select auth.uid()) then
    raise exception 'you can''t block yourself';
  end if;
  update auth.users set banned_until = case when blocked then 'infinity'::timestamptz else null end where id = target;
  if blocked then
    delete from auth.sessions where user_id = target;
  end if;
end;
$$;

-- Delete an account for good, with the lists nobody else is in (their items in shared lists stay)
create function public.admin_delete_user(target uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.require_admin();
  if target = (select auth.uid()) then
    raise exception 'you can''t delete yourself';
  end if;
  delete from public.households h
  where h.id in (select household_id from public.members where user_id = target)
    and not exists (select 1 from public.members o where o.household_id = h.id and o.user_id <> target and o.left_at is null);
  delete from auth.users where id = target;
end;
$$;

-- The admin team
create function public.admin_list_admins()
returns table (user_id uuid, phone text, name text, added_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
    select a.user_id, private.mask_phone(u.phone),
      (select m.display_name from public.members m where m.user_id = a.user_id order by m.joined_at desc limit 1),
      a.added_at
    from private.admins a join auth.users u on u.id = a.user_id
    order by a.added_at;
end;
$$;

-- Add an admin by phone (digits with country code, e.g. 201012345678); they must have signed in to the app once
create function public.admin_add_admin(phone text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  target uuid;
begin
  perform private.require_admin();
  select id into target from auth.users u where u.phone = regexp_replace(admin_add_admin.phone, '\D', '', 'g');
  if target is null then
    raise exception 'no account with this number — they need to sign in to the app once first';
  end if;
  insert into private.admins (user_id, added_by) values (target, (select auth.uid())) on conflict do nothing;
end;
$$;

create function public.admin_remove_admin(target uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.require_admin();
  if target = (select auth.uid()) then
    raise exception 'you can''t remove yourself';
  end if;
  delete from private.admins where user_id = target;
end;
$$;

-- Signed-in people may call the doors (each one checks for an admin); signed-out visitors can't
revoke all on function public.admin_me() from public, anon;
revoke all on function public.admin_overview() from public, anon;
revoke all on function public.admin_users() from public, anon;
revoke all on function public.admin_set_blocked(uuid, boolean) from public, anon;
revoke all on function public.admin_delete_user(uuid) from public, anon;
revoke all on function public.admin_list_admins() from public, anon;
revoke all on function public.admin_add_admin(text) from public, anon;
revoke all on function public.admin_remove_admin(uuid) from public, anon;
grant execute on function public.admin_me() to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_users() to authenticated;
grant execute on function public.admin_set_blocked(uuid, boolean) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
grant execute on function public.admin_list_admins() to authenticated;
grant execute on function public.admin_add_admin(text) to authenticated;
grant execute on function public.admin_remove_admin(uuid) to authenticated;

-- First admin: the main test account (+20 1000000001). Add your real number later from the dashboard.
insert into private.admins (user_id) select id from auth.users where phone = '201000000001' on conflict do nothing;
