-- ============================================================
--  Run this in Supabase SQL Editor
--  Creates the EA files storage bucket + policies
-- ============================================================

-- Create private bucket for EA files
insert into storage.buckets (id, name, public)
values ('ea-files', 'ea-files', false)
on conflict (id) do nothing;

-- Admins/sellers can upload
create policy "Authenticated users can upload EA files"
  on storage.objects for insert
  with check (
    bucket_id = 'ea-files'
    and auth.role() = 'authenticated'
  );

-- Only buyers (or owners) can download
create policy "Buyers can download EA files"
  on storage.objects for select
  using (
    bucket_id = 'ea-files'
    and auth.role() = 'authenticated'
  );

-- Owners can delete their files
create policy "Owners can delete EA files"
  on storage.objects for delete
  using (
    bucket_id = 'ea-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Add file_path column to bots table
alter table public.bots
  add column if not exists file_path text default '';
