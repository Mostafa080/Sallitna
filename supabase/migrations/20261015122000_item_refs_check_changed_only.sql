-- Fix: deleting someone's account failed when they had added items. Deleting a member sets
-- items.added_by to null automatically; that update re-ran the household check on requested_by,
-- which still held the departing member's id, and was rejected.
-- Now on UPDATE we only check the people/trip fields that actually changed (on INSERT: all of them).

create or replace function private.check_item_refs()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  m uuid;
  is_insert boolean := tg_op = 'INSERT';
begin
  if new.added_by is not null and (is_insert or new.added_by is distinct from old.added_by) and not exists (
    select 1 from public.members where id = new.added_by and household_id = new.household_id
  ) then
    raise exception 'added_by is not in this household';
  end if;
  if new.claimed_by is not null and (is_insert or new.claimed_by is distinct from old.claimed_by)
     and not private.in_household(new.claimed_by, new.household_id) then
    raise exception 'claimed_by is not in this household';
  end if;
  if new.trip_id is not null and (is_insert or new.trip_id is distinct from old.trip_id) and not exists (
    select 1 from public.trips where id = new.trip_id and household_id = new.household_id
  ) then
    raise exception 'trip_id is not in this household';
  end if;
  if is_insert or new.requested_by is distinct from old.requested_by then
    foreach m in array new.requested_by loop
      -- People already on the list before this change may have left since; only new names are checked
      if (is_insert or not (m = any (old.requested_by)))
         and not exists (select 1 from public.members where id = m and household_id = new.household_id) then
        raise exception 'requested_by has someone from another household';
      end if;
    end loop;
  end if;
  return new;
end;
$$;
