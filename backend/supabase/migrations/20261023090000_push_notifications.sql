-- Push notifications: each phone's Expo push address, and a record of what was already sent.
--
-- • public.push_tokens — one row per phone. Nobody reads or writes it directly (no grants); the app goes through
--   save_push_token / forget_push_token below, which only ever touch the signed-in person's own phones.
--   A phone that changes hands (sign out, someone else signs in) moves to the new person.
-- • private.push_sent — «this event was already announced», so the same notification never goes out twice.
-- The sending itself is the `notify` Edge Function (supabase/functions/notify), which reads these with the
-- service key — that key only exists inside Supabase.

create table public.push_tokens (
  token text primary key check (token ~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,200}\]$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  time_zone text not null default 'UTC' check (char_length(time_zone) between 1 and 64), -- for «وقت الهدوء»
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;
revoke all on public.push_tokens from anon, authenticated;

create table private.push_sent (
  kind text not null check (kind in ('trip_started', 'trip_done', 'question', 'answer', 'item')),
  ref uuid not null, -- the trip, question or item it was about
  sent_at timestamptz not null default now(),
  primary key (kind, ref)
);

-- This phone now belongs to me (signed in on it): save or move its address
create function public.save_push_token(push_token text, device_platform text, device_time_zone text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  insert into public.push_tokens (token, user_id, platform, time_zone, updated_at)
  values (push_token, auth.uid(), device_platform, coalesce(nullif(btrim(device_time_zone), ''), 'UTC'), now())
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, time_zone = excluded.time_zone, updated_at = now();
end;
$$;
revoke all on function public.save_push_token(text, text, text) from public;
grant execute on function public.save_push_token(text, text, text) to authenticated;

-- Signing out on this phone: stop sending my notifications to it (only my own row can go)
create function public.forget_push_token(push_token text)
returns void
language sql volatile security definer set search_path = ''
as $$
  delete from public.push_tokens where token = push_token and user_id = auth.uid();
$$;
revoke all on function public.forget_push_token(text) from public;
grant execute on function public.forget_push_token(text) to authenticated;

-- For the notify function only (service key): mark these as announced, and get back the ones that weren't yet
-- (so two calls for the same event can't both send it)
create function public.claim_push(push_kind text, refs uuid[])
returns setof uuid
language sql volatile security definer set search_path = ''
as $$
  insert into private.push_sent (kind, ref)
  select push_kind, r from unnest(refs) as r
  on conflict do nothing
  returning ref;
$$;
revoke all on function public.claim_push(text, uuid[]) from public, anon, authenticated;
grant execute on function public.claim_push(text, uuid[]) to service_role;
