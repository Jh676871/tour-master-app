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
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  group_code: string;
  start_date: string;
  end_date: string;
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
  created_at: string;
}
