-- Add flight_number, departure_time, and destination_country columns to groups table
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS flight_number TEXT,
ADD COLUMN IF NOT EXISTS departure_time TEXT,
ADD COLUMN IF NOT EXISTS destination_country TEXT DEFAULT 'Japan';

-- Add comment to describe the columns
COMMENT ON COLUMN groups.flight_number IS '航班編號 (e.g., BR132)';
COMMENT ON COLUMN groups.departure_time IS '起飛時間 (e.g., 08:30)';
COMMENT ON COLUMN groups.destination_country IS '旅遊國家 (e.g., Japan, Korea)';
