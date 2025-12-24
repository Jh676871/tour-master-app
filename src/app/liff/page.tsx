'use client';

import React, { useEffect, useState, Suspense } from 'react';
import liff from '@line/liff';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle2, AlertCircle, User } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

function LiffContent() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'idle' | 'binding' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [profile, setProfile] = useState<{ displayName: string; userId: string; pictureUrl?: string } | null>(null);
  
  const searchParams = useSearchParams();
  const name = searchParams.get('name');
  const router = useRouter();

  useEffect(() => {
    // 如果沒有參數，直接導向到新的旅客首頁
    if (!name) {
      window.location.href = '/traveler';
      return;
    }

    const controller = new AbortController();

    const initLiff = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID || '' });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        
        const userProfile = await liff.getProfile();
        setProfile(userProfile);
        
        if (name) {
          handleBinding(userProfile.userId, name, controller.signal);
        } else {
          setLoading(false);
          setStatus('error');
          setMessage('缺少必要參數，請透過正確連結開啟。');
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('LIFF Init Error:', err);
          setLoading(false);
          setStatus('error');
          setMessage('LIFF 初始化失敗，請重新開啟。');
        }
      }
    };

    initLiff();
    return () => controller.abort();
  }, [name]);

  const handleBinding = async (userId: string, travelerName: string, signal?: AbortSignal) => {
    setStatus('binding');
    try {
      // 1. Find the traveler by name
      const query = supabase
        .from('travelers')
        .select('*')
        .or(`full_name.eq."${travelerName}",name.eq."${travelerName}"`);
      
      if (signal) query.abortSignal(signal);
      
      const { data: traveler, error: findError } = await query.single();

      if (findError || !traveler) {
        throw new Error('找不到對應的旅客資料，請洽領隊。');
      }

      // 2. Update the line_uid
      const updateQuery = supabase
        .from('travelers')
        .update({ line_uid: userId })
        .eq('id', traveler.id);
      
      if (signal) updateQuery.abortSignal(signal);

      const { error: updateError } = await updateQuery;

      if (updateError) {
        // Fallback: If column doesn't exist, we might need the user to add it
        if (updateError.message.includes('column "line_uid" of relation "travelers" does not exist')) {
          throw new Error('系統資料庫尚未更新，請洽技術人員新增 line_uid 欄位。');
        }
        throw updateError;
      }

      setStatus('success');
      setMessage(`綁定成功！您好，${travelerName}。`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Binding Error:', err);
        setStatus('error');
        setMessage(err.message || '綁定過程中發生錯誤。');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl text-center">
        {loading ? (
          <div className="py-12 flex flex-col items-center gap-6">
            <Loader2 className="w-16 h-16 animate-spin text-blue-500" />
            <p className="text-xl font-black text-slate-400 uppercase tracking-widest">初始化中...</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in zoom-in duration-500">
            {profile?.pictureUrl && (
              <div className="relative mx-auto w-24 h-24">
                <img src={profile.pictureUrl} alt="profile" className="rounded-full border-4 border-blue-600 shadow-xl" />
                <div className="absolute -bottom-2 -right-2 bg-blue-600 p-2 rounded-full shadow-lg">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
            
            <div>
              <h1 className="text-2xl font-black mb-2">LINE 旅客綁定</h1>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Traveler Identity Binding</p>
            </div>

            <div className={`p-6 rounded-3xl border ${
              status === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
              status === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
              'bg-blue-500/10 border-blue-500/20 text-blue-400'
            }`}>
              <div className="flex flex-col items-center gap-4">
                {status === 'success' ? <CheckCircle2 className="w-12 h-12" /> :
                 status === 'error' ? <AlertCircle className="w-12 h-12" /> :
                 <User className="w-12 h-12" />}
                <p className="text-lg font-bold leading-relaxed">{message}</p>
              </div>
            </div>

            {status === 'success' && (
              <button 
                onClick={() => liff.closeWindow()}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-900/40 border-2 border-blue-400 active:scale-95"
              >
                關閉視窗
              </button>
            )}

            {status === 'error' && (
              <p className="text-slate-500 text-sm italic">
                請確認您是點擊正確的連結進入，如有疑問請聯繫領隊。
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function LiffPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    }>
      <LiffContent />
    </Suspense>
  );
}
