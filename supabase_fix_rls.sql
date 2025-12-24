-- 由於目前系統尚未建立「使用者登入」功能 (Supabase Auth)，
-- 我們必須暫時將權限開放給 public (匿名使用者)，才能進行測試。
-- 請執行此腳本來修正 RLS 錯誤。

-- 1. 移除舊的「僅限登入者」政策
drop policy if exists "Allow authenticated users to view ledger" on leader_ledger;
drop policy if exists "Allow authenticated users to insert ledger" on leader_ledger;
drop policy if exists "Allow authenticated users to update ledger" on leader_ledger;
drop policy if exists "Allow authenticated users to delete ledger" on leader_ledger;

-- 2. 建立新的「允許所有人」政策 (開發測試用)
create policy "Allow public to view ledger"
  on leader_ledger for select
  to public
  using (true);

create policy "Allow public to insert ledger"
  on leader_ledger for insert
  to public
  with check (true);

create policy "Allow public to update ledger"
  on leader_ledger for update
  to public
  using (true);

create policy "Allow public to delete ledger"
  on leader_ledger for delete
  to public
  using (true);

-- 3. 修正 Storage 權限 (允許匿名上傳收據)
drop policy if exists "Allow authenticated uploads" on storage.objects;

create policy "Allow public uploads"
  on storage.objects for insert
  to public
  with check ( bucket_id = 'receipts' );
