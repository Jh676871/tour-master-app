-- 1. Create leader_ledger table
create table if not exists leader_ledger (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references groups(id) on delete cascade not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  amount numeric not null,
  currency text not null default 'TWD',
  exchange_rate numeric not null default 1.0,
  notes text,
  receipt_url text,
  created_at timestamptz default now()
);

-- 2. Enable RLS
alter table leader_ledger enable row level security;

-- 3. Create Policy (Allow authenticated users - assuming leaders are authenticated)
create policy "Allow authenticated users to view ledger"
  on leader_ledger for select
  to authenticated
  using (true);

create policy "Allow authenticated users to insert ledger"
  on leader_ledger for insert
  to authenticated
  with check (true);

create policy "Allow authenticated users to update ledger"
  on leader_ledger for update
  to authenticated
  using (true);

create policy "Allow authenticated users to delete ledger"
  on leader_ledger for delete
  to authenticated
  using (true);

-- 4. Create Storage Bucket for Receipts
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

-- 5. Storage Policies
create policy "Give public access to receipts"
  on storage.objects for select
  using ( bucket_id = 'receipts' );

create policy "Allow authenticated uploads"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'receipts' );
