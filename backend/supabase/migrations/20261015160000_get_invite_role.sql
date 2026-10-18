-- The join screen needs to know if a code invites a helper (driver / maid), so it can speak their language.
-- Same as before plus `role`; the return type changes, so the function is recreated.

drop function public.get_invite(text);

create function public.get_invite(invite_code text)
returns table (
  household_name text,
  inviter_name text,
  inviter_gender text,
  member_count int,
  members jsonb,
  expired boolean,
  role text
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
    i.expires_at < now(),
    i.role
  from public.invites i
  join public.households h on h.id = i.household_id
  left join public.members inviter on inviter.id = i.created_by
  where i.code = upper(btrim(invite_code)) and h.deleted_at is null
$$;

revoke all on function public.get_invite(text) from public;
grant execute on function public.get_invite(text) to anon, authenticated;
