-- 請在 Supabase Dashboard 的 SQL Editor 中執行此腳本
-- 這將為 "spots" 資料表新增 "nearby_medical" 欄位

ALTER TABLE spots
ADD COLUMN IF NOT EXISTS nearby_medical TEXT;
