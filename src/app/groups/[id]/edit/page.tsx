'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Calendar, 
  Clock, 
  Building2, 
  MapPin, 
  Wifi, 
  Phone,
  Users,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Hotel as HotelIcon
} from 'lucide-react';
import Link from 'next/link';
import { Group, Hotel, Itinerary, Traveler, TravelerRoom } from '@/types/database';

export default function GroupEditPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Data
  const [group, setGroup] = useState<Group | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [roomMappings, setRoomMappings] = useState<Record<string, Record<string, string>>>({}); // { itineraryId: { travelerId: roomNumber } }

  // UI State
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [showAddHotelModal, setShowAddHotelModal] = useState(false);
  const [newHotel, setNewHotel] = useState({
    name: '',
    address: '',
    phone: '',
    wifi_info: ''
  });

  useEffect(() => {
    if (groupId) {
      fetchData();
    }
  }, [groupId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Group
      const { data: groupData } = await supabase.from('groups').select('*').eq('id', groupId).single();
      if (!groupData) throw new Error('找不到團體資料');
      setGroup(groupData);

      // 2. Fetch Hotels
      const { data: hotelsData } = await supabase.from('hotels').select('*').order('name');
      setHotels(hotelsData || []);

      // 3. Fetch Itineraries
      const { data: itinerariesData } = await supabase
        .from('itineraries')
        .select('*, hotel:hotels(*)')
        .eq('group_id', groupId)
        .order('trip_date', { ascending: true });
      
      let currentItineraries = itinerariesData || [];

      // 如果沒有行程，根據團體日期自動生成
      if (currentItineraries.length === 0 && groupData.start_date && groupData.end_date) {
        const start = new Date(groupData.start_date);
        const end = new Date(groupData.end_date);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        const newItins = [];
        for (let i = 0; i < days; i++) {
          const date = new Date(start);
          date.setDate(start.getDate() + i);
          newItins.push({
            group_id: groupId,
            trip_date: date.toISOString().split('T')[0],
            schedule_text: '',
            morning_call_time: '07:00',
            meeting_time: '08:00',
            hotel_id: null
          });
        }
        
        const { data: insertedItins } = await supabase.from('itineraries').insert(newItins).select();
        currentItineraries = insertedItins || [];
      }
      setItineraries(currentItineraries);

      // 4. Fetch Travelers
      const { data: travelersData } = await supabase.from('travelers').select('*').eq('group_id', groupId).order('full_name');
      setTravelers(travelersData || []);

      // 5. Fetch All Room Numbers for this group
      if (currentItineraries.length > 0) {
        const itinIds = currentItineraries.map(i => i.id);
        const { data: roomsData } = await supabase
          .from('traveler_rooms')
          .select('*')
          .in('itinerary_id', itinIds);
        
        const mapping: Record<string, Record<string, string>> = {};
        roomsData?.forEach(room => {
          if (!mapping[room.itinerary_id]) mapping[room.itinerary_id] = {};
          mapping[room.itinerary_id][room.traveler_id] = room.room_number;
        });
        setRoomMappings(mapping);
      }

    } catch (error: any) {
      console.error('Fetch error:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setMessage(null);
    try {
      // 1. Update Itineraries
      for (const itin of itineraries) {
        const { hotel, ...itinData } = itin as any; // Remove joined hotel object
        
        // 將空字串轉換為 null
        Object.keys(itinData).forEach(key => {
          if (itinData[key] === '') {
            itinData[key] = null;
          }
        });

        const { error } = await supabase.from('itineraries').upsert(itinData);
        if (error) throw error;
      }

      // 2. Update Room Numbers
      const roomUpdates: any[] = [];
      Object.entries(roomMappings).forEach(([itinId, travelers]) => {
        Object.entries(travelers).forEach(([travelerId, roomNumber]) => {
          if (roomNumber.trim()) {
            roomUpdates.push({
              itinerary_id: itinId,
              traveler_id: travelerId,
              room_number: roomNumber
            });
          }
        });
      });

      if (roomUpdates.length > 0) {
        await supabase.from('traveler_rooms').upsert(roomUpdates, { onConflict: 'itinerary_id,traveler_id' });
      }

      setMessage({ type: 'success', text: '全部變更已儲存！' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: `儲存失敗: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleAddHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.from('hotels').insert([newHotel]).select().single();
      if (error) throw error;
      setHotels([...hotels, data]);
      setNewHotel({ name: '', address: '', phone: '', wifi_info: '' });
      setShowAddHotelModal(false);
      
      // 自動將當前天數設為這間新飯店
      const updatedItins = [...itineraries];
      updatedItins[activeDayIndex].hotel_id = data.id;
      setItineraries(updatedItins);
    } catch (error: any) {
      alert(`新增飯店失敗: ${error.message}`);
    }
  };

  const currentItinerary = itineraries[activeDayIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
              <ArrowLeft className="w-6 h-6 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-xl font-black tracking-tight">{group?.name}</h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">團體編輯中心</p>
            </div>
          </div>
          
          <button 
            onClick={handleSaveAll}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-black transition-all shadow-lg shadow-blue-900/40"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            <span className="uppercase tracking-widest text-sm">儲存變更</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {message && (
          <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 border ${
            message.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-red-500/10 border-red-500/50 text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-bold">{message.text}</span>
          </div>
        )}

        {/* Day Selector Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {itineraries.map((itin, idx) => (
            <button
              key={itin.id || idx}
              onClick={() => setActiveDayIndex(idx)}
              className={`flex-none px-6 py-4 rounded-2xl font-black transition-all border-2 ${
                activeDayIndex === idx 
                  ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40' 
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
              }`}
            >
              <div className="text-[10px] uppercase tracking-[0.2em] mb-1">Day</div>
              <div className="text-2xl">{idx + 1}</div>
              <div className="text-[10px] font-bold mt-1 opacity-60">{itin.trip_date.split('-').slice(1).join('/')}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Day Settings */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-slate-900 rounded-[2.5rem] border-2 border-slate-800 p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-blue-600/20 p-3 rounded-2xl">
                  <Calendar className="w-6 h-6 text-blue-500" />
                </div>
                <h2 className="text-2xl font-black tracking-tight">Day {activeDayIndex + 1} 行程排控</h2>
              </div>

              {currentItinerary && (
                <div className="space-y-8">
                  {/* Hotel Selector */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-black text-slate-400 uppercase tracking-widest">今日住宿飯店</label>
                      <button 
                        onClick={() => setShowAddHotelModal(true)}
                        className="text-xs font-black text-blue-400 hover:text-blue-300 flex items-center gap-1 uppercase tracking-widest"
                      >
                        <Plus className="w-3 h-3" />
                        新增飯店清單
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <select 
                        value={currentItinerary.hotel_id || ''}
                        onChange={(e) => {
                          const updated = [...itineraries];
                          updated[activeDayIndex].hotel_id = e.target.value || null;
                          setItineraries(updated);
                        }}
                        className="bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 font-bold focus:border-blue-500 outline-none transition-all appearance-none col-span-1"
                      >
                        <option value="">未設定飯店</option>
                        {hotels.map(h => (
                          <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                      </select>
                      
                      {currentItinerary.hotel_id && (
                        <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 flex items-center gap-3 text-slate-400">
                          <MapPin className="w-5 h-5 text-blue-500 shrink-0" />
                          <span className="text-sm font-bold truncate">
                            {hotels.find(h => h.id === currentItinerary.hotel_id)?.address || '無地址資訊'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Times */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Clock className="w-4 h-4" /> 晨喚時間
                      </label>
                      <input 
                        type="time"
                        value={currentItinerary.morning_call_time || ''}
                        onChange={(e) => {
                          const updated = [...itineraries];
                          updated[activeDayIndex].morning_call_time = e.target.value;
                          setItineraries(updated);
                        }}
                        className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 font-black focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Users className="w-4 h-4" /> 集合時間
                      </label>
                      <input 
                        type="time"
                        value={currentItinerary.meeting_time || ''}
                        onChange={(e) => {
                          const updated = [...itineraries];
                          updated[activeDayIndex].meeting_time = e.target.value;
                          setItineraries(updated);
                        }}
                        className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 font-black focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Schedule Description */}
                  <div className="space-y-3">
                    <label className="text-sm font-black text-slate-400 uppercase tracking-widest">今日行程簡介</label>
                    <textarea 
                      rows={4}
                      placeholder="輸入今日的主要景點或注意事項..."
                      value={currentItinerary.schedule_text || ''}
                      onChange={(e) => {
                        const updated = [...itineraries];
                        updated[activeDayIndex].schedule_text = e.target.value;
                        setItineraries(updated);
                      }}
                      className="w-full bg-slate-950 border-2 border-slate-800 rounded-3xl px-6 py-4 font-bold focus:border-blue-500 outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Right: Room Numbers for Active Day */}
          <div className="space-y-8">
            <section className="bg-slate-900 rounded-[2.5rem] border-2 border-slate-800 p-8 shadow-xl flex flex-col h-full">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600/20 p-3 rounded-2xl">
                    <HotelIcon className="w-6 h-6 text-blue-500" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">Day {activeDayIndex + 1} 房號</h2>
                </div>
                <div className="text-xs font-black text-slate-500 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                  {travelers.length} 位團員
                </div>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[600px] pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                {travelers.map(traveler => (
                  <div key={traveler.id} className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800 group hover:border-blue-500/50 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${
                        traveler.gender === '男' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'
                      }`}>
                        {traveler.gender === '男' ? 'M' : 'F'}
                      </div>
                      <span className="font-bold">{traveler.full_name}</span>
                    </div>
                    <input 
                      type="text"
                      placeholder="房號"
                      value={roomMappings[currentItinerary?.id]?.[traveler.id] || ''}
                      onChange={(e) => {
                        if (!currentItinerary) return;
                        const newMappings = { ...roomMappings };
                        if (!newMappings[currentItinerary.id]) newMappings[currentItinerary.id] = {};
                        newMappings[currentItinerary.id][traveler.id] = e.target.value;
                        setRoomMappings(newMappings);
                      }}
                      className="w-20 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-center font-black text-blue-400 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Add Hotel Modal */}
      {showAddHotelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowAddHotelModal(false)}></div>
          <div className="relative bg-slate-900 border-2 border-slate-800 rounded-[3rem] p-10 w-full max-w-lg shadow-2xl">
            <h3 className="text-3xl font-black mb-8 flex items-center gap-3">
              <Plus className="w-8 h-8 text-blue-500" /> 新增飯店
            </h3>
            <form onSubmit={handleAddHotel} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4">飯店名稱</label>
                <input 
                  required
                  type="text"
                  placeholder="例如：京都大倉酒店"
                  value={newHotel.name}
                  onChange={(e) => setNewHotel({...newHotel, name: e.target.value})}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 font-bold focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4">地址</label>
                <input 
                  type="text"
                  placeholder="完整地址"
                  value={newHotel.address}
                  onChange={(e) => setNewHotel({...newHotel, address: e.target.value})}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 font-bold focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4">電話</label>
                  <input 
                    type="text"
                    placeholder="電話號碼"
                    value={newHotel.phone}
                    onChange={(e) => setNewHotel({...newHotel, phone: e.target.value})}
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 font-bold focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4">WiFi 資訊</label>
                  <input 
                    type="text"
                    placeholder="SSID / Password"
                    value={newHotel.wifi_info}
                    onChange={(e) => setNewHotel({...newHotel, wifi_info: e.target.value})}
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 font-bold focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddHotelModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-black transition-all"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black transition-all shadow-lg shadow-blue-900/40"
                >
                  確定新增
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
