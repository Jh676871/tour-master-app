'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import liff from '@line/liff';
import Image from 'next/image';
import { 
  Loader2, 
  UserCheck, 
  Building2, 
  MapPin, 
  Wifi, 
  Copy, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  Key,
  Navigation,
  Calendar,
  Phone,
  Dumbbell,
  StickyNote,
  Map as MapIcon,
  Users,
  UtensilsCrossed,
  Clock,
  QrCode,
  Bell
} from 'lucide-react';
import { Traveler, Group, Itinerary, Hotel } from '@/types/database';
import TaxiMode from '@/components/TaxiMode';
import { QRCodeSVG } from 'qrcode.react';

import LeaderCard from '@/components/LeaderCard';
import { useSearchParams } from 'next/navigation';

// Helper to parse wifi info
const parseWifiInfo = (info: string) => {
  if (!info) return null;
  
  // Try to find common patterns
  // Pattern 1: "ID: xxx PW: yyy" or similar
  const idMatch = info.match(/(?:ID|SSID)\s*[:：]\s*([^\s\/]+)/i);
  const pwMatch = info.match(/(?:PW|PASS|PASSWORD|密碼)\s*[:：]\s*([^\s]+)/i);

  if (idMatch && pwMatch) {
    return { ssid: idMatch[1], password: pwMatch[1] };
  }

  // Pattern 2: Split by / or newline if it looks like 2 parts
  const parts = info.split(/[\/\n]/).map(s => s.trim()).filter(Boolean);
  if (parts.length === 2) {
    // Assume first is ID, second is PW
    // Check if parts[0] looks like ID (no spaces usually, but SSID can have spaces)
    return { ssid: parts[0], password: parts[1] };
  }

  return null;
};

