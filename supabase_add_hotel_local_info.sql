-- Add local_name and local_address to hotels table
ALTER TABLE hotels
ADD COLUMN IF NOT EXISTS local_name TEXT,
ADD COLUMN IF NOT EXISTS local_address TEXT;

COMMENT ON COLUMN hotels.local_name IS '飯店當地語言名稱 (e.g. Japanese Name)';
COMMENT ON COLUMN hotels.local_address IS '飯店當地語言地址 (e.g. Japanese Address)';
