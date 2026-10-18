-- Live trips and questions: «سارة في السوق» and «خالد يسألك عن هيل» reach the others instantly.
-- Same rule as items: Realtime checks Row Level Security, and these tables can't be deleted from
-- (no delete grant), so no unchecked delete events go out.

alter publication supabase_realtime add table public.trips;
alter publication supabase_realtime add table public.questions;
