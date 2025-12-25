'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Traveler, Group, ImmigrationTemplate } from '@/types/database';
import { 
  ArrowLeft, 
  Plus, 
  Minus, 
  Camera, 
  Check, 
  Share2, 
  FileText,
  UploadCloud,
  Loader2,
  Luggage
} from 'lucide-react';

export default function AirportAssistant() {
  const params = useParams();
  const id = params?.id as string;
  const [group, setGroup] = useState<Group | null>(null);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [template, setTemplate] = useState<ImmigrationTemplate | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTravelerId, setSelectedTravelerId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchData();
      // Load offline data if available
      const cached = localStorage.getItem(`airport_data_${id}`);
      if (cached) {
        setTravelers(JSON.parse(cached));
      }
    }
  }, [id]);

  useEffect(() => {
    if (travelers.length > 0) {
      localStorage.setItem(`airport_data_${id}`, JSON.stringify(travelers));
    }
  }, [travelers, id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Group
      const { data: groupData } = await supabase.from('groups').select('*').eq('id', id).single();
      setGroup(groupData);

      // Fetch Travelers
      const { data: travelersData } = await supabase
        .from('travelers')
        .select('*')
        .eq('group_id', id)
        .order('full_name');
      
      if (travelersData) {
        setTravelers(travelersData);
      }

      // Fetch Template
      if (groupData && groupData.destination_country && groupData.destination_country !== 'Taiwan') {
        const { data: templateData } = await supabase
          .from('immigration_templates')
          .select('*')
          .eq('country_name', groupData.destination_country)
          .maybeSingle();
        
        // If not found, try to find "Others" or fallback (optional)
        // For now, if exact match not found, template is null (hidden)
        setTemplate(templateData);
      } else {
        setTemplate(null);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLuggage = async (travelerId: string, delta: number) => {
    // Optimistic Update
    setTravelers(prev => prev.map(t => {
      if (t.id === travelerId) {
        const newCount = Math.max(0, (t.luggage_count || 0) + delta);
        return { ...t, luggage_count: newCount };
      }
      return t;
    }));

    // DB Update
    const traveler = travelers.find(t => t.id === travelerId);
    if (!traveler) return;
    const newCount = Math.max(0, (traveler.luggage_count || 0) + delta);

    const { error } = await supabase
      .from('travelers')
      .update({ luggage_count: newCount })
      .eq('id', travelerId);
    
    if (error) {
      console.error('Error updating luggage:', error);
      // Revert if needed (omitted for brevity)
    }
  };

  const handleCameraClick = (travelerId: string) => {
    setSelectedTravelerId(travelerId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTravelerId) return;

    try {
      setUploadingId(selectedTravelerId);
      const fileExt = file.name.split('.').pop();
      const fileName = `${id}/${selectedTravelerId}_${Date.now()}.${fileExt}`;

      // Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('boarding-passes')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('boarding-passes')
        .getPublicUrl(fileName);

      // Update Traveler Record
      const { error: dbError } = await supabase
        .from('travelers')
        .update({ boarding_pass_url: publicUrl })
        .eq('id', selectedTravelerId);

      if (dbError) throw dbError;

      // Update Local State
      setTravelers(prev => prev.map(t => 
        t.id === selectedTravelerId ? { ...t, boarding_pass_url: publicUrl } : t
      ));

    } catch (error) {
      console.error('Upload failed:', error);
      alert('上傳失敗，請重試');
    } finally {
      setUploadingId(null);
      setSelectedTravelerId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const [sendingLine, setSendingLine] = useState(false);

  const handleShareTemplate = async () => {
    if (!template) return;
    
    if (!confirm('確定要發送入境卡範本給所有已綁定 LINE 的團員嗎？')) return;

    try {
      setSendingLine(true);
      const response = await fetch('/api/line/broadcast-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupId: id,
          template: template
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '發送失敗');
      }

      if (result.count === 0) {
        alert('沒有找到已綁定 LINE 的團員。');
      } else {
        alert(`已成功發送給 ${result.count} 位團員！`);
      }
    } catch (error: any) {
      console.error('Share error:', error);
      alert(`發送失敗: ${error.message}`);
    } finally {
      setSendingLine(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      <input 
        type="file" 
        accept="image/*" 
        capture="environment"
        ref={fileInputRef} 
        className="absolute opacity-0 w-1 h-1 overflow-hidden" 
        onChange={handleFileChange}
      />

      <header className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-4 flex items-center gap-4">
        <Link href={`/groups/${id}`} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-lg font-black">機場快速助手</h1>
        <div className="ml-auto">
            {/* Sync status or offline indicator could go here */}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        
        {/* Immigration Template Section - Only show if template exists */}
        {template && (
        <section className="bg-slate-900 rounded-3xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-400" />
              <h2 className="font-bold text-lg">入境卡範本 ({template.country_name})</h2>
            </div>
            <button 
              onClick={handleShareTemplate}
              disabled={sendingLine}
              className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all active:scale-95"
            >
              {sendingLine ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              {sendingLine ? '發送中...' : '發送至 LINE'}
            </button>
          </div>
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
            <p className="text-slate-400 text-sm mb-3 whitespace-pre-line">{template.instruction_text}</p>
            {template.template_image_url && (
              <div className="relative w-full h-64 rounded-lg overflow-hidden border border-slate-800 group">
                <Image 
                  src={template.template_image_url} 
                  alt="Template" 
                  fill 
                  className="object-contain"
                />
              </div>
            )}
          </div>
        </section>
        )}

        {/* Travelers List */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 px-1 flex items-center justify-between">
            <span>旅客名單 ({travelers.length})</span>
            <span className="text-blue-400 text-xs">
              總件數: {travelers.reduce((acc, t) => acc + (t.luggage_count || 0), 0)}
            </span>
          </h2>
          
          <div className="space-y-3">
            {travelers.map(traveler => (
              <div key={traveler.id} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex items-center gap-4">
                {/* Avatar / Name */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate text-lg">{traveler.full_name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    {traveler.boarding_pass_url ? (
                      <span className="text-green-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> 已上傳登機證
                      </span>
                    ) : (
                      <span className="text-orange-400">未上傳登機證</span>
                    )}
                  </div>
                </div>

                {/* Luggage Counter */}
                <div className="flex items-center gap-3 bg-slate-900 rounded-xl p-1.5 border border-slate-800">
                  <button 
                    onClick={() => updateLuggage(traveler.id, -1)}
                    className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-colors active:bg-slate-600"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <div className="w-8 text-center font-black text-xl text-white">
                    {traveler.luggage_count || 0}
                  </div>
                  <button 
                    onClick={() => updateLuggage(traveler.id, 1)}
                    className="w-10 h-10 rounded-lg bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white transition-colors active:bg-blue-700"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Camera Button */}
                <button 
                  onClick={() => handleCameraClick(traveler.id)}
                  disabled={uploadingId === traveler.id}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all active:scale-95 ${
                    traveler.boarding_pass_url 
                      ? 'bg-green-600/20 text-green-400 border-green-500/30 hover:bg-green-600/30' 
                      : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600 hover:text-white'
                  }`}
                >
                  {uploadingId === traveler.id ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
