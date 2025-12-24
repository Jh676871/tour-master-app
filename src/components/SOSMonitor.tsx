'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { EmergencyAlert, Traveler } from '@/types/database';
import { AlertTriangle, MapPin, X, ExternalLink, Navigation } from 'lucide-react';

export default function SOSMonitor() {
  const [activeAlert, setActiveAlert] = useState<EmergencyAlert | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // 1. Listen for new alerts
    const channel = supabase
      .channel('public:emergency_alerts')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'emergency_alerts' 
        }, 
        async (payload) => {
          console.log('New SOS Alert received:', payload);
          const newAlert = payload.new as EmergencyAlert;
          
          // Fetch traveler details
          const { data: travelerData } = await supabase
            .from('travelers')
            .select('*')
            .eq('id', newAlert.traveler_id)
            .single();
          
          if (travelerData) {
            setActiveAlert({
              ...newAlert,
              traveler: travelerData as Traveler
            });
            
            // Play sound if not muted
            if (!isMuted) {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');
              audio.play().catch(e => console.error('Audio play failed:', e));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isMuted]);

  const dismissAlert = async () => {
    if (activeAlert) {
      await supabase
        .from('emergency_alerts')
        .update({ status: 'resolved' })
        .eq('id', activeAlert.id);
      setActiveAlert(null);
    }
  };

  if (!activeAlert) return null;

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${activeAlert.latitude},${activeAlert.longitude}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-red-600/90 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
      <div className="w-full max-w-2xl bg-slate-950 border-4 border-white rounded-[3rem] shadow-[0_0_100px_rgba(255,255,255,0.5)] overflow-hidden relative">
        <div className="bg-red-600 p-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-2xl animate-pulse">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Emergency SOS</h2>
          </div>
          <button 
            onClick={() => setActiveAlert(null)}
            className="text-white/50 hover:text-white p-2"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="p-10 space-y-8">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-red-600 rounded-[2rem] flex items-center justify-center font-black text-4xl text-white shadow-xl flex-shrink-0">
              {activeAlert.traveler?.full_name[0]}
            </div>
            <div className="space-y-2">
              <h3 className="text-5xl font-black text-white">{activeAlert.traveler?.full_name}</h3>
              <p className="text-red-500 font-black text-xl uppercase tracking-[0.3em]">發出緊急求助訊息！</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-1">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">血型</p>
              <p className="text-2xl font-black text-white">{activeAlert.traveler?.blood_type || '未填寫'}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-1">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">緊急聯絡人</p>
              <p className="text-2xl font-black text-white">{activeAlert.traveler?.emergency_contact || '未填寫'}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-1">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">醫療病史備註</p>
            <p className="text-lg font-bold text-slate-300">{activeAlert.traveler?.medical_notes || '無備註'}</p>
          </div>

          <div className="flex flex-col gap-4 pt-4">
            <a 
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-[2rem] font-black text-2xl uppercase tracking-widest transition-all shadow-2xl flex items-center justify-center gap-4 active:scale-95"
            >
              <Navigation className="w-8 h-8" />
              開啟導航救援
            </a>
            
            <button 
              onClick={dismissAlert}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 py-4 rounded-[1.5rem] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              解除警告
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
