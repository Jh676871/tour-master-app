'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { UserPlus, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Trash2, UserCog, FileUp, Download, Users, RotateCw, Eraser, MessageSquare, Copy, Link as LinkIcon, Send } from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';

interface Traveler {
  id: string;
  full_name: string;
  room_number: string;
  gender: string;
  dietary_needs: string;
  line_uid?: string;
  created_at?: string;
}

export default function TravelersPage() {
  const [name, setName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [gender, setGender] = useState('男');
  const [dietaryNeeds, setDietaryNeeds] = useState('無');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTravelers = async () => {
    try {
      setFetching(true);
      const { data: rawData, error } = await supabase
        .from('travelers')
        .select('*');

      if (error) throw error;
      
      // Robust mapping logic to handle varying column names
      const mappedTravelers = (rawData || []).map(t => {
        return {
          id: t.id,
          full_name: t.full_name || t.name || '未名',
          room_number: String(t.room_number || t.room_no || t.room || ''),
          gender: t.gender || '未指定',
          dietary_needs: t.dietary_needs || t.diet || '無',
          line_uid: t.line_uid || null,
          created_at: t.created_at
        } as Traveler;
      });

      // Sort in JS to avoid database errors on missing order columns
      const sortedTravelers = [...mappedTravelers].sort((a, b) => 
        a.room_number.localeCompare(b.room_number, undefined, { numeric: true })
      );

      setTravelers(sortedTravelers);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error fetching travelers:', error.message);
      }
    } finally {
      setFetching(false);
    }
  };

  const clearAllTravelers = async () => {
    if (!confirm('確定要清空所有旅客與點名紀錄嗎？這通常在開啟新團時使用，此操作無法復原。')) return;
    
    setFetching(true);
    try {
      // 1. Clear check-ins first (foreign key dependency)
      const { error: checkinError } = await supabase
        .from('check_ins')
        .delete()
        .not('id', 'is', null); 

      if (checkinError) throw checkinError;

      // 2. Clear travelers
      const { error: travelerError } = await supabase
        .from('travelers')
        .delete()
        .not('id', 'is', null);

      if (travelerError) throw travelerError;

      setMessage({ type: 'success', text: '已成功清空所有資料，可開始匯入新名單。' });
      fetchTravelers();
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(`清空失敗：${error.message}`);
      }
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchTravelers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !roomNumber) return;

    setLoading(true);
    setMessage(null);

    try {
      const insertData: any = { 
        full_name: name, 
        room_number: roomNumber
      };

      // Only add these if we're sure the DB has them, or just try and handle error
      insertData.gender = gender;
      insertData.dietary_needs = dietaryNeeds;

      const { error } = await supabase
        .from('travelers')
        .insert([insertData]);

      if (error) {
        if (error.message.includes('column') && (error.message.includes('gender') || error.message.includes('dietary_needs'))) {
          // If columns are missing, try inserting without them
          console.warn('New columns missing in DB, falling back to basic insert');
          const { error: retryError } = await supabase
            .from('travelers')
            .insert([{ full_name: name, room_number: roomNumber }]);
          if (retryError) throw retryError;
          setMessage({ type: 'success', text: '旅客資料已儲存（注意：資料庫尚不支援性別與飲食需求欄位）' });
        } else {
          throw error;
        }
      } else {
        setMessage({ type: 'success', text: '旅客資料已成功儲存！' });
      }
      setName('');
      setRoomNumber('');
      setGender('男');
      setDietaryNeeds('無');
      fetchTravelers();
    } catch (error: unknown) {
      if (error instanceof Error) {
        setMessage({ type: 'error', text: `儲存失敗：${error.message}` });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws) as any[];

        // Enhanced mapping logic to handle spaces and various naming conventions
        const formattedData = rawData.map(row => {
          // Find value by checking keys with trimming and case-insensitive matching
          const getValue = (possibleNames: string[]) => {
            const key = Object.keys(row).find(k => 
              possibleNames.some(name => 
                k.trim().toLowerCase() === name.toLowerCase()
              )
            );
            return key ? row[key] : null;
          };

          return {
            full_name: getValue(['姓名', 'name', 'full_name', '旅客姓名']) || '',
            room_number: String(getValue(['房號', 'room', 'room_number', '房間號碼']) || ''),
            gender: getValue(['性別', 'gender', 'sex']) || '男',
            dietary_needs: getValue(['飲食需求', 'diet', 'dietary_needs', '備註']) || '無'
          };
        }).filter(item => item.full_name && item.full_name.trim() !== '');

        if (formattedData.length === 0) {
          throw new Error('找不到有效的旅客資料。請確保 Excel 第一行是標題（如：姓名、房號、性別、飲食需求）。');
        }

        const { error } = await supabase
          .from('travelers')
          .insert(formattedData);

        if (error) {
          if (error.message.includes('column') && (error.message.includes('gender') || error.message.includes('dietary_needs'))) {
            console.warn('New columns missing in DB, retrying import without them');
            const strippedData = formattedData.map(({ full_name, room_number }) => ({ full_name, room_number }));
            const { error: retryError } = await supabase
              .from('travelers')
              .insert(strippedData);
            if (retryError) throw retryError;
            setMessage({ type: 'success', text: `成功匯入 ${formattedData.length} 位旅客！（注意：資料庫尚不支援性別與飲食需求欄位）` });
          } else {
            throw error;
          }
        } else {
          setMessage({ type: 'success', text: `成功匯入 ${formattedData.length} 位旅客！` });
        }
        fetchTravelers();
      } catch (error: unknown) {
        if (error instanceof Error) {
          setMessage({ type: 'error', text: `匯入失敗：${error.message}` });
        }
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const template = [
      { '姓名': '王大明', '房號': '101', '性別': '男', '飲食需求': '無' },
      { '姓名': '李小華', '房號': '102', '性別': '女', '飲食需求': '蛋奶素' }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "旅客名單範本");
    XLSX.writeFile(wb, "traveler_template.xlsx");
  };

  const [sendingLine, setSendingLine] = useState<string | null>(null);

  const handleSendTestMessage = async (traveler: Traveler) => {
    if (!traveler.line_uid) {
      alert('該旅客尚未綁定 LINE！');
      return;
    }

    setSendingLine(traveler.id);
    try {
      const response = await fetch('/api/line/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: traveler.line_uid,
          message: '您好，歡迎加入本次旅行！'
        })
      });

      if (!response.ok) throw new Error('發送失敗');
      setMessage({ type: 'success', text: `已成功發送測試訊息給 ${traveler.full_name}！` });
    } catch (error: any) {
      setMessage({ type: 'error', text: `發送失敗：${error.message}` });
    } finally {
      setSendingLine(null);
    }
  };

  const copyLiffLink = (name: string) => {
    const liffUrl = `${window.location.origin}/liff?name=${encodeURIComponent(name)}`;
    navigator.clipboard.writeText(liffUrl);
    setMessage({ type: 'success', text: `已複製 ${name} 的綁定連結！` });
  };
  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這位旅客嗎？')) return;

    try {
      const { error } = await supabase
        .from('travelers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchTravelers();
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(`刪除失敗：${error.message}`);
      }
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white pb-20">
      <div className="max-w-5xl mx-auto px-6 py-6 md:py-12">
        {/* Header - Professional Deep Blue */}
        <div className="flex items-center justify-between mb-8 md:mb-12 bg-slate-950 p-6 rounded-[2rem] border border-slate-800 shadow-2xl">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-all bg-slate-900 px-4 py-3 rounded-2xl border border-slate-800 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-bold hidden sm:inline">返回首頁</span>
          </Link>
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">旅客名單管理</h1>
            <p className="text-blue-500 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">Traveler Directory</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={clearAllTravelers}
              className="bg-slate-800 hover:bg-red-600/20 text-slate-400 hover:text-red-500 p-3 rounded-2xl border border-slate-700 transition-all active:scale-95 group flex items-center gap-2"
              title="清空所有資料"
            >
              <Eraser className="w-5 h-5" />
              <span className="text-xs font-black hidden lg:inline">開啟新團</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-2xl font-black transition-all shadow-lg border border-blue-400 active:scale-95 flex items-center gap-2"
            >
              {importing ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileUp className="w-5 h-5" />}
              <span className="hidden sm:inline">匯入名單</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".xlsx, .xls, .csv" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
          {/* Form Section - Large & Clear */}
          <div className="lg:col-span-5">
            <div className="bg-slate-800 rounded-[2.5rem] border-2 border-slate-700 p-8 md:p-10 sticky top-10 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-900/20">
                    <UserPlus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">手動新增旅客</h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Add New Member</p>
                  </div>
                </div>
                <button 
                  onClick={downloadTemplate}
                  className="text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1 text-xs font-black uppercase tracking-wider"
                >
                  <Download className="w-4 h-4" />
                  範本
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-1">旅客姓名</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如：王小明"
                    required
                    className="w-full px-6 py-4 bg-slate-900 border-2 border-slate-700 rounded-2xl focus:outline-none focus:border-blue-500 text-lg font-bold transition-all placeholder:text-slate-700 shadow-inner"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-1">房間號碼</label>
                    <input 
                      type="text" 
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      placeholder="例如：1205"
                      required
                      className="w-full px-6 py-4 bg-slate-900 border-2 border-slate-700 rounded-2xl focus:outline-none focus:border-blue-500 text-lg font-bold transition-all placeholder:text-slate-700 shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-1">性別</label>
                    <select 
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-900 border-2 border-slate-700 rounded-2xl focus:outline-none focus:border-blue-500 text-lg font-bold transition-all shadow-inner appearance-none text-white"
                    >
                      <option value="男">男</option>
                      <option value="女">女</option>
                      <option value="其他">其他</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-1">飲食需求</label>
                  <input 
                    type="text" 
                    value={dietaryNeeds}
                    onChange={(e) => setDietaryNeeds(e.target.value)}
                    placeholder="例如：蛋奶素、不吃牛"
                    className="w-full px-6 py-4 bg-slate-900 border-2 border-slate-700 rounded-2xl focus:outline-none focus:border-blue-500 text-lg font-bold transition-all placeholder:text-slate-700 shadow-inner"
                  />
                </div>

                {message && (
                  <div className={`p-5 rounded-2xl flex items-start gap-4 text-base font-bold animate-in fade-in slide-in-from-top-4 ${
                    message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-6 h-6 mt-0.5" /> : <AlertCircle className="w-6 h-6 mt-0.5" />}
                    <span>{message.text}</span>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-black py-6 rounded-2xl transition-all flex items-center justify-center gap-3 text-xl shadow-[0_20px_40px_rgba(37,99,235,0.25)] active:scale-95 border border-blue-400"
                >
                  {loading ? (
                    <Loader2 className="w-7 h-7 animate-spin" />
                  ) : (
                    <>
                      <span>儲存旅客資料</span>
                      <CheckCircle2 className="w-6 h-6" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* List Section - Touch Friendly */}
          <div className="lg:col-span-7">
            <div className="bg-slate-800 rounded-[2.5rem] border-2 border-slate-700 overflow-hidden shadow-2xl">
              <div className="px-8 py-7 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 backdrop-blur-sm">
                <div>
                  <h2 className="text-xl font-black text-white">目前旅客名單</h2>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Current Directory</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={fetchTravelers}
                    className="p-2 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-blue-400 transition-all active:rotate-180 duration-500"
                    title="重新整理名單"
                  >
                    <RotateCw className={`w-5 h-5 ${fetching ? 'animate-spin text-blue-500' : ''}`} />
                  </button>
                  <div className="bg-slate-950 px-5 py-2 rounded-full border border-slate-700 shadow-inner">
                    <span className="text-sm font-black text-blue-500 tracking-tighter">TOTAL {travelers.length}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-6 space-y-4">
                {fetching ? (
                  <div className="py-32 flex flex-col items-center justify-center text-slate-500">
                    <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-500" />
                    <p className="font-bold text-xl uppercase tracking-widest">讀取中</p>
                  </div>
                ) : travelers.length > 0 ? (
                  travelers.map((traveler) => (
                    <div 
                      key={traveler.id} 
                      className="bg-slate-900/50 p-5 rounded-3xl flex items-center justify-between border-2 border-slate-800 hover:border-slate-700 transition-all group"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-slate-800 text-blue-500 rounded-2xl flex items-center justify-center font-black text-2xl border-2 border-slate-700 shadow-lg group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-all">
                          {traveler.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-black text-2xl text-white tracking-tight">{traveler.full_name}</div>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                              traveler.gender === '女' ? 'bg-pink-500/10 text-pink-500 border-pink-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            }`}>
                              {traveler.gender}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="bg-slate-800 px-2 py-0.5 rounded-full text-[10px] font-black text-slate-500 border border-slate-700 uppercase tracking-widest">Room</span>
                              <span className="text-lg font-black text-blue-400 tracking-wider">{traveler.room_number}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="bg-slate-800 px-2 py-0.5 rounded-full text-[10px] font-black text-slate-500 border border-slate-700 uppercase tracking-widest">Diet</span>
                              <span className="text-sm font-bold text-slate-300">{traveler.dietary_needs}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyLiffLink(traveler.full_name)}
                          className="p-3 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-2xl transition-all border border-slate-700 active:scale-90 group relative"
                          title="複製綁定連結"
                        >
                          <LinkIcon className="w-5 h-5" />
                          <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-slate-700">
                            複製綁定連結
                          </span>
                        </button>

                        <button
                          onClick={() => handleSendTestMessage(traveler)}
                          disabled={!traveler.line_uid || sendingLine === traveler.id}
                          className={`p-3 rounded-2xl transition-all border active:scale-90 group relative ${
                            traveler.line_uid 
                              ? 'bg-green-600/20 border-green-500/30 text-green-400 hover:bg-green-600/30' 
                              : 'bg-slate-800/50 border-slate-700 text-slate-500 cursor-not-allowed'
                          }`}
                          title={traveler.line_uid ? "發送測試訊息" : "尚未綁定 LINE"}
                        >
                          {sendingLine === traveler.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Send className="w-5 h-5" />
                          )}
                          <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-slate-700">
                            {traveler.line_uid ? "發送測試訊息" : "尚未綁定 LINE"}
                          </span>
                        </button>

                        <button
                          onClick={() => handleDelete(traveler.id)}
                          className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl transition-all border border-red-500/20 active:scale-90 group relative"
                          title="刪除"
                        >
                          <Trash2 className="w-5 h-5" />
                          <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-slate-700">
                            刪除旅客
                          </span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-32 text-center bg-slate-900/30 rounded-[2rem] border-2 border-dashed border-slate-800">
                    <div className="bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Users className="w-10 h-10 text-slate-600" />
                    </div>
                    <p className="text-xl font-bold text-slate-600 uppercase tracking-widest">尚無旅客資料</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
