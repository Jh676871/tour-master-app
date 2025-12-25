'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  Building2, 
  Wifi, 
  Phone,
  Navigation,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Share2,
  ExternalLink,
  Map as MapIcon,
  Utensils,
  Camera,
  Users,
  Key
} from 'lucide-react';
import { Group, Hotel, Itinerary, Spot } from '@/types/database';

export default function GroupPreviewPage() {
  const params = useParams();
  const groupId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<Group | null>(null);
  const [itineraries, setItineraries] = useState<(Itinerary & { hotel?: Hotel })[]>([]);
  const [itinSpots, setItinSpots] = useState<Record<string, any[]>>({});
  const [roomAllocations, setRoomAllocations] = useState<Record<string, Record<string, string[]>>>({});
  const [activeDay, setActiveDay] = useState(0);

  useEffect(() => {
    if (groupId) fetchData();
  }, [groupId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Group
      const { data: groupData } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();
      setGroup(groupData);

      // 2. Fetch Itineraries
      const { data: itinData } = await supabase
        .from('itineraries')
        .select('*, hotel:hotels(*)')
        .eq('group_id', groupId)
        .order('trip_date', { ascending: true });
      
      const itins = itinData || [];
      setItineraries(itins);

      // 3. Fetch Spots & Rooms for all itineraries
      const itinIds = itins.map(it => it.id);
      if (itinIds.length > 0) {
        // Spots
        const { data: spotData } = await supabase
          .from('itinerary_spots')
          .select('*, spot:spots(*)')
          .in('itinerary_id', itinIds)
          .order('sort_order', { ascending: true });
        
        if (spotData) {
          const mapping: Record<string, any[]> = {};
          spotData.forEach(item => {
            if (!mapping[item.itinerary_id]) mapping[item.itinerary_id] = [];
            mapping[item.itinerary_id].push(item);
          });
          setItinSpots(mapping);
        }

        // Rooms
        const { data: roomData } = await supabase
          .from('traveler_rooms')
          .select('itinerary_id, room_number, traveler:travelers(full_name)')
          .in('itinerary_id', itinIds);

        if (roomData) {
          const roomMapping: Record<string, Record<string, string[]>> = {};
          roomData.forEach((item: any) => {
            if (!roomMapping[item.itinerary_id]) roomMapping[item.itinerary_id] = {};
            if (!roomMapping[item.itinerary_id][item.room_number]) roomMapping[item.itinerary_id][item.room_number] = [];
            if (item.traveler?.full_name) {
              roomMapping[item.itinerary_id][item.room_number].push(item.traveler.full_name);
            }
          });
          setRoomAllocations(roomMapping);
        }
      }
    } catch (error) {
      console.error('Error fetching preview data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  const currentItin = itineraries[activeDay];
  const currentSpots = currentItin ? (itinSpots[currentItin.id] || []) : [];

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      {/* Mobile-First Header */}
      <div className="relative h-64 overflow-hidden bg-gradient-to-br from-blue-900 to-slate-900">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-blue-600 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-[0.2em]">Day {activeDay + 1}</span>
              <span className="text-slate-400 text-xs font-bold">{currentItin?.trip_date}</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight">{group?.name}</h1>
          </div>
          <div className="relative w-12 h-12 overflow-hidden rounded-xl border border-white/20 shadow-2xl">
            <Image 
              src="/logo.png" 
              alt="Logo" 
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>

      {/* Day Selector (Horizontal Scroll) */}
      <div className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 overflow-x-auto scrollbar-hide flex gap-2 p-4">
        {itineraries.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveDay(idx)}
            className={`flex-none w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all border-2 ${
              activeDay === idx 
                ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40' 
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            <span className="text-[10px] font-black uppercase tracking-tighter leading-none mb-1">D</span>
            <span className="text-lg font-black leading-none">{idx + 1}</span>
          </button>
        ))}
      </div>

      <main className="px-6 py-8 space-y-8 max-w-2xl mx-auto">
        {/* Morning Call & Meeting Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-3xl flex items-center gap-3">
            <div className="bg-orange-500/10 p-2 rounded-xl text-orange-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Morning Call</p>
              <p className="text-lg font-black">{currentItin?.morning_call_time || '--:--'}</p>
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-3xl flex items-center gap-3">
            <div className="bg-blue-500/10 p-2 rounded-xl text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">集合出發</p>
              <p className="text-lg font-black">{currentItin?.meeting_time || '--:--'}</p>
            </div>
          </div>
        </div>

        {/* Modular Spots Timeline */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Camera className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-black uppercase tracking-tight">行程規劃</h2>
          </div>
          
          <div className="space-y-4 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {currentSpots.length > 0 ? (
              currentSpots.map((item, idx) => (
                <div key={item.id} className="relative pl-12">
                  <div className="absolute left-4 top-2 w-4 h-4 rounded-full bg-blue-600 border-4 border-slate-950 z-10"></div>
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden group">
                    <div className="aspect-video relative">
                      {item.spot?.image_url ? (
                        <img src={item.spot.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-950 flex items-center justify-center">
                          <MapIcon className="w-12 h-12 text-slate-800" />
                        </div>
                      )}
                      <div className="absolute top-4 left-4">
                        <span className="bg-slate-950/60 backdrop-blur-md text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest border border-white/10">
                          {item.spot?.category || '景點'}
                        </span>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-black mb-1">{item.spot?.name}</h3>
                      <p className="text-xs font-bold text-slate-500 mb-4 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-blue-500" /> {item.spot?.address}
                      </p>
                      {item.spot?.description && (
                        <p className="text-sm text-slate-400 font-medium line-clamp-2 mb-4">
                          {item.spot.description}
                        </p>
                      )}
                      {item.spot?.google_map_url && (
                        <a 
                          href={item.spot.google_map_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-2xl font-black text-xs transition-all"
                        >
                          <Navigation className="w-4 h-4 text-blue-400" />
                          地圖導覽
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="pl-12 py-8 text-slate-600 font-black uppercase tracking-widest text-xs">
                暫無模組化行程
              </div>
            )}
          </div>
        </div>

        {/* Schedule Text (Legacy / Notes) */}
        {currentItin?.schedule_text && (
          <div className="bg-blue-900/10 border border-blue-500/20 rounded-[2.5rem] p-8">
            <div className="flex items-center gap-3 mb-4">
              <ExternalLink className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-black uppercase tracking-tight text-blue-400">領隊叮嚀</h2>
            </div>
            <div className="text-slate-300 font-medium whitespace-pre-line leading-relaxed text-sm">
              {currentItin.schedule_text}
            </div>
          </div>
        )}

        {/* Hotel Section */}
        {currentItin?.hotel && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-black uppercase tracking-tight">下榻飯店</h2>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden">
              {currentItin.hotel.image_url && (
                <div className="h-64 w-full relative">
                  <img src={currentItin.hotel.image_url} alt={currentItin.hotel.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-60"></div>
                </div>
              )}
              <div className="p-8">
                <h3 className="text-2xl font-black mb-2">{currentItin.hotel.name}</h3>
                <p className="text-slate-500 font-bold text-sm mb-6">{currentItin.hotel.address}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-2 mb-1 text-blue-500">
                      <Wifi className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Wi-Fi</span>
                    </div>
                    <p className="text-xs font-black truncate">{currentItin.hotel.wifi_info || '飯店提供'}</p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-2 mb-1 text-blue-500">
                      <Utensils className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Breakfast</span>
                    </div>
                    <p className="text-xs font-black truncate">{currentItin.hotel.breakfast_info || '飯店餐廳'}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  {currentItin.hotel.google_map_url && (
                    <a 
                      href={currentItin.hotel.google_map_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-xs transition-all shadow-lg shadow-blue-900/40"
                    >
                      <Navigation className="w-4 h-4" />
                      飯店導覽
                    </a>
                  )}
                  {currentItin.hotel.phone && (
                    <a 
                      href={`tel:${currentItin.hotel.phone}`}
                      className="p-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl transition-all"
                    >
                      <Phone className="w-5 h-5" />
                    </a>
                  )}
                </div>

                {/* Room Allocation */}
                {roomAllocations[currentItin.id] && Object.keys(roomAllocations[currentItin.id]).length > 0 && (
                  <div className="mt-8 pt-8 border-t border-slate-800">
                    <div className="flex items-center gap-2 mb-4">
                      <Key className="w-5 h-5 text-blue-500" />
                      <h4 className="font-black text-lg">房號分配</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(roomAllocations[currentItin.id]).sort((a, b) => a[0].localeCompare(b[0])).map(([room, names]) => (
                        <div key={room} className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <div className="text-blue-500 font-black text-lg mb-1">{room}</div>
                          <div className="text-xs text-slate-400 font-medium leading-relaxed">
                            {names.join('、')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Share FAB */}
      <button 
        onClick={() => {
          if (navigator.share) {
            navigator.share({
              title: group?.name || '行程預覽',
              url: window.location.href
            });
          } else {
            navigator.clipboard.writeText(window.location.href);
            alert('連結已複製到剪貼簿');
          }
        }}
        className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-900/60 transition-all active:scale-90 z-50"
      >
        <Share2 className="w-6 h-6" />
      </button>
    </div>
  );
}
