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
  Navigation
} from 'lucide-react';

interface Traveler {
  id: string;
  full_name: string;
  room_number: string;
  line_uid: string;
  group_id: string;
}

interface Group {
  id: string;
  name: string;
  hotel_name: string;
  hotel_address: string;
  wifi_info: string;
}

export default function TravelerLIFFPage() {
  const [liffLoading, setLiffLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [traveler, setTraveler] = useState<Traveler | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [binding, setBinding] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Binding Form State
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
      if (!liffId) {
        throw new Error('LIFF ID is missing');
      }

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
    const { data, error } = await supabase
      .from('travelers')
      .select('*, group:group_id(*)')
      .eq('line_uid', lineUid)
      .single();

    if (data) {
      setTraveler(data);
      setGroup(data.group);
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
      // 1. 驗證團體代碼
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('group_code', formData.group_code.trim())
        .single();

      if (groupError || !groupData) {
        throw new Error('團體代碼不正確，請詢問您的領隊。');
      }

      // 2. 查找旅客 (名稱匹配且尚未綁定 LINE)
      const { data: travelerData, error: travelerError } = await supabase
        .from('travelers')
        .select('*')
        .eq('group_id', groupData.id)
        .eq('full_name', formData.name.trim())
        .is('line_uid', null)
        .single();

      if (travelerError || !travelerData) {
        throw new Error('找不到您的報名資料，或您已經綁定過了。請確認姓名是否正確。');
      }

      // 3. 執行綁定
      const { error: updateError } = await supabase
        .from('travelers')
        .update({ line_uid: userId })
        .eq('id', travelerData.id);

      if (updateError) throw updateError;

      // 4. 成功，重新獲取資料
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

  // Case 1: Need Binding
  if (!traveler) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center">
        {/* Debug Info: LINE User ID Verification */}
        {userId && (
          <div className="fixed top-4 left-4 right-4 z-50 bg-slate-900/80 backdrop-blur-md border border-slate-700 p-3 rounded-xl flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <p className="text-[10px] font-mono text-slate-400 break-all">
              <span className="text-blue-400 font-black mr-2">LINE ID:</span>
              {userId}
            </p>
          </div>
        )}

        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-4">
            <div className="bg-blue-600 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-blue-900/40 border border-blue-400">
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
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 focus:border-blue-500 focus:outline-none transition-all font-bold text-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-1">團體代碼</label>
              <input
                type="text"
                value={formData.group_code}
                onChange={(e) => setFormData({ ...formData, group_code: e.target.value })}
                placeholder="領隊提供的 6 碼代碼"
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 focus:border-purple-500 focus:outline-none transition-all font-bold text-lg uppercase"
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
              className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-[1.5rem] font-black text-lg uppercase tracking-widest transition-all shadow-xl shadow-blue-900/40 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {binding ? <Loader2 className="w-6 h-6 animate-spin" /> : '立即綁定'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Case 2: Dashboard (Bound)
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Debug Info: LINE User ID Verification */}
      {userId && (
        <div className="bg-slate-900/30 border-b border-slate-800 px-6 py-1 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          <p className="text-[9px] font-mono text-slate-500 break-all">
            <span className="text-slate-600 font-bold mr-1">LINE UID:</span>
            {userId}
          </p>
        </div>
      )}

      {/* Top Welcome Bar */}
      <div className="bg-slate-900/50 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl">
            {traveler.full_name[0]}
          </div>
          <div>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Welcome Back</p>
            <h2 className="font-black text-lg">{traveler.full_name} 貴賓</h2>
          </div>
        </div>
        <div className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-[10px] font-black border border-green-500/20 uppercase tracking-tighter">
          Line Bound
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* HUGE HOTEL NAME & ROOM NUMBER */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[3rem] shadow-2xl shadow-blue-900/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="relative z-10 space-y-8">
            <div className="space-y-1">
              <p className="text-blue-200 text-xs font-black uppercase tracking-[0.3em]">Current Hotel</p>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight">
                {group?.hotel_name || '尚未設定飯店'}
              </h1>
            </div>
            
            <div className="flex items-end justify-between">
              <div className="space-y-1">
                <p className="text-blue-200 text-xs font-black uppercase tracking-[0.3em]">Room Number</p>
                <div className="text-7xl md:text-8xl font-black tracking-tighter text-white">
                  {traveler.room_number || '---'}
                </div>
              </div>
              <div className="bg-white/20 p-4 rounded-[2rem] backdrop-blur-md border border-white/20">
                <Building2 className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-4">
          {/* Copy Address */}
          <button 
            onClick={() => group?.hotel_address && copyToClipboard(group.hotel_address)}
            className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] flex items-center justify-between group active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-5">
              <div className="bg-green-500/10 p-4 rounded-2xl text-green-400 group-hover:scale-110 transition-transform">
                <MapPin className="w-8 h-8" />
              </div>
              <div className="text-left">
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Hotel Address</p>
                <p className="font-bold text-slate-200 line-clamp-1">給計程車司機看地址</p>
              </div>
            </div>
            <div className={`p-3 rounded-xl transition-colors ${copied ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {copied ? <CheckCircle2 className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
            </div>
          </button>

          {/* WiFi Info */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="bg-orange-500/10 p-4 rounded-2xl text-orange-400">
                <Wifi className="w-8 h-8" />
              </div>
              <div className="text-left">
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Hotel Wi-Fi</p>
                <p className="font-bold text-slate-200">{group?.wifi_info || '詢問櫃檯'}</p>
              </div>
            </div>
            <button 
              onClick={() => group?.wifi_info && copyToClipboard(group.wifi_info)}
              className="p-3 bg-slate-800 text-slate-400 rounded-xl hover:text-white transition-colors"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Help */}
        <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 p-8 rounded-[2.5rem] text-center space-y-4">
          <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
            <Navigation className="w-6 h-6 text-blue-400" />
          </div>
          <p className="text-slate-400 text-sm font-bold">
            迷路或需要協助？<br/>
            點擊地址複製後，可直接貼入 Google Map 導航。
          </p>
        </div>
      </div>
    </main>
  );
}
