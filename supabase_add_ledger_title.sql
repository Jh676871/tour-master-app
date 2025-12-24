-- Add title column to leader_ledger table
alter table leader_ledger 
add column if not exists title text not null default '未命名款項';
