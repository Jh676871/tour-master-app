-- Add leader contact info columns to groups table
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS leader_photo TEXT,
ADD COLUMN IF NOT EXISTS leader_ename TEXT,
ADD COLUMN IF NOT EXISTS leader_line_id TEXT;

-- Update the comment or description if needed (optional)
COMMENT ON COLUMN groups.leader_photo IS 'URL to leader profile photo';
COMMENT ON COLUMN groups.leader_ename IS 'English name of the leader';
COMMENT ON COLUMN groups.leader_line_id IS 'LINE ID of the leader';
