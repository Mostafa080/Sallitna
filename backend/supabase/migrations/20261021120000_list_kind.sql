-- Who a list is for — «القائمة دي لمين؟»: family, friends, work or other. The app uses it for its wording:
-- «بلّغ العيلة» / «بلّغ صحابك» / «بلّغ زمايلك» / «بلّغ الكل». Lists made before this are family lists.

alter table public.households
  add column kind text not null default 'family' check (kind in ('family', 'friends', 'work', 'other'));

-- Only the manager changes it (the same rule as renaming: "manager renames the household")
grant update (kind) on public.households to authenticated;

-- Creating a list now also takes its kind (family when left out)
drop function public.create_household(text, text, text, text, text);
create function public.create_household(
  household_name text,
  display_name text,
  gender text,
  dialect text default 'saudi',
  view_language text default 'ar',
  kind text default 'family'
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
  insert into public.households (name, kind, created_by)
    values (btrim(household_name), coalesce(create_household.kind, 'family'), uid) returning id into hh;
  insert into public.members (household_id, user_id, display_name, gender, role, view_language, speaks, dialect, avatar_color)
  values (hh, uid, btrim(display_name), gender, 'owner', view_language, array[view_language], dialect, 'ink');
  return hh;
end;
$$;
revoke all on function public.create_household(text, text, text, text, text, text) from public, anon;
grant execute on function public.create_household(text, text, text, text, text, text) to authenticated;
