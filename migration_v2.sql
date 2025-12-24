-- 1. 建立飯店表 (Hotels)
CREATE TABLE IF NOT EXISTS public.hotels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    wifi_info TEXT,
    UNIQUE(name)
);

-- 2. 建立行程表 (Itineraries)
CREATE TABLE IF NOT EXISTS public.itineraries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    hotel_id UUID REFERENCES public.hotels(id) ON DELETE SET NULL,
    trip_date DATE NOT NULL,
    schedule_text TEXT,
    morning_call_time TIME,
    meeting_time TIME,
    UNIQUE(group_id, trip_date)
);

-- 3. 建立旅客房號關聯表 (Traveler Rooms)
CREATE TABLE IF NOT EXISTS public.traveler_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    traveler_id UUID REFERENCES public.travelers(id) ON DELETE CASCADE,
    itinerary_id UUID REFERENCES public.itineraries(id) ON DELETE CASCADE,
    room_number TEXT,
    UNIQUE(traveler_id, itinerary_id)
);

-- 4. 遷移現有資料 (如果有的話)
-- 這裡做一個簡單的遷移邏輯：將 groups 表中的飯店資訊轉移到 hotels 表，並為每個團體的每一天建立一個行程
-- 假設每個團體目前只有一天的行程 (start_date)

-- 遷移飯店
INSERT INTO public.hotels (name, address, wifi_info)
SELECT DISTINCT hotel_name, hotel_address, wifi_info 
FROM public.groups 
WHERE hotel_name IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- 遷移行程 (初步)
INSERT INTO public.itineraries (group_id, hotel_id, trip_date)
SELECT g.id, h.id, COALESCE(g.start_date, CURRENT_DATE)
FROM public.groups g
JOIN public.hotels h ON g.hotel_name = h.name
ON CONFLICT DO NOTHING;

-- 遷移旅客房號
INSERT INTO public.traveler_rooms (traveler_id, itinerary_id, room_number)
SELECT t.id, i.id, t.room_number
FROM public.travelers t
JOIN public.itineraries i ON t.group_id = i.group_id
WHERE t.room_number IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. 修改原有的表 (移除冗餘欄位)
-- 注意：在正式環境中，這一步通常在確認資料遷移成功後執行
-- ALTER TABLE public.groups DROP COLUMN hotel_name;
-- ALTER TABLE public.groups DROP COLUMN hotel_address;
-- ALTER TABLE public.groups DROP COLUMN wifi_info;
-- ALTER TABLE public.travelers DROP COLUMN room_number;

-- 6. 開啟 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE hotels;
ALTER PUBLICATION supabase_realtime ADD TABLE itineraries;
ALTER PUBLICATION supabase_realtime ADD TABLE traveler_rooms;

-- 7. 設置 RLS
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access" ON public.hotels FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access" ON public.itineraries FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.traveler_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access" ON public.traveler_rooms FOR ALL USING (true) WITH CHECK (true);
