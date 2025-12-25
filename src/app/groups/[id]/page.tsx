'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Group } from '@/types/database';
import { 
  ArrowLeft, 
  Plane, 
  Wallet, 
  Utensils, 
  Settings, 
  Users, 
  FileText,
  Map,
  LogOut
} from 'lucide-react';
import FlightStatusCard from '@/components/FlightStatusCard';

export default function GroupDashboard() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchGroupDetails();
    }
  }, [id]);

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setGroup(data);
    } catch (error) {
      console.error('Error fetching group:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;
  }

  if (!group) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Group not found</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Link href="/" className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-lg font-black truncate max-w-[200px]">{group.name}</h1>
          <Link href={`/groups/${id}/edit`} className="p-2 -mr-2 text-slate-400 hover:text-white transition-colors">
            <Settings className="w-6 h-6" />
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Flight Status Section */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">Flight Status</h2>
          <FlightStatusCard 
            flightNumber={group.flight_number}
            departureDate={group.departure_time}
          />
        </section>

        {/* Quick Actions Grid */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">Tools & Management</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link href={`/groups/${id}/airport`} className="bg-slate-800 p-5 rounded-3xl border border-slate-700 hover:border-blue-500/50 hover:bg-slate-750 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/3 translate-x-1/3 group-hover:bg-blue-500/10"></div>
              <div className="bg-slate-900 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-blue-400 group-hover:text-white group-hover:scale-110 transition-all duration-300">
                <Plane className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg leading-tight mb-1">機場助手</h3>
              <p className="text-xs text-slate-500 font-medium">登機證與行李管理</p>
            </Link>

            <Link href={`/groups/${id}/ledger`} className="bg-slate-800 p-5 rounded-3xl border border-slate-700 hover:border-green-500/50 hover:bg-slate-750 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl -translate-y-1/3 translate-x-1/3 group-hover:bg-green-500/10"></div>
              <div className="bg-slate-900 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-green-400 group-hover:text-white group-hover:scale-110 transition-all duration-300">
                <Wallet className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg leading-tight mb-1">財務帳本</h3>
              <p className="text-xs text-slate-500 font-medium">公費與私帳管理</p>
            </Link>

            <Link href={`/groups/${id}/dining`} className="bg-slate-800 p-5 rounded-3xl border border-slate-700 hover:border-orange-500/50 hover:bg-slate-750 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl -translate-y-1/3 translate-x-1/3 group-hover:bg-orange-500/10"></div>
              <div className="bg-slate-900 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-orange-400 group-hover:text-white group-hover:scale-110 transition-all duration-300">
                <Utensils className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg leading-tight mb-1">餐廳分配</h3>
              <p className="text-xs text-slate-500 font-medium">桌次與飲食禁忌</p>
            </Link>

            <Link href={`/groups/${id}/preview`} className="bg-slate-800 p-5 rounded-3xl border border-slate-700 hover:border-purple-500/50 hover:bg-slate-750 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -translate-y-1/3 translate-x-1/3 group-hover:bg-purple-500/10"></div>
              <div className="bg-slate-900 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-purple-400 group-hover:text-white group-hover:scale-110 transition-all duration-300">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg leading-tight mb-1">行程預覽</h3>
              <p className="text-xs text-slate-500 font-medium">每日行程與資訊</p>
            </Link>
          </div>
        </section>

        {/* Stats or other info could go here */}
        <section className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800">
          <div className="flex items-center gap-3 mb-4">
             <Users className="w-5 h-5 text-slate-400" />
             <h3 className="font-bold text-slate-300">團員概況</h3>
          </div>
          <div className="text-3xl font-black text-white mb-1">{group.group_code}</div>
          <p className="text-slate-500 text-sm">出發日期：{group.start_date}</p>
        </section>
      </main>
    </div>
  );
}
