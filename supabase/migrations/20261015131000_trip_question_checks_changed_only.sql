-- Fix: deleting an account that had shopped or asked a question failed. Deleting a member removes
-- their trips and clears them from questions; those automatic updates re-ran the household checks on
-- fields that hadn't changed (e.g. a trip that was being deleted at the same moment) and were rejected.
-- Like items (20261015122000): on UPDATE only the fields that actually changed are checked.

create or replace function private.check_trip_refs()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  is_insert boolean := tg_op = 'INSERT';
begin
  if (is_insert or new.shopper_id is distinct from old.shopper_id)
     and not private.in_household(new.shopper_id, new.household_id) then
    raise exception 'shopper is not in this household';
  end if;
  if new.partner_id is not null and (is_insert or new.partner_id is distinct from old.partner_id)
     and not private.in_household(new.partner_id, new.household_id) then
    raise exception 'partner is not in this household';
  end if;
  return new;
end;
$$;

create or replace function private.check_question_refs()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  is_insert boolean := tg_op = 'INSERT';
begin
  if (is_insert or new.item_id is distinct from old.item_id)
     and not exists (select 1 from public.items where id = new.item_id and household_id = new.household_id) then
    raise exception 'item is not in this household';
  end if;
  if new.trip_id is not null and (is_insert or new.trip_id is distinct from old.trip_id) and not exists (
    select 1 from public.trips where id = new.trip_id and household_id = new.household_id
  ) then
    raise exception 'trip is not in this household';
  end if;
  if new.to_member is not null and (is_insert or new.to_member is distinct from old.to_member)
     and not private.in_household(new.to_member, new.household_id) then
    raise exception 'to_member is not in this household';
  end if;
  return new;
end;
$$;
