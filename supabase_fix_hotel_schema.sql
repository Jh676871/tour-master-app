-- Fix missing column in hotels table
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS nearby_medical TEXT;

-- Verify other security module columns just in case
ALTER TABLE spots ADD COLUMN IF NOT EXISTS nearby_medical TEXT;