function TravelerContent() {
  const searchParams = useSearchParams();
  const section = searchParams.get('section');
  const [liffLoading, setLiffLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [traveler, setTraveler] = useState<Traveler | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [itineraries, setItineraries] = useState<(Itinerary & { hotel: Hotel | null })[]>([]);
  const [itinSpots, setItinSpots] = useState<Record<string, any[]>>({});
  const [currentItinerary, setCurrentItinerary] = useState<(Itinerary & { hotel: Hotel }) | null>(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [roomMappings, setRoomMappings] = useState<Record<string, string>>({});
  const [currentRoom, setCurrentRoom] = useState<string>('');
  const [myTables, setMyTables] = useState<Record<string, string>>({}); // { itinerarySpotId: tableNumber }
  const [binding, setBinding] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    group_code: '',
    emergency_contact: '',
    blood_type: '',
    medical_notes: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [sosLoading, setSosLoading] = useState(false);
  const [showWifiQr, setShowWifiQr] = useState(false);

  const triggerSOS = async () => {
    if (!traveler) return;
    if (!confirm('確定要送出緊急求助訊息嗎？這將會立即通知領隊您的位置。')) return;

    setSosLoading(true);
    try {
      // 1. Get location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;

      // 2. Insert alert
      const { error: alertError } = await supabase
        .from('emergency_alerts')
        .insert([{
          traveler_id: traveler.id,
          latitude,
          longitude,
          status: 'pending'
        }]);

      if (alertError) throw alertError;

      alert('緊急求助訊息已送出！領隊已收到您的位置，請保持冷靜並留在原地。');
    } catch (err: any) {
      console.error('SOS Error:', err);
      let msg = '無法取得您的位置。請確認已開啟定位權限。';
      if (err.code === 1) msg = '您拒絕了定位請求，請在設定中開啟定位以發送 SOS。';
      else if (err.code === 3) msg = '定位超時，請稍後再試。';
      alert(`SOS 發送失敗: ${msg}`);
    } finally {
      setSosLoading(false);
    }
  };

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

  // Cache Data & Scroll Logic
  useEffect(() => {
    if (traveler && group && itineraries.length > 0) {
      const cacheKey = `traveler_cache_v1`;
      localStorage.setItem(cacheKey, JSON.stringify({
        traveler, group, itineraries, itinSpots, roomMappings, myTables, 
        timestamp: Date.now()
      }));
    }
  }, [traveler, group, itineraries, itinSpots, roomMappings, myTables]);

  useEffect(() => {
    // Try load cache on mount if offline or just to speed up
    const loadCache = () => {
      const cacheKey = `traveler_cache_v1`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          // Only set if we don't have data yet (or maybe always set initial data?)
          // For now, let's just set if empty.
          if (!traveler) {
            setTraveler(data.traveler);
            setGroup(data.group);
            setItineraries(data.itineraries);
            setItinSpots(data.itinSpots);
            setRoomMappings(data.roomMappings);
            setMyTables(data.myTables);
            
            // Set active day
            const today = new Date().toISOString().split('T')[0];
            const todayIdx = data.itineraries.findIndex((it: any) => it.trip_date >= today);
            const finalIdx = todayIdx !== -1 ? todayIdx : data.itineraries.length - 1;
            setActiveDayIndex(finalIdx);
            setCurrentItinerary(data.itineraries[finalIdx]);
            if (data.itineraries[finalIdx]) {
              setCurrentRoom(data.roomMappings[data.itineraries[finalIdx].id] || '');
            }
            setLiffLoading(false); // Stop loading if we have cache
          }
        } catch (e) {
          console.error('Cache load error', e);
        }
      }
    };
    
    // Attempt to load cache immediately
    loadCache();
  }, []);

  useEffect(() => {
    if (section === 'hotel' && currentItinerary?.hotel) {
      setTimeout(() => {
        const el = document.getElementById('hotel-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    }
  }, [section, currentItinerary]);

  const checkBinding = async (lineUid: string, signal?: AbortSignal) => {
    const { data: travelerData } = await supabase
      .from('travelers')
      .select('*')
      .eq('line_uid', lineUid)
      .single();

    if (travelerData) {
      setTraveler(travelerData);
      await fetchTodayInfo(travelerData.id, travelerData.group_id, signal);
    }
  };

  const fetchTodayInfo = async (travelerId: string, groupId: string | null, signal?: AbortSignal) => {
    if (!groupId) return;

    // Fetch Group Info
    const { data: groupData } = await supabase
      .from('groups')
      .select('*, leader:leaders(*)')
      .eq('id', groupId)
      .single();
    if (groupData) setGroup(groupData);

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
        const todayIdx = allItineraries.findIndex(it => it.trip_date >= today);
        const finalIdx = todayIdx !== -1 ? todayIdx : allItineraries.length - 1;
        
        setActiveDayIndex(finalIdx);
        const todayItin = allItineraries[finalIdx];
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

      // 3. Fetch Itinerary Spots
      if (itinIds.length > 0) {
        const { data: spotData } = await supabase
          .from('itinerary_spots')
          .select('*, spot:spots(*)')
          .in('itinerary_id', itinIds)
          .order('sort_order', { ascending: true });
        
        if (spotData) {
          const mapping: Record<string, any[]> = {};
          spotData.forEach(item => {
            if (!mapping[item.itinerary_id]) mapping[item.itinerary_id] = [];
            mapping[item.itinerary_id].push(item);
          });
          setItinSpots(mapping);

          // 4. Fetch Tables for this traveler
          const { data: tableData } = await supabase
            .from('itinerary_spot_tables')
            .select('*')
            .in('itinerary_id', itinIds)
            .contains('traveler_ids', [travelerId]);
          
          if (tableData) {
            const tableMapping: Record<string, string> = {};
            tableData.forEach(t => {
              const key = `${t.itinerary_id}_${t.spot_id}`;
              tableMapping[key] = t.table_number;
            });
            setMyTables(tableMapping);
          }
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
        .update({ 
          line_uid: userId,
          emergency_contact: formData.emergency_contact,
          blood_type: formData.blood_type,
          medical_notes: formData.medical_notes
        })
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
            <div className="relative w-24 h-24 mx-auto overflow-hidden rounded-[2rem] shadow-2xl border border-blue-400/50 bg-slate-900">
              <Image 
                src="/logo.png" 
                alt="TourMaster Logo" 
                fill
                className="object-cover"
              />
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

            <div className="pt-4 border-t border-slate-800 space-y-6">
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest text-center">緊急安全資訊 (必填)</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">血型</label>
                  <select
                    value={formData.blood_type}
                    onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })}
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 focus:border-blue-500 focus:outline-none font-bold text-lg"
                    required
                  >
                    <option value="">選擇</option>
                    <option value="A">A 型</option>
                    <option value="B">B 型</option>
                    <option value="O">O 型</option>
                    <option value="AB">AB 型</option>
                    <option value="Unknown">不清楚</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">緊急聯絡電話</label>
                  <input
                    type="tel"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                    placeholder="例: 0912..."
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 focus:border-blue-500 focus:outline-none font-bold text-lg"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">重大病史或藥物過敏 (無則填無)</label>
                <textarea
                  value={formData.medical_notes}
                  onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
                  placeholder="提供領隊緊急時參考..."
                  rows={2}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 focus:border-blue-500 focus:outline-none font-bold text-lg resize-none"
                  required
                />
              </div>
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
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex-none w-16 h-16 rounded-2xl flex flex-col items-center justify-center transition-all border-2 ${
              activeDayIndex === idx 
                ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40' 
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            <span className="text-[10px] font-black uppercase tracking-tighter leading-none mb-1">D{idx + 1}</span>
            <span className="text-2xl font-black leading-none tracking-tight">
              {itin.trip_date.split('-').slice(1).join('/')}
            </span>
          </button>
        ))}
      </div>

      <div className="p-6 space-y-6">
        {/* Leader Card with Integrated SOS */}
        {group && <LeaderCard 
          leader_name={group.leader?.name || group.leader_name}
          leader_phone={group.leader?.phone || group.leader_phone}
          leader_line_id={group.leader?.line_id || group.leader_line_id}
          leader_photo={group.leader?.photo_url || group.leader_photo}
          leader_ename={group.leader?.ename || group.leader_ename}
          onSOSClick={triggerSOS}
          isSOSLoading={sosLoading}
        />}

        {/* Current Itinerary Info */}
        {currentItinerary && (
          <div className="space-y-6 pb-20">
            {/* Unified Hotel Card */}
            {currentItinerary.hotel ? (
              <div id="hotel-section" className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                {/* Header Image Section */}
                <div className="relative h-64 w-full group overflow-hidden">
                  <Image
                    src={currentItinerary.hotel.image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80'}
                    alt={currentItinerary.hotel.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                  
                  {/* Room Number Badge */}
                  <div className="absolute top-6 right-6 bg-slate-900/90 backdrop-blur-md border border-slate-700 px-6 py-4 rounded-[1.5rem] shadow-xl text-center min-w-[120px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">YOUR ROOM</p>
                    <p className="text-3xl font-black text-white tracking-tighter">
                      {currentRoom || '--'}
                    </p>
                  </div>

                  {/* Hotel Name Overlay */}
                  <div className="absolute bottom-0 left-0 p-8 w-full">
                    <h3 className="text-3xl font-black leading-tight text-white drop-shadow-lg">
                      {currentItinerary.hotel.name}
                    </h3>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-6 space-y-6 bg-slate-900">
                    {/* Time Info: Morning Call & Meeting Time */}
                    {(currentItinerary.morning_call_time || currentItinerary.meeting_time) && (
                      <div className="grid grid-cols-2 gap-2 pb-4 border-b border-slate-800/50">
                        <div className="bg-slate-950 rounded-2xl p-3 border border-slate-800 relative group overflow-hidden">
                          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Bell size={40} />
                          </div>
                          <div className="flex items-center gap-2 mb-1 text-orange-500">
                            <Bell size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">MORNING CALL</span>
                          </div>
                          <p className="text-xl font-black text-white tracking-tighter whitespace-nowrap">
                            {formatTimeWithNextDate(currentItinerary.morning_call_time, currentItinerary.trip_date)}
                          </p>
                        </div>

                        <div className="bg-slate-950 rounded-2xl p-3 border border-slate-800 relative group overflow-hidden">
                          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Users size={40} />
                          </div>
                          <div className="flex items-center gap-2 mb-1 text-blue-500">
                            <Users size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">集合時間</span>
                          </div>
                          <p className="text-xl font-black text-white tracking-tighter whitespace-nowrap">
                            {formatTimeWithNextDate(currentItinerary.meeting_time, currentItinerary.trip_date)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Address */}
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-500">
                        <MapPin size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">HOTEL ADDRESS</p>
                        <p className="text-lg font-bold text-white leading-relaxed mb-1">
                          {currentItinerary.hotel.local_address || currentItinerary.hotel.address}
                        </p>
                        <p className="text-sm text-slate-400 font-medium">
                          {currentItinerary.hotel.address}
                        </p>
                        <a 
                          href={currentItinerary.hotel.google_map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((currentItinerary.hotel.local_name || currentItinerary.hotel.name) + ' ' + (currentItinerary.hotel.local_address || currentItinerary.hotel.address))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 mt-3 text-blue-400 font-bold text-sm hover:text-blue-300 transition-colors"
                        >
                          <MapIcon size={16} />
                          開啟 Google Map 導航
                        </a>
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center shrink-0 text-green-500">
                        <Phone size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">FRONT DESK</p>
                        <a href={`tel:${currentItinerary.hotel.phone}`} className="text-xl font-black text-white hover:text-green-400 transition-colors">
                          {currentItinerary.hotel.phone}
                        </a>
                      </div>
                    </div>

                    {/* Wifi */}
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center shrink-0 text-purple-500">
                        <Wifi size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">WI-FI PASSWORD</p>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-3">
                            <p className="text-xl font-black text-white">{currentItinerary.hotel.wifi_info || '無資訊'}</p>
                            {currentItinerary.hotel.wifi_info && (
                              <div className="flex gap-1">
                                <button 
                                  onClick={() => copyToClipboard(currentItinerary.hotel.wifi_info!)}
                                  className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400"
                                >
                                  {copied ? <CheckCircle2 size={20} className="text-green-500" /> : <Copy size={20} />}
                                </button>
                                
                                {parseWifiInfo(currentItinerary.hotel.wifi_info) && (
                                  <button 
                                    onClick={() => setShowWifiQr(!showWifiQr)}
                                    className={`p-2 hover:bg-slate-800 rounded-full transition-colors ${showWifiQr ? 'text-blue-500' : 'text-slate-400'}`}
                                  >
                                    <QrCode size={20} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* WiFi QR Code */}
                          {showWifiQr && currentItinerary.hotel.wifi_info && (() => {
                            const wifiData = parseWifiInfo(currentItinerary.hotel.wifi_info);
                            if (!wifiData) return null;
                            const wifiString = `WIFI:T:WPA;S:${wifiData.ssid};P:${wifiData.password};;`;
                            
                            return (
                              <div className="bg-white p-4 rounded-xl self-start animate-in fade-in zoom-in duration-200">
                                <QRCodeSVG value={wifiString} size={150} />
                                <p className="text-slate-500 text-xs font-bold text-center mt-2">掃描自動連線</p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    
                    {/* Taxi Mode Button */}
                    <div className="w-full pt-4 border-t border-slate-800/50">
                       <TaxiMode hotel={currentItinerary.hotel} leaderPhone={group?.leader_phone} />
                    </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 text-center">
                <Building2 className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 font-bold">尚未安排飯店</p>
              </div>
            )}

            {/* Daily Schedule */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-black flex items-center gap-2">
                  <Calendar className="text-blue-500" />
                  行程表
                </h3>
              </div>
              
              <div className="space-y-4">
                {itinSpots[currentItinerary.id]?.map((spotItem, idx) => (
                  <div key={spotItem.id} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600" />
                    
                    <div className="flex gap-4 relative z-10">
                      <div className="flex flex-col items-center gap-2 shrink-0">
                        <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center font-black text-lg text-slate-300 border border-slate-700">
                          {idx + 1}
                        </div>
                        <div className="h-full w-0.5 bg-slate-800 my-2" />
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-blue-400 font-bold text-sm mb-1">
                              {spotItem.start_time ? spotItem.start_time.slice(0,5) : '--:--'}
                            </div>
                            <h4 className="text-xl font-black text-white leading-tight">
                              {spotItem.spot?.name}
                            </h4>
                          </div>
                        </div>

                        {myTables[`${currentItinerary.id}_${spotItem.spot_id}`] && (
                          <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/50 px-4 py-2 rounded-xl">
                            <UtensilsCrossed size={16} className="text-purple-400" />
                            <span className="text-purple-300 font-bold text-sm">桌號: {myTables[`${currentItinerary.id}_${spotItem.spot_id}`]}</span>
                          </div>
                        )}

                        {spotItem.notes && (
                          <div className="bg-slate-950/50 rounded-xl p-4 text-slate-400 text-sm leading-relaxed border border-slate-800/50 flex gap-3">
                            <StickyNote size={16} className="shrink-0 mt-0.5 text-slate-500" />
                            {spotItem.notes}
                          </div>
                        )}
                        
                        {/* Next Spot Info (Travel Time) */}
                        {itinSpots[currentItinerary.id]?.[idx + 1] && (
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mt-2 pl-1">
                            <Navigation size={12} />
                            <span>前往下一站</span>
                            <div className="h-px bg-slate-800 w-8" />
                            <Clock size={12} />
                            <span>
                              {formatTimeWithNextDate(
                                itinSpots[currentItinerary.id][idx + 1].start_time,
                                currentItinerary.trip_date
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {(!itinSpots[currentItinerary.id] || itinSpots[currentItinerary.id].length === 0) && (
                  <div className="text-center py-12 text-slate-500 bg-slate-900/50 rounded-[2rem] border border-slate-800 border-dashed">
                    <p className="font-bold">今日無特定行程安排</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function TravelerLIFFPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-slate-400 font-bold animate-pulse">載入中...</p>
      </div>
    }>
      <TravelerContent />
    </Suspense>
  );
}
