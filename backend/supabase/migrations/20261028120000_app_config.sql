-- «حدّث التطبيق»: one row of app-wide settings everyone can read (even signed out, since it's checked at launch).
-- min_version: phones on an older app version see a full-screen «update» message with a link to the store.
-- Change it in the SQL Editor only when an old version must stop working (e.g. after a breaking change):
--   update public.app_config set min_version = '1.2.0';
-- The store links are filled in once the app is published.

create table public.app_config (
  id boolean primary key default true check (id), -- exactly one row
  min_version text not null default '1.0.0' check (min_version ~ '^\d+\.\d+\.\d+$'),
  ios_store_url text check (ios_store_url is null or ios_store_url ~ '^https://'),
  android_store_url text check (android_store_url is null or android_store_url ~ '^https://'),
  updated_at timestamptz not null default now()
);
insert into public.app_config default values;

alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;
grant select on public.app_config to anon, authenticated;
create policy "anyone can read the app settings" on public.app_config for select to anon, authenticated using (true);
