-- Family photos as suggestions for the official product picture.
-- Admins can look at families' product photos (to review them) — nothing more: they still can't add, change or
-- remove a family's photos. A suggestion becomes official only when an admin approves it in the dashboard
-- (the dashboard copies the file into product-photos and calls admin_set_product_image).

create policy "admins see family photos to review them" on storage.objects
  for select to authenticated
  using (bucket_id = 'family-photos' and private.is_admin());

-- One row per family photo of a product, newest first
create function public.admin_photo_suggestions()
returns table (catalog_id text, product text, photo_path text, list_name text, updated_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
    select p.catalog_id, c.name, p.photo_path, h.name, p.updated_at
    from public.household_product_photos p
    join public.catalog c on c.id = p.catalog_id
    join public.households h on h.id = p.household_id
    where h.deleted_at is null
    order by p.updated_at desc;
end;
$$;
revoke all on function public.admin_photo_suggestions() from public, anon;
grant execute on function public.admin_photo_suggestions() to authenticated;
