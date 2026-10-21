-- Sign-in moves from phone to email (codes are emailed through Resend; phone sign-in is switched off).
-- The dashboard shows each person's email, partly hidden, and admins are added by email.
-- Accounts made with a phone before the switch still show their (hidden) number.

-- "mo•••@gmail.com": enough to recognise someone, not enough to copy the address
create function private.mask_email(email text)
returns text
language sql immutable set search_path = ''
as $$
  select case
    when email is null or position('@' in email) < 2 then email
    else left(split_part(email, '@', 1), 2) || '•••@' || split_part(email, '@', 2)
  end
$$;

-- How the dashboard shows someone: hidden email, or hidden phone for older accounts
create function private.mask_contact(email text, phone text)
returns text
language sql immutable set search_path = ''
as $$
  select coalesce(private.mask_email(nullif(email, '')), private.mask_phone(nullif(phone, '')))
$$;

-- Everyone who signed up, newest first, with their lists («contact» replaces «phone»)
drop function public.admin_users();
create function public.admin_users()
returns table (
  id uuid,
  contact text,
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
      private.mask_contact(u.email, u.phone),
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

-- The admin team
drop function public.admin_list_admins();
create function public.admin_list_admins()
returns table (user_id uuid, contact text, name text, added_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
    select a.user_id, private.mask_contact(u.email, u.phone),
      (select m.display_name from public.members m where m.user_id = a.user_id order by m.joined_at desc limit 1),
      a.added_at
    from private.admins a join auth.users u on u.id = a.user_id
    order by a.added_at;
end;
$$;

-- Add an admin by email (any capitals or spaces); they must have signed in to the app once
drop function public.admin_add_admin(text);
create function public.admin_add_admin(email text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  target uuid;
begin
  perform private.require_admin();
  select id into target from auth.users u where lower(u.email) = lower(btrim(admin_add_admin.email));
  if target is null then
    raise exception 'no account with this email — they need to sign in to the app once first';
  end if;
  insert into private.admins (user_id, added_by) values (target, (select auth.uid())) on conflict do nothing;
end;
$$;

revoke all on function public.admin_users() from public, anon;
revoke all on function public.admin_list_admins() from public, anon;
revoke all on function public.admin_add_admin(text) from public, anon;
grant execute on function public.admin_users() to authenticated;
grant execute on function public.admin_list_admins() to authenticated;
grant execute on function public.admin_add_admin(text) to authenticated;
