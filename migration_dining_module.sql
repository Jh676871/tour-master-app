-- Create itinerary_spot_tables table for restaurant table assignments
CREATE TABLE IF NOT EXISTS public.itinerary_spot_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerary_id UUID REFERENCES public.itineraries(id) ON DELETE CASCADE,
    spot_id UUID REFERENCES public.spots(id) ON DELETE CASCADE,
    table_number TEXT NOT NULL,
    capacity INTEGER DEFAULT 10,
    traveler_ids UUID[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(itinerary_id, spot_id, table_number)
);

-- Enable RLS
ALTER TABLE public.itinerary_spot_tables ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for all users" ON public.itinerary_spot_tables FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.itinerary_spot_tables FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.itinerary_spot_tables FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users" ON public.itinerary_spot_tables FOR DELETE USING (true);

-- Add realtime support
ALTER PUBLICATION supabase_realtime ADD TABLE itinerary_spot_tables;
