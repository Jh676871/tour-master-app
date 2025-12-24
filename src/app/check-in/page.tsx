'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, Circle, ArrowLeft, Loader2, Search, MapPin, Users, Bell, Send, CheckCircle, Smartphone } from 'lucide-react';
import Link from 'next/link';

interface Traveler {
  id: string;
  full_name: string;
  room_number: string;
  gender: string;
  dietary_needs: string;
  line_uid?: string;
}

export default function CheckInPage() {
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationName, setLocationName] = useState('集合點');
  const [nudging, setNudging] = useState<string | null>(null);
  const [sendingRoom, setSendingRoom] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);

    // Subscribe to realtime check_ins changes
    const channel = supabase
      .channel('public:check_ins')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'check_ins' }, (payload) => {
        console.log('Realtime change received:', payload);
        if (payload.eventType === 'INSERT') {
          setCheckedIds(prev => new Set([...prev, payload.new.traveler_id]));
        } else if (payload.eventType === 'DELETE') {
          setCheckedIds(prev => {
            const next = new Set(prev);
            next.delete(payload.old.traveler_id);
            return next;
          });
        }
      })
      .subscribe();

    return () => {
      controller.abort();
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const { data: rawData, error: fetchError } = await supabase
        .from('travelers')
        .select('*');

      if (fetchError) throw fetchError;

      const mappedTravelers = (rawData || []).map(t => {
        return {
          id: t.id,
          full_name: t.full_name || t.name || '未名',
          room_number: String(t.room_number || t.room_no || t.room || ''),
          gender: t.gender || '未指定',
          dietary_needs: t.dietary_needs || t.diet || '無',
          line_uid: t.line_uid
        } as Traveler;
      });

      const sortedTravelers = [...mappedTravelers].sort((a, b) => 
        a.room_number.localeCompare(b.room_number, undefined, { numeric: true })
      );

      setTravelers(sortedTravelers);

      const { data: checkinsData, error: checkinsError } = await supabase
        .from('check_ins')
        .select('traveler_id');

      if (checkinsError) throw checkinsError;
      
      const checkedSet = new Set<string>((checkinsData || []).map(c => c.traveler_id));
      setCheckedIds(checkedSet);
    } catch (error: any) {
      if (error.name !== 'AbortError' && !error.message?.includes('AbortError')) {
        console.error('Error fetching data:', error.message || error);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleCheckIn = async (travelerId: string) => {
    const isChecked = checkedIds.has(travelerId);
    
    // Optimistic update
    const newCheckedIds = new Set(checkedIds);
    if (isChecked) {
      newCheckedIds.delete(travelerId);
    } else {
      newCheckedIds.add(travelerId);
    }
    setCheckedIds(newCheckedIds);

    try {
      if (isChecked) {
        const { error } = await supabase.from('check_ins').delete().eq('traveler_id', travelerId);
        if (error) throw error;
      } else {
        const insertData: any = { traveler_id: travelerId };
        if (locationName) insertData.location_name = locationName;

        const { error } = await supabase.from('check_ins').insert([insertData]);
        
        if (error) {
          if (error.message.includes('column') && error.message.includes('location_name')) {
            const { error: retryError } = await supabase
              .from('check_ins')
              .insert([{ traveler_id: travelerId }]);
            if (retryError) throw retryError;
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('Error toggling check-in:', error);
      // Revert optimistic update
      fetchData();
      alert('操作失敗，請稍後再試');
    }
  };

  const sendRoomInfo = async (traveler: Traveler) => {
    if (!traveler.line_uid) {
      alert('該旅客尚未綁定 LINE，無法發送訊息。');
      return;
    }

    setSendingRoom(traveler.id);
    try {
      const response = await fetch('/api/line/send-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ travelerId: traveler.id })
      });

      const data = await response.json();
      if (data.success) {
        alert(`房號資訊已發送給 ${traveler.full_name}`);
      } else {
        alert(`發送失敗: ${data.error}`);
      }
    } catch (error) {
      alert('發送發生錯誤');
    } finally {
      setSendingRoom(null);
    }
  };

  const handleNudge = async (traveler: Traveler) => {
    if (!traveler.line_uid) {
      alert('該旅客尚未綁定 LINE！');
      return;
    }

    setNudging(traveler.id);
    try {
      const response = await fetch('/api/line/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: traveler.line_uid,
          message: '【重要提醒】集合時間已到，請儘速回報位置！領隊正在集合點等候大家。'
        })
      });

      if (!response.ok) throw new Error('發送失敗');
      alert(`已成功發送提醒給 ${traveler.full_name}！`);
    } catch (error: any) {
      alert(`發送失敗：${error.message}`);
    } finally {
      setNudging(null);
    }
  };

  const filteredTravelers = travelers.filter(t => 
    t.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.room_number.includes(searchTerm)
  );

  const checkedInTravelers = filteredTravelers.filter(t => checkedIds.has(t.id));
  const notCheckedInTravelers = filteredTravelers.filter(t => !checkedIds.has(t.id));

  const checkedCount = checkedIds.size;
  const totalCount = travelers.length;
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  return (
    <main className="min-h-screen bg-slate-900 text-white pb-40">
      {/* Sticky Top Header - High Contrast Deep Blue */}
      <div className="bg-slate-950 border-b border-slate-800 sticky top-0 z-30 shadow-2xl">
        <div className="max-w-4xl mx-auto px-6 py-4 md:py-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-slate-900/50 p-2 rounded-xl border border-slate-800">
              <ArrowLeft className="w-6 h-6" />
              <span className="font-bold text-base hidden sm:inline">返回</span>
            </Link>
            <div className="flex flex-col items-center">
              <h1 className="text-xl md:text-2xl font-black tracking-tight">每日點名</h1>
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Daily Check-in</span>
            </div>
            <div className="bg-slate-800 p-2 rounded-xl border border-slate-700">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
          </div>

          {/* Large Progress Indicator - Compact for mobile */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 md:p-6 border border-slate-800 mb-4 md:mb-6 shadow-inner">
            <div className="flex justify-between items-end mb-2 md:mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">點名進度</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl md:text-4xl font-black text-blue-500">{checkedCount}</span>
                <span className="text-lg md:text-xl font-bold text-slate-600">/ {totalCount}</span>
              </div>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 md:h-4 overflow-hidden border border-slate-700">
              <div 
                className="bg-gradient-to-r from-blue-600 to-blue-400 h-full transition-all duration-700 ease-out shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Search bar stays at top for quick access */}
          <div className="relative group">
            <Search className="w-6 h-6 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-blue-400 transition-colors" />
            <input 
              type="text" 
              placeholder="搜尋姓名或房號..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-slate-800 border-2 border-slate-700 rounded-2xl focus:outline-none focus:border-blue-500 text-lg font-bold transition-all placeholder:text-slate-600 shadow-lg"
            />
          </div>
        </div>
      </div>

      {/* Traveler List - Optimized for thumb scrolling */}
      <div className="max-w-4xl mx-auto px-6 mt-6">
        <div className="flex items-center gap-3 px-5 py-3 bg-blue-900/20 border border-blue-800/30 rounded-2xl text-blue-300 mb-6">
          <MapPin className="w-5 h-5 flex-shrink-0" />
          <span className="font-bold text-sm whitespace-nowrap">地點:</span>
          <input 
            type="text" 
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            className="bg-transparent border-b border-blue-800/50 focus:border-blue-400 focus:outline-none text-base font-black text-white px-2 w-full"
          />
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-500" />
            <p className="font-bold text-xl uppercase tracking-widest">名單載入中</p>
          </div>
        ) : filteredTravelers.length > 0 ? (
          <div className="space-y-10">
            {/* 未報到區域 */}
            {notCheckedInTravelers.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-lg font-black text-orange-400 flex items-center gap-2">
                    <Bell className="w-5 h-5 animate-bounce" /> 未報到 ({notCheckedInTravelers.length})
                  </h2>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pending</span>
                </div>
                <div className="grid gap-3">
                  {notCheckedInTravelers.map((traveler) => (
                    <div 
                      key={traveler.id}
                      className="flex items-center gap-3"
                    >
                      <button 
                        onClick={() => toggleCheckIn(traveler.id)}
                        className="flex-1 flex items-center justify-between p-5 rounded-[1.5rem] border-2 bg-slate-800 border-slate-700 hover:border-slate-600 transition-all active:scale-[0.96]"
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl transition-all shadow-lg bg-slate-700 text-slate-400">
                            {traveler.full_name.charAt(0)}
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2 mb-0.5">
                              <div className="font-black text-xl tracking-tight text-slate-100">
                                {traveler.full_name}
                              </div>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                traveler.gender === '女' 
                                  ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' 
                                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              }`}>
                                {traveler.gender}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-bold text-xs px-2 py-0.5 rounded-full bg-slate-900 text-slate-400">
                                房號 {traveler.room_number}
                              </div>
                            </div>
                          </div>
                        </div>
                        <Circle className="w-8 h-8 text-slate-600" />
                      </button>

                      {/* 操作按鈕組 */}
                      <div className="flex flex-col gap-2">
                        {/* 催促按鈕 */}
                        <button
                          onClick={() => handleNudge(traveler)}
                          disabled={nudging === traveler.id}
                          className={`w-14 h-12 rounded-[1.5rem] flex items-center justify-center transition-all active:scale-90 border-2 ${
                            traveler.line_uid 
                              ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20' 
                              : 'bg-slate-800/50 border-slate-700 text-slate-600 cursor-not-allowed'
                          }`}
                          title={traveler.line_uid ? "一鍵催促" : "尚未綁定 LINE"}
                        >
                          {nudging === traveler.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Send className="w-5 h-5" />
                          )}
                        </button>
                        
                        {/* 發送房號按鈕 */}
                        <button
                          onClick={() => sendRoomInfo(traveler)}
                          disabled={sendingRoom === traveler.id}
                          className={`w-14 h-12 rounded-[1.5rem] flex items-center justify-center transition-all active:scale-90 border-2 ${
                            traveler.line_uid 
                              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20' 
                              : 'bg-slate-800/50 border-slate-700 text-slate-600 cursor-not-allowed'
                          }`}
                          title={traveler.line_uid ? "發送房號" : "尚未綁定 LINE"}
                        >
                          {sendingRoom === traveler.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Smartphone className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 已報到區域 */}
            {checkedInTravelers.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-lg font-black text-green-400 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" /> 已報到 ({checkedInTravelers.length})
                  </h2>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Completed</span>
                </div>
                <div className="grid gap-3 opacity-80">
                  {checkedInTravelers.map((traveler) => (
                    <div 
                      key={traveler.id}
                      className="flex items-center gap-3"
                    >
                      <button 
                        onClick={() => toggleCheckIn(traveler.id)}
                        className="flex-1 flex items-center justify-between p-5 rounded-[1.5rem] border-2 bg-blue-600 border-blue-400 shadow-[0_10px_30px_rgba(37,99,235,0.1)] transition-all active:scale-[0.96]"
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl transition-all shadow-lg bg-blue-500 text-white">
                            {traveler.full_name.charAt(0)}
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2 mb-0.5">
                              <div className="font-black text-xl tracking-tight text-white">
                                {traveler.full_name}
                              </div>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-white/20 text-white border-white/30">
                                {traveler.gender}
                              </span>
                            </div>
                            <div className="font-bold text-xs px-2 py-0.5 rounded-full bg-blue-700 text-blue-100 w-fit">
                              房號 {traveler.room_number}
                            </div>
                          </div>
                        </div>
                        <CheckCircle2 className="w-8 h-8 text-white fill-current" />
                      </button>

                      {/* 操作按鈕組 (已報到) */}
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => sendRoomInfo(traveler)}
                          disabled={sendingRoom === traveler.id}
                          className={`w-14 h-[84px] rounded-[1.5rem] flex items-center justify-center transition-all active:scale-90 border-2 ${
                            traveler.line_uid 
                              ? 'bg-blue-500/10 border-blue-400/30 text-white hover:bg-blue-500/20' 
                              : 'bg-slate-800/50 border-slate-700 text-slate-400 cursor-not-allowed'
                          }`}
                          title={traveler.line_uid ? "發送房號" : "尚未綁定 LINE"}
                        >
                          {sendingRoom === traveler.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Smartphone className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-20 text-center bg-slate-800/30 rounded-3xl border-2 border-dashed border-slate-700">
            <p className="text-xl font-bold text-slate-500 uppercase tracking-widest">無搜尋結果</p>
          </div>
        )}
      </div>

      {/* Floating Bottom Navigation for One-Handed Operation */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-40 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent">
        <div className="max-w-4xl mx-auto flex gap-4">
          <Link 
            href="/"
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black py-5 rounded-2xl text-center shadow-2xl border border-slate-700 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-6 h-6" />
            <span>結束點名</span>
          </Link>
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-20 bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-900/40 transition-all active:scale-95 border border-blue-400"
          >
            <div className="rotate-90">
              <ArrowLeft className="w-8 h-8" />
            </div>
          </button>
        </div>
      </div>
    </main>
  );
}
