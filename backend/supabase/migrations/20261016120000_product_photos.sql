-- Photos of what to buy («صوّرها عشان ما يغلط»).
--
-- Two places for pictures:
--   family-photos  (private) — a family's own photos. Files live under "<household id>/…" and only that
--                  household's members can see, add, replace or remove them.
--   product-photos (public)  — the official product pictures set by admins in the dashboard.
--
-- A family photo of a known product becomes that family's picture for the product
-- (public.household_product_photos), so the next «طماطم» they add shows it too. Other families never see it.
-- What a list row shows: the item's own photo → my family's photo of the product → the official picture.

-- --- Places for the files ----------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('family-photos', 'family-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('product-photos', 'product-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

-- Family photos: the first folder of the path is the household id; only its members get in
create policy "members read family photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'family-photos'
    and (storage.foldername(name))[1] in (select h::text from private.my_household_ids() as h)
  );
create policy "members add family photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'family-photos'
    and (storage.foldername(name))[1] in (select h::text from private.my_household_ids() as h)
  );
create policy "members replace family photos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'family-photos'
    and (storage.foldername(name))[1] in (select h::text from private.my_household_ids() as h)
  )
  with check (
    bucket_id = 'family-photos'
    and (storage.foldername(name))[1] in (select h::text from private.my_household_ids() as h)
  );
create policy "members remove family photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'family-photos'
    and (storage.foldername(name))[1] in (select h::text from private.my_household_ids() as h)
  );

-- Official product pictures: anyone can look (public bucket); only admins add, replace or remove
grant execute on function private.is_admin() to authenticated;
create policy "admins add product photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-photos' and private.is_admin());
create policy "admins replace product photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-photos' and private.is_admin())
  with check (bucket_id = 'product-photos' and private.is_admin());
create policy "admins remove product photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-photos' and private.is_admin());
-- (listing the folder isn't needed: the app builds each picture's address itself)

-- --- Official picture on a product ---------------------------------------------------------------

alter table public.catalog add column image_path text check (char_length(image_path) <= 300);

create function public.admin_set_product_image(product_id text, image_path text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.require_admin();
  update public.catalog
    set image_path = nullif(btrim(admin_set_product_image.image_path), ''), updated_at = now()
    where id = product_id;
end;
$$;
revoke all on function public.admin_set_product_image(text, text) from public, anon;
grant execute on function public.admin_set_product_image(text, text) to authenticated;

-- --- A photo on one item -------------------------------------------------------------------------

-- Must be a file in this household's own folder (no pointing at another family's photo)
alter table public.items
  add column photo_path text check (char_length(photo_path) <= 300),
  add constraint items_photo_in_own_folder check (photo_path is null or photo_path like household_id::text || '/%');
grant update (photo_path) on public.items to authenticated;

-- --- A family's own picture of a product ---------------------------------------------------------

create table public.household_product_photos (
  household_id uuid not null references public.households (id) on delete cascade,
  catalog_id text not null references public.catalog (id) on delete cascade,
  photo_path text not null check (char_length(photo_path) <= 300),
  updated_by uuid references public.members (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (household_id, catalog_id),
  constraint household_photo_in_own_folder check (photo_path like household_id::text || '/%')
);
alter table public.household_product_photos enable row level security;

grant select, insert, update, delete on public.household_product_photos to authenticated;
create policy "members read their product photos" on public.household_product_photos
  for select to authenticated using (household_id in (select private.my_household_ids()));
create policy "members set their product photos" on public.household_product_photos
  for insert to authenticated
  with check (
    household_id in (select private.my_household_ids())
    and updated_by = (select private.my_member_id(household_id))
  );
create policy "members change their product photos" on public.household_product_photos
  for update to authenticated
  using (household_id in (select private.my_household_ids()))
  with check (
    household_id in (select private.my_household_ids())
    and updated_by = (select private.my_member_id(household_id))
  );
create policy "members remove their product photos" on public.household_product_photos
  for delete to authenticated using (household_id in (select private.my_household_ids()));
