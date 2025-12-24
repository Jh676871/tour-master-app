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
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTraveler, setNewTraveler] = useState({
    full_name: '',
    gender: '男',
    dietary_needs: '無',
    emergency_contact: '',
    blood_type: '',
    medical_notes: ''
  });

  const DIETARY_OPTIONS = ['全素', '蛋奶素', '不吃牛', '不吃豬', '海鮮過敏', '花生過敏', '無'];

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('groups')
          .select('*');
          
        if (data && data.length > 0) {
          setGroups(data);
          setSelectedGroupId(data[0].id);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError' && !error.message?.includes('AbortError')) {
          console.error('Error fetching groups:', error.message || error);
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

    if (selectedGroupId) {
      const loadGroupData = async () => {
        try {
          // Fetch Itineraries
          const { data: itinData } = await supabase
            .from('itineraries')
            .select('*, hotel:hotels(*)')
            .eq('group_id', selectedGroupId)
            .order('trip_date', { ascending: true });
          
          if (itinData) {
            setItineraries(itinData);
            if (itinData.length > 0) {
              setSelectedItineraryId(itinData[0].id);
            } else {
              setSelectedItineraryId('');
            }
          }

          // Fetch Travelers
          setFetching(true);
          const { data: travelerData } = await supabase
            .from('travelers')
            .select('*')
            .eq('group_id', selectedGroupId)
            .order('full_name', { ascending: true });
          
          if (travelerData) setTravelers(travelerData);
        } catch (error: any) {
          if (error.name !== 'AbortError' && !error.message?.includes('AbortError')) {
            console.error('Error loading group data:', error.message || error);
          }
        } finally {
          setFetching(false);
        }
      };

      loadGroupData();
    }

    return () => controller.abort();
  }, [selectedGroupId]);

  useEffect(() => {
    const controller = new AbortController();

    if (selectedItineraryId) {
      const loadRoomNumbers = async () => {
        try {
          const { data } = await supabase
            .from('traveler_rooms')
            .select('traveler_id, room_number')
            .eq('itinerary_id', selectedItineraryId);
          
          if (data) {
            const mapping: Record<string, string> = {};
            data.forEach(r => {
              mapping[r.traveler_id] = r.room_number;
            });
            setRoomMappings(mapping);
          }
        } catch (error: any) {
          if (error.name !== 'AbortError' && !error.message?.includes('AbortError')) {
            console.error('Error loading room numbers:', error.message || error);
          }
        }
      };

      loadRoomNumbers();
    } else {
      setRoomMappings({});
    }

    return () => controller.abort();
  }, [selectedItineraryId]);

  const fetchInitialData = async (signal?: AbortSignal) => {
    // Keep this for manual refresh if needed, but the effect handles initial load
    try {
      setLoading(true);
      const { data } = await supabase.from('groups').select('*');
      if (data && data.length > 0) {
        setGroups(data);
        setSelectedGroupId(data[0].id);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError' && !error.message?.includes('AbortError')) {
        console.error('Error fetching groups:', error.message || error);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchItineraries = async (groupId: string, signal?: AbortSignal) => {
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

  const fetchTravelers = async (groupId: string, signal?: AbortSignal) => {
    setFetching(true);
    const { data } = await supabase
      .from('travelers')
      .select('*')
      .eq('group_id', groupId)
      .order('full_name', { ascending: true });
    
    if (data) setTravelers(data);
    setFetching(false);
  };

  const fetchRoomNumbers = async (itineraryId: string, signal?: AbortSignal) => {
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

  const handleDietaryChange = async (travelerId: string, needs: string) => {
    try {
      const { error } = await supabase
        .from('travelers')
        .update({ dietary_needs: needs })
        .eq('id', travelerId);
      
      if (error) throw error;
      
      setTravelers(prev => prev.map(t => 
        t.id === travelerId ? { ...t, dietary_needs: needs } : t
      ));
    } catch (error: any) {
      alert(`更新飲食需求失敗: ${error.message}`);
    }
  };

  const toggleDietaryTag = (traveler: Traveler, tag: string) => {
    let currentNeeds = traveler.dietary_needs || '無';
    let newNeeds = '';

    if (tag === '無') {
      newNeeds = '無';
    } else {
      const tags = currentNeeds === '無' ? [] : currentNeeds.split(',').map(t => t.trim());
      if (tags.includes(tag)) {
        const filtered = tags.filter(t => t !== tag);
        newNeeds = filtered.length > 0 ? filtered.join(', ') : '無';
      } else {
        const filtered = tags.filter(t => t !== '無');
        newNeeds = [...filtered, tag].join(', ');
      }
    }
    handleDietaryChange(traveler.id, newNeeds);
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

  const handleAddTraveler = async () => {
    if (!newTraveler.full_name || !selectedGroupId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('travelers')
        .insert([{
          ...newTraveler,
          group_id: selectedGroupId
        }])
        .select()
        .single();

      if (error) throw error;

      setTravelers(prev => [...prev, data]);
      setNewTraveler({ 
        full_name: '', 
        gender: '男', 
        dietary_needs: '無',
        emergency_contact: '',
        blood_type: '',
        medical_notes: ''
      });
      setShowAddModal(false);
      setMessage({ type: 'success', text: '旅客新增成功！' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      alert(`新增失敗: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTraveler = async (id: string) => {
    if (!confirm('確定要刪除這位旅客嗎？')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('travelers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTravelers(prev => prev.filter(t => t.id !== id));
      setMessage({ type: 'success', text: '旅客已刪除' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      alert(`刪除失敗: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredTravelers = travelers.filter(t => 
    t.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const downloadTemplate = () => {
    const templateData = [
      {
        '姓名': '王小明',
        '性別': '男',
        '飲食需求': '無',
        '緊急聯絡人': '林小姐/0912345678',
        '血型': 'A+',
        '醫療備註': '無過敏史'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '旅客名單範本');
    XLSX.writeFile(wb, 'tour_master_traveler_template.xlsx');
  };

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
          emergency_contact: row['緊急聯絡人'] || '',
          blood_type: row['血型'] || '',
          medical_notes: row['醫療備註'] || '',
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
        <div className="flex items-center gap-2">
          <button 
            onClick={downloadTemplate}
            title="下載範本"
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 w-12 h-12 rounded-xl font-bold flex items-center justify-center transition-all"
          >
            <Download className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            title="新增旅客"
            className="bg-blue-600 hover:bg-blue-500 text-white w-12 h-12 rounded-xl font-bold flex items-center justify-center transition-all shadow-lg shadow-blue-900/40"
          >
            <UserPlus className="w-6 h-6" />
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            title="匯入名單"
            className="bg-slate-800 hover:bg-slate-700 text-white w-12 h-12 rounded-xl font-bold flex items-center justify-center transition-all"
          >
            {importing ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileUp className="w-6 h-6" />}
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
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
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
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {DIETARY_OPTIONS.map(option => {
                              const isSelected = t.dietary_needs?.includes(option) || (option === '無' && (t.dietary_needs === '無' || !t.dietary_needs));
                              return (
                                <button
                                  key={option}
                                  onClick={() => toggleDietaryTag(t, option)}
                                  className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all border touch-manipulation min-w-[48px] min-h-[48px] flex items-center justify-center ${
                                    isSelected 
                                      ? 'bg-blue-600 border-blue-400 text-white' 
                                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'
                                  }`}
                                >
                                  {option}
                                </button>
                              );
                            })}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.gender}</span>
                            <span className="text-[10px] font-bold text-slate-600">目前設定: {t.dietary_needs || '無'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button 
                            onClick={() => handleDeleteTraveler(t.id)}
                            className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden p-4 space-y-4">
                {filteredTravelers.map(t => (
                  <div key={t.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="text-xl font-black text-white">{t.full_name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.gender}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteTraveler(t.id)}
                        className="p-3 text-slate-600 hover:text-red-500 transition-colors bg-slate-900 rounded-xl min-w-[48px] min-h-[48px] flex items-center justify-center"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Room Number Input */}
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">房號設定</label>
                      <input 
                        type="text"
                        value={roomMappings[t.id] || ''}
                        onChange={(e) => handleRoomChange(t.id, e.target.value)}
                        placeholder="請輸入房號"
                        disabled={!selectedItineraryId}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none font-bold text-sm disabled:opacity-50"
                      />
                    </div>

                    {/* Dietary Options */}
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">飲食需求</label>
                      <div className="flex flex-wrap gap-2">
                        {DIETARY_OPTIONS.map(option => {
                          const isSelected = t.dietary_needs?.includes(option) || (option === '無' && (t.dietary_needs === '無' || !t.dietary_needs));
                          return (
                            <button
                              key={option}
                              onClick={() => toggleDietaryTag(t, option)}
                              className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all border touch-manipulation min-w-[48px] min-h-[48px] flex items-center justify-center ${
                                isSelected 
                                  ? 'bg-blue-600 border-blue-400 text-white' 
                                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'
                              }`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Traveler Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-800">
              <h2 className="text-2xl font-black flex items-center gap-3">
                <UserPlus className="w-6 h-6 text-blue-500" />
                新增旅客
              </h2>
            </div>
            
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">旅客姓名</label>
                  <input 
                    type="text"
                    value={newTraveler.full_name}
                    onChange={(e) => setNewTraveler(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="姓名"
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 focus:border-blue-500 focus:outline-none font-bold text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">性別</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['男', '女'].map(g => (
                      <button
                        key={g}
                        onClick={() => setNewTraveler(prev => ({ ...prev, gender: g }))}
                        className={`py-4 rounded-2xl font-black text-lg border-2 transition-all ${
                          newTraveler.gender === g 
                            ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40' 
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">緊急聯絡人/電話</label>
                  <input 
                    type="text"
                    value={newTraveler.emergency_contact}
                    onChange={(e) => setNewTraveler(prev => ({ ...prev, emergency_contact: e.target.value }))}
                    placeholder="姓名/電話"
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 focus:border-blue-500 focus:outline-none font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">血型</label>
                  <select 
                    value={newTraveler.blood_type}
                    onChange={(e) => setNewTraveler(prev => ({ ...prev, blood_type: e.target.value }))}
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 focus:border-blue-500 focus:outline-none font-bold appearance-none"
                  >
                    <option value="">未設定</option>
                    {['A', 'B', 'AB', 'O'].map(type => (
                      <React.Fragment key={type}>
                        <option value={`${type}+`}>{type}+</option>
                        <option value={`${type}-`}>{type}-</option>
                      </React.Fragment>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">醫療備註</label>
                <textarea 
                  value={newTraveler.medical_notes}
                  onChange={(e) => setNewTraveler(prev => ({ ...prev, medical_notes: e.target.value }))}
                  placeholder="過敏史、長期用藥等..."
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 focus:border-blue-500 focus:outline-none font-bold min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">飲食需求</label>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_OPTIONS.map(option => {
                    const isSelected = newTraveler.dietary_needs?.includes(option) || (option === '無' && (newTraveler.dietary_needs === '無' || !newTraveler.dietary_needs));
                    return (
                      <button
                        key={option}
                        onClick={() => {
                          let currentNeeds = newTraveler.dietary_needs || '無';
                          let newNeeds = '';
                          if (option === '無') {
                            newNeeds = '無';
                          } else {
                            const tags = currentNeeds === '無' ? [] : currentNeeds.split(',').map(t => t.trim());
                            if (tags.includes(option)) {
                              const filtered = tags.filter(t => t !== option);
                              newNeeds = filtered.length > 0 ? filtered.join(', ') : '無';
                            } else {
                              const filtered = tags.filter(t => t !== '無');
                              newNeeds = [...filtered, option].join(', ');
                            }
                          }
                          setNewTraveler(prev => ({ ...prev, dietary_needs: newNeeds }));
                        }}
                        className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border touch-manipulation min-h-[44px] flex items-center justify-center ${
                          isSelected 
                            ? 'bg-blue-600 border-blue-400 text-white' 
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-950/50 flex gap-4">
              <button 
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-black transition-all"
              >
                取消
              </button>
              <button 
                onClick={handleAddTraveler}
                disabled={!newTraveler.full_name || loading}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white py-4 rounded-2xl font-black transition-all shadow-lg shadow-blue-900/40"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : '確認新增'}
              </button>
            </div>
          </div>
        </div>
      )}

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
