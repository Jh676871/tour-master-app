-- Migration to add image_url to hotels table and setup storage
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Instructions for Supabase Dashboard:
-- 1. Go to Storage
-- 2. Create a new bucket named 'hotel-images'
-- 3. Set it to Public
-- 4. Add a policy to allow authenticated users to upload and delete files
-- 5. Add a policy to allow everyone to select/read files
