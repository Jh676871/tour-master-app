-- Phase 5: Security Module Migration

-- 1. Add security fields to travelers table
ALTER TABLE travelers ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE travelers ADD COLUMN IF NOT EXISTS blood_type VARCHAR(10);
ALTER TABLE travelers ADD COLUMN IF NOT EXISTS medical_notes TEXT;

-- 2. Create emergency_alerts table
CREATE TABLE IF NOT EXISTS emergency_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    traveler_id UUID REFERENCES travelers(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status VARCHAR(20) DEFAULT 'pending', -- pending, resolved, dismissed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add medical info to hotels and spots
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS nearby_medical TEXT;
ALTER TABLE spots ADD COLUMN IF NOT EXISTS nearby_medical TEXT;

-- Enable Realtime for emergency_alerts
ALTER PUBLICATION supabase_realtime ADD TABLE emergency_alerts;
