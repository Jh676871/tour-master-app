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
  Edit2,
  Settings,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { LeaderLedger, GroupCurrencySetting } from '@/types/database';
import { createWorker } from 'tesseract.js';

export default function LedgerPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [ledgers, setLedgers] = useState<LeaderLedger[]>([]);
  const [currencySettings, setCurrencySettings] = useState<GroupCurrencySetting[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [processingOCR, setProcessingOCR] = useState(false);
  const [ledgerToDelete, setLedgerToDelete] = useState<string | null>(null);
  const [editingLedgerId, setEditingLedgerId] = useState<string | null>(null);
  const [currencyToDelete, setCurrencyToDelete] = useState<string | null>(null);

  // Settings Form State
  const [settingsFormData, setSettingsFormData] = useState<{
    id?: string;
    currency: string;
    exchange_rate: string;
    initial_balance: string;
  }>({
    currency: 'USD',
    exchange_rate: '',
    initial_balance: ''
  });
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

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  
  // Stats
  const stats = React.useMemo(() => {
    const balances: Record<string, { income: number, expense: number, initial: number, current: number, rate: number }> = {};
    
    // Initialize from settings
    currencySettings.forEach(s => {
      balances[s.currency] = {
        income: 0,
        expense: 0,
        initial: s.initial_balance || 0,
        current: s.initial_balance || 0,
        rate: s.exchange_rate || 1
      };
    });

    // Ensure TWD exists
    if (!balances['TWD']) {
      balances['TWD'] = { income: 0, expense: 0, initial: 0, current: 0, rate: 1 };
    }

    ledgers.forEach(l => {
      const curr = l.currency;
      if (!balances[curr]) {
        // New currency found in ledger but not in settings
        balances[curr] = {
          income: 0,
          expense: 0,
          initial: 0,
          current: 0,
          rate: l.exchange_rate || 1 // Fallback to transaction rate
        };
      }

      if (l.type === 'income') {
        balances[curr].income += l.amount;
        balances[curr].current += l.amount;
      } else {
        balances[curr].expense += l.amount;
        balances[curr].current -= l.amount;
      }
    });

    // Calculate Total Assets in TWD
    let totalAssetsTWD = 0;
    Object.values(balances).forEach(b => {
      totalAssetsTWD += b.current * b.rate;
    });

    return {
      balances,
      totalAssetsTWD
    };
  }, [ledgers, currencySettings]);

  useEffect(() => {
    fetchData();
  }, [groupId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchLedgers(), fetchCurrencySettings()]);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      alert('載入失敗: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrencySettings = async () => {
    const { data, error } = await supabase
      .from('group_currency_settings')
      .select('*')
      .eq('group_id', groupId);
    
    if (error) throw error;
    if (data) setCurrencySettings(data);
  };

  const fetchLedgers = async () => {
    const { data, error } = await supabase
      .from('leader_ledger')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (data) setLedgers(data);
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase
        .from('group_currency_settings')
        .upsert({
          group_id: groupId,
          currency: settingsFormData.currency,
          exchange_rate: parseFloat(settingsFormData.exchange_rate),
          initial_balance: parseFloat(settingsFormData.initial_balance || '0')
        }, { onConflict: 'group_id,currency' });

      if (error) throw error;
      
      await fetchCurrencySettings();
      setSettingsFormData({ currency: '', exchange_rate: '', initial_balance: '' });
      // Don't close modal immediately to allow adding more? Or maybe close.
      // Let's keep it open or just reset form.
    } catch (error: any) {
      alert('儲存失敗: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSettings = (setting: GroupCurrencySetting) => {
    setSettingsFormData({
      id: setting.id,
      currency: setting.currency,
      exchange_rate: setting.exchange_rate.toString(),
      initial_balance: setting.initial_balance.toString()
    });
  };

  const handleDeleteCurrency = (id: string) => {
    setCurrencyToDelete(id);
  };

  const confirmDeleteCurrency = async () => {
    if (!currencyToDelete) return;

    // Check if there are any ledgers using this currency
    const currency = currencySettings.find(s => s.id === currencyToDelete)?.currency;
    if (currency) {
      const hasLedgers = ledgers.some(l => l.currency === currency);
      if (hasLedgers) {
        alert(`無法刪除 ${currency}：尚有使用此幣別的帳目。請先刪除或修改相關帳目。`);
        setCurrencyToDelete(null);
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('group_currency_settings')
        .delete()
        .eq('id', currencyToDelete);
      
      if (error) throw error;
      
      setCurrencySettings(currencySettings.filter(s => s.id !== currencyToDelete));
      setCurrencyToDelete(null);
      // Reset form if we were editing the deleted one
      if (settingsFormData.id === currencyToDelete) {
        setSettingsFormData({ currency: '', exchange_rate: '', initial_balance: '' });
      }
    } catch (error: any) {
      alert('刪除失敗: ' + error.message);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData(prev => ({ ...prev, receipt_file: file }));
      
      // Auto OCR
      await performOCR(file);
    }
    // Reset input so same file can be selected again if needed
    e.target.value = '';
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
    // Reset inputs handled in onChange
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
    // No need to reset hidden refs anymore as we use direct inputs
    // but we can clear the event target value in onChange
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
        {/* Total Assets Card */}
        <div className="bg-blue-600 p-8 rounded-[2.5rem] relative overflow-hidden shadow-xl shadow-blue-900/40">
          <div className="absolute -right-8 -top-8 p-4 opacity-20">
            <Wallet className="w-48 h-48 text-white" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-blue-200 font-bold uppercase tracking-widest text-xs">總資產估算 (台幣)</p>
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="bg-blue-500/50 hover:bg-blue-500 p-2 rounded-lg text-white transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
            <p className="text-5xl font-black text-white tracking-tight">
              NT$ {Math.round(stats.totalAssetsTWD).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Currency Cards Scroll */}
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide">
          {Object.entries(stats.balances).map(([curr, balance]) => (
            <div key={curr} className="min-w-[280px] bg-slate-900 border border-slate-800 p-6 rounded-[2rem] relative flex-shrink-0">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-slate-800 px-3 py-1 rounded-full text-xs font-bold text-slate-400">
                  匯率: {balance.rate}
                </div>
                <div className="text-2xl font-black text-white">{curr}</div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">初始/預付</span>
                  <span className="font-bold text-green-400">+{balance.initial.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">收入</span>
                  <span className="font-bold text-green-400">+{balance.income.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">支出</span>
                  <span className="font-bold text-red-400">-{balance.expense.toLocaleString()}</span>
                </div>
                <div className="h-px bg-slate-800 my-2"></div>
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold text-slate-400 uppercase mb-1">目前結餘</span>
                  <span className="text-2xl font-black text-white">{balance.current.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
          
          {/* Add Currency Button Card */}
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="min-w-[100px] bg-slate-900/50 border-2 border-dashed border-slate-800 hover:border-blue-500 hover:bg-slate-900 p-6 rounded-[2rem] flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-blue-500 transition-all flex-shrink-0"
          >
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <span className="font-bold text-sm">新增幣別</span>
          </button>
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
                      {ledger.type === 'income' ? '+' : '-'} NT$ {Math.round(ledger.amount * ledger.exchange_rate).toLocaleString()}
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

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setShowSettingsModal(false)}></div>
          <div className="bg-slate-900 border-t sm:border border-slate-800 w-full max-w-lg sm:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl relative z-10 overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black">匯率與初始資金設定</h2>
                <button onClick={() => setShowSettingsModal(false)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* List Existing */}
              <div className="space-y-3">
                {currencySettings.map(setting => (
                  <div key={setting.id} className="bg-slate-800 p-4 rounded-xl flex items-center justify-between group/item transition-colors hover:bg-slate-700">
                    <div onClick={() => handleEditSettings(setting)} className="flex-1 cursor-pointer">
                      <div className="font-black text-white flex items-center gap-2">
                        {setting.currency}
                        <span className="text-xs font-normal text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full">
                          {setting.id === settingsFormData.id ? '編輯中' : '點擊編輯'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        匯率: {setting.exchange_rate} · 初始: {setting.initial_balance}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteCurrency(setting.id)}
                      className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors opacity-0 group-hover/item:opacity-100 focus:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="h-px bg-slate-800"></div>

              <form onSubmit={handleSettingsSubmit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-400">
                    {settingsFormData.id ? '編輯幣別設定' : '新增幣別設定'}
                  </h3>
                  {settingsFormData.id && (
                    <button 
                      type="button"
                      onClick={() => setSettingsFormData({ currency: '', exchange_rate: '', initial_balance: '' })}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      取消編輯
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">幣別代碼</label>
                    <input
                      type="text"
                      required
                      value={settingsFormData.currency}
                      onChange={(e) => setSettingsFormData({...settingsFormData, currency: e.target.value.toUpperCase()})}
                      className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-4 py-3 focus:border-blue-500 focus:outline-none font-black text-lg"
                      placeholder="USD"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">對台幣匯率</label>
                    <input
                      type="number"
                      required
                      step="0.0001"
                      value={settingsFormData.exchange_rate}
                      onChange={(e) => setSettingsFormData({...settingsFormData, exchange_rate: e.target.value})}
                      className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-4 py-3 focus:border-blue-500 focus:outline-none font-black text-lg"
                      placeholder="32.5"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">初始資金 (預付款)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={settingsFormData.initial_balance}
                    onChange={(e) => setSettingsFormData({...settingsFormData, initial_balance: e.target.value})}
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-4 py-3 focus:border-blue-500 focus:outline-none font-black text-lg"
                    placeholder="0.00"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-blue-900/40 transition-all"
                >
                  {loading ? '儲存中...' : '儲存設定'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

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
                    {formData.currency !== 'TWD' && formData.amount && (
                      <div className="text-right text-xs font-bold text-slate-500 mt-1">
                        約 NT$ {Math.round(parseFloat(formData.amount || '0') * parseFloat(formData.exchange_rate || '0')).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">幣別</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => {
                        const newCurrency = e.target.value;
                        const setting = currencySettings.find(s => s.currency === newCurrency);
                        setFormData({
                          ...formData, 
                          currency: newCurrency,
                          exchange_rate: setting ? setting.exchange_rate.toString() : (newCurrency === 'TWD' ? '1' : formData.exchange_rate)
                        });
                      }}
                      className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-4 py-4 focus:border-blue-500 focus:outline-none font-bold text-lg"
                    >
                      <option value="TWD">TWD 台幣</option>
                      {currencySettings.filter(s => s.currency !== 'TWD').map(s => (
                        <option key={s.id} value={s.currency}>{s.currency}</option>
                      ))}
                      {!currencySettings.some(s => s.currency === 'JPY') && <option value="JPY">JPY 日幣</option>}
                      {!currencySettings.some(s => s.currency === 'USD') && <option value="USD">USD 美金</option>}
                      {!currencySettings.some(s => s.currency === 'EUR') && <option value="EUR">EUR 歐元</option>}
                    </select>
                  </div>
                </div>

                {/* Exchange Rate (Visible only for foreign currency) */}
                {formData.currency !== 'TWD' && (
                  <div className="bg-slate-800/50 p-4 rounded-2xl space-y-2 border border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                        當下匯率 (預設為固定匯率)
                      </label>
                      <button 
                        type="button"
                        onClick={() => {
                          const setting = currencySettings.find(s => s.currency === formData.currency);
                          if (setting) setFormData({...formData, exchange_rate: setting.exchange_rate.toString()});
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> 重置
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-400">1 {formData.currency} ≈</span>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">NT$</span>
                        <input
                          type="number"
                          step="0.0001"
                          required
                          value={formData.exchange_rate}
                          onChange={(e) => setFormData({...formData, exchange_rate: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 focus:border-blue-500 focus:outline-none font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}

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
                  
                  {/* Hidden Inputs removed in favor of direct inputs below */}

                  {processingOCR ? (
                    <div className="border-2 border-dashed border-blue-500 bg-blue-500/10 rounded-2xl p-6 text-center">
                      <div className="flex flex-col items-center gap-2 text-blue-400">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="font-bold">AI 辨識金額中...</span>
                      </div>
                    </div>
                  ) : formData.receipt_file || formData.receipt_url ? (
                    <div className="border-2 border-dashed border-green-500 bg-green-500/10 rounded-2xl p-6 relative">
                      <div className="flex flex-col items-center gap-2 text-green-400">
                        <Check className="w-8 h-8" />
                        <span className="font-bold">已選擇照片</span>
                        <span className="text-xs text-slate-500">
                          {formData.receipt_file ? formData.receipt_file.name : '已儲存的收據'}
                        </span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, receipt_file: null, receipt_url: ''})}
                        className="absolute top-2 right-2 p-1 bg-slate-800 rounded-full text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {/* Camera Button */}
                      <label 
                        htmlFor="camera-input"
                        className="flex flex-col items-center gap-3 bg-slate-800 hover:bg-slate-700 p-6 rounded-2xl border-2 border-slate-700 hover:border-blue-500 transition-all group cursor-pointer active:scale-95"
                      >
                        <input 
                          id="camera-input"
                          type="file" 
                          accept="image/*" 
                          capture="environment"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                          <Camera className="w-6 h-6" />
                        </div>
                        <span className="font-black text-white">立即拍照</span>
                      </label>

                      {/* Gallery Button */}
                      <label
                        htmlFor="gallery-input"
                        className="flex flex-col items-center gap-3 bg-slate-800 hover:bg-slate-700 p-6 rounded-2xl border-2 border-slate-700 hover:border-purple-500 transition-all group cursor-pointer active:scale-95"
                      >
                        <input 
                          id="gallery-input"
                          type="file" 
                          accept="image/*" 
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                          <Wallet className="w-6 h-6" />
                        </div>
                        <span className="font-black text-white">從相簿選擇</span>
                      </label>
                    </div>
                  )}
                  <p className="text-xs text-center text-slate-500 font-bold mt-2">
                    * 若無法啟動相機，請確認 LINE App 已開啟相機權限
                  </p>
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

      {/* Currency Delete Confirmation Modal */}
      {currencyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setCurrencyToDelete(null)}></div>
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl shadow-2xl relative z-10 p-6 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white">確定刪除此幣別？</h3>
              <p className="text-slate-400 font-bold">
                這將移除 {currencySettings.find(s => s.id === currencyToDelete)?.currency} 的匯率與初始資金設定。
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setCurrencyToDelete(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-black transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmDeleteCurrency}
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