'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  UserPlus, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  FileUp, 
  Download, 
  Calendar,
  Hotel,
  Save,
  Search,
  User,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { Traveler, Group, Itinerary, TravelerRoom } from '@/types/database';

export default function TravelersPage() {
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [selectedItineraryId, setSelectedItineraryId] = useState<string>('');
  
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [roomMappings, setRoomMappings] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      fetchItineraries(selectedGroupId);
      fetchTravelers(selectedGroupId);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedItineraryId) {
      fetchRoomNumbers(selectedItineraryId);
    } else {
      setRoomMappings({});
    }
  }, [selectedItineraryId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('groups').select('*');
      if (data && data.length > 0) {
        setGroups(data);
        setSelectedGroupId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchItineraries = async (groupId: string) => {
    const { data } = await supabase
      .from('itineraries')
      .select('*, hotel:hotels(*)')
      .eq('group_id', groupId)
      .order('trip_date', { ascending: true });
    
    if (data) {
      setItineraries(data);
      if (data.length > 0) {
        setSelectedItineraryId(data[0].id);
      } else {
        setSelectedItineraryId('');
      }
    }
  };

  const fetchTravelers = async (groupId: string) => {
    setFetching(true);
    const { data } = await supabase
      .from('travelers')
      .select('*')
      .eq('group_id', groupId)
      .order('full_name', { ascending: true });
    
    if (data) setTravelers(data);
    setFetching(false);
  };

  const fetchRoomNumbers = async (itineraryId: string) => {
    const { data } = await supabase
      .from('traveler_rooms')
      .select('*')
      .eq('itinerary_id', itineraryId);
    
    const mapping: Record<string, string> = {};
    if (data) {
      data.forEach((r: TravelerRoom) => {
        mapping[r.traveler_id] = r.room_number;
      });
    }
    setRoomMappings(mapping);
  };

  const handleRoomChange = (travelerId: string, roomNumber: string) => {
    setRoomMappings(prev => ({ ...prev, [travelerId]: roomNumber }));
  };

  const saveRoomNumbers = async () => {
    if (!selectedItineraryId) return;
    setLoading(true);
    try {
      const updates = Object.entries(roomMappings).map(([travelerId, roomNumber]) => ({
        traveler_id: travelerId,
        itinerary_id: selectedItineraryId,
        room_number: roomNumber
      }));

      const { error } = await supabase
        .from('traveler_rooms')
        .upsert(updates, { onConflict: 'traveler_id,itinerary_id' });

      if (error) throw error;
      setMessage({ type: 'success', text: '房號儲存成功！' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      alert(`儲存失敗: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredTravelers = travelers.filter(t => 
    t.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGroupId) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(ws) as any[];

        const formattedData = rawData.map(row => ({
          full_name: row['姓名'] || row['name'] || '',
          gender: row['性別'] || '男',
          dietary_needs: row['飲食需求'] || '無',
          group_id: selectedGroupId
        })).filter(t => t.full_name);

        const { error } = await supabase.from('travelers').insert(formattedData);
        if (error) throw error;
        
        setMessage({ type: 'success', text: `成功匯入 ${formattedData.length} 位旅客！` });
        fetchTravelers(selectedGroupId);
      } catch (error: any) {
        alert(`匯入失敗: ${error.message}`);
      } finally {
        setImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  if (loading && groups.length === 0) {
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
          <h1 className="text-xl font-black tracking-tight">旅客房號管理</h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
            匯入名單
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx,.xls" />
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Controls Section */}
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">選擇團體</label>
            <select 
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 focus:border-blue-500 focus:outline-none font-bold text-lg appearance-none"
            >
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">選擇行程日期 (設定該日房號)</label>
            <select 
              value={selectedItineraryId}
              onChange={(e) => setSelectedItineraryId(e.target.value)}
              className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 focus:border-blue-500 focus:outline-none font-bold text-lg appearance-none"
            >
              <option value="">請選擇日期</option>
              {itineraries.map(it => (
                <option key={it.id} value={it.id}>
                  {it.trip_date} - {it.hotel?.name || '未設定飯店'}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">搜尋旅客</label>
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="輸入姓名..."
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl pl-14 pr-6 py-4 focus:border-blue-500 focus:outline-none font-bold text-lg"
              />
            </div>
          </div>
        </div>

        {/* Selected Itinerary Summary (Admin View) */}
        {selectedItineraryId && itineraries.find(i => i.id === selectedItineraryId) && (
          <div className="bg-blue-600/10 border-2 border-blue-500/20 rounded-[2rem] p-6 animate-in fade-in slide-in-from-top-4 duration-500">
            {(() => {
              const itin = itineraries.find(i => i.id === selectedItineraryId)!;
              return (
                <div className="flex flex-wrap items-center gap-8">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl">
                      {itineraries.indexOf(itin) + 1}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">當前選取日期</p>
                      <h3 className="text-xl font-black">{itin.trip_date}</h3>
                    </div>
                  </div>
                  
                  <div className="flex gap-6">
                    {itin.morning_call_time && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-orange-400" />
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Morning Call</p>
                          <p className="font-bold text-lg">{itin.morning_call_time}</p>
                        </div>
                      </div>
                    )}
                    {itin.meeting_time && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-green-400" />
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">集合時間</p>
                          <p className="font-bold text-lg">{itin.meeting_time}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {itin.schedule_text && (
                    <div className="flex-1 min-w-[200px] border-l-2 border-slate-800 pl-6">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">今日行程摘要</p>
                      <p className="text-sm font-bold text-slate-400 line-clamp-2">{itin.schedule_text}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Travelers Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-xl overflow-hidden">
          <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <h2 className="text-xl font-black flex items-center gap-3">
              <User className="w-6 h-6 text-blue-500" />
              旅客名單 ({filteredTravelers.length} 位)
            </h2>
            <button 
              onClick={saveRoomNumbers}
              disabled={loading || !selectedItineraryId}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 transition-all shadow-lg shadow-blue-900/40"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              儲存今日房號
            </button>
          </div>

          {fetching ? (
            <div className="p-20 text-center">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
              <p className="mt-4 text-slate-500 font-bold">載入名單中...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-950/50">
                    <th className="px-8 py-5 text-left text-xs font-black text-slate-500 uppercase tracking-widest">旅客姓名</th>
                    <th className="px-8 py-5 text-left text-xs font-black text-slate-500 uppercase tracking-widest">房號設定</th>
                    <th className="px-8 py-5 text-left text-xs font-black text-slate-500 uppercase tracking-widest">性別/飲食</th>
                    <th className="px-8 py-5 text-right text-xs font-black text-slate-500 uppercase tracking-widest">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredTravelers.map(t => (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-8 py-6 font-bold text-lg">{t.full_name}</td>
                      <td className="px-8 py-6">
                        <input 
                          type="text"
                          value={roomMappings[t.id] || ''}
                          onChange={(e) => handleRoomChange(t.id, e.target.value)}
                          placeholder="請輸入房號"
                          disabled={!selectedItineraryId}
                          className="bg-slate-950 border-2 border-slate-800 rounded-xl px-4 py-2 focus:border-blue-500 focus:outline-none font-bold w-32 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex gap-2">
                          <span className="bg-slate-800 px-3 py-1 rounded-lg text-sm font-bold text-slate-400">{t.gender}</span>
                          <span className="bg-slate-800 px-3 py-1 rounded-lg text-sm font-bold text-slate-400">{t.dietary_needs}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button className="p-2 text-slate-600 hover:text-red-500 transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Success/Error Message Toast */}
      {message && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-black animate-in fade-in slide-in-from-bottom-4 ${
          message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          {message.text}
        </div>
      )}
    </main>
  );
}
