-- 修正 groups 表缺失欄位
-- 請在 Supabase SQL Editor 中執行此腳本

ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS group_code TEXT,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- 為 group_code 添加唯一約束 (如果尚未添加)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'groups_group_code_key'
    ) THEN
        ALTER TABLE public.groups ADD CONSTRAINT groups_group_code_key UNIQUE (group_code);
    END IF;
END $$;
