'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  MapPin, 
  Search, 
  Plus, 
  ArrowLeft, 
  Loader2, 
  Image as ImageIcon,
  Trash2,
  ExternalLink,
  Tag,
  Map as MapIcon,
  Navigation
} from 'lucide-react';
import Link from 'next/link';
import { Spot } from '@/types/database';

export default function SpotsPage() {
  const [loading, setLoading] = useState(true);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newSpot, setNewSpot] = useState({
    name: '',
    address: '',
    description: '',
    google_map_url: '',
    category: '熱門景點',
    image_url: ''
  });

  useEffect(() => {
    fetchSpots();
  }, []);

  const fetchSpots = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('spots')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSpots(data || []);
    } catch (error: any) {
      console.error('Error fetching spots:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSpot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('spots')
        .insert([newSpot])
        .select()
        .single();
      
      if (error) throw error;
      setSpots([data, ...spots]);
      setShowAddModal(false);
      setNewSpot({
        name: '',
        address: '',
        description: '',
        google_map_url: '',
        category: '熱門景點',
        image_url: ''
      });
    } catch (error: any) {
      alert(`新增失敗: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSpot = async (id: string) => {
    if (!confirm('確定要刪除此景點嗎？')) return;
    try {
      const { error } = await supabase.from('spots').delete().eq('id', id);
      if (error) throw error;
      setSpots(spots.filter(s => s.id !== id));
    } catch (error: any) {
      alert(`刪除失敗: ${error.message}`);
    }
  };

  const filteredSpots = spots.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <header className="bg-slate-900/50 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
              <ArrowLeft className="w-6 h-6 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-xl font-black tracking-tight">景點資料庫</h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">SPOT MASTER DATABASE</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black transition-all shadow-lg shadow-blue-900/40"
          >
            <Plus className="w-5 h-5" />
            <span className="uppercase tracking-widest text-sm">新增景點</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Bar */}
        <div className="relative mb-8">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500" />
          <input 
            type="text"
            placeholder="搜尋景點名稱、地址或分類..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border-2 border-slate-800 rounded-[2rem] pl-16 pr-6 py-5 font-bold focus:border-blue-500 outline-none transition-all text-lg shadow-xl"
          />
        </div>

        {/* Spots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSpots.map((spot) => (
            <div key={spot.id} className="bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] overflow-hidden group hover:border-blue-500/50 transition-all flex flex-col">
              <div className="aspect-video bg-slate-950 relative overflow-hidden">
                {spot.image_url ? (
                  <img src={spot.image_url} alt={spot.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-800">
                    <MapIcon className="w-16 h-16" />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <span className="bg-blue-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                    {spot.category || '景點'}
                  </span>
                </div>
                <button 
                  onClick={() => handleDeleteSpot(spot.id)}
                  className="absolute top-4 right-4 p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all opacity-0 group-hover:opacity-100 backdrop-blur-md"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-black mb-2 group-hover:text-blue-400 transition-colors">{spot.name}</h3>
                <div className="flex items-start gap-2 text-slate-500 text-sm font-bold mb-4">
                  <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{spot.address || '未提供地址'}</span>
                </div>
                
                <p className="text-slate-400 text-sm font-medium line-clamp-3 mb-6 flex-1">
                  {spot.description || '暫無景點描述...'}
                </p>

                <div className="flex gap-3 pt-4 border-t border-slate-800">
                  {spot.google_map_url && (
                    <a 
                      href={spot.google_map_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-2xl font-black text-xs transition-all"
                    >
                      <Navigation className="w-4 h-4 text-blue-400" />
                      地圖導航
                    </a>
                  )}
                  <button className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl transition-all">
                    <ImageIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add New Card (Empty State) */}
          {filteredSpots.length === 0 && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="border-2 border-dashed border-slate-800 rounded-[2.5rem] p-12 flex flex-col items-center justify-center gap-4 hover:bg-slate-900/50 hover:border-blue-500/50 transition-all group"
            >
              <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-8 h-8 text-slate-600" />
              </div>
              <span className="text-slate-500 font-black uppercase tracking-widest">新增第一個景點</span>
            </button>
          )}
        </div>
      </main>

      {/* Add Spot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="relative bg-slate-900 border-2 border-slate-800 rounded-[3rem] p-10 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
            <h3 className="text-3xl font-black mb-8 flex items-center gap-3">
              <Plus className="w-8 h-8 text-blue-500" /> 新增景點
            </h3>
            <form onSubmit={handleAddSpot} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4">景點名稱</label>
                  <input 
                    required
                    type="text"
                    placeholder="例如：清水寺"
                    value={newSpot.name}
                    onChange={(e) => setNewSpot({...newSpot, name: e.target.value})}
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 font-bold focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4">景點分類</label>
                  <select 
                    value={newSpot.category}
                    onChange={(e) => setNewSpot({...newSpot, category: e.target.value})}
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 font-bold focus:border-blue-500 outline-none transition-all appearance-none"
                  >
                    <option value="熱門景點">熱門景點</option>
                    <option value="美食餐廳">美食餐廳</option>
                    <option value="購物商場">購物商場</option>
                    <option value="自然景觀">自然景觀</option>
                    <option value="文化體驗">文化體驗</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4">詳細地址</label>
                <input 
                  type="text"
                  placeholder="請輸入景點完整地址"
                  value={newSpot.address}
                  onChange={(e) => setNewSpot({...newSpot, address: e.target.value})}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 font-bold focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4">Google Maps 連結</label>
                <div className="relative">
                  <Navigation className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input 
                    type="text"
                    placeholder="https://maps.app.goo.gl/..."
                    value={newSpot.google_map_url}
                    onChange={(e) => setNewSpot({...newSpot, google_map_url: e.target.value})}
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl pl-16 pr-6 py-4 font-bold focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4">景點描述</label>
                <textarea 
                  rows={4}
                  placeholder="輸入關於此景點的介紹、開放時間或特色..."
                  value={newSpot.description}
                  onChange={(e) => setNewSpot({...newSpot, description: e.target.value})}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-3xl px-6 py-4 font-bold focus:border-blue-500 outline-none transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4">景點圖片網址 (選填)</label>
                <input 
                  type="text"
                  placeholder="https://..."
                  value={newSpot.image_url}
                  onChange={(e) => setNewSpot({...newSpot, image_url: e.target.value})}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 font-bold focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-5 rounded-2xl font-black transition-all"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black transition-all shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
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
