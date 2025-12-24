'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Building2, 
  MapPin, 
  Wifi, 
  Save, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2,
  Hotel as HotelIcon,
  Plus,
  Calendar,
  Clock,
  Trash2,
  Phone,
  Search,
  ExternalLink,
  StickyNote
} from 'lucide-react';
import Link from 'next/link';
import { Hotel, Group, Itinerary } from '@/types/database';

export default function HotelSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [hotelSearch, setHotelSearch] = useState('');
  
  const [showAddHotel, setShowAddHotel] = useState(false);
  const [newHotel, setNewHotel] = useState({
    name: '',
    address: '',
    phone: '',
    wifi_info: '',
    google_map_url: '',
    breakfast_info: '',
    gym_pool_info: '',
    guide_notes: ''
  });

  useEffect(() => {
    const controller = new AbortController();

    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [groupsRes, hotelsRes] = await Promise.all([
          supabase.from('groups').select('*').abortSignal(controller.signal),
          supabase.from('hotels').select('*').abortSignal(controller.signal)
        ]);

        if (groupsRes.data) {
          setGroups(groupsRes.data);
          if (groupsRes.data.length > 0) {
            setSelectedGroupId(groupsRes.data[0].id);
          }
        }
        if (hotelsRes.data) setHotels(hotelsRes.data);
      } catch (error: any) {
        if (error.name !== 'AbortError' && !error.message?.includes('AbortError')) {
          console.error('Error fetching data:', error.message || error);
        }
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadItineraries = async () => {
      if (!selectedGroupId) return;
      try {
        const { data } = await supabase
          .from('itineraries')
          .select('*, hotel:hotels(*)')
          .eq('group_id', selectedGroupId)
          .order('trip_date', { ascending: true })
          .abortSignal(controller.signal);
        
        if (data) setItineraries(data);
      } catch (error: any) {
        if (error.name !== 'AbortError' && !error.message?.includes('AbortError')) {
          console.error('Error loading itineraries:', error.message || error);
        }
      }
    };

    loadItineraries();
    return () => controller.abort();
  }, [selectedGroupId]);

  const fetchInitialData = async (signal?: AbortSignal) => {
    // Keep for manual refresh
    try {
      setLoading(true);
      const query = supabase.from('groups').select('*');
      if (signal) query.abortSignal(signal);
      
      const { data } = await query;
      if (data) setGroups(data);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching data:', error.message || error);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchItineraries = async (groupId: string, signal?: AbortSignal) => {
    const query = supabase
      .from('itineraries')
      .select('*, hotel:hotels(*)')
      .eq('group_id', groupId)
      .order('trip_date', { ascending: true });
    
    if (signal) query.abortSignal(signal);
    
    const { data } = await query;
    if (data) setItineraries(data);
  };

  const handleAddHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('hotels')
        .insert([newHotel])
        .select()
        .single();
      
      if (error) throw error;
      setHotels([...hotels, data]);
      setNewHotel({ name: '', address: '', phone: '', wifi_info: '' });
      setShowAddHotel(false);
    } catch (error: any) {
      alert(`新增飯店失敗: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddItinerary = async () => {
    if (!selectedGroupId) return;
    
    // Default to next day after the last itinerary or today
    const lastDate = itineraries.length > 0 
      ? new Date(itineraries[itineraries.length - 1].trip_date)
      : new Date();
    
    const nextDate = new Date(lastDate);
    if (itineraries.length > 0) nextDate.setDate(nextDate.getDate() + 1);
    
    const formattedDate = nextDate.toISOString().split('T')[0];

    try {
      const { data, error } = await supabase
        .from('itineraries')
        .insert([{
          group_id: selectedGroupId,
          trip_date: formattedDate,
          hotel_id: hotels.length > 0 ? hotels[0].id : null
        }])
        .select('*, hotel:hotels(*)')
        .single();
      
      if (error) throw error;
      setItineraries([...itineraries, data]);
    } catch (error: any) {
      alert(`新增行程失敗: ${error.message}`);
    }
  };

  const handleUpdateItinerary = async (id: string, updates: Partial<Itinerary>) => {
    try {
      // 移除 hotel 關聯對象，避免更新失敗
      const { hotel, ...cleanUpdates } = updates as any;
      
      // 將空字串轉換為 null
      Object.keys(cleanUpdates).forEach(key => {
        if (cleanUpdates[key] === '') {
          cleanUpdates[key] = null;
        }
      });

      const { error } = await supabase
        .from('itineraries')
        .update(cleanUpdates)
        .eq('id', id);
      
      if (error) throw error;
      setItineraries(itineraries.map(it => it.id === id ? { ...it, ...updates } : it));
    } catch (error: any) {
      console.error('Update failed details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      alert(`更新失敗: ${error.message || '未知錯誤'}`);
    }
  };

  const handleDeleteItinerary = async (id: string) => {
    if (!confirm('確定要刪除此日行程嗎？')) return;
    try {
      const { error } = await supabase.from('itineraries').delete().eq('id', id);
      if (error) throw error;
      setItineraries(itineraries.filter(it => it.id !== id));
    } catch (error: any) {
      alert(`刪除失敗: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white pb-20">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </Link>
          <h1 className="text-xl font-black tracking-tight">飯店與行程設定</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/hotels"
            className="bg-slate-800 hover:bg-slate-700 text-green-400 px-4 py-2 rounded-xl font-black transition-all flex items-center gap-2 text-sm"
          >
            <HotelIcon className="w-5 h-5" />
            飯店資料庫
          </Link>
          <button 
            onClick={() => {
              setSaving(true);
              Promise.all(itineraries.map(it => handleUpdateItinerary(it.id, it)))
                .then(() => alert('全部儲存成功'))
                .catch(err => alert('部分儲存失敗: ' + err.message))
                .finally(() => setSaving(false));
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-black transition-all flex items-center gap-2 text-sm shadow-lg shadow-blue-900/40"
          >
            <Save className="w-5 h-5" />
            全部儲存
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Selection Section */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] shadow-xl flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">選擇團體</label>
            <select 
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full bg-slate-950 border-2 border-slate-800 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none font-bold"
            >
              {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.group_code})</option>)}
            </select>
          </div>
          <button 
            onClick={() => setShowAddHotel(true)}
            className="mt-6 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            新增飯店
          </button>
        </div>

        {/* Itinerary List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-500" />
              每日行程設定
            </h2>
            <button 
              onClick={handleAddItinerary}
              className="bg-slate-800 hover:bg-slate-700 text-blue-400 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              新增一日
            </button>
          </div>

          {itineraries.length === 0 ? (
            <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[2rem] p-12 text-center">
              <p className="text-slate-500 font-bold">目前尚無行程資料，請點擊上方按鈕新增。</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {itineraries.map((it, index) => (
                <div key={it.id} className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl space-y-6 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
                  
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-600/20 text-blue-400 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl">
                        {index + 1}
                      </div>
                      <input 
                        type="date"
                        value={it.trip_date}
                        onChange={(e) => handleUpdateItinerary(it.id, { trip_date: e.target.value })}
                        className="bg-transparent border-none text-2xl font-black focus:outline-none text-white cursor-pointer"
                      />
                    </div>
                    <button 
                      onClick={() => handleDeleteItinerary(it.id)}
                      className="p-3 text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Hotel Selection */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                        <HotelIcon className="w-4 h-4" /> 住宿飯店
                      </label>
                      <div className="relative group/search">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within/search:text-blue-500 transition-colors" />
                        <input 
                          type="text"
                          placeholder="搜尋飯店..."
                          value={hotelSearch}
                          onChange={(e) => setHotelSearch(e.target.value)}
                          className="w-full bg-slate-950 border-2 border-slate-800 rounded-t-2xl px-11 py-3 focus:border-blue-500 focus:outline-none font-bold text-sm"
                        />
                      </div>
                      <select 
                        value={it.hotel_id || ''}
                        onChange={(e) => handleUpdateItinerary(it.id, { hotel_id: e.target.value })}
                        className="w-full bg-slate-950 border-2 border-t-0 border-slate-800 rounded-b-2xl px-6 py-4 focus:border-blue-500 focus:outline-none font-bold text-lg appearance-none"
                      >
                        <option value="">未選擇飯店</option>
                        {hotels
                          .filter(h => h.name.toLowerCase().includes(hotelSearch.toLowerCase()))
                          .map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                      </select>
                    </div>

                    {/* Times */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                          <Clock className="w-4 h-4 text-orange-400" /> Morning Call
                        </label>
                        <input 
                          type="time"
                          value={it.morning_call_time || ''}
                          onChange={(e) => handleUpdateItinerary(it.id, { morning_call_time: e.target.value })}
                          className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-4 py-4 focus:border-orange-500 focus:outline-none font-bold text-lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                          <Clock className="w-4 h-4 text-green-400" /> 集合時間
                        </label>
                        <input 
                          type="time"
                          value={it.meeting_time || ''}
                          onChange={(e) => handleUpdateItinerary(it.id, { meeting_time: e.target.value })}
                          className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-4 py-4 focus:border-green-500 focus:outline-none font-bold text-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Schedule Text */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">行程內容摘要</label>
                    <textarea 
                      value={it.schedule_text || ''}
                      onChange={(e) => handleUpdateItinerary(it.id, { schedule_text: e.target.value })}
                      placeholder="例如：今日前往淺草寺，傍晚入住飯店..."
                      rows={2}
                      className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 focus:border-blue-500 focus:outline-none font-bold text-lg resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Hotel Modal */}
      {showAddHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowAddHotel(false)}></div>
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden">
            <div className="p-8 border-b border-slate-800">
              <h2 className="text-2xl font-black">新增飯店資訊</h2>
            </div>
            <form onSubmit={handleAddHotel} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">飯店名稱</label>
                <input 
                  type="text"
                  required
                  value={newHotel.name}
                  onChange={(e) => setNewHotel({...newHotel, name: e.target.value})}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 focus:border-blue-500 focus:outline-none font-bold text-lg"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">飯店地址</label>
                <input 
                  type="text"
                  value={newHotel.address}
                  onChange={(e) => setNewHotel({...newHotel, address: e.target.value})}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 focus:border-blue-500 focus:outline-none font-bold text-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">電話</label>
                  <input 
                    type="text"
                    value={newHotel.phone}
                    onChange={(e) => setNewHotel({...newHotel, phone: e.target.value})}
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 focus:border-blue-500 focus:outline-none font-bold text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Wi-Fi 資訊</label>
                  <input 
                    type="text"
                    value={newHotel.wifi_info}
                    onChange={(e) => setNewHotel({...newHotel, wifi_info: e.target.value})}
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 focus:border-blue-500 focus:outline-none font-bold text-lg"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Google Maps 連結</label>
                <input 
                  type="text"
                  value={newHotel.google_map_url}
                  onChange={(e) => setNewHotel({...newHotel, google_map_url: e.target.value})}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 focus:border-blue-500 focus:outline-none font-bold text-lg"
                  placeholder="https://maps.app.goo.gl/..."
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">早餐資訊</label>
                <textarea 
                  value={newHotel.breakfast_info}
                  onChange={(e) => setNewHotel({...newHotel, breakfast_info: e.target.value})}
                  rows={2}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 focus:border-blue-500 focus:outline-none font-bold text-lg resize-none"
                  placeholder="例如：06:30-10:00 2樓餐廳"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddHotel(false)}
                  className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-black transition-all"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black transition-all shadow-lg shadow-blue-900/40"
                >
                  {saving ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : '儲存飯店'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
