-- 請在 Supabase Dashboard 的 SQL Editor 中執行此腳本
-- 這將建立 "spot-images" 儲存桶並設定公開讀取權限

-- 1. 建立儲存桶 (如果不存在)
INSERT INTO storage.buckets (id, name, public)
VALUES ('spot-images', 'spot-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. 設定開放讀取權限 (所有人都能看到圖片)
DROP POLICY IF EXISTS "Public Access spot-images" ON storage.objects;
CREATE POLICY "Public Access spot-images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'spot-images' );

-- 3. 設定開放上傳權限 (所有人都能上傳 - 適合開發階段)
-- 注意：生產環境建議改為僅限 "authenticated" 用戶
DROP POLICY IF EXISTS "Allow All Uploads spot-images" ON storage.objects;
CREATE POLICY "Allow All Uploads spot-images"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'spot-images' );

-- 4. 設定修改與刪除權限
DROP POLICY IF EXISTS "Allow All Modify spot-images" ON storage.objects;
CREATE POLICY "Allow All Modify spot-images"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'spot-images' );

DROP POLICY IF EXISTS "Allow All Delete spot-images" ON storage.objects;
CREATE POLICY "Allow All Delete spot-images"
ON storage.objects FOR DELETE
USING ( bucket_id = 'spot-images' );
