-- Fix: removing an official product picture left the file behind. Storage only deletes files the person can
-- also see in the file list, and admins had no "see" rule for product pictures. (Everyone still opens the
-- pictures through their public address; this only lets admins list and delete the files.)
create policy "admins see product photo files" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-photos' and private.is_admin());
