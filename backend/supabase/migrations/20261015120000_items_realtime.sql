-- Live list: send item changes to the app through Supabase Realtime.
-- Realtime checks the same Row Level Security as normal reads, so each person only
-- receives changes for households they're in.

alter publication supabase_realtime add table public.items;

-- (Was: replica identity full — undone in 20261015121000, it leaked deleted rows to listeners.)
alter table public.items replica identity full;
