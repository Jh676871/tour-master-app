-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add flight info to groups
ALTER TABLE groups ADD COLUMN IF NOT EXISTS flight_number TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS departure_date TIMESTAMP WITH TIME ZONE;

-- Add luggage and boarding pass info to travelers
ALTER TABLE travelers ADD COLUMN IF NOT EXISTS luggage_count INTEGER DEFAULT 0;
ALTER TABLE travelers ADD COLUMN IF NOT EXISTS boarding_pass_url TEXT;

-- Create immigration templates table
CREATE TABLE IF NOT EXISTS immigration_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_name TEXT NOT NULL,
  template_image_url TEXT,
  instruction_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for immigration_templates
ALTER TABLE immigration_templates ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone (or authenticated users)
CREATE POLICY "Allow public read access" ON immigration_templates FOR SELECT USING (true);
-- Allow write access only to authenticated users (leaders) - assuming authenticated users are leaders for now
CREATE POLICY "Allow authenticated insert" ON immigration_templates FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON immigration_templates FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON immigration_templates FOR DELETE USING (auth.role() = 'authenticated');


-- Storage Bucket Setup for 'boarding-passes'
-- Note: This might require superuser privileges. If it fails, create the bucket manually in Supabase Dashboard.
INSERT INTO storage.buckets (id, name, public)
VALUES ('boarding-passes', 'boarding-passes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'boarding-passes'
-- Allow public read
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'boarding-passes');
-- Allow authenticated upload
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'boarding-passes' AND auth.role() = 'authenticated');
-- Allow authenticated update/delete
CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE USING (bucket_id = 'boarding-passes' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE USING (bucket_id = 'boarding-passes' AND auth.role() = 'authenticated');
