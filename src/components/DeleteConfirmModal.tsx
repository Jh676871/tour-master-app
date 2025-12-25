import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  loading?: boolean;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "確認刪除", 
  message = "確定要執行刪除操作嗎？此動作無法復原。",
  loading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-sm">
      <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border-2 border-slate-700 relative animate-in zoom-in-95 duration-200">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-500/20">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          
          <h2 className="text-2xl font-black text-white tracking-tight mb-3">{title}</h2>
          <p className="text-slate-400 font-bold leading-relaxed mb-8">
            {message}
          </p>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-black transition-all border border-slate-700 active:scale-95 disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black transition-all shadow-xl shadow-red-900/30 active:scale-95 border border-red-400 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? '刪除中...' : '確認刪除'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
