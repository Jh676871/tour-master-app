-- Create table for managing group currency settings (exchange rates and initial funds)
CREATE TABLE IF NOT EXISTS group_currency_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    currency VARCHAR(10) NOT NULL,
    exchange_rate DECIMAL(10, 4) DEFAULT 1.0, -- Rate to TWD
    initial_balance DECIMAL(12, 2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, currency)
);

-- Enable RLS
ALTER TABLE group_currency_settings ENABLE ROW LEVEL SECURITY;

-- Create policies (temporarily public as requested previously for testing, but ideally should be restricted)
-- For now, following the pattern of "fix_rls", we allow all access for dev speed, but restricted to group ideally.
CREATE POLICY "Enable all access for all users" ON group_currency_settings
    FOR ALL USING (true) WITH CHECK (true);

-- Ensure leader_ledger has currency support
ALTER TABLE leader_ledger ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'TWD';
ALTER TABLE leader_ledger ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 4) DEFAULT 1.0;
