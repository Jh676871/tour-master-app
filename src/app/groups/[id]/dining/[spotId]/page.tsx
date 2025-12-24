'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, 
  UtensilsCrossed, 
  Users, 
  AlertCircle,
  Loader2,
  Printer,
  ChevronLeft
} from 'lucide-react';
import Link from 'next/link';
import { Traveler, Group, Spot, ItinerarySpotTable } from '@/types/database';

export default function DiningSummaryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const groupId = params.id as string;
  const spotId = params.spotId as string;
  const itineraryId = searchParams.get('itineraryId');

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<Group | null>(null);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [tables, setTables] = useState<ItinerarySpotTable[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch Group
        const { data: groupData } = await supabase.from('groups').select('*').eq('id', groupId).single();
        setGroup(groupData);

        // Fetch Spot
        const { data: spotData } = await supabase.from('spots').select('*').eq('id', spotId).single();
        setSpot(spotData);

        // Fetch Travelers
        const { data: travelersData } = await supabase
          .from('travelers')
          .select('*')
          .eq('group_id', groupId);
        setTravelers(travelersData || []);

        // Fetch Tables
        let query = supabase
          .from('itinerary_spot_tables')
          .select('*')
          .eq('spot_id', spotId);
        
        if (itineraryId) {
          query = query.eq('itinerary_id', itineraryId);
        }

        const { data: tableData } = await query;
        
        if (!itineraryId) {
          // Filter tables that belong to this group's itineraries if no specific itineraryId provided
          const { data: itinData } = await supabase.from('itineraries').select('id').eq('group_id', groupId);
          const itinIds = itinData?.map(i => i.id) || [];
          setTables((tableData || []).filter(t => itinIds.includes(t.itinerary_id)));
        } else {
          setTables(tableData || []);
        }

      } catch (error) {
        console.error('Error fetching dining data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [groupId, spotId, itineraryId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  // Calculate dietary summary
  const dietarySummary: Record<string, number> = {};
  travelers.forEach(t => {
    if (t.dietary_needs && t.dietary_needs !== '無') {
      const needs = t.dietary_needs.split(',').map(s => s.trim());
      needs.forEach(n => {
        dietarySummary[n] = (dietarySummary[n] || 0) + 1;
      });
    }
  });

  return (
    <main className="min-h-screen bg-white text-slate-900 pb-20">
      <header className="bg-orange-600 text-white p-6 sticky top-0 z-30 flex items-center justify-between shadow-lg print:hidden">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-black">餐廳經理模式</h1>
            <p className="text-xs font-bold opacity-80">{group?.name} · {spot?.name}</p>
          </div>
        </div>
        <button 
          onClick={() => window.print()}
          className="bg-white/20 hover:bg-white/30 p-3 rounded-2xl transition-all"
        >
          <Printer className="w-6 h-6" />
        </button>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Dietary Summary Card */}
        <section className="bg-orange-50 border-2 border-orange-100 rounded-[2.5rem] p-8">
          <h2 className="text-xl font-black flex items-center gap-3 mb-6 text-orange-700">
            <AlertCircle className="w-6 h-6" /> 特殊飲食彙整 (全團)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(dietarySummary).map(([need, count]) => (
              <div key={need} className="bg-white border border-orange-200 p-4 rounded-2xl shadow-sm">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{need}</p>
                <p className="text-2xl font-black text-orange-600">{count} <span className="text-sm font-bold text-slate-400">位</span></p>
              </div>
            ))}
            {Object.keys(dietarySummary).length === 0 && (
              <p className="col-span-full text-center py-4 text-slate-400 font-bold italic">全團均無特殊飲食需求</p>
            )}
          </div>
        </section>

        {/* Table Assignments */}
        <section className="space-y-6">
          <h2 className="text-xl font-black flex items-center gap-3 px-2">
            <UtensilsCrossed className="w-6 h-6 text-orange-600" /> 桌次明細
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tables.sort((a, b) => parseInt(a.table_number) - parseInt(b.table_number)).map(table => (
              <div key={table.id} className="border-2 border-slate-100 rounded-[2rem] overflow-hidden bg-white shadow-sm">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-lg font-black">{table.table_number} 號桌</h3>
                  <span className="bg-white px-3 py-1 rounded-full text-xs font-black text-slate-400 border border-slate-200">
                    {table.traveler_ids.length} 人
                  </span>
                </div>
                <div className="p-6 space-y-3">
                  {table.traveler_ids.map(tid => {
                    const traveler = travelers.find(t => t.id === tid);
                    if (!traveler) return null;
                    return (
                      <div key={tid} className="flex items-center justify-between text-sm">
                        <span className="font-bold">{traveler.full_name}</span>
                        {traveler.dietary_needs && traveler.dietary_needs !== '無' && (
                          <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-lg">
                            {traveler.dietary_needs}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {tables.length === 0 && (
              <div className="col-span-full text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold">尚未配置桌位資料</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white to-transparent pointer-events-none print:hidden">
        <div className="max-w-4xl mx-auto flex justify-center pointer-events-auto">
          <p className="text-[10px] font-black text-slate-400 bg-white/80 backdrop-blur px-4 py-2 rounded-full border border-slate-100 shadow-sm">
            請將此螢幕出示給餐廳經理確認
          </p>
        </div>
      </footer>
    </main>
  );
}
