-- Fix Supabase Storage 400 error by simplifying RLS policies
-- This SQL should be run in Supabase SQL Editor

-- 1. Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can view their own images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;  
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- 2. Ensure bucket is public and RLS-free for maximum compatibility
UPDATE storage.buckets 
SET public = true
WHERE id = 'design-files';

-- 3. Create simple, permissive policies
CREATE POLICY "Allow public read access" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'design-files');

CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'design-files');

CREATE POLICY "Allow authenticated users to delete their own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'design-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Alternative: Disable RLS entirely for this bucket (most permissive)
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
-- Uncomment above line if you still get 400 errors