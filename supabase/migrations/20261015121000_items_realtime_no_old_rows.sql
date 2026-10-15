-- Realtime sends DELETE events without checking Row Level Security. With "replica identity full"
-- that event carried the whole deleted row (e.g. the item's name) to anyone listening on that
-- household's channel. Back to the default: a delete event only carries the item's id.
-- The app also stopped deleting items (undo marks them 'removed'), so normally there are no delete events.

alter table public.items replica identity default;
