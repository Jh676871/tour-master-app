'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Plus, Navigation, Users, CheckSquare, LayoutGrid, FileText, Loader2, Hotel, Map as MapIcon } from 'lucide-react';
import Link from 'next/link';
import GroupCard from '@/components/GroupCard';
import AddGroupModal from '@/components/AddGroupModal';
import { supabase } from '@/lib/supabase';
import { Group } from '@/types/database';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groups, setGroups] = useState<(Group & { memberCount: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchGroups(controller.signal);
    return () => controller.abort();
  }, []);

  const fetchGroups = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      // Fetch groups and join with traveler counts
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (groupsError) {
        // If it's an abort error, we don't want to log it as a full error
        if (groupsError.message?.includes('AbortError') || groupsError.code === 'ABORT') {
          return;
        }
        
        console.error('Groups Fetch Error Details:', groupsError);
        throw groupsError;
      }

      if (!groupsData) {
        setGroups([]);
        return;
      }

      const groupsWithCounts = await Promise.all(groupsData.map(async (group) => {
        try {
          const travelerQuery = supabase
            .from('travelers')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', group.id);
          
          const { count, error: countError } = await travelerQuery;
          
          if (countError) {
            console.warn(`Error fetching count for group ${group.id}:`, countError.message);
            return { ...group, memberCount: 0 };
          }
          
          return {
            ...group,
            memberCount: count || 0
          };
        } catch (err: any) {
          if (err.name === 'AbortError') throw err;
          console.warn(`Exception fetching count for group ${group.id}:`, err);
          return { ...group, memberCount: 0 };
        }
      }));

      setGroups(groupsWithCounts);
    } catch (error: any) {
      if (error.name !== 'AbortError' && !error.message?.includes('AbortError')) {
        console.error('Error fetching groups:', error.message || error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white pb-20">
      {/* Professional Header - Deep Blue / Slate */}
      <header className="bg-slate-900 border-b border-slate-800 shadow-2xl sticky top-0 z-30 backdrop-blur-md bg-opacity-90">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 overflow-hidden rounded-[1.25rem] shadow-[0_0_30px_rgba(37,99,235,0.3)] border border-blue-400/50">
              <Image 
                src="/logo.png" 
                alt="TourMaster Logo" 
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-white uppercase leading-none">
                TourMaster
              </h1>
              <p className="text-[10px] font-black text-blue-500 tracking-[0.3em] uppercase mt-1">Professional Navigator</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsModalOpen(true)}
              title="新增團體"
              className="flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white w-12 h-12 rounded-xl font-black transition-all shadow-xl shadow-blue-900/40 active:scale-95 border border-blue-400"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section / Quick Actions for One-Handed Use */}
      <div className="bg-slate-900 border-b border-slate-800 py-12 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-blue-900/30 px-4 py-2 rounded-full border border-blue-500/30">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-black text-blue-400 uppercase tracking-[0.2em]">系統運行中</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-none">
                領隊導航<span className="text-blue-500">中心</span>
              </h2>
              <p className="text-slate-400 text-lg font-bold max-w-xl">
                專為領隊設計的戶外管理工具。快速點名、旅客房號管理，一切盡在掌握。
              </p>
            </div>
            
            {/* Quick Action Large Buttons - Primary for one-handed */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full md:w-auto">
              <Link 
                href="/check-in"
                className="flex flex-col items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white p-6 rounded-[2rem] font-black transition-all shadow-2xl shadow-blue-900/40 active:scale-95 border-2 border-blue-400 group h-40 w-full md:w-40"
              >
                <div className="bg-white/20 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                  <CheckSquare className="w-6 h-6" />
                </div>
                <span className="uppercase tracking-widest text-xs">每日點名</span>
              </Link>
              <Link 
                href="/travelers"
                className="flex flex-col items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 text-white p-6 rounded-[2rem] font-black transition-all shadow-xl border-2 border-slate-700 active:scale-95 group h-40 w-full md:w-40"
              >
                <div className="bg-white/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <span className="uppercase tracking-widest text-xs text-center">旅客名單</span>
              </Link>
              <Link 
                href="/report"
                className="flex flex-col items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 text-white p-6 rounded-[2rem] font-black transition-all shadow-xl border-2 border-slate-700 active:scale-95 group h-40 w-full md:w-40"
              >
                <div className="bg-white/10 p-3 rounded-2xl group-hover:scale-110 transition-transform text-purple-400">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="uppercase tracking-widest text-xs text-center">完團報告</span>
              </Link>
              <Link 
                href="/hotel"
                className="flex flex-col items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 text-white p-6 rounded-[2rem] font-black transition-all shadow-xl border-2 border-slate-700 active:scale-95 group h-40 w-full md:w-40"
              >
                <div className="bg-white/10 p-3 rounded-2xl group-hover:scale-110 transition-transform text-orange-400">
                  <Navigation className="w-6 h-6" />
                </div>
                <span className="uppercase tracking-widest text-xs text-center">飯店設定</span>
              </Link>
              <Link 
                href="/hotels"
                className="flex flex-col items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 text-white p-6 rounded-[2rem] font-black transition-all shadow-xl border-2 border-slate-700 active:scale-95 group h-40 w-full md:w-40"
              >
                <div className="bg-white/10 p-3 rounded-2xl group-hover:scale-110 transition-transform text-green-400">
                  <Hotel className="w-6 h-6" />
                </div>
                <span className="uppercase tracking-widest text-xs text-center">飯店資料庫</span>
              </Link>
              <Link 
                href="/spots"
                className="flex flex-col items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 text-white p-6 rounded-[2rem] font-black transition-all shadow-xl border-2 border-slate-700 active:scale-95 group h-40 w-full md:w-40"
              >
                <div className="bg-white/10 p-3 rounded-2xl group-hover:scale-110 transition-transform text-pink-400">
                  <MapIcon className="w-6 h-6" />
                </div>
                <span className="uppercase tracking-widest text-xs text-center">景點資料庫</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <LayoutGrid className="w-6 h-6 text-blue-500" />
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.4em]">行程管理中心</h3>
            </div>
            <h4 className="text-4xl font-black text-white tracking-tight">目前負責團體</h4>
          </div>
          <div className="bg-slate-900 px-8 py-4 rounded-[2rem] border border-slate-800 inline-flex items-center gap-4 shadow-inner">
            <span className="text-slate-500 font-black uppercase tracking-widest text-xs">運作中團體</span>
            <div className="w-px h-8 bg-slate-800"></div>
            <span className="text-4xl font-black text-blue-500">{groups.length}</span>
          </div>
        </div>

        {/* Professional Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            </div>
          ) : (
            groups.map((group) => (
              <GroupCard 
                key={group.id} 
                id={group.id}
                name={group.name}
                startDate={group.start_date}
                endDate={group.end_date}
                memberCount={group.memberCount}
                location={group.name.split(' ')[0]} // Use first word of name as location for now
              />
            ))
          )}
          
          {/* Add New Group Placeholder Card */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="group bg-slate-900/50 rounded-[2.5rem] border-4 border-dashed border-slate-800 p-8 flex flex-col items-center justify-center gap-6 hover:border-blue-500/50 hover:bg-slate-900 transition-all min-h-[350px] shadow-xl relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-colors"></div>
            <div className="w-24 h-24 bg-slate-800 rounded-[2rem] flex items-center justify-center group-hover:bg-blue-600 group-hover:scale-110 transition-all shadow-2xl border border-slate-700 group-hover:border-blue-400">
              <Plus className="w-12 h-12 text-slate-500 group-hover:text-white" />
            </div>
            <div className="text-center relative z-10">
              <p className="text-2xl font-black text-slate-400 group-hover:text-white transition-colors uppercase tracking-[0.2em]">建立新團體</p>
              <p className="text-sm font-bold text-slate-600 mt-2 group-hover:text-slate-400 uppercase tracking-widest">Start New Plan</p>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Mobile FAB for One-Handed Use */}
      <div className="md:hidden fixed bottom-8 right-8 z-50">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-20 h-20 bg-blue-600 text-white rounded-[2rem] shadow-[0_20px_40px_rgba(37,99,235,0.4)] flex items-center justify-center border-2 border-blue-400 active:scale-90 transition-all"
        >
          <Plus className="w-10 h-10" />
        </button>
      </div>

      {/* Professional Modal */}
      <AddGroupModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchGroups}
      />
    </main>
  );
}
