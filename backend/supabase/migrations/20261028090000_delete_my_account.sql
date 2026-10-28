-- «احذف حسابي»: anyone can delete their own account from the app (App Store / Google Play rule).
-- For each list they're in:
-- • no other family member (alone, or only helpers left) → the list is deleted, like «امسح القائمة»;
-- • they manage it and others are there → the longest-standing family member becomes the manager;
-- • otherwise they just leave.
-- Then the sign-in account itself is deleted: that removes their member rows, phones (push_tokens) and admin
-- access. Items and questions they added stay on the lists, without their name (as when an admin deletes a user).

create function public.delete_my_account()
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  m public.members;
  heir uuid;
begin
  if me is null then
    raise exception 'not signed in';
  end if;

  for m in select * from public.members where user_id = me and left_at is null loop
    select o.id into heir
    from public.members o
    where o.household_id = m.household_id and o.left_at is null and o.user_id <> me and o.role <> 'helper'
    order by o.joined_at
    limit 1;

    if heir is null then
      update public.households set deleted_at = now() where id = m.household_id and deleted_at is null;
      update public.trips set ended_at = now() where household_id = m.household_id and ended_at is null;
      update public.invites set expires_at = now() where household_id = m.household_id and expires_at > now();
      update public.members set left_at = now() where household_id = m.household_id and left_at is null;
    elsif m.role = 'owner' then
      update public.members set left_at = now() where id = m.id; -- one manager at a time
      update public.members set role = 'owner' where id = heir;
    end if;
  end loop;

  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
