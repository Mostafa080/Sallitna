-- Dashboard fixes: «today» and the 14-day chart count in Egypt time (not UTC); easier-to-read hidden phones.

-- "+20 10•• ••• 0001": enough to recognise a number, not enough to copy it
create or replace function private.mask_phone(phone text)
returns text
language sql immutable set search_path = ''
as $$
  select case
    when phone is null or length(phone) < 6 then phone
    -- country code, the next 2 digits, dots, the last 4: «+20 10•• ••• 0001»
    else '+' || left(phone, 2) || ' ' || substr(phone, 3, 2) || '•• ••• ' || right(phone, 4)
  end
$$;

-- The numbers on the overview page
create or replace function public.admin_overview()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.require_admin();
  return jsonb_build_object(
    'users_total', (select count(*) from auth.users),
    'users_today', (select count(*) from auth.users where created_at >= (date_trunc('day', now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo')),
    'users_week', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    'users_month', (select count(*) from auth.users where created_at >= now() - interval '30 days'),
    'users_blocked', (select count(*) from auth.users where banned_until > now()),
    'active_week', (select count(*) from auth.users where last_sign_in_at >= now() - interval '7 days'),
    'lists_active', (select count(*) from public.households where deleted_at is null),
    'lists_with_helper', (select count(distinct m.household_id) from public.members m
        join public.households h on h.id = m.household_id
        where m.role = 'helper' and m.left_at is null and h.deleted_at is null),
    'helpers', (select count(distinct user_id) from public.members where role = 'helper' and left_at is null),
    'items_today', (select count(*) from public.items where created_at >= (date_trunc('day', now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo')),
    'items_week', (select count(*) from public.items where created_at >= now() - interval '7 days'),
    'trips_week', (select count(*) from public.trips where started_at >= now() - interval '7 days'),
    'spent_week', (select coalesce(sum(amount_paid), 0) from public.trips where started_at >= now() - interval '7 days'),
    -- New sign-ups per day for the last 14 days (oldest first)
    'signups_by_day', (select coalesce(jsonb_agg(jsonb_build_object('day', (d at time zone 'Africa/Cairo')::date, 'count', (
          select count(*) from auth.users u where u.created_at >= d and u.created_at < d + interval '1 day'
        )) order by d), '[]'::jsonb)
        from generate_series((date_trunc('day', now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo') - interval '13 days', (date_trunc('day', now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo'), interval '1 day') d),
    'top_items', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'count', n) order by n desc), '[]'::jsonb)
        from (select name, count(*) n from public.items where status <> 'removed'
              group by name order by count(*) desc limit 10) t)
  );
end;
$$;
