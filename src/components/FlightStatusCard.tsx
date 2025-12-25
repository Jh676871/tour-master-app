import React, { useEffect, useState } from 'react';
import { Plane, Clock, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { fetchFlightStatus, FlightStatus } from '@/services/flightService';
import { format } from 'date-fns';

interface FlightStatusCardProps {
  flightNumber?: string;
  departureDate?: string;
}

const FlightStatusCard: React.FC<FlightStatusCardProps> = ({ flightNumber, departureDate }) => {
  const [flight, setFlight] = useState<FlightStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (flightNumber) {
      setLoading(true);
      fetchFlightStatus(flightNumber, departureDate)
        .then(data => setFlight(data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [flightNumber, departureDate]);

  if (!flightNumber) {
    return (
      <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl opacity-50">
        <div className="flex items-center gap-3 text-slate-400 mb-2">
          <Plane className="w-6 h-6" />
          <h3 className="text-lg font-bold">航班資訊未設定</h3>
        </div>
        <p className="text-slate-500 text-sm">請至「團務設定」新增航班號碼以啟用追蹤。</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl animate-pulse">
        <div className="h-6 w-32 bg-slate-700 rounded mb-4"></div>
        <div className="h-20 bg-slate-700 rounded"></div>
      </div>
    );
  }

  if (!flight) {
    return (
      <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl">
        <div className="flex items-center gap-3 text-red-400 mb-2">
          <AlertTriangle className="w-6 h-6" />
          <h3 className="text-lg font-bold">無法取得航班資訊</h3>
        </div>
        <p className="text-slate-400 text-sm">航班 {flightNumber} 暫無資料，請稍後再試。</p>
      </div>
    );
  }

  const isDelayed = flight.departure.delay > 15;
  const statusColor = isDelayed ? 'text-red-400' : 'text-green-400';
  const statusText = isDelayed ? `延誤 ${flight.departure.delay} 分鐘` : '準點起飛';

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 border border-slate-700 shadow-xl relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

      <div className="flex justify-between items-start mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-black text-white">{flight.flight.iata}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${isDelayed ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'}`}>
              {flight.flight_status.toUpperCase()}
            </span>
          </div>
          <div className="text-slate-400 text-xs font-bold tracking-wider">{flight.airline.name}</div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-black ${statusColor} flex items-center justify-end gap-1`}>
            {isDelayed && <AlertTriangle className="w-3 h-3" />}
            {!isDelayed && <CheckCircle className="w-3 h-3" />}
            {statusText}
          </div>
          <div className="text-slate-500 text-[10px] mt-1">更新於 {format(new Date(), 'HH:mm')}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 relative z-10">
        {/* Departure */}
        <div>
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">DEP</div>
          <div className="text-xl font-black text-white">{flight.departure.iata}</div>
          <div className="text-xs text-blue-400 font-bold mt-1">
            {flight.departure.estimated ? format(new Date(flight.departure.estimated), 'HH:mm') : '--:--'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
             Gate {flight.departure.gate || '--'}
          </div>
        </div>

        {/* Plane Icon */}
        <div className="flex flex-col items-center justify-center">
          <Plane className="w-6 h-6 text-slate-600 rotate-90" />
          <div className="w-full h-px bg-slate-700 mt-2 relative">
             <div className="absolute left-1/2 top-1/2 w-1 h-1 bg-blue-500 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
          </div>
          <div className="text-[10px] text-slate-600 mt-2 font-mono">
            {flight.departure.delay > 0 ? `+${flight.departure.delay}m` : 'On Time'}
          </div>
        </div>

        {/* Arrival */}
        <div className="text-right">
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">ARR</div>
          <div className="text-xl font-black text-white">{flight.arrival.iata}</div>
          <div className="text-xs text-blue-400 font-bold mt-1">
            {flight.arrival.estimated ? format(new Date(flight.arrival.estimated), 'HH:mm') : '--:--'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
             Term {flight.arrival.terminal || '--'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightStatusCard;
