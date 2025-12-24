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
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // 獲取旅客
      const { data: travelersData } = await supabase.from('travelers').select('id, full_name');
      setTravelers(travelersData || []);

      // 獲取點名記錄
      const { data: checkinsData } = await supabase.from('check_ins').select('traveler_id');
      setCheckedIds(new Set((checkinsData || []).map(c => c.traveler_id)));

      // 獲取支出記錄
      const { data: expensesData } = await supabase.from('tour_expenses').select('*').order('created_at', { ascending: false });
      setExpenses(expensesData || []);
    } catch (error) {
      console.error('Error fetching report data:', error);
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
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0f172a' // match slate-900
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`完團報告_${new Date().toLocaleDateString()}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('導出失敗');
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
    <main className="min-h-screen bg-slate-900 text-white pb-20">
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-800 sticky top-0 z-30 shadow-xl">
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

      <div className="max-w-4xl mx-auto p-6 space-y-8" ref={reportRef}>
        {/* Section 1: Summary Stats */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold">點名數據總覽</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <div className="flex justify-between items-start mb-2">
                <Users className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-bold text-slate-500 uppercase">總人數</span>
              </div>
              <div className="text-3xl font-black">{totalTravelers}</div>
            </div>
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <div className="flex justify-between items-start mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-xs font-bold text-slate-500 uppercase">已報到</span>
              </div>
              <div className="text-3xl font-black text-green-400">{totalChecked}</div>
            </div>
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <div className="flex justify-between items-start mb-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-xs font-bold text-slate-500 uppercase">未報到</span>
              </div>
              <div className="text-3xl font-black text-red-400">{missingCount}</div>
            </div>
          </div>
        </section>

        {/* Section 2: Expense Notebook */}
        <section className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-bold">公積金支出記事本</h2>
            </div>
            <div className="text-xl font-black text-yellow-400">
              總計: ${totalExpense.toLocaleString()}
            </div>
          </div>

          {/* Add Expense Form */}
          <form onSubmit={handleAddExpense} className="flex gap-2 bg-slate-800/30 p-4 rounded-xl border border-slate-700 border-dashed">
            <input 
              type="text" 
              placeholder="支出描述 (如: 導遊小費, 飲水)"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newExpense.description}
              onChange={e => setNewExpense({...newExpense, description: e.target.value})}
            />
            <input 
              type="number" 
              placeholder="金額"
              className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newExpense.amount}
              onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
            />
            <button type="submit" className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </form>

          {/* Expense List */}
          <div className="space-y-2">
            {expenses.map(expense => (
              <div key={expense.id} className="flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700 group">
                <div>
                  <div className="font-bold">{expense.description}</div>
                  <div className="text-xs text-slate-500">{new Date(expense.created_at).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="font-black text-yellow-400">${Number(expense.amount).toLocaleString()}</div>
                  <button 
                    onClick={() => handleDeleteExpense(expense.id)}
                    className="p-1 text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {expenses.length === 0 && (
              <div className="text-center py-10 text-slate-500 italic text-sm">
                目前尚無支出記錄
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Summary Comments (Manual Entry for PDF) */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold">團後心得與異常說明</h2>
          </div>
          <textarea 
            className="w-full h-40 bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-600"
            placeholder="請在此輸入這一團的特殊狀況或心得，將會一起匯出至 PDF 報告中..."
          />
        </section>

        {/* Report Footer for PDF */}
        <div className="pt-10 border-t border-slate-800 text-center text-xs text-slate-600">
          報告生成時間: {new Date().toLocaleString()} | Tour Master AI 輔助生成
        </div>
      </div>
    </main>
  );
}
