'use client';

import React, { useEffect, useState, Suspense } from 'react';
import liff from '@line/liff';
import { supabase } from '@/lib/supabase';
import { Loader2, Hotel, Wifi, Key, User, MapPin } from 'lucide-react';

function TravelerInfoContent() {
  const [loading, setLoading] = useState(true);
  const [traveler, setTraveler] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // 模擬飯店資訊（實際開發可從資料庫取得）
  const hotelInfo = {
    name: '東京大倉酒店 (The Okura Tokyo)',
    address: '東京都港區虎之門 2-10-4',
    wifiSsid: 'Okura_Guest_WiFi',
    wifiPass: 'welcome2025'
  };

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID || '' });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        
        const profile = await liff.getProfile();
        
        // 根據 LINE UID 取得旅客資料
        const { data, error: fetchError } = await supabase
          .from('travelers')
          .select('*')
          .eq('line_uid', profile.userId)
          .single();

        if (fetchError || !data) {
          throw new Error('找不到您的旅客資料，請確認是否已完成綁定。');
        }

        setTraveler(data);
      } catch (err: any) {
        console.error('Error:', err);
        setError(err.message || '載入失敗');
      } finally {
        setLoading(false);
      }
    };

    initLiff();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <Loader2 className="w-16 h-16 animate-spin text-blue-500 mb-4" />
        <p className="text-slate-400 animate-pulse">正在取得您的住房資訊...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-[2rem] max-w-sm">
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-slate-800 rounded-xl text-sm font-medium"
          >
            重新整理
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 pt-4">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
          <User className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">{traveler.full_name} 貴賓</h1>
          <p className="text-slate-500 text-sm">歡迎抵達飯店</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Room Number Card - HUGE FONT */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 shadow-2xl shadow-blue-900/20 relative overflow-hidden group">
          <Key className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
          <div className="relative z-10">
            <p className="text-blue-100 font-medium mb-2 flex items-center gap-2">
              <Hotel className="w-5 h-5" /> 您的房號
            </p>
            <h2 className="text-8xl font-black tracking-tighter text-white mb-2">
              {traveler.room_number || '確認中'}
            </h2>
            <p className="text-blue-200/80 text-sm">行李將由行李員送至您的門口</p>
          </div>
        </div>

        {/* Hotel Info Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-800 rounded-2xl">
              <Hotel className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">{hotelInfo.name}</h3>
              <p className="text-slate-500 text-sm flex items-center gap-1">
                <MapPin className="w-4 h-4" /> {hotelInfo.address}
              </p>
            </div>
          </div>

          <div className="h-px bg-slate-800 mx-2" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-800 rounded-2xl">
                <Wifi className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider font-bold">WiFi SSID</p>
                <p className="font-mono text-blue-100">{hotelInfo.wifiSsid}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-xs uppercase tracking-wider font-bold">Password</p>
              <p className="font-mono text-green-400 font-bold">{hotelInfo.wifiPass}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 p-6 rounded-[2rem] flex flex-col items-center gap-2 transition-all active:scale-95">
            <MapPin className="w-6 h-6 text-blue-400" />
            <span className="text-sm font-bold">飯店地圖</span>
          </button>
          <button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 p-6 rounded-[2rem] flex flex-col items-center gap-2 transition-all active:scale-95">
            <User className="w-6 h-6 text-green-400" />
            <span className="text-sm font-bold">聯繫領隊</span>
          </button>
        </div>
      </div>

      <p className="text-center text-slate-600 text-xs mt-12">
        Tour Master 2025 © 智慧領隊助手
      </p>
    </main>
  );
}

export default function TravelerInfoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    }>
      <TravelerInfoContent />
    </Suspense>
  );
}
