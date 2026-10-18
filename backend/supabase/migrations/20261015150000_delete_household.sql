-- «امسح القائمة»: the manager deletes a list for everyone.
-- Soft delete (nothing is erased, so realtime never broadcasts deleted rows): the list is marked deleted,
-- everyone in it is moved out (row level security then hides it from all of them), running trips end and
-- invite codes stop working. Deleted lists can't be joined or have people brought back.

alter table public.households add column deleted_at timestamptz;

create function public.delete_household(hh uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_role(hh, '{owner}') then
    raise exception 'only the manager can delete this list';
  end if;
  update public.households set deleted_at = now() where id = hh and deleted_at is null;
  update public.trips set ended_at = now() where household_id = hh and ended_at is null;
  update public.invites set expires_at = now() where household_id = hh and expires_at > now();
  update public.members set left_at = now() where household_id = hh and left_at is null;
end;
$$;

revoke all on function public.delete_household(uuid) from public, anon;
grant execute on function public.delete_household(uuid) to authenticated;

-- Invite links of a deleted list show nothing
create or replace function public.get_invite(invite_code text)
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
  where i.code = upper(btrim(invite_code)) and h.deleted_at is null
$$;

-- Joining a deleted list is refused (as if the code didn't exist)
create or replace function public.join_household(
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
  select i.* into inv from public.invites i
    join public.households h on h.id = i.household_id
    where i.code = upper(btrim(invite_code)) and h.deleted_at is null;
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
