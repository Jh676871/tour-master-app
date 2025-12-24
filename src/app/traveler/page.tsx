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
  Phone
} from 'lucide-react';
import { Traveler, Group, Itinerary, Hotel } from '@/types/database';

export default function TravelerLIFFPage() {
  const [liffLoading, setLiffLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [traveler, setTraveler] = useState<Traveler | null>(null);
  const [itineraries, setItineraries] = useState<(Itinerary & { hotel: Hotel | null })[]>([]);
  const [currentItinerary, setCurrentItinerary] = useState<(Itinerary & { hotel: Hotel }) | null>(null);
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
    initLiff();
  }, []);

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
      await checkBinding(profile.userId);
    } catch (err: any) {
      console.error('LIFF Init Error:', err);
      setError('LINE 登入失敗，請確認在 LINE App 中開啟。');
    } finally {
      setLiffLoading(false);
    }
  };

  const checkBinding = async (lineUid: string) => {
    const { data: travelerData } = await supabase
      .from('travelers')
      .select('*')
      .eq('line_uid', lineUid)
      .single();

    if (travelerData) {
      setTraveler(travelerData);
      await fetchTodayInfo(travelerData.id, travelerData.group_id);
    }
  };

  const fetchTodayInfo = async (travelerId: string, groupId: string | null) => {
    if (!groupId) return;

    const today = new Date().toISOString().split('T')[0];
    
    // 1. Fetch ALL itineraries for the group
    const { data: allItineraries } = await supabase
      .from('itineraries')
      .select('*, hotel:hotels(*)')
      .eq('group_id', groupId)
      .order('trip_date', { ascending: true });

    if (allItineraries) {
      setItineraries(allItineraries as any);
      
      // Find today's or next available itinerary
      const todayItin = allItineraries.find(it => it.trip_date >= today) || allItineraries[allItineraries.length - 1];
      if (todayItin) {
        setCurrentItinerary(todayItin as any);
      }

      // 2. Fetch ALL room numbers for this traveler in this group
      const itinIds = allItineraries.map(it => it.id);
      const { data: roomsData } = await supabase
        .from('traveler_rooms')
        .select('itinerary_id, room_number')
        .eq('traveler_id', travelerId)
        .in('itinerary_id', itinIds);
      
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

      <div className="p-6 space-y-6">
        {/* HUGE HOTEL NAME & ROOM NUMBER */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[3rem] shadow-2xl shadow-blue-900/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="relative z-10 space-y-8">
            <div className="space-y-1">
              <p className="text-blue-200 text-xs font-black uppercase tracking-[0.3em]">
                {currentItinerary?.trip_date} 住宿飯店
              </p>
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter leading-tight">
                {currentItinerary?.hotel?.name || '今日尚未設定飯店'}
              </h1>
            </div>
            
            <div className="flex items-end justify-between">
              <div className="space-y-1">
                <p className="text-blue-200 text-xs font-black uppercase tracking-[0.3em]">我的房號</p>
                <div className="text-7xl md:text-8xl font-black tracking-tighter text-white">
                  {currentRoom || '---'}
                </div>
              </div>
              <div className="bg-white/20 p-4 rounded-[2rem] backdrop-blur-md border border-white/20">
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
              <p className="text-2xl font-black">{currentItinerary.morning_call_time || '--:--'}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] space-y-1">
              <div className="flex items-center gap-2 text-green-400">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">集合時間</span>
              </div>
              <p className="text-2xl font-black">{currentItinerary.meeting_time || '--:--'}</p>
            </div>
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
                      MC {itin.morning_call_time}
                    </div>
                  )}
                  {itin.meeting_time && (
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-green-400 uppercase tracking-widest">
                      <Clock className="w-3 h-3" />
                      集合 {itin.meeting_time}
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
