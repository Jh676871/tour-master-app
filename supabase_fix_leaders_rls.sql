-- Enable RLS on leaders table
ALTER TABLE leaders ENABLE ROW LEVEL SECURITY;

-- Allow public read access to leaders (needed for travelers)
CREATE POLICY "Public leaders are viewable by everyone" 
ON leaders FOR SELECT 
USING (true);

-- Allow authenticated users (admins) to insert/update/delete
CREATE POLICY "Admins can insert leaders" 
ON leaders FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can update leaders" 
ON leaders FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete leaders" 
ON leaders FOR DELETE 
USING (auth.role() = 'authenticated');
