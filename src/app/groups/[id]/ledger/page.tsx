'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, 
  Plus, 
  Camera, 
  Receipt, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Wallet,
  Loader2,
  Trash2,
  FileText,
  X,
  Check,
  Edit2
} from 'lucide-react';
import Link from 'next/link';
import { LeaderLedger } from '@/types/database';
import { createWorker } from 'tesseract.js';

export default function LedgerPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [ledgers, setLedgers] = useState<LeaderLedger[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [processingOCR, setProcessingOCR] = useState(false);
  const [ledgerToDelete, setLedgerToDelete] = useState<string | null>(null);
  const [editingLedgerId, setEditingLedgerId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    type: 'income' | 'expense';
    title: string;
    category: string;
    amount: string;
    currency: string;
    exchange_rate: string;
    notes: string;
    receipt_file: File | null;
    receipt_url: string;
  }>({
    type: 'expense',
    title: '',
    category: '餐飲',
    amount: '',
    currency: 'TWD',
    exchange_rate: '1',
    notes: '',
    receipt_file: null,
    receipt_url: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats
  const stats = React.useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    ledgers.forEach(l => {
      const amountTWD = l.amount * l.exchange_rate;
      if (l.type === 'income') {
        totalIncome += amountTWD;
      } else {
        totalExpense += amountTWD;
      }
    });

    return {
      totalIncome,
      totalExpense,
      remaining: totalIncome - totalExpense
    };
  }, [ledgers]);

  useEffect(() => {
    fetchLedgers();
  }, [groupId]);

  const fetchLedgers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leader_ledger')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setLedgers(data);
    } catch (error: any) {
      console.error('Error fetching ledgers:', error);
      alert('載入失敗: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData(prev => ({ ...prev, receipt_file: file }));
      
      // Auto OCR
      await performOCR(file);
    }
  };

  const performOCR = async (file: File) => {
    try {
      setProcessingOCR(true);
      const worker = await createWorker('eng'); // eng works better for numbers usually
      
      const ret = await worker.recognize(file);
      const text = ret.data.text;
      console.log('OCR Result:', text);
      
      // Simple regex to find numbers (money amounts)
      // Look for numbers with optional commas and decimals
      const numbers = text.match(/\d{1,3}(,\d{3})*(\.\d{2})?/g);
      
      if (numbers) {
        // Simple heuristic: largest number might be the total
        // Or last number? Let's try to find the largest valid number
        const validNumbers = numbers.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => !isNaN(n));
        if (validNumbers.length > 0) {
          const maxAmount = Math.max(...validNumbers);
          // Don't override if user already typed something? Maybe just suggest.
          // For "Quick Snap", we overwrite.
          setFormData(prev => ({ ...prev, amount: maxAmount.toString() }));
        }
      }
      
      await worker.terminate();
    } catch (err) {
      console.error('OCR Error:', err);
      // Non-blocking error
    } finally {
      setProcessingOCR(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) return;

    try {
      setLoading(true);
      let receiptUrl = formData.receipt_url;

      // Upload file if exists
      if (formData.receipt_file) {
        const fileExt = formData.receipt_file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${groupId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(filePath, formData.receipt_file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('receipts')
          .getPublicUrl(filePath);
          
        receiptUrl = publicUrl;
      }

      const ledgerData = {
        group_id: groupId,
        type: formData.type,
        title: formData.title || formData.category, // Default to category if empty
        category: formData.category,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        exchange_rate: parseFloat(formData.exchange_rate),
        notes: formData.notes,
        receipt_url: receiptUrl
      };

      let data, error;

      if (editingLedgerId) {
        // Update existing record
        const result = await supabase
          .from('leader_ledger')
          .update(ledgerData)
          .eq('id', editingLedgerId)
          .select()
          .single();
        data = result.data;
        error = result.error;
      } else {
        // Create new record
        const result = await supabase
          .from('leader_ledger')
          .insert([ledgerData])
          .select()
          .single();
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      if (editingLedgerId) {
        setLedgers(ledgers.map(l => l.id === editingLedgerId ? data : l));
      } else {
        setLedgers([data, ...ledgers]);
      }
      
      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      alert('儲存失敗: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (ledger: LeaderLedger) => {
    setEditingLedgerId(ledger.id);
    setFormData({
      type: ledger.type,
      title: ledger.title,
      category: ledger.category,
      amount: ledger.amount.toString(),
      currency: ledger.currency,
      exchange_rate: ledger.exchange_rate.toString(),
      notes: ledger.notes || '',
      receipt_file: null,
      receipt_url: ledger.receipt_url || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    setLedgerToDelete(id);
  };

  const confirmDelete = async () => {
    if (!ledgerToDelete) return;

    try {
      const { error } = await supabase
        .from('leader_ledger')
        .delete()
        .eq('id', ledgerToDelete);
      
      if (error) throw error;
      setLedgers(ledgers.filter(l => l.id !== ledgerToDelete));
      setLedgerToDelete(null);
    } catch (error: any) {
      alert('刪除失敗: ' + error.message);
    }
  };

  const resetForm = () => {
    setEditingLedgerId(null);
    setFormData({
      type: 'expense',
      title: '',
      category: '餐飲',
      amount: '',
      currency: 'TWD',
      exchange_rate: '1',
      notes: '',
      receipt_file: null,
      receipt_url: ''
    });
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white pb-24">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </Link>
          <h1 className="text-xl font-black tracking-tight">私密財務管理</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrendingUp className="w-24 h-24 text-green-500" />
            </div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-2">預付款總額 (Income)</p>
            <p className="text-3xl font-black text-green-400">
              ${stats.totalIncome.toLocaleString()}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrendingDown className="w-24 h-24 text-red-500" />
            </div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-2">已支出總額 (Expense)</p>
            <p className="text-3xl font-black text-red-400">
              ${stats.totalExpense.toLocaleString()}
            </p>
          </div>

          <div className="bg-blue-600 p-6 rounded-[2rem] relative overflow-hidden shadow-lg shadow-blue-900/40">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <Wallet className="w-24 h-24 text-white" />
            </div>
            <p className="text-blue-200 font-bold uppercase tracking-widest text-xs mb-2">目前剩餘現金</p>
            <p className="text-4xl font-black text-white">
              ${stats.remaining.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-2xl font-black shadow-lg shadow-blue-900/40 transition-all active:scale-95"
          >
            <Camera className="w-5 h-5" />
            <span className="text-lg">快拍記帳</span>
          </button>
        </div>

        {/* Ledger List */}
        <div className="space-y-4">
          <h2 className="text-xl font-black flex items-center gap-2 text-slate-400">
            <FileText className="w-5 h-5" />
            收支明細
          </h2>
          
          {loading && ledgers.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : ledgers.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-bold border-2 border-dashed border-slate-800 rounded-3xl">
              尚無紀錄
            </div>
          ) : (
            <div className="grid gap-4">
              {ledgers.map(ledger => (
                <div key={ledger.id} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${
                      ledger.type === 'income' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {ledger.type === 'income' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="font-bold text-white text-lg">{ledger.title || ledger.category}</div>
                      <div className="text-slate-500 text-sm font-bold">
                        <span className="bg-slate-800 px-2 py-0.5 rounded text-xs mr-2 text-slate-400">{ledger.category}</span>
                        {new Date(ledger.created_at).toLocaleDateString()}
                        {ledger.currency !== 'TWD' && ` · ${ledger.currency} ${ledger.amount}`}
                        {ledger.receipt_url && (
                          <a href={ledger.receipt_url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center text-blue-400 hover:text-blue-300">
                            <Receipt className="w-3 h-3 mr-1" /> 收據
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`text-xl font-black ${
                      ledger.type === 'income' ? 'text-green-400' : 'text-white'
                    }`}>
                      {ledger.type === 'income' ? '+' : '-'}${Math.round(ledger.amount * ledger.exchange_rate).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleEdit(ledger)}
                        className="p-2 text-slate-600 hover:text-blue-500 transition-colors"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(ledger.id)}
                        className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="bg-slate-900 border-t sm:border border-slate-800 w-full max-w-lg sm:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl relative z-10 overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black">{editingLedgerId ? '編輯收支紀錄' : '新增收支紀錄'}</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Type Selection */}
                <div className="flex p-1 bg-slate-800 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, type: 'expense'})}
                    className={`flex-1 py-3 rounded-xl font-black transition-all ${
                      formData.type === 'expense' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    支出
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, type: 'income'})}
                    className={`flex-1 py-3 rounded-xl font-black transition-all ${
                      formData.type === 'income' ? 'bg-green-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    收入/預支
                  </button>
                </div>

                {/* Amount & Currency */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">金額</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input
                        type="number"
                        required
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl pl-12 pr-4 py-4 focus:border-blue-500 focus:outline-none font-black text-xl"
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">幣別</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({...formData, currency: e.target.value})}
                      className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-4 py-4 focus:border-blue-500 focus:outline-none font-bold text-lg"
                    >
                      <option value="TWD">TWD 台幣</option>
                      <option value="JPY">JPY 日幣</option>
                      <option value="USD">USD 美金</option>
                      <option value="EUR">EUR 歐元</option>
                    </select>
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">名目 (例如：JR 山手線車票)</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="請輸入消費項目名稱..."
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 focus:border-blue-500 focus:outline-none font-bold text-lg"
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">類別</label>
                  <div className="flex flex-wrap gap-2">
                    {['餐飲', '交通', '門票', '購物', '住宿', '雜支', '預支款'].map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormData({...formData, category: cat})}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                          formData.category === cat 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Receipt Upload (Camera) */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">收據照片 (拍照或從相簿)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                      processingOCR ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 hover:border-slate-600 hover:bg-slate-800/50'
                    }`}
                  >
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*" 
                      // Removed capture="environment" to allow user to choose between Camera and Album in LINE/WebViews
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    {processingOCR ? (
                      <div className="flex flex-col items-center gap-2 text-blue-400">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="font-bold">AI 辨識金額中...</span>
                      </div>
                    ) : formData.receipt_file ? (
                      <div className="flex flex-col items-center gap-2 text-green-400">
                        <Check className="w-8 h-8" />
                        <span className="font-bold">已選擇照片</span>
                        <span className="text-xs text-slate-500">{formData.receipt_file.name}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-500">
                        <Camera className="w-8 h-8" />
                        <span className="font-bold">點擊拍照或上傳圖片</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || processingOCR}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-blue-900/40 transition-all active:scale-95"
                >
                  {loading ? '儲存中...' : (editingLedgerId ? '更新紀錄' : '確認儲存')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {ledgerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setLedgerToDelete(null)}></div>
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl shadow-2xl relative z-10 p-6 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white">確定要刪除嗎？</h3>
              <p className="text-slate-400 font-bold">刪除後將無法復原此筆帳目。</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setLedgerToDelete(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-black transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-black transition-colors"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}