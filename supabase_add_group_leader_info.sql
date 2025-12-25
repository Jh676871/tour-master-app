-- Add leader_name and leader_phone to groups table
ALTER TABLE groups
ADD COLUMN IF NOT EXISTS leader_name TEXT,
ADD COLUMN IF NOT EXISTS leader_phone TEXT;

COMMENT ON COLUMN groups.leader_name IS '領隊姓名';
COMMENT ON COLUMN groups.leader_phone IS '領隊電話';
