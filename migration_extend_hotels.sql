-- Migration to add more fields to hotels table
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS google_map_url TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS breakfast_info TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS gym_pool_info TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS guide_notes TEXT;
