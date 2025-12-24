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
  Navigation,
  Pencil,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { Spot } from '@/types/database';

export default function SpotsPage() {
  const [loading, setLoading] = useState(true);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingSpot, setEditingSpot] = useState<Spot | null>(null);
  const [spotToDelete, setSpotToDelete] = useState<string | null>(null);

  const [newSpot, setNewSpot] = useState({
    name: '',
    address: '',
    description: '',
    google_map_url: '',
    category: '熱門景點',
    image_url: '',
    nearby_medical: ''
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

  const optimizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 1200;
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
          }, 'image/jpeg', 0.8);
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSpotImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      
      // Client-side Resize & Compress
      const optimizedFile = await optimizeImage(file);
      
      const fileExt = 'jpg';
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `spot-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('spot-images')
        .upload(filePath, optimizedFile, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('spot-images')
        .getPublicUrl(filePath);

      setNewSpot({ ...newSpot, image_url: publicUrl });
    } catch (error: any) {
      console.error('Error uploading image:', error.message);
      if (error.message === 'Bucket not found') {
        alert('❌ 找不到儲存桶！\n\n請至 Supabase 控制台建立名為 "spot-images" 的 Public Bucket。');
      } else {
        alert(`圖片上傳失敗: ${error.message}`);
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddSpot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingSpot) {
        // Update existing spot
        const { error } = await supabase
          .from('spots')
          .update(newSpot)
          .eq('id', editingSpot.id);
        
        if (error) throw error;
        
        setSpots(spots.map(s => s.id === editingSpot.id ? { ...s, ...newSpot } : s));
      } else {
        // Create new spot
        const { data, error } = await supabase
          .from('spots')
          .insert([newSpot])
          .select()
          .single();
        
        if (error) throw error;
        setSpots([data, ...spots]);
      }
      
      setShowAddModal(false);
      setNewSpot({
        name: '',
        address: '',
        description: '',
        google_map_url: '',
        category: '熱門景點',
        image_url: '',
        nearby_medical: ''
      });
      setEditingSpot(null);
    } catch (error: any) {
      alert(`${editingSpot ? '更新' : '新增'}失敗: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (spot: Spot) => {
    setEditingSpot(spot);
    setNewSpot({
      name: spot.name,
      address: spot.address || '',
      description: spot.description || '',
      google_map_url: spot.google_map_url || '',
      category: spot.category || '熱門景點',
      image_url: spot.image_url || '',
      nearby_medical: spot.nearby_medical || ''
    });
    setShowAddModal(true);
  };

  const handleDeleteClick = (id: string) => {
    setSpotToDelete(id);
  };

  const confirmDelete = async () => {
    if (!spotToDelete) return;
    try {
      const { error } = await supabase.from('spots').delete().eq('id', spotToDelete);
      if (error) throw error;
      setSpots(spots.filter(s => s.id !== spotToDelete));
      setSpotToDelete(null);
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
            <Link href="/" className="p-3 hover:bg-slate-800 rounded-xl transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center">
              <ArrowLeft className="w-6 h-6 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-xl font-black tracking-tight">景點資料庫</h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">SPOT MASTER DATABASE</p>
            </div>
          </div>
          
          <button 
            onClick={() => {
              setEditingSpot(null);
              setNewSpot({
                name: '',
                address: '',
                description: '',
                google_map_url: '',
                category: '熱門景點',
                image_url: '',
                nearby_medical: ''
              });
              setShowAddModal(true);
            }}
            title="新增景點"
            className="flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white w-12 h-12 rounded-xl font-black transition-all shadow-lg shadow-blue-900/40"
          >
            <Plus className="w-6 h-6" />
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
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEditClick(spot)}
                    className="p-3 bg-blue-600/90 hover:bg-blue-600 text-white rounded-xl backdrop-blur-md min-w-[48px] min-h-[48px] flex items-center justify-center shadow-lg transition-all hover:scale-105"
                    title="編輯景點"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(spot.id)}
                    className="p-3 bg-red-500/90 hover:bg-red-500 text-white rounded-xl backdrop-blur-md min-w-[48px] min-h-[48px] flex items-center justify-center shadow-lg transition-all hover:scale-105"
                    title="刪除景點"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-black mb-2 group-hover:text-blue-400 transition-colors leading-relaxed">{spot.name}</h3>
                <div className="flex items-start gap-2 text-slate-500 text-sm font-bold mb-4">
                  <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-1" />
                  <span className="line-clamp-2 leading-relaxed">{spot.address || '未提供地址'}</span>
                </div>
                
                <p className="text-slate-400 text-sm font-medium line-clamp-3 mb-6 flex-1 leading-loose">
                  {spot.description || '暫無景點描述...'}
                </p>

                <div className="flex gap-3 pt-4 border-t border-slate-800">
                  {spot.google_map_url && (
                    <a 
                      href={spot.google_map_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-black text-xs transition-all min-h-[48px]"
                    >
                      <Navigation className="w-4 h-4 text-blue-400" />
                      地圖導航
                    </a>
                  )}
                  <button className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl transition-all min-w-[48px] min-h-[48px] flex items-center justify-center">
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
              {editingSpot ? <Pencil className="w-8 h-8 text-blue-500" /> : <Plus className="w-8 h-8 text-blue-500" />}
              {editingSpot ? '編輯景點' : '新增景點'}
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
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4">景點圖片 (選填)</label>
                <div className="relative">
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleSpotImageUpload}
                    className="hidden"
                    id="spot-image-upload"
                  />
                  <label 
                    htmlFor="spot-image-upload"
                    className={`w-full bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-500 hover:bg-slate-900 transition-all ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {newSpot.image_url ? (
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden group">
                        <img src={newSpot.image_url} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white font-bold flex items-center gap-2">
                            <ImageIcon className="w-5 h-5" /> 更換圖片
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        {uploadingImage ? (
                          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-slate-600" />
                        )}
                        <span className="text-slate-500 font-bold text-sm">
                          {uploadingImage ? '正在處理圖片...' : '點擊上傳圖片'}
                        </span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4 text-red-400">附近醫療機構 (選填)</label>
                <textarea 
                  rows={2}
                  placeholder="例如：最近的 24H 急診醫院名稱與電話..."
                  value={newSpot.nearby_medical}
                  onChange={(e) => setNewSpot({...newSpot, nearby_medical: e.target.value})}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-3xl px-6 py-4 font-bold focus:border-blue-500 outline-none transition-all resize-none"
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
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingSpot ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />)}
                  {editingSpot ? '儲存變更' : '確定新增'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {spotToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSpotToDelete(null)}></div>
          <div className="relative bg-slate-900 border-2 border-slate-800 rounded-[3rem] p-10 w-full max-w-md shadow-2xl">
            <div className="flex flex-col items-center text-center gap-6">
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black">確定要刪除嗎？</h3>
                <p className="text-slate-400 font-bold">
                  此動作無法復原，確定要永久刪除此景點？
                </p>
              </div>

              <div className="flex gap-4 w-full pt-4">
                <button 
                  onClick={() => setSpotToDelete(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-black transition-all"
                >
                  取消
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white py-4 rounded-2xl font-black transition-all shadow-lg shadow-red-900/40 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  確認刪除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
