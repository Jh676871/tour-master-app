export interface Hotel {
  id: string;
  name: string;
  address: string;
  phone: string;
  wifi_info: string;
  google_map_url?: string;
  breakfast_info?: string;
  gym_pool_info?: string;
  guide_notes?: string;
  image_url?: string;
  nearby_medical?: string;
  local_name?: string;
  local_address?: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  group_code: string;
  start_date: string;
  end_date: string;
  flight_number?: string;
  departure_time?: string;
  destination_country?: string;
  leader_name?: string;
  leader_phone?: string;
  leader_photo?: string;
  leader_ename?: string;
  leader_line_id?: string;
  created_at: string;
}

export interface ImmigrationTemplate {
  id: string;
  country_name: string;
  template_image_url?: string;
  instruction_text?: string;
  created_at: string;
}

export interface Itinerary {
  id: string;
  group_id: string;
  hotel_id: string | null;
  trip_date: string;
  schedule_text: string;
  morning_call_time: string | null;
  meeting_time: string | null;
  created_at: string;
  hotel?: Hotel;
}

export interface Traveler {
  id: string;
  full_name: string;
  gender: string;
  dietary_needs: string;
  group_id: string | null;
  line_uid: string | null;
  emergency_contact?: string;
  blood_type?: string;
  medical_notes?: string;
  luggage_count?: number;
  boarding_pass_url?: string;
  created_at: string;
}

export interface TravelerRoom {
  id: string;
  traveler_id: string;
  itinerary_id: string;
  room_number: string;
  created_at: string;
}

export interface Spot {
  id: string;
  name: string;
  address: string;
  description?: string;
  image_url?: string;
  google_map_url?: string;
  category?: string;
  nearby_medical?: string;
  created_at: string;
}

export interface EmergencyAlert {
  id: string;
  traveler_id: string;
  latitude: number;
  longitude: number;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  traveler?: Traveler;
}

export interface ItinerarySpotTable {
  id: string;
  itinerary_id: string;
  spot_id: string;
  table_number: string;
  capacity: number;
  traveler_ids: string[];
  notes?: string;
  created_at: string;
}

export interface LeaderLedger {
  id: string;
  group_id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  currency: string;
  exchange_rate: number;
  title: string;
  notes?: string;
  receipt_url?: string;
  created_at: string;
}

export interface GroupCurrencySetting {
  id: string;
  group_id: string;
  currency: string;
  exchange_rate: number;
  initial_balance: number;
  created_at: string;
}
