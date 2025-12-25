'use client';

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AddGroupModal: React.FC<AddGroupModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    destination_country: 'Japan', // Default
  });

  const COUNTRIES = [
    { code: 'Japan', name: '日本 (Japan)' },
    { code: 'Korea', name: '韓國 (Korea)' },
    { code: 'Thailand', name: '泰國 (Thailand)' },
    { code: 'Vietnam', name: '越南 (Vietnam)' },
    { code: 'USA', name: '美國 (USA)' },
    { code: 'UK', name: '英國 (UK)' },
    { code: 'Europe', name: '歐洲 (Europe)' },
    { code: 'Taiwan', name: '台灣 (Taiwan)' },
    { code: 'Others', name: '其他 (Others)' },
  ];

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Generate a random 6-character group code
      const groupCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { data, error } = await supabase
        .from('groups')
        .insert([
          { 
            name: formData.name, 
            start_date: formData.start_date, 
            end_date: formData.end_date,
            destination_country: formData.destination_country,
            group_code: groupCode
          }
        ])
        .select()
        .single();

      if (error) {
        if (error.message.includes('column "end_date" of relation "groups" does not exist')) {
          throw new Error('資料庫結構尚未更新，請先執行 SQL 腳本添加 end_date 欄位。');
        }
        throw error;
      }
      
      setFormData({ 
        name: '', 
        start_date: '', 
        end_date: '', 
        destination_country: 'Japan',
        flight_number: '',
        departure_time: ''
      });
      onClose();
      if (onSuccess) onSuccess();
      
      // 跳轉到編輯頁面
      if (data && data.id) {
        router.push(`/groups/${data.id}/edit`);
      }
    } catch (error: any) {
      alert(`新增團體失敗: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border-2 border-slate-700 relative animate-in zoom-in-95 duration-200">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        
        <div className="flex justify-between items-center px-8 py-7 border-b border-slate-800 bg-slate-900/50">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">新增團體行程</h2>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mt-1">Create New Tour</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all border border-slate-700 active:scale-90"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>
        
        <form className="p-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">團體名稱</label>
            <input 
              required
              type="text" 
              placeholder="例如：日本關西五日賞楓團"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-6 py-4 bg-slate-950 border-2 border-slate-800 rounded-2xl focus:outline-none focus:border-blue-500 text-lg font-bold text-white transition-all placeholder:text-slate-700 shadow-inner"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">旅遊國家 / 地區</label>
            <select
              value={formData.destination_country}
              onChange={(e) => setFormData({...formData, destination_country: e.target.value})}
              className="w-full px-6 py-4 bg-slate-950 border-2 border-slate-800 rounded-2xl focus:outline-none focus:border-blue-500 text-lg font-bold text-white transition-all shadow-inner appearance-none"
            >
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">開始日期</label>
              <input 
                required
                type="date" 
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                className="w-full px-6 py-4 bg-slate-950 border-2 border-slate-800 rounded-2xl focus:outline-none focus:border-blue-500 text-lg font-bold text-white transition-all shadow-inner [color-scheme:dark]"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">結束日期</label>
              <input 
                required
                type="date" 
                value={formData.end_date}
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                className="w-full px-6 py-4 bg-slate-950 border-2 border-slate-800 rounded-2xl focus:outline-none focus:border-blue-500 text-lg font-bold text-white transition-all shadow-inner [color-scheme:dark]"
              />
            </div>
          </div>
          
          <div className="pt-6 flex gap-4">
            <button 
              type="button"
              disabled={loading}
              onClick={onClose}
              className="flex-1 px-6 py-5 bg-slate-800 text-slate-400 font-black rounded-2xl hover:bg-slate-700 hover:text-white transition-all border-2 border-slate-700 active:scale-95 uppercase tracking-widest text-sm"
            >
              取消
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40 border-2 border-blue-400 active:scale-95 uppercase tracking-widest text-sm flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '確認新增'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddGroupModal;
