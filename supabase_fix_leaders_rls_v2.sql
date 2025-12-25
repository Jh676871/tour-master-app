-- DROP existing restrictive policies
DROP POLICY IF EXISTS "Admins can insert leaders" ON leaders;
DROP POLICY IF EXISTS "Admins can update leaders" ON leaders;
DROP POLICY IF EXISTS "Admins can delete leaders" ON leaders;

-- Create PERMISSIVE policies (Allow everyone including anon users to edit)
-- This fixes the "new row violates row-level security policy" error for unauthenticated users
CREATE POLICY "Enable insert for all users" 
ON leaders FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Enable update for all users" 
ON leaders FOR UPDATE 
USING (true);

CREATE POLICY "Enable delete for all users" 
ON leaders FOR DELETE 
USING (true);
