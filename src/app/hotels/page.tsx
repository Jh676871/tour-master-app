'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Wifi, 
  Search, 
  Plus, 
  Loader2, 
  ArrowLeft,
  ExternalLink,
  Clock,
  Dumbbell,
  StickyNote,
  Edit2,
  Trash2,
  X,
  Save,
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import Link from 'next/link';
import { Hotel } from '@/types/database';

export default function HotelsPage() {
  const [loading, setLoading] = useState(true);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    wifi_info: '',
    google_map_url: '',
    breakfast_info: '',
    gym_pool_info: '',
    guide_notes: '',
    image_url: ''
  });

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('hotels')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      setHotels(data || []);
    } catch (error: any) {
      console.error('Error fetching hotels:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredHotels = hotels.filter(hotel => 
    hotel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hotel.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenModal = (hotel: Hotel | null = null) => {
    if (hotel) {
      setEditingHotel(hotel);
      setFormData({
        name: hotel.name || '',
        address: hotel.address || '',
        phone: hotel.phone || '',
        wifi_info: hotel.wifi_info || '',
        google_map_url: hotel.google_map_url || '',
        breakfast_info: hotel.breakfast_info || '',
        gym_pool_info: hotel.gym_pool_info || '',
        guide_notes: hotel.guide_notes || '',
        image_url: hotel.image_url || ''
      });
    } else {
      setEditingHotel(null);
      setFormData({
        name: '',
        address: '',
        phone: '',
        wifi_info: '',
        google_map_url: '',
        breakfast_info: '',
        gym_pool_info: '',
        guide_notes: '',
        image_url: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      
      // 1. Client-side Resize & Compress (Target 1200px width, 16:9 friendly)
      const optimizedFile = await optimizeImage(file);
      
      // 2. Upload to Supabase Storage
      const fileExt = 'jpg';
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `hotel-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('hotel-images')
        .upload(filePath, optimizedFile, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 3. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('hotel-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });
    } catch (error: any) {
      console.error('Error uploading image:', error.message);
      if (error.message === 'Bucket not found') {
        alert('❌ 找不到儲存桶！\n\n請至 Supabase 控制台建立名為 "hotel-images" 的 Public Bucket。');
      } else {
        alert(`圖片上傳失敗: ${error.message}`);
      }
    } finally {
      setUploading(false);
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
          
          // Max width 1200px
          const MAX_WIDTH = 1200;
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Canvas to Blob failed'));
            },
            'image/jpeg',
            0.8 // 80% quality
          );
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingHotel) {
        const { error } = await supabase
          .from('hotels')
          .update(formData)
          .eq('id', editingHotel.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hotels')
          .insert([formData]);
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      fetchHotels();
    } catch (error: any) {
      alert(`儲存失敗: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此飯店嗎？這可能會影響已關聯的行程。')) return;
    
    try {
      const { error } = await supabase
        .from('hotels')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchHotels();
    } catch (error: any) {
      alert(`刪除失敗: ${error.message}`);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white pb-20">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md bg-opacity-90">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-800 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-black uppercase tracking-widest">飯店資料庫</h1>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-black transition-all flex items-center gap-2 text-sm"
          >
            <Plus className="w-5 h-5" />
            新增飯店
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Bar */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input 
            type="text"
            placeholder="搜尋飯店名稱或地址..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">載入中...</p>
          </div>
        ) : filteredHotels.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 rounded-[2.5rem] border border-dashed border-slate-800">
            <Building2 className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 font-bold">尚未建立飯店資料</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHotels.map((hotel) => (
              <div key={hotel.id} className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden group hover:border-blue-500/50 transition-all shadow-xl">
                {/* Hotel Image Header */}
                <div className="h-48 bg-slate-800 relative overflow-hidden">
                  {hotel.image_url ? (
                    <img 
                      src={hotel.image_url} 
                      alt={hotel.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="w-12 h-12 text-slate-700" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60"></div>
                  
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button 
                      onClick={() => handleOpenModal(hotel)}
                      className="p-2 bg-slate-900/80 backdrop-blur-md hover:bg-blue-600 rounded-xl text-white transition-all border border-slate-700"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(hotel.id)}
                      className="p-2 bg-slate-900/80 backdrop-blur-md hover:bg-red-600 rounded-xl text-white transition-all border border-slate-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-lg font-black text-white group-hover:text-blue-400 transition-colors">{hotel.name}</h3>
                    <div className="flex items-center gap-2 text-slate-400 mt-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <p className="text-xs font-medium truncate">{hotel.address}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-slate-800/50 p-3 rounded-xl space-y-1">
                      <div className="flex items-center gap-2 text-orange-400">
                        <Phone className="w-3 h-3" />
                        <span className="text-[10px] font-black uppercase tracking-widest">電話</span>
                      </div>
                      <p className="text-xs font-bold truncate">{hotel.phone || '未提供'}</p>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-xl space-y-1">
                      <div className="flex items-center gap-2 text-blue-400">
                        <Wifi className="w-3 h-3" />
                        <span className="text-[10px] font-black uppercase tracking-widest">WiFi</span>
                      </div>
                      <p className="text-xs font-bold truncate">{hotel.wifi_info || '未提供'}</p>
                    </div>
                  </div>

                  {hotel.google_map_url && (
                    <a 
                      href={hotel.google_map_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl text-xs font-black transition-all"
                    >
                      <ExternalLink className="w-3 h-3" />
                      GOOGLE MAPS 導航
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900 sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">
                  {editingHotel ? '編輯飯店' : '新增飯店'}
                </h2>
                <p className="text-xs font-black text-blue-500 uppercase tracking-widest mt-1">
                  {editingHotel ? '更新飯店詳細資訊' : '建立新的飯店基本資料'}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
              {/* Image Upload Area */}
              <div className="space-y-2">
                <div className="flex justify-between items-end ml-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">飯店外觀照片</label>
                  <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter bg-blue-500/10 px-2 py-0.5 rounded-full">
                    建議比例 16:9 (橫向)
                  </span>
                </div>
                <div className="relative group">
                  <div className={`w-full h-48 rounded-2xl border-2 border-dashed transition-all overflow-hidden flex flex-col items-center justify-center gap-2 ${
                    formData.image_url ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                  }`}>
                    {formData.image_url ? (
                      <>
                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <label className="cursor-pointer bg-white text-slate-950 px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2">
                            <Upload className="w-4 h-4" /> 更換照片
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                          </label>
                        </div>
                      </>
                    ) : (
                      <>
                        {uploading ? (
                          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-slate-700" />
                        )}
                        <p className="text-xs font-bold text-slate-500">點擊或拖曳上傳照片</p>
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleImageUpload} />
                      </>
                    )}
                  </div>
                  {formData.image_url && !uploading && (
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, image_url: ''})}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">飯店名稱 *</label>
                  <input 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="例如：東京希爾頓酒店"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">電話</label>
                  <input 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="+81 3-3344-5111"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">地址</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 w-5 h-5 text-slate-600" />
                    <input 
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 pl-12 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="飯店完整地址..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">WiFi 資訊</label>
                  <div className="relative">
                    <Wifi className="absolute left-4 top-4 w-5 h-5 text-slate-600" />
                    <input 
                      value={formData.wifi_info}
                      onChange={(e) => setFormData({...formData, wifi_info: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 pl-12 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="SSID: HotelWiFi / Pass: 12345"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Google Maps 連結</label>
                  <div className="relative">
                    <ExternalLink className="absolute left-4 top-4 w-5 h-5 text-slate-600" />
                    <input 
                      value={formData.google_map_url}
                      onChange={(e) => setFormData({...formData, google_map_url: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 pl-12 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="https://maps.app.goo.gl/..."
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-4 border-t border-slate-800">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 ml-1">
                    <Clock className="w-4 h-4 text-orange-400" />
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">早餐資訊</label>
                  </div>
                  <textarea 
                    value={formData.breakfast_info}
                    onChange={(e) => setFormData({...formData, breakfast_info: e.target.value})}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="例如：06:30-10:00 2樓餐廳 (憑房卡用餐)"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 ml-1">
                    <Dumbbell className="w-4 h-4 text-blue-400" />
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">設施資訊 (健身房/泳池)</label>
                  </div>
                  <textarea 
                    value={formData.gym_pool_info}
                    onChange={(e) => setFormData({...formData, gym_pool_info: e.target.value})}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="例如：健身房 5F (24H), 泳池 頂樓 (09:00-21:00)"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 ml-1">
                    <StickyNote className="w-4 h-4 text-yellow-400" />
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">導遊筆記 / 注意事項</label>
                  </div>
                  <textarea 
                    value={formData.guide_notes}
                    onChange={(e) => setFormData({...formData, guide_notes: e.target.value})}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="例如：電梯分流時間、行李集中區域、附近有全家便利商店..."
                  />
                </div>
              </div>

              <div className="pt-4 sticky bottom-0 bg-slate-900 pb-2">
                <button 
                  disabled={saving}
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-5 rounded-2xl font-black transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                  <span className="uppercase tracking-widest">儲存飯店資料</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
