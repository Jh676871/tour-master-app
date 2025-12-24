'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Calendar, 
  Clock, 
  Building2, 
  MapPin, 
  Wifi, 
  Phone,
  Users,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Hotel as HotelIcon,
  Image as ImageIcon,
  Upload,
  Search,
  Wand2,
  Sparkles,
  Copy
} from 'lucide-react';
import Link from 'next/link';
import { Group, Hotel, Itinerary, Traveler, TravelerRoom, Spot } from '@/types/database';

export default function GroupEditPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Data
  const [group, setGroup] = useState<Group | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [itinerarySpots, setItinerarySpots] = useState<Record<string, any[]>>({}); // { itineraryId: spotObjects[] }
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [roomMappings, setRoomMappings] = useState<Record<string, Record<string, string>>>({}); // { itineraryId: { travelerId: roomNumber } }

  // Search & Filter
  const [hotelSearchTerm, setHotelSearchTerm] = useState('');
  const [spotSearchTerm, setSpotSearchTerm] = useState('');
  const [isSearchingHotel, setIsSearchingHotel] = useState(false);
  const [isSearchingSpot, setIsSearchingSpot] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [isAIPolishing, setIsAIPolishing] = useState(false);

  // UI State
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  // AI Helper
  const handleAIAutoFill = async () => {
    const currentItin = itineraries[activeDayIndex];
    const hotel = hotels.find(h => h.id === currentItin.hotel_id);
    
    if (!hotel) {
      alert('請先選擇飯店，AI 才能根據位置生成行程建議！');
      return;
    }

    setIsAIGenerating(true);
    
    // Simulate AI Delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const updated = [...itineraries];
    const day = activeDayIndex + 1;
    
    // More professional AI content based on hotel
    const suggestions = [
      `【Day ${day} 活力行程】\n08:30 從 ${hotel.name} 出發\n09:00 抵達周邊人氣景點 A (位於 ${hotel.address.split(' ').slice(0, 2).join('')} 區域)\n12:00 午餐：推薦飯店附近的高評價在地料理\n14:00 下午茶與文藝特區散策\n17:30 返回飯店休息，享受 ${hotel.gym_pool_info || '飯店設施'}\n\n※ 領隊叮嚀：${hotel.guide_notes || '請提醒團員準時集合，並檢查房卡。'}`,
      `【Day ${day} 深度之旅】\n09:00 享用 ${hotel.breakfast_info || '飯店早餐'} 後集合\n10:00 專車前往名勝古蹟參訪\n13:00 景觀餐廳饗宴\n15:30 購物中心或免稅店行程\n18:30 晚餐後返回 ${hotel.name}\n\n※ 飯店資訊：WIFI 為 ${hotel.wifi_info || '飯店提供'}`,
    ];

    updated[activeDayIndex] = {
      ...updated[activeDayIndex],
      morning_call_time: '07:00',
      meeting_time: '08:30',
      schedule_text: suggestions[Math.floor(Math.random() * suggestions.length)]
    };

    setItineraries(updated);
    setIsAIGenerating(false);
  };

  const handleAIPolish = async () => {
    const currentItin = itineraries[activeDayIndex];
    if (!currentItin.schedule_text) {
      alert('請先輸入一些行程草稿，AI 才能幫您潤飾！');
      return;
    }

    setIsAIPolishing(true);
    await new Promise(resolve => setTimeout(resolve, 1200));

    const updated = [...itineraries];
    updated[activeDayIndex].schedule_text = `✨【AI 專業潤飾】\n${currentItin.schedule_text}\n\n--- 專業領隊建議 ---\n📍 建議提醒團員攜帶舒適步行鞋\n📍 若天氣不佳，可備案改往室內商場`;
    
    setItineraries(updated);
    setIsAIPolishing(false);
  };

  const handleAddSpotToItinerary = async (spot: Spot) => {
    const currentItin = itineraries[activeDayIndex];
    if (!currentItin.id) {
      alert('請先儲存行程，再加入景點');
      return;
    }

    const currentSpots = itinerarySpots[currentItin.id] || [];
    
    // Check if spot already exists in this day
    if (currentSpots.find(s => s.spot_id === spot.id)) {
      alert('此景點已在行程中');
      return;
    }

    const newItinSpot = {
      itinerary_id: currentItin.id,
      spot_id: spot.id,
      sort_order: currentSpots.length,
      spot: spot // Keep the spot object for UI
    };

    setItinerarySpots({
      ...itinerarySpots,
      [currentItin.id]: [...currentSpots, newItinSpot]
    });

    setIsSearchingSpot(false);
    setSpotSearchTerm('');
  };

  const handleRemoveSpotFromItinerary = (spotId: string) => {
    const currentItin = itineraries[activeDayIndex];
    if (!currentItin.id) return;

    const currentSpots = itinerarySpots[currentItin.id] || [];
    const updatedSpots = currentSpots
      .filter(s => s.spot_id !== spotId)
      .map((s, idx) => ({ ...s, sort_order: idx }));

    setItinerarySpots({
      ...itinerarySpots,
      [currentItin.id]: updatedSpots
    });
  };

  const handleMoveSpot = (spotId: string, direction: 'up' | 'down') => {
    const currentItin = itineraries[activeDayIndex];
    if (!currentItin.id) return;

    const currentSpots = [...(itinerarySpots[currentItin.id] || [])];
    const index = currentSpots.findIndex(s => s.spot_id === spotId);
    
    if (direction === 'up' && index > 0) {
      const temp = currentSpots[index];
      currentSpots[index] = currentSpots[index - 1];
      currentSpots[index - 1] = temp;
    } else if (direction === 'down' && index < currentSpots.length - 1) {
      const temp = currentSpots[index];
      currentSpots[index] = currentSpots[index + 1];
      currentSpots[index + 1] = temp;
    } else {
      return;
    }

    const updatedSpots = currentSpots.map((s, idx) => ({ ...s, sort_order: idx }));
    setItinerarySpots({
      ...itinerarySpots,
      [currentItin.id]: updatedSpots
    });
  };

  const [showAddHotelModal, setShowAddHotelModal] = useState(false);
  const [showAddSpotModal, setShowAddSpotModal] = useState(false);
  const [uploadingHotelImage, setUploadingHotelImage] = useState(false);
  const [newHotel, setNewHotel] = useState({
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

  const [newSpot, setNewSpot] = useState({
    name: '',
    address: '',
    description: '',
    google_map_url: '',
    category: '景點'
  });

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch Group
        const { data: groupData } = await supabase
          .from('groups')
          .select('*')
          .eq('id', groupId)
          .abortSignal(controller.signal)
          .single();
          
        if (!groupData) throw new Error('找不到團體資料');
        setGroup(groupData);

        // 2. Fetch Hotels
        const { data: hotelsData } = await supabase
          .from('hotels')
          .select('*')
          .order('name')
          .abortSignal(controller.signal);
        setHotels(hotelsData || []);

        // 2.5 Fetch Spots
        const { data: spotsData } = await supabase
          .from('spots')
          .select('*')
          .order('name')
          .abortSignal(controller.signal);
        setSpots(spotsData || []);

        // 3. Fetch Itineraries
        const { data: itinerariesData } = await supabase
          .from('itineraries')
          .select('*, hotel:hotels(*)')
          .eq('group_id', groupId)
          .order('trip_date', { ascending: true })
          .abortSignal(controller.signal);
        
        let currentItineraries = itinerariesData || [];

        // 如果沒有行程，根據團體日期自動生成
        if (currentItineraries.length === 0 && groupData.start_date && groupData.end_date) {
          const start = new Date(groupData.start_date);
          const end = new Date(groupData.end_date);
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          
          const newItins = [];
          for (let i = 0; i < days; i++) {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            newItins.push({
              group_id: groupId,
              trip_date: date.toISOString().split('T')[0],
              schedule_text: '',
              morning_call_time: '07:00',
              meeting_time: '08:00',
              hotel_id: null
            });
          }
          
          const { data: insertedItins } = await supabase
            .from('itineraries')
            .insert(newItins)
            .select()
            .abortSignal(controller.signal);
          currentItineraries = insertedItins || [];
        }
        
        setItineraries(currentItineraries);

        // 3.5 Fetch Itinerary Spots
        const itinIds = currentItineraries.map((it: any) => it.id).filter(Boolean);
        if (itinIds.length > 0) {
          const { data: itinSpotsData } = await supabase
            .from('itinerary_spots')
            .select('*, spot:spots(*)')
            .in('itinerary_id', itinIds)
            .order('sort_order', { ascending: true })
            .abortSignal(controller.signal);
          
          if (itinSpotsData) {
            const mapping: Record<string, any[]> = {};
            itinSpotsData.forEach(item => {
              if (!mapping[item.itinerary_id]) mapping[item.itinerary_id] = [];
              mapping[item.itinerary_id].push(item);
            });
            setItinerarySpots(mapping);
          }
        }

        // 4. Fetch Travelers
        const { data: travelersData } = await supabase
          .from('travelers')
          .select('*')
          .eq('group_id', groupId)
          .order('full_name')
          .abortSignal(controller.signal);
        setTravelers(travelersData || []);

        // 5. Fetch Room Mappings
        const { data: roomsData } = await supabase
          .from('traveler_rooms')
          .select('*')
          .in('itinerary_id', currentItineraries.map((it: any) => it.id).filter(Boolean))
          .abortSignal(controller.signal);
        
        if (roomsData) {
          const mapping: Record<string, Record<string, string>> = {};
          roomsData.forEach(r => {
            if (!mapping[r.itinerary_id]) mapping[r.itinerary_id] = {};
            mapping[r.itinerary_id][r.traveler_id] = r.room_number;
          });
          setRoomMappings(mapping);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError' && !error.message?.includes('AbortError')) {
          console.error('Error fetching data:', error.message || error);
          setMessage({ type: 'error', text: error.message || '讀取資料失敗' });
        }
      } finally {
        setLoading(false);
      }
    };

    if (groupId) {
      fetchData();
    }

    return () => controller.abort();
  }, [groupId]);

  const fetchData = async (signal?: AbortSignal) => {
    // Manual refresh if needed
    if (!groupId) return;
    try {
      setLoading(true);
      const query = supabase.from('groups').select('*').eq('id', groupId).single();
      if (signal) query.abortSignal(signal);
      
      const { data: groupData } = await query;
      if (groupData) setGroup(groupData);
    } catch (error: any) {
      if (error.name !== 'AbortError' && !error.message?.includes('AbortError')) {
        console.error('Error fetching data:', error.message || error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setMessage(null);
    try {
      // 1. Update Itineraries
      for (const itin of itineraries) {
        const { hotel, ...itinData } = itin as any; // Remove joined hotel object
        
        // 將空字串轉換為 null
        Object.keys(itinData).forEach(key => {
          if (itinData[key] === '') {
            itinData[key] = null;
          }
        });

        const { error } = await supabase.from('itineraries').upsert(itinData);
        if (error) throw error;
      }

      // 2. Update Room Numbers
      const roomUpdates: any[] = [];
      Object.entries(roomMappings).forEach(([itinId, travelers]) => {
        Object.entries(travelers).forEach(([travelerId, roomNumber]) => {
          if (roomNumber.trim()) {
            roomUpdates.push({
              itinerary_id: itinId,
              traveler_id: travelerId,
              room_number: roomNumber
            });
          }
        });
      });

      if (roomUpdates.length > 0) {
        await supabase.from('traveler_rooms').upsert(roomUpdates, { onConflict: 'itinerary_id,traveler_id' });
      }

      // 3. Update Itinerary Spots
      for (const [itinId, spots] of Object.entries(itinerarySpots)) {
        // First, delete existing spots for this itinerary to handle removals and reordering simply
        await supabase.from('itinerary_spots').delete().eq('itinerary_id', itinId);
        
        if (spots.length > 0) {
          const spotsToInsert = spots.map(s => ({
            itinerary_id: s.itinerary_id,
            spot_id: s.spot_id,
            sort_order: s.sort_order,
            notes: s.notes
          }));
          const { error } = await supabase.from('itinerary_spots').insert(spotsToInsert);
          if (error) throw error;
        }
      }

      setMessage({ type: 'success', text: '全部變更已儲存！' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: `儲存失敗: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleHotelImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingHotelImage(true);
      
      // Client-side Resize & Compress
      const optimizedFile = await optimizeImage(file);
      
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

      const { data: { publicUrl } } = supabase.storage
        .from('hotel-images')
        .getPublicUrl(filePath);

      setNewHotel({ ...newHotel, image_url: publicUrl });
    } catch (error: any) {
      console.error('Error uploading image:', error.message);
      if (error.message === 'Bucket not found') {
        alert('❌ 找不到儲存桶！\n\n請至 Supabase 控制台建立名為 "hotel-images" 的 Public Bucket。');
      } else {
        alert(`圖片上傳失敗: ${error.message}`);
      }
    } finally {
      setUploadingHotelImage(false);
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

  const handleAddHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.from('hotels').insert([newHotel]).select().single();
      if (error) throw error;
      setHotels([...hotels, data]);
      setNewHotel({ 
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
      setShowAddHotelModal(false);
      
      // 自動將當前天數設為這間新飯店
      const updatedItins = [...itineraries];
      updatedItins[activeDayIndex].hotel_id = data.id;
      setItineraries(updatedItins);
    } catch (error: any) {
      alert(`新增飯店失敗: ${error.message}`);
    }
  };

  const handleAddSpot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.from('spots').insert([newSpot]).select().single();
      if (error) throw error;
      setSpots([...spots, data]);
      
      // 使用模組化方式加入當前行程
      await handleAddSpotToItinerary(data);
      
      setNewSpot({ 
        name: '', 
        address: '', 
        description: '', 
        google_map_url: '',
        category: '景點'
      });
      setShowAddSpotModal(false);
    } catch (error: any) {
      alert(`新增景點失敗: ${error.message}`);
    }
  };

  const currentItinerary = itineraries[activeDayIndex];

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
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
              <ArrowLeft className="w-6 h-6 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-xl font-black tracking-tight">{group?.name}</h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest gap-2 flex items-center">
                團體編輯中心
                <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                <Link href={`/groups/${groupId}/preview`} target="_blank" className="text-blue-500 hover:underline flex items-center gap-1">
                  查看旅客預覽 <ChevronRight className="w-3 h-3" />
                </Link>
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleSaveAll}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-black transition-all shadow-lg shadow-blue-900/40"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            <span className="uppercase tracking-widest text-sm">儲存變更</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {message && (
          <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 border ${
            message.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-red-500/10 border-red-500/50 text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-bold">{message.text}</span>
          </div>
        )}

        {/* Day Selector Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {itineraries.map((itin, idx) => (
            <button
              key={itin.id || idx}
              onClick={() => setActiveDayIndex(idx)}
              className={`flex-none px-6 py-4 rounded-2xl font-black transition-all border-2 ${
                activeDayIndex === idx 
                  ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40' 
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
              }`}
            >
              <div className="text-[10px] uppercase tracking-[0.2em] mb-1">Day</div>
              <div className="text-2xl">{idx + 1}</div>
              <div className="text-[10px] font-bold mt-1 opacity-60">{itin.trip_date.split('-').slice(1).join('/')}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Day Settings */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-slate-900 rounded-[2.5rem] border-2 border-slate-800 p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-blue-600/20 p-3 rounded-2xl">
                  <Calendar className="w-6 h-6 text-blue-500" />
                </div>
                <h2 className="text-2xl font-black tracking-tight">Day {activeDayIndex + 1} 行程排控</h2>
              </div>

              {currentItinerary && (
                <div className="space-y-8">
                  {/* Hotel Selector - Upgraded to Searchable */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-black text-slate-400 uppercase tracking-widest">今日住宿飯店</label>
                      <button 
                        onClick={() => setShowAddHotelModal(true)}
                        className="text-xs font-black text-blue-400 hover:text-blue-300 flex items-center gap-1 uppercase tracking-widest"
                      >
                        <Plus className="w-3 h-3" />
                        新增飯店至資料庫
                      </button>
                    </div>

                    <div className="relative">
                      {currentItinerary.hotel_id ? (
                        /* Selected Hotel Card */
                        <div className="bg-slate-950 border-2 border-blue-500/30 rounded-3xl p-6 flex flex-col md:flex-row gap-6 items-start relative overflow-hidden group">
                          {/* Background Glow */}
                          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl -mr-10 -mt-10 group-hover:bg-blue-600/10 transition-colors"></div>
                          
                          {/* Hotel Image Preview */}
                          <div className="w-full md:w-48 h-32 rounded-2xl overflow-hidden bg-slate-900 shrink-0 border border-slate-800">
                            {hotels.find(h => h.id === currentItinerary.hotel_id)?.image_url ? (
                              <img 
                                src={hotels.find(h => h.id === currentItinerary.hotel_id)?.image_url} 
                                alt="Hotel" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-700">
                                <HotelIcon className="w-10 h-10" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="text-xl font-black text-white leading-tight">
                                  {hotels.find(h => h.id === currentItinerary.hotel_id)?.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-1 text-slate-500 text-sm font-bold">
                                  <MapPin className="w-4 h-4 text-blue-500" />
                                  {hotels.find(h => h.id === currentItinerary.hotel_id)?.address}
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  const updated = [...itineraries];
                                  updated[activeDayIndex].hotel_id = null;
                                  setItineraries(updated);
                                }}
                                className="p-2 hover:bg-red-500/10 text-slate-600 hover:text-red-500 rounded-xl transition-all"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-3">
                              {hotels.find(h => h.id === currentItinerary.hotel_id)?.wifi_info && (
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 rounded-full text-[10px] font-black text-slate-400 border border-slate-800 uppercase tracking-wider">
                                  <Wifi className="w-3 h-3 text-blue-500" /> WIFI
                                </div>
                              )}
                              <button 
                                onClick={() => {
                                  const addr = hotels.find(h => h.id === currentItinerary.hotel_id)?.address;
                                  if (addr) {
                                    navigator.clipboard.writeText(addr);
                                    alert('地址已複製！');
                                  }
                                }}
                                className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 rounded-full text-[10px] font-black text-slate-400 border border-slate-800 uppercase tracking-wider transition-colors"
                              >
                                <Copy className="w-3 h-3" /> 複製地址
                              </button>
                              {hotels.find(h => h.id === currentItinerary.hotel_id)?.google_map_url && (
                                <a 
                                  href={hotels.find(h => h.id === currentItinerary.hotel_id)?.google_map_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-full text-[10px] font-black text-white shadow-lg shadow-blue-900/40 uppercase tracking-wider transition-all hover:-translate-y-0.5"
                                >
                                  <MapPin className="w-3 h-3" /> 開啟導覽
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Search Input */
                        <div className="relative">
                          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                            <Search className="w-5 h-5 text-slate-500" />
                          </div>
                          <input 
                            type="text"
                            placeholder="搜尋飯店名稱或地址..."
                            value={hotelSearchTerm}
                            onFocus={() => setIsSearchingHotel(true)}
                            onChange={(e) => setHotelSearchTerm(e.target.value)}
                            className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl pl-16 pr-6 py-4 font-bold focus:border-blue-500 outline-none transition-all"
                          />
                          
                          {/* Search Results Dropdown */}
                          {isSearchingHotel && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setIsSearchingHotel(false)}></div>
                              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border-2 border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto">
                                {hotels.filter(h => 
                                  h.name.toLowerCase().includes(hotelSearchTerm.toLowerCase()) || 
                                  h.address.toLowerCase().includes(hotelSearchTerm.toLowerCase())
                                ).length > 0 ? (
                                  hotels
                                    .filter(h => 
                                      h.name.toLowerCase().includes(hotelSearchTerm.toLowerCase()) || 
                                      h.address.toLowerCase().includes(hotelSearchTerm.toLowerCase())
                                    )
                                    .map(h => (
                                      <button
                                        key={h.id}
                                        onClick={() => {
                                          const updated = [...itineraries];
                                          updated[activeDayIndex].hotel_id = h.id;
                                          setItineraries(updated);
                                          setHotelSearchTerm('');
                                          setIsSearchingHotel(false);
                                        }}
                                        className="w-full px-6 py-4 hover:bg-slate-800 text-left border-b border-slate-800 last:border-0 transition-colors flex items-center gap-4 group"
                                      >
                                        <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center shrink-0 border border-slate-800 overflow-hidden">
                                          {h.image_url ? (
                                            <img src={h.image_url} alt="" className="w-full h-full object-cover" />
                                          ) : (
                                            <HotelIcon className="w-6 h-6 text-slate-700" />
                                          )}
                                        </div>
                                        <div>
                                          <div className="font-black text-white group-hover:text-blue-400 transition-colors">{h.name}</div>
                                          <div className="text-xs font-bold text-slate-500 line-clamp-1">{h.address}</div>
                                        </div>
                                      </button>
                                    ))
                                ) : (
                                  <div className="px-6 py-8 text-center">
                                    <div className="text-slate-500 font-bold mb-2">找不到相關飯店</div>
                                    <button 
                                      onClick={() => setShowAddHotelModal(true)}
                                      className="text-blue-500 text-sm font-black hover:underline"
                                    >
                                      點此新增一間飯店
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Times */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Clock className="w-4 h-4" /> 晨喚時間
                      </label>
                      <input 
                        type="time"
                        value={currentItinerary.morning_call_time || ''}
                        onChange={(e) => {
                          const updated = [...itineraries];
                          updated[activeDayIndex].morning_call_time = e.target.value;
                          setItineraries(updated);
                        }}
                        className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 font-black focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Users className="w-4 h-4" /> 集合時間
                      </label>
                      <input 
                        type="time"
                        value={currentItinerary.meeting_time || ''}
                        onChange={(e) => {
                          const updated = [...itineraries];
                          updated[activeDayIndex].meeting_time = e.target.value;
                          setItineraries(updated);
                        }}
                        className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 font-black focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Schedule Description */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        今日行程簡介
                      </label>
                      <div className="flex gap-2">
                        <button 
                          onClick={handleAIPolish}
                          disabled={isAIPolishing || !currentItinerary.schedule_text}
                          className="text-[10px] font-black bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 px-3 py-1.5 rounded-xl border border-purple-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
                        >
                          {isAIPolishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                          AI 潤飾文案
                        </button>
                        <button 
                          onClick={handleAIAutoFill}
                          disabled={isAIGenerating || !currentItinerary.hotel_id}
                          className="text-[10px] font-black bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-xl border border-blue-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
                        >
                          {isAIGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          AI 生成建議
                        </button>
                      </div>
                    </div>

                    {/* Modular Spots List */}
                    <div className="space-y-4 mb-6">
                      {(itinerarySpots[currentItinerary.id] || []).length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                          {(itinerarySpots[currentItinerary.id] || []).map((itinSpot, idx) => (
                            <div 
                              key={itinSpot.spot_id} 
                              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 group/spot"
                            >
                              <div className="flex flex-col gap-1 shrink-0">
                                <button 
                                  onClick={() => handleMoveSpot(itinSpot.spot_id, 'up')}
                                  disabled={idx === 0}
                                  className="p-1 hover:bg-slate-800 rounded-md text-slate-600 hover:text-blue-400 disabled:opacity-0 transition-all"
                                >
                                  <ChevronLeft className="w-4 h-4 rotate-90" />
                                </button>
                                <button 
                                  onClick={() => handleMoveSpot(itinSpot.spot_id, 'down')}
                                  disabled={idx === (itinerarySpots[currentItinerary.id]?.length || 0) - 1}
                                  className="p-1 hover:bg-slate-800 rounded-md text-slate-600 hover:text-blue-400 disabled:opacity-0 transition-all"
                                >
                                  <ChevronLeft className="w-4 h-4 -rotate-90" />
                                </button>
                              </div>
                              
                              <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center border border-slate-800 shrink-0 overflow-hidden">
                                {itinSpot.spot?.image_url ? (
                                  <img src={itinSpot.spot.image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <MapPin className="w-5 h-5 text-slate-700" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase tracking-widest">
                                    {idx + 1}
                                  </span>
                                  <h4 className="font-black text-sm text-white truncate">{itinSpot.spot?.name}</h4>
                                </div>
                                <p className="text-[10px] font-bold text-slate-500 truncate mt-0.5">{itinSpot.spot?.address}</p>
                              </div>

                              <div className="flex items-center gap-2 opacity-0 group-hover/spot:opacity-100 transition-opacity">
                                {itinSpot.spot?.google_map_url && (
                                  <a 
                                    href={itinSpot.spot.google_map_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-xl transition-all"
                                    title="查看地圖"
                                  >
                                    <Navigation className="w-4 h-4" />
                                  </a>
                                )}
                                <button 
                                  onClick={() => handleRemoveSpotFromItinerary(itinSpot.spot_id)}
                                  className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all"
                                  title="移除景點"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-3xl p-8 text-center">
                          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">尚未加入模組化景點</p>
                          <p className="text-[10px] text-slate-600 mt-2">點擊右上角 "+" 按鈕從資料庫中選取景點</p>
                        </div>
                      )}
                    </div>

                    <div className="relative group/text">
                      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 opacity-0 group-hover/text:opacity-100 transition-opacity">
                        <div className="relative">
                          <button 
                            onFocus={() => setIsSearchingSpot(true)}
                            className="p-2 bg-slate-900/90 border border-slate-700 rounded-xl text-blue-400 hover:text-blue-300 transition-all shadow-xl backdrop-blur-md"
                            title="從資料庫加入景點"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                          
                          {isSearchingSpot && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setIsSearchingSpot(false)}></div>
                              <div className="absolute top-0 right-full mr-4 w-64 bg-slate-900 border-2 border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
                                <div className="p-3 border-b border-slate-800 bg-slate-950">
                                  <input 
                                    autoFocus
                                    type="text"
                                    placeholder="搜尋景點..."
                                    value={spotSearchTerm}
                                    onChange={(e) => setSpotSearchTerm(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold focus:border-blue-500 outline-none"
                                  />
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                  {spots.filter(s => 
                                    s.name.toLowerCase().includes(spotSearchTerm.toLowerCase()) ||
                                    s.address.toLowerCase().includes(spotSearchTerm.toLowerCase())
                                  ).length > 0 ? (
                                    spots
                                      .filter(s => 
                                        s.name.toLowerCase().includes(spotSearchTerm.toLowerCase()) ||
                                        s.address.toLowerCase().includes(spotSearchTerm.toLowerCase())
                                      )
                                      .map(s => (
                                        <button
                                          key={s.id}
                                          onClick={() => handleAddSpotToItinerary(s)}
                                          className="w-full px-4 py-3 hover:bg-slate-800 text-left border-b border-slate-800 last:border-0 transition-colors"
                                        >
                                          <div className="text-xs font-black text-white">{s.name}</div>
                                          <div className="text-[10px] font-bold text-slate-500 line-clamp-1">{s.address}</div>
                                        </button>
                                      ))
                                  ) : (
                                    <div className="px-4 py-6 text-center">
                                      <div className="text-[10px] font-bold text-slate-500 mb-2">未找到景點</div>
                                      <button 
                                        onClick={() => {
                                          setIsSearchingSpot(false);
                                          setShowAddSpotModal(true);
                                        }}
                                        className="text-[10px] font-black text-blue-500 hover:underline"
                                      >
                                        點此新增景點
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <textarea 
                        rows={6}
                        placeholder="輸入今日的主要景點或注意事項..."
                        value={currentItinerary.schedule_text || ''}
                        onChange={(e) => {
                          const updated = [...itineraries];
                          updated[activeDayIndex].schedule_text = e.target.value;
                          setItineraries(updated);
                        }}
                        className="w-full bg-slate-950 border-2 border-slate-800 rounded-[2rem] px-8 py-6 font-bold focus:border-blue-500 outline-none transition-all resize-none text-lg leading-relaxed group-hover/text:border-slate-700"
                      />
                      {!currentItinerary.schedule_text && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 group-hover/text:opacity-40 transition-opacity">
                          <Sparkles className="w-12 h-12 text-blue-500" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Right: Room Numbers for Active Day */}
          <div className="space-y-8">
            <section className="bg-slate-900 rounded-[2.5rem] border-2 border-slate-800 p-8 shadow-xl flex flex-col h-full">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600/20 p-3 rounded-2xl">
                    <HotelIcon className="w-6 h-6 text-blue-500" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">Day {activeDayIndex + 1} 房號</h2>
                </div>
                <div className="text-xs font-black text-slate-500 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                  {travelers.length} 位團員
                </div>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[600px] pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                {travelers.map(traveler => (
                  <div key={traveler.id} className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800 group hover:border-blue-500/50 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${
                        traveler.gender === '男' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'
                      }`}>
                        {traveler.gender === '男' ? 'M' : 'F'}
                      </div>
                      <span className="font-bold">{traveler.full_name}</span>
                    </div>
                    <input 
                      type="text"
                      placeholder="房號"
                      value={roomMappings[currentItinerary?.id]?.[traveler.id] || ''}
                      onChange={(e) => {
                        if (!currentItinerary) return;
                        const newMappings = { ...roomMappings };
                        if (!newMappings[currentItinerary.id]) newMappings[currentItinerary.id] = {};
                        newMappings[currentItinerary.id][traveler.id] = e.target.value;
                        setRoomMappings(newMappings);
                      }}
                      className="w-20 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-center font-black text-blue-400 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Add Hotel Modal */}
      {showAddHotelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowAddHotelModal(false)}></div>
          <div className="relative bg-slate-900 border-2 border-slate-800 rounded-[3rem] p-10 w-full max-w-lg shadow-2xl">
            <h3 className="text-3xl font-black mb-8 flex items-center gap-3">
              <Plus className="w-8 h-8 text-blue-500" /> 新增飯店
            </h3>
            <form onSubmit={handleAddHotel} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin">
              {/* Image Upload Area */}
              <div className="space-y-2">
                <div className="flex justify-between items-end ml-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">飯店照片</label>
                  <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter bg-blue-500/10 px-2 py-0.5 rounded-full">
                    建議 16:9 橫向
                  </span>
                </div>
                <div className="relative group mx-4">
                  <div className={`w-full h-40 rounded-2xl border-2 border-dashed transition-all overflow-hidden flex flex-col items-center justify-center gap-2 ${
                    newHotel.image_url ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                  }`}>
                    {newHotel.image_url ? (
                      <>
                        <img src={newHotel.image_url} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <label className="cursor-pointer bg-white text-slate-950 px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2">
                            <Upload className="w-4 h-4" /> 更換照片
                            <input type="file" className="hidden" accept="image/*" onChange={handleHotelImageUpload} />
                          </label>
                        </div>
                      </>
                    ) : (
                      <>
                        {uploadingHotelImage ? (
                          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-slate-700" />
                        )}
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">點擊上傳照片</p>
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleHotelImageUpload} />
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4">飯店名稱</label>
                <input 
                  required
                  type="text"
                  placeholder="例如：京都大倉酒店"
                  value={newHotel.name}
                  onChange={(e) => setNewHotel({...newHotel, name: e.target.value})}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 font-bold focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4">地址</label>
                <input 
                  type="text"
                  placeholder="完整地址"
                  value={newHotel.address}
                  onChange={(e) => setNewHotel({...newHotel, address: e.target.value})}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 font-bold focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4">電話</label>
                  <input 
                    type="text"
                    placeholder="電話號碼"
                    value={newHotel.phone}
                    onChange={(e) => setNewHotel({...newHotel, phone: e.target.value})}
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 font-bold focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4">Wi-Fi 資訊</label>
                  <input 
                    type="text"
                    placeholder="SSID / Password"
                    value={newHotel.wifi_info}
                    onChange={(e) => setNewHotel({...newHotel, wifi_info: e.target.value})}
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 font-bold focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4">Google Maps 連結</label>
                <input 
                  type="text"
                  placeholder="https://maps.app.goo.gl/..."
                  value={newHotel.google_map_url}
                  onChange={(e) => setNewHotel({...newHotel, google_map_url: e.target.value})}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 font-bold focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4">早餐資訊</label>
                <textarea 
                  placeholder="例如：06:30-10:00 2樓餐廳"
                  value={newHotel.breakfast_info}
                  onChange={(e) => setNewHotel({...newHotel, breakfast_info: e.target.value})}
                  rows={2}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 font-bold focus:border-blue-500 outline-none transition-all resize-none"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddHotelModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-black transition-all"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black transition-all shadow-lg shadow-blue-900/40"
                >
                  確定新增
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add Spot Modal */}
      {showAddSpotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowAddSpotModal(false)}></div>
          <div className="relative bg-slate-900 border-2 border-slate-800 rounded-[3rem] p-10 w-full max-w-lg shadow-2xl">
            <h3 className="text-3xl font-black mb-8 flex items-center gap-3">
              <Plus className="w-8 h-8 text-blue-500" /> 新增景點
            </h3>
            <form onSubmit={handleAddSpot} className="space-y-6">
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
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4">地址</label>
                <input 
                  type="text"
                  placeholder="景點地址"
                  value={newSpot.address}
                  onChange={(e) => setNewSpot({...newSpot, address: e.target.value})}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 font-bold focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4">Google Maps 連結</label>
                <input 
                  type="text"
                  placeholder="https://maps.app.goo.gl/..."
                  value={newSpot.google_map_url}
                  onChange={(e) => setNewSpot({...newSpot, google_map_url: e.target.value})}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 font-bold focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddSpotModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-black transition-all"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black transition-all shadow-lg shadow-blue-900/40"
                >
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
