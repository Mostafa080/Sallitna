-- Product list managed from the admin dashboard. App users can only read products (as before);
-- admins change them through the doors below, each of which checks private.is_admin() first.
-- Removing a product hides it (search skips it), so items already on lists keep their link.

alter table public.catalog
  add column hidden boolean not null default false,
  add column updated_at timestamptz not null default now();

-- Add or edit a product. p = {id?, name, category, default_qty, default_unit, en, hi, alternative_id?}
-- A new product gets an id like «p_8f3k2a». Returns the id.
create function public.admin_save_product(p jsonb)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  product_id text := nullif(btrim(p ->> 'id'), '');
  alias_count int;
begin
  perform private.require_admin();
  if nullif(btrim(p ->> 'name'), '') is null then
    raise exception 'the product needs a name';
  end if;
  if product_id is null then
    product_id := 'p_' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);
  end if;
  insert into public.catalog as c (id, name, category, default_qty, default_unit, translations, alternative_id, updated_at)
  values (
    product_id,
    btrim(p ->> 'name'),
    coalesce(p ->> 'category', 'other'),
    coalesce((p ->> 'default_qty')::numeric, 1),
    coalesce(p ->> 'default_unit', 'count'),
    jsonb_strip_nulls(jsonb_build_object('en', nullif(btrim(p ->> 'en'), ''), 'hi', nullif(btrim(p ->> 'hi'), ''))),
    nullif(p ->> 'alternative_id', ''),
    now()
  )
  on conflict (id) do update set
    name = excluded.name,
    category = excluded.category,
    default_qty = excluded.default_qty,
    default_unit = excluded.default_unit,
    translations = excluded.translations,
    alternative_id = excluded.alternative_id,
    updated_at = now();
  return product_id;
exception
  when unique_violation then
    raise exception 'there is already a product with this name';
end;
$$;

-- Hide (or bring back) a product
create function public.admin_set_product_hidden(product_id text, hidden boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.require_admin();
  update public.catalog set hidden = admin_set_product_hidden.hidden, updated_at = now() where id = product_id;
end;
$$;

-- Dialect words: dialect null = everyone; otherwise only people who speak that dialect match it
create function public.admin_add_alias(product_id text, alias text, dialect text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.require_admin();
  if nullif(btrim(alias), '') is null then
    raise exception 'the word is empty';
  end if;
  insert into public.catalog_aliases (catalog_id, alias, dialect)
  values (product_id, btrim(alias), nullif(dialect, ''))
  on conflict do nothing;
  update public.catalog set updated_at = now() where id = product_id;
end;
$$;

create function public.admin_remove_alias(alias_id bigint)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.require_admin();
  update public.catalog set updated_at = now()
    where id = (select catalog_id from public.catalog_aliases where id = alias_id);
  delete from public.catalog_aliases where id = alias_id;
end;
$$;

revoke all on function public.admin_save_product(jsonb) from public, anon;
revoke all on function public.admin_set_product_hidden(text, boolean) from public, anon;
revoke all on function public.admin_add_alias(text, text, text) from public, anon;
revoke all on function public.admin_remove_alias(bigint) from public, anon;
grant execute on function public.admin_save_product(jsonb) to authenticated;
grant execute on function public.admin_set_product_hidden(text, boolean) to authenticated;
grant execute on function public.admin_add_alias(text, text, text) to authenticated;
grant execute on function public.admin_remove_alias(bigint) to authenticated;
