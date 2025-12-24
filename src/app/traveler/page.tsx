'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import liff from '@line/liff';
import { 
  Loader2, 
  UserCheck, 
  Building2, 
  MapPin, 
  Wifi, 
  Copy, 
  CheckCircle2, 
  AlertCircle,
  Key,
  Navigation,
  Calendar,
  Phone,
  Dumbbell,
  StickyNote,
  Map as MapIcon,
  Users
} from 'lucide-react';
import { Traveler, Group, Itinerary, Hotel } from '@/types/database';

export default function TravelerLIFFPage() {
  const [liffLoading, setLiffLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [traveler, setTraveler] = useState<Traveler | null>(null);
  const [itineraries, setItineraries] = useState<(Itinerary & { hotel: Hotel | null })[]>([]);
  const [itinSpots, setItinSpots] = useState<Record<string, any[]>>({});
  const [currentItinerary, setCurrentItinerary] = useState<(Itinerary & { hotel: Hotel }) | null>(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [roomMappings, setRoomMappings] = useState<Record<string, string>>({});
  const [currentRoom, setCurrentRoom] = useState<string>('');
  const [binding, setBinding] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    group_code: ''
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const initLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) throw new Error('LIFF ID is missing');

        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const profile = await liff.getProfile();
        setUserId(profile.userId);
        await checkBinding(profile.userId, controller.signal);
      } catch (err: any) {
        if (err.name !== 'AbortError' && !err.message?.includes('AbortError')) {
          console.error('LIFF Init Error:', err);
          setError('LINE 登入失敗，請確認在 LINE App 中開啟。');
        }
      } finally {
        setLiffLoading(false);
      }
    };

    initLiff();
    return () => controller.abort();
  }, []);

  const checkBinding = async (lineUid: string, signal?: AbortSignal) => {
    const query = supabase
      .from('travelers')
      .select('*')
      .eq('line_uid', lineUid);
    
    if (signal) query.abortSignal(signal);
    
    const { data: travelerData } = await query.single();

    if (travelerData) {
      setTraveler(travelerData);
      await fetchTodayInfo(travelerData.id, travelerData.group_id, signal);
    }
  };

  const fetchTodayInfo = async (travelerId: string, groupId: string | null, signal?: AbortSignal) => {
    if (!groupId) return;

    const today = new Date().toISOString().split('T')[0];
    
    // 1. Fetch ALL itineraries for the group
    const itinQuery = supabase
      .from('itineraries')
      .select('*, hotel:hotels(*)')
      .eq('group_id', groupId)
      .order('trip_date', { ascending: true });

    if (signal) itinQuery.abortSignal(signal);
    
    const { data: allItineraries } = await itinQuery;

      if (allItineraries) {
        setItineraries(allItineraries as any);
        
        // Find today's or next available itinerary
        const todayIdx = allItineraries.findIndex(it => it.trip_date >= today);
        const finalIdx = todayIdx !== -1 ? todayIdx : allItineraries.length - 1;
        
        setActiveDayIndex(finalIdx);
        const todayItin = allItineraries[finalIdx];
        if (todayItin) {
          setCurrentItinerary(todayItin as any);
        }

      // 2. Fetch ALL room numbers for this traveler in this group
      const itinIds = allItineraries.map(it => it.id);
      const roomQuery = supabase
        .from('traveler_rooms')
        .select('itinerary_id, room_number')
        .eq('traveler_id', travelerId)
        .in('itinerary_id', itinIds);

      if (signal) roomQuery.abortSignal(signal);
      
      const { data: roomsData } = await roomQuery;
      
      if (roomsData) {
        const mapping: Record<string, string> = {};
        roomsData.forEach(r => {
          mapping[r.itinerary_id] = r.room_number;
        });
        setRoomMappings(mapping);

        if (todayItin && mapping[todayItin.id]) {
          setCurrentRoom(mapping[todayItin.id]);
        }
      }

      // 3. Fetch Itinerary Spots
      if (itinIds.length > 0) {
        const spotQuery = supabase
          .from('itinerary_spots')
          .select('*, spot:spots(*)')
          .in('itinerary_id', itinIds)
          .order('sort_order', { ascending: true });
        
        if (signal) spotQuery.abortSignal(signal);
        
        const { data: spotData } = await spotQuery;
        
        if (spotData) {
          const mapping: Record<string, any[]> = {};
          spotData.forEach(item => {
            if (!mapping[item.itinerary_id]) mapping[item.itinerary_id] = [];
            mapping[item.itinerary_id].push(item);
          });
          setItinSpots(mapping);
        }
      }
    }
  };

  const handleBinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!formData.name || !formData.group_code) {
      setError('請填寫完整資訊');
      return;
    }

    setBinding(true);
    setError(null);

    try {
      const { data: groupData } = await supabase
        .from('groups')
        .select('*')
        .eq('group_code', formData.group_code.trim())
        .single();

      if (!groupData) throw new Error('團體代碼不正確，請詢問您的領隊。');

      const { data: travelerData } = await supabase
        .from('travelers')
        .select('*')
        .eq('group_id', groupData.id)
        .eq('full_name', formData.name.trim())
        .is('line_uid', null)
        .single();

      if (!travelerData) throw new Error('找不到您的報名資料，或您已經綁定過了。');

      const { error: updateError } = await supabase
        .from('travelers')
        .update({ line_uid: userId })
        .eq('id', travelerData.id);

      if (updateError) throw updateError;
      await checkBinding(userId);
    } catch (err: any) {
      setError(err.message || '綁定失敗，請稍後再試。');
    } finally {
      setBinding(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTimeWithNextDate = (timeStr: string | null, baseDateStr: string | undefined) => {
    if (!timeStr || !baseDateStr) return '--:--';
    
    // 移除秒 (HH:mm:ss -> HH:mm)
    const timeParts = timeStr.split(':');
    const displayTime = timeParts.slice(0, 2).join(':');

    try {
      // 計算隔天日期 (避免時區問題，使用分段解析)
      const [y, m, d] = baseDateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      dateObj.setDate(dateObj.getDate() + 1);
      
      const month = dateObj.getMonth() + 1;
      const date = dateObj.getDate();
      
      return `${month}/${date} ${displayTime}`;
    } catch (e) {
      return displayTime;
    }
  };

  if (liffLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-slate-400 font-bold animate-pulse">正在連接 LINE...</p>
      </div>
    );
  }

  if (!traveler) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-4">
            <div className="bg-blue-600 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl border border-blue-400">
              <UserCheck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter">旅客資料綁定</h1>
            <p className="text-slate-400 font-medium">歡迎！請輸入以下資訊以連結您的行程。</p>
          </div>

          <form onSubmit={handleBinding} className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-1">旅客姓名</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="請輸入您的全名"
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 focus:border-blue-500 focus:outline-none font-bold text-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-1">團體代碼</label>
              <input
                type="text"
                value={formData.group_code}
                onChange={(e) => setFormData({ ...formData, group_code: e.target.value })}
                placeholder="領隊提供的代碼"
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 focus:border-purple-500 focus:outline-none font-bold text-lg uppercase"
              />
            </div>
            {error && (
              <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-2xl flex items-center gap-3 text-red-400 text-sm font-bold">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={binding}
              className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-[1.5rem] font-black text-lg uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {binding ? <Loader2 className="w-6 h-6 animate-spin" /> : '立即綁定'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="bg-slate-900/50 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl">
            {traveler.full_name[0]}
          </div>
          <div>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Hello</p>
            <h2 className="font-black text-lg">{traveler.full_name} 貴賓</h2>
          </div>
        </div>
        <div className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-[10px] font-black border border-green-500/20">
          LINE BOUND
        </div>
      </div>

      {/* Day Selector */}
      <div className="bg-slate-950/80 backdrop-blur-md border-b border-slate-900 overflow-x-auto scrollbar-hide flex gap-2 p-4 sticky top-0 z-30">
        {itineraries.map((itin, idx) => (
          <button
            key={itin.id}
            onClick={() => {
              setActiveDayIndex(idx);
              setCurrentItinerary(itin as any);
              setCurrentRoom(roomMappings[itin.id] || '');
            }}
            className={`flex-none w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all border-2 ${
              activeDayIndex === idx 
                ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40' 
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            <span className="text-[10px] font-black uppercase tracking-tighter leading-none mb-1">D</span>
            <span className="text-lg font-black leading-none">{idx + 1}</span>
          </button>
        ))}
      </div>

      <div className="p-6 space-y-6">
        {/* HUGE HOTEL NAME & ROOM NUMBER */}
        <div className="bg-slate-900 rounded-[3rem] shadow-2xl shadow-blue-900/40 relative overflow-hidden min-h-[300px] flex flex-col justify-end">
          {currentItinerary?.hotel?.image_url ? (
            <img 
              src={currentItinerary.hotel.image_url} 
              alt={currentItinerary.hotel.name}
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 opacity-100"></div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
          
          <div className="relative z-10 p-8 space-y-8">
            <div className="space-y-1">
              <p className="text-blue-400 text-xs font-black uppercase tracking-[0.3em] drop-shadow-md">
                {currentItinerary?.trip_date} 住宿飯店
              </p>
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter leading-tight drop-shadow-xl text-white">
                {currentItinerary?.hotel?.name || '今日尚未設定飯店'}
              </h1>
            </div>
            
            <div className="flex items-end justify-between">
              <div className="space-y-1">
                <p className="text-blue-400 text-xs font-black uppercase tracking-[0.3em] drop-shadow-md">我的房號</p>
                <div className="text-7xl md:text-8xl font-black tracking-tighter text-white drop-shadow-2xl">
                  {currentRoom || '---'}
                </div>
              </div>
              <div className="bg-white/10 p-4 rounded-[2rem] backdrop-blur-md border border-white/20">
                <Building2 className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Times */}
        {currentItinerary && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] space-y-1">
              <div className="flex items-center gap-2 text-orange-400">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Morning Call</span>
              </div>
              <p className="text-xl font-black">{formatTimeWithNextDate(currentItinerary.morning_call_time, currentItinerary.trip_date)}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] space-y-1">
              <div className="flex items-center gap-2 text-green-400">
                <Users className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">集合時間</span>
              </div>
              <p className="text-xl font-black">{formatTimeWithNextDate(currentItinerary.meeting_time, currentItinerary.trip_date)}</p>
            </div>
          </div>
        )}

        {/* Modular Spots Timeline */}
        {currentItinerary && itinSpots[currentItinerary.id] && itinSpots[currentItinerary.id].length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <MapIcon className="w-6 h-6 text-blue-500" />
              <h3 className="text-xl font-black tracking-tight">今日行程景點</h3>
            </div>
            
            <div className="space-y-4 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {itinSpots[currentItinerary.id].map((item, idx) => (
                <div key={item.id} className="relative pl-12">
                  <div className="absolute left-4 top-2 w-4 h-4 rounded-full bg-blue-600 border-4 border-slate-950 z-10"></div>
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                    {item.spot?.image_url && (
                      <div className="aspect-video relative">
                        <img src={item.spot.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="text-lg font-black">{item.spot?.name}</h4>
                        <span className="bg-slate-800 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest text-slate-400 shrink-0">
                          {item.spot?.category || '景點'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-500 mb-4 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-blue-500" /> {item.spot?.address}
                      </p>
                      
                      {item.spot?.google_map_url && (
                        <a 
                          href={item.spot.google_map_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-2xl font-black text-xs transition-all border border-slate-700"
                        >
                          <Navigation className="w-4 h-4 text-blue-400" />
                          開啟導覽
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NEW: Hotel Details Section */}
        {currentItinerary?.hotel && (
          <div className="grid grid-cols-1 gap-4">
            {/* WiFi & Breakfast - Side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] space-y-2">
                <div className="flex items-center gap-2 text-blue-400">
                  <Wifi className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">WiFi 資訊</span>
                </div>
                <p className="text-sm font-bold text-slate-200">{currentItinerary.hotel.wifi_info || '請洽櫃台'}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] space-y-2">
                <div className="flex items-center gap-2 text-orange-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">早餐資訊</span>
                </div>
                <p className="text-sm font-bold text-slate-200">{currentItinerary.hotel.breakfast_info || '請洽櫃台'}</p>
              </div>
            </div>

            {/* Facilities & Guide Notes - Stacked */}
            {currentItinerary.hotel.gym_pool_info && (
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] space-y-2">
                <div className="flex items-center gap-2 text-purple-400">
                  <Dumbbell className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">飯店設施</span>
                </div>
                <p className="text-sm font-bold text-slate-200">{currentItinerary.hotel.gym_pool_info}</p>
              </div>
            )}
            
            {currentItinerary.hotel.guide_notes && (
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] space-y-2">
                <div className="flex items-center gap-2 text-yellow-400">
                  <StickyNote className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">注意事項</span>
                </div>
                <p className="text-sm font-bold text-slate-200">{currentItinerary.hotel.guide_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-4">
          <button 
            onClick={() => currentItinerary?.hotel?.address && copyToClipboard(currentItinerary.hotel.address)}
            className="w-full bg-slate-900 border border-slate-800 p-6 rounded-[2rem] flex items-center justify-between group active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-5">
              <div className="bg-green-500/10 p-4 rounded-2xl text-green-400">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest">飯店地址</p>
                <p className="font-bold text-slate-200 line-clamp-1">{currentItinerary?.hotel?.address || '未設定'}</p>
              </div>
            </div>
            <div className={`p-2 rounded-lg ${copied ? 'bg-green-600' : 'bg-slate-800 text-slate-500'}`}>
              <Copy className="w-4 h-4" />
            </div>
          </button>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="bg-orange-500/10 p-4 rounded-2xl text-orange-400">
                <Wifi className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Wi-Fi 密碼</p>
                <p className="font-bold text-slate-200">{currentItinerary?.hotel?.wifi_info || '請洽櫃檯'}</p>
              </div>
            </div>
            <button onClick={() => currentItinerary?.hotel?.wifi_info && copyToClipboard(currentItinerary.hotel.wifi_info)} className="p-2 bg-slate-800 text-slate-500 rounded-lg">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Full Itinerary List */}
        <div className="space-y-6 pt-4">
          <div className="flex items-center gap-3 px-2">
            <Calendar className="w-6 h-6 text-blue-500" />
            <h3 className="text-xl font-black tracking-tight">完整行程表</h3>
          </div>
          
          <div className="space-y-4">
            {itineraries.map((itin, index) => (
              <div 
                key={itin.id}
                className={`bg-slate-900/50 border-2 rounded-[2.5rem] p-6 transition-all ${
                  itin.id === currentItinerary?.id ? 'border-blue-500 bg-blue-500/5' : 'border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${
                      itin.id === currentItinerary?.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {itin.trip_date.split('-').slice(1).join('/')}
                      </p>
                      <h4 className="font-black text-lg leading-tight">{itin.hotel?.name || '未設定飯店'}</h4>
                    </div>
                  </div>
                  {roomMappings[itin.id] && (
                    <div className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-[10px] font-black border border-blue-500/20 uppercase tracking-widest">
                      Room {roomMappings[itin.id]}
                    </div>
                  )}
                </div>

                {itin.schedule_text && (
                  <p className="text-slate-400 text-sm font-medium mb-4 pl-11 line-clamp-2">
                    {itin.schedule_text}
                  </p>
                )}

                <div className="flex gap-4 pl-11">
                  {itin.morning_call_time && (
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-orange-400 uppercase tracking-widest">
                      <Clock className="w-3 h-3" />
                      MC {formatTimeWithNextDate(itin.morning_call_time, itin.trip_date)}
                    </div>
                  )}
                  {itin.meeting_time && (
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-green-400 uppercase tracking-widest">
                      <Users className="w-3 h-3" />
                      集合 {formatTimeWithNextDate(itin.meeting_time, itin.trip_date)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function Clock(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
