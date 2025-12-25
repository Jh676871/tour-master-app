-- Create leaders table
CREATE TABLE IF NOT EXISTS leaders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  ename TEXT,
  phone TEXT,
  line_id TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add leader_id to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES leaders(id);

-- Optional: Create index for performance
CREATE INDEX IF NOT EXISTS idx_groups_leader_id ON groups(leader_id);
