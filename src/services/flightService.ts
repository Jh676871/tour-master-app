import { format } from 'date-fns';

export interface FlightStatus {
  flight_date: string;
  flight_status: string; // 'scheduled', 'active', 'landed', 'cancelled', 'incident', 'diverted'
  departure: {
    airport: string;
    timezone: string;
    iata: string;
    icao: string;
    terminal: string;
    gate: string;
    delay: number;
    scheduled: string;
    estimated: string;
    actual: string | null;
    estimated_runway: string | null;
    actual_runway: string | null;
  };
  arrival: {
    airport: string;
    timezone: string;
    iata: string;
    icao: string;
    terminal: string;
    gate: string;
    baggage: string;
    delay: number;
    scheduled: string;
    estimated: string;
    actual: string | null;
    estimated_runway: string | null;
    actual_runway: string | null;
  };
  airline: {
    name: string;
    iata: string;
    icao: string;
  };
  flight: {
    number: string;
    iata: string;
    icao: string;
    codeshared: any;
  };
}

// Mock data generator
const getMockFlightData = (flightNumber: string, date: string): FlightStatus => {
  const isDelayed = Math.random() > 0.7;
  const status = isDelayed ? 'active' : 'scheduled';
  
  return {
    flight_date: date,
    flight_status: status,
    departure: {
      airport: "Taoyuan International Airport",
      timezone: "Asia/Taipei",
      iata: "TPE",
      icao: "RCTP",
      terminal: "2",
      gate: "C" + Math.floor(Math.random() * 10),
      delay: isDelayed ? 45 : 0,
      scheduled: `${date}T10:00:00+00:00`,
      estimated: `${date}T${isDelayed ? '10:45' : '10:00'}:00+00:00`,
      actual: null,
      estimated_runway: null,
      actual_runway: null,
    },
    arrival: {
      airport: "Narita International Airport",
      timezone: "Asia/Tokyo",
      iata: "NRT",
      icao: "RJAA",
      terminal: "1",
      gate: "4" + Math.floor(Math.random() * 10),
      baggage: "A" + Math.floor(Math.random() * 5),
      delay: isDelayed ? 45 : 0,
      scheduled: `${date}T14:00:00+00:00`,
      estimated: `${date}T${isDelayed ? '14:45' : '14:00'}:00+00:00`,
      actual: null,
      estimated_runway: null,
      actual_runway: null,
    },
    airline: {
      name: "China Airlines",
      iata: "CI",
      icao: "CAL",
    },
    flight: {
      number: flightNumber || "CI100",
      iata: flightNumber || "CI100",
      icao: flightNumber || "CI100",
      codeshared: null,
    },
  };
};

export const fetchFlightStatus = async (flightNumber: string, date?: string): Promise<FlightStatus | null> => {
  const flightDate = date ? format(new Date(date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  const apiKey = process.env.NEXT_PUBLIC_AVIATIONSTACK_KEY;

  if (!apiKey) {
    console.log('Using Mock Flight Data (No API Key)');
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return getMockFlightData(flightNumber, flightDate);
  }

  try {
    const response = await fetch(`http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${flightNumber}`);
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      // Find the most relevant flight (e.g., matching date)
      // For simplicity, returning the first one or the one matching the date if possible
      // Aviationstack historical/future data might need paid plan, but 'flights' endpoint usually gives recent/active.
      return data.data[0];
    }
    return null;
  } catch (error) {
    console.error("Error fetching flight status:", error);
    return getMockFlightData(flightNumber, flightDate); // Fallback to mock on error
  }
};
