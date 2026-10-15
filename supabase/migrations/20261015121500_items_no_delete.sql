-- Items are never deleted from the app anymore (undo marks them 'removed'), and a delete would send
-- a realtime event to every listener on that household's channel without an RLS check.
-- So nobody signed in can delete items at all. (Whole households are still removed by cascade.)

drop policy if exists "take back your own addition" on public.items;
revoke delete on public.items from authenticated;
