-- 1. 建立旅客表欄位 (如果不存在)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travelers' AND column_name='line_uid') THEN
        ALTER TABLE travelers ADD COLUMN line_uid TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travelers' AND column_name='room_number') THEN
        ALTER TABLE travelers ADD COLUMN room_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travelers' AND column_name='hotel_name') THEN
        ALTER TABLE travelers ADD COLUMN hotel_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travelers' AND column_name='wifi_password') THEN
        ALTER TABLE travelers ADD COLUMN wifi_password TEXT;
    END IF;
END $$;

-- 2. 建立點名紀錄表 (如果不存在)
CREATE TABLE IF NOT EXISTS public.check_ins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    traveler_id UUID REFERENCES public.travelers(id) ON DELETE CASCADE,
    location_name TEXT DEFAULT '集合點',
    UNIQUE(traveler_id)
);

-- 3. 建立公積金支出表
CREATE TABLE IF NOT EXISTS public.tour_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    category TEXT DEFAULT '一般支出'
);

-- 4. 開啟 Realtime (針對 check_ins)
-- 注意：這部分通常在 Supabase 控制台操作，但可以嘗試透過 SQL 開啟
ALTER PUBLICATION supabase_realtime ADD TABLE check_ins;
ALTER PUBLICATION supabase_realtime ADD TABLE tour_expenses;

-- 5. 設置 RLS (Row Level Security) - 暫時允許所有人讀寫 (開發環境)
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access" ON public.check_ins FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.tour_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access" ON public.tour_expenses FOR ALL USING (true) WITH CHECK (true);
