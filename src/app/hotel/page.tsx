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
  Hotel
} from 'lucide-react';
import Link from 'next/link';

interface Group {
  id: string;
  name: string;
  hotel_name: string;
  hotel_address: string;
  wifi_info: string;
}

export default function HotelSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [group, setGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState({
    hotel_name: '',
    hotel_address: '',
    wifi_info: ''
  });

  useEffect(() => {
    fetchGroupData();
  }, []);

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      // 獲取第一個團體資料 (目前系統預設為單一團體操作模式)
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }

      if (data) {
        setGroup(data);
        setFormData({
          hotel_name: data.hotel_name || '',
          hotel_address: data.hotel_address || '',
          wifi_info: data.wifi_info || ''
        });
      }
    } catch (error) {
      console.error('Error fetching group:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      if (group) {
        // 更新現有團體
        const { error } = await supabase
          .from('groups')
          .update({
            hotel_name: formData.hotel_name,
            hotel_address: formData.hotel_address,
            wifi_info: formData.wifi_info
          })
          .eq('id', group.id);

        if (error) throw error;
      } else {
        // 如果沒有團體，先建立一個預設團體 (兼容模式)
        const { data, error } = await supabase
          .from('groups')
          .insert([{
            name: '我的團體',
            hotel_name: formData.hotel_name,
            hotel_address: formData.hotel_address,
            wifi_info: formData.wifi_info
          }])
          .select()
          .single();

        if (error) throw error;
        setGroup(data);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      alert(`儲存失敗: ${error.message}`);
    } finally {
      setSaving(false);
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
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </Link>
          <h1 className="text-xl font-black tracking-tight">飯店資訊設定</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-8">
        {/* Intro Section */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="relative z-10">
            <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
              <Hotel className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-black mb-2">管理住宿資訊</h2>
            <p className="text-blue-100 font-medium">填寫後旅客可隨時透過 LINE 機器人查詢飯店地址與 Wi-Fi。</p>
          </div>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl space-y-6">
            {/* Hotel Name */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-black text-slate-400 uppercase tracking-widest ml-1">
                <Building2 className="w-4 h-4 text-blue-400" />
                飯店名稱
              </label>
              <input
                type="text"
                value={formData.hotel_name}
                onChange={(e) => setFormData({ ...formData, hotel_name: e.target.value })}
                placeholder="例如：東京希爾頓酒店"
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 focus:border-blue-500 focus:outline-none transition-all font-bold text-lg"
              />
            </div>

            {/* Hotel Address */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-black text-slate-400 uppercase tracking-widest ml-1">
                <MapPin className="w-4 h-4 text-green-400" />
                飯店地址
              </label>
              <textarea
                value={formData.hotel_address}
                onChange={(e) => setFormData({ ...formData, hotel_address: e.target.value })}
                placeholder="請輸入詳細地址..."
                rows={3}
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 focus:border-green-500 focus:outline-none transition-all font-bold text-lg resize-none"
              />
            </div>

            {/* WiFi Info */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-black text-slate-400 uppercase tracking-widest ml-1">
                <Wifi className="w-4 h-4 text-orange-400" />
                Wi-Fi 帳密
              </label>
              <input
                type="text"
                value={formData.wifi_info}
                onChange={(e) => setFormData({ ...formData, wifi_info: e.target.value })}
                placeholder="例如：Guest_WiFi / 12345678"
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 focus:border-orange-500 focus:outline-none transition-all font-bold text-lg"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className={`w-full py-6 rounded-[2rem] font-black text-xl uppercase tracking-widest transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-95 ${
              success 
                ? 'bg-green-600 shadow-green-900/40' 
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/40'
            }`}
          >
            {saving ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : success ? (
              <>
                <CheckCircle2 className="w-6 h-6" />
                已儲存成功
              </>
            ) : (
              <>
                <Save className="w-6 h-6" />
                儲存設定
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
