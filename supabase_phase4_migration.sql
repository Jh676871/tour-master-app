
-- 1. 建立景點資料表
CREATE TABLE IF NOT EXISTS spots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    description TEXT,
    image_url TEXT,
    google_map_url TEXT,
    category TEXT DEFAULT '景點',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 建立行程-景點關聯表 (用於模組化行程)
CREATE TABLE IF NOT EXISTS itinerary_spots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE,
    spot_id UUID REFERENCES spots(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    arrival_time TIME,
    stay_duration TEXT, -- 例如 "1.5h"
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 開放 RLS 權限
ALTER TABLE spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_spots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on spots" ON spots FOR SELECT USING (true);
CREATE POLICY "Allow public insert on spots" ON spots FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on spots" ON spots FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on spots" ON spots FOR DELETE USING (true);

CREATE POLICY "Allow public read on itinerary_spots" ON itinerary_spots FOR SELECT USING (true);
CREATE POLICY "Allow public insert on itinerary_spots" ON itinerary_spots FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on itinerary_spots" ON itinerary_spots FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on itinerary_spots" ON itinerary_spots FOR DELETE USING (true);
