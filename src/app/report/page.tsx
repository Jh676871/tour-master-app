'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  FileText, 
  ArrowLeft, 
  Download, 
  Plus, 
  Trash2, 
  DollarSign, 
  PieChart, 
  Users, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Traveler {
  id: string;
  full_name: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  created_at: string;
}

export default function TourReportPage() {
  const [loading, setLoading] = useState(true);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newExpense, setNewExpense] = useState({ description: '', amount: '' });
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadData = async () => {
      try {
        setLoading(true);
        // 獲取旅客
        const { data: travelersData } = await supabase
          .from('travelers')
          .select('id, full_name');
        setTravelers(travelersData || []);

        // 獲取點名記錄
        const { data: checkinsData } = await supabase
          .from('check_ins')
          .select('traveler_id');
        setCheckedIds(new Set((checkinsData || []).map(c => c.traveler_id)));

        // 獲取支出記錄
        const { data: expensesData } = await supabase
          .from('tour_expenses')
          .select('*')
          .order('created_at', { ascending: false });
        setExpenses(expensesData || []);
      } catch (error: any) {
        if (error.name !== 'AbortError' && !error.message?.includes('AbortError')) {
          console.error('Error fetching report data:', error.message || error);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
    return () => controller.abort();
  }, []);

  const fetchData = async () => {
    // Keep for manual refresh
    try {
      setLoading(true);
      const { data: travelersData } = await supabase.from('travelers').select('id, full_name');
      setTravelers(travelersData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount) return;

    try {
      const { data, error } = await supabase
        .from('tour_expenses')
        .insert([{ 
          description: newExpense.description, 
          amount: parseFloat(newExpense.amount) 
        }])
        .select();

      if (error) throw error;
      setExpenses([data[0], ...expenses]);
      setNewExpense({ description: '', amount: '' });
    } catch (error) {
      alert('新增失敗');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const { error } = await supabase.from('tour_expenses').delete().eq('id', id);
      if (error) throw error;
      setExpenses(expenses.filter(e => e.id !== id));
    } catch (error) {
      alert('刪除失敗');
    }
  };

  const exportToPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      console.log('Starting PDF export with style stripping...');
      const canvas = await html2canvas(reportRef.current, {
        scale: 1.5,
        useCORS: true,
        logging: true,
        backgroundColor: '#0f172a',
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          // 徹底移除所有 style 與 link 標籤，防止 html2canvas 解析到 lab() 顏色
          const styles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
          styles.forEach(s => s.remove());
          
          // 強制設定 clonedDoc 的 body 背景色，避免抓到全域樣式
          clonedDoc.body.style.backgroundColor = '#0f172a';
          clonedDoc.body.style.color = 'white';

          // 注入最簡化的 HEX 基礎樣式
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * { 
              color-scheme: dark !important;
              border-color: #334155 !important;
            }
            .report-capture { 
              background-color: #0f172a !important; 
              color: white !important; 
              font-family: sans-serif !important;
              padding: 40px !important;
            }
            h2 { color: white !important; }
            section { margin-bottom: 32px !important; }
            .bg-slate-800, .bg-\\[\\#1e293b\\]\\/50 { background-color: #1e293b !important; }
            .border-slate-700, .border-\\[\\#334155\\] { border-color: #334155 !important; }
            .text-blue-400, .text-\\[\\#60a5fa\\] { color: #60a5fa !important; }
            .text-green-400, .text-\\[\\#4ade80\\] { color: #4ade80 !important; }
            .text-red-400, .text-\\[\\#f87171\\] { color: #f87171 !important; }
            .text-yellow-400, .text-\\[\\#facc15\\] { color: #facc15 !important; }
            .text-slate-400, .text-\\[\\#94a3b8\\] { color: #94a3b8 !important; }
            .text-slate-500, .text-\\[\\#64748b\\] { color: #64748b !important; }
            /* 隱藏不必要的 UI 元素 */
            [data-html2canvas-ignore="true"] { display: none !important; }
          `;
          clonedDoc.head.appendChild(style);
        }
      });
      
      console.log('Canvas generated successfully');
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`完團報告_${new Date().toLocaleDateString()}.pdf`);
      console.log('PDF saved successfully');
    } catch (error: any) {
      console.error('PDF export detail error:', error);
      alert(`導出失敗: ${error.message || '未知錯誤'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const totalChecked = checkedIds.size;
  const totalTravelers = travelers.length;
  const missingCount = totalTravelers - totalChecked;
  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f172a] text-white pb-20">
      <style jsx global>{`
        /* 強制覆蓋 Tailwind 4 可能產生的 modern colors (lab, oklch)，避免 html2canvas 崩潰 */
        :root {
          --color-slate-900: #0f172a !important;
          --color-slate-800: #1e293b !important;
          --color-slate-700: #334155 !important;
          --color-blue-600: #2563eb !important;
          --color-blue-500: #3b82f6 !important;
          --color-blue-400: #60a5fa !important;
        }
      `}</style>
      {/* Header */}
      <div className="bg-[#020617] border-b border-[#1e293b] sticky top-0 z-30 shadow-xl">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-black tracking-tight">完團報告</h1>
          <button 
            onClick={exportToPDF}
            disabled={isExporting}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>導出 PDF</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-8 bg-[#0f172a]" ref={reportRef}>
        {/* Section 1: Summary Stats */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-[#60a5fa]" />
            <h2 className="text-lg font-bold text-white">點名數據總覽</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#1e293b]/50 p-6 rounded-2xl border border-[#334155]">
              <div className="flex justify-between items-start mb-2">
                <Users className="w-5 h-5 text-[#94a3b8]" />
                <span className="text-xs font-bold text-[#64748b] uppercase">總人數</span>
              </div>
              <div className="text-3xl font-black text-white">{totalTravelers}</div>
            </div>
            <div className="bg-[#1e293b]/50 p-6 rounded-2xl border border-[#334155]">
              <div className="flex justify-between items-start mb-2">
                <CheckCircle className="w-5 h-5 text-[#4ade80]" />
                <span className="text-xs font-bold text-[#64748b] uppercase">已報到</span>
              </div>
              <div className="text-3xl font-black text-[#4ade80]">{totalChecked}</div>
            </div>
            <div className="bg-[#1e293b]/50 p-6 rounded-2xl border border-[#334155]">
              <div className="flex justify-between items-start mb-2">
                <AlertCircle className="w-5 h-5 text-[#f87171]" />
                <span className="text-xs font-bold text-[#64748b] uppercase">未報到</span>
              </div>
              <div className="text-3xl font-black text-[#f87171]">{missingCount}</div>
            </div>
          </div>
        </section>

        {/* Section 2: Expense Notebook */}
        <section className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#facc15]" />
              <h2 className="text-lg font-bold text-white">公積金支出記事本</h2>
            </div>
            <div className="text-xl font-black text-[#facc15]">
              總計: ${totalExpense.toLocaleString()}
            </div>
          </div>

          {/* Add Expense Form - Ignore in PDF */}
          <form 
            onSubmit={handleAddExpense} 
            data-html2canvas-ignore="true"
            className="flex gap-2 bg-[#1e293b]/30 p-4 rounded-xl border border-[#334155] border-dashed"
          >
            <input 
              type="text" 
              placeholder="支出描述 (如: 導遊小費, 飲水)"
              className="flex-1 bg-[#020617] border border-[#334155] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
              value={newExpense.description}
              onChange={e => setNewExpense({...newExpense, description: e.target.value})}
            />
            <input 
              type="number" 
              placeholder="金額"
              className="w-24 bg-[#020617] border border-[#334155] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
              value={newExpense.amount}
              onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
            />
            <button type="submit" className="bg-[#334155] hover:bg-[#475569] p-2 rounded-lg transition-colors text-white">
              <Plus className="w-5 h-5" />
            </button>
          </form>

          {/* Expense List */}
          <div className="space-y-2">
            {expenses.map(expense => (
              <div key={expense.id} className="flex items-center justify-between bg-[#1e293b]/50 p-4 rounded-xl border border-[#334155] group">
                <div>
                  <div className="font-bold text-white">{expense.description}</div>
                  <div className="text-xs text-[#64748b]">{new Date(expense.created_at).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="font-black text-[#facc15]">${Number(expense.amount).toLocaleString()}</div>
                  <button 
                    onClick={() => handleDeleteExpense(expense.id)}
                    data-html2canvas-ignore="true"
                    className="p-1 text-[#475569] hover:text-[#f87171] transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {expenses.length === 0 && (
              <div className="text-center py-10 text-[#64748b] italic text-sm">
                目前尚無支出記錄
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Summary Comments (Manual Entry for PDF) */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-[#c084fc]" />
            <h2 className="text-lg font-bold text-white">團後心得與異常說明</h2>
          </div>
          <textarea 
            className="w-full h-40 bg-[#1e293b]/50 border border-[#334155] rounded-2xl p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#3b82f6] placeholder:text-[#475569]"
            placeholder="請在此輸入這一團的特殊狀況或心得，將會一起匯出至 PDF 報告中..."
          />
        </section>

        {/* Report Footer for PDF */}
        <div className="pt-10 border-t border-[#1e293b] text-center text-xs text-[#64748b]">
          報告生成時間: {new Date().toLocaleString()} | Tour Master AI 輔助生成
        </div>
      </div>
    </main>
  );
}
