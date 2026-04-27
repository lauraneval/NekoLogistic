import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  actionLabel: string;
  type: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({ isOpen, title, message, actionLabel, type, onConfirm, onClose }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#1a1410] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl transform scale-100 animate-in zoom-in-95 duration-200">
        <div className={`mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl ${
          type === 'danger' ? 'bg-red-500/20 text-red-500 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]' :
          type === 'warning' ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.2)]' :
          'bg-blue-500/20 text-blue-500 border border-blue-500/30'
        }`}>
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white mb-3">{title}</h2>
        <p className="text-sm font-medium text-slate-400 mb-8 leading-relaxed">{message}</p>
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 bg-white/5 border border-white/10 text-white font-bold py-4 rounded-2xl hover:bg-white/10 transition-colors">Batal</button>
          <button onClick={onConfirm} className={`flex-1 font-bold py-4 rounded-2xl text-white transition-all shadow-lg ${
            type === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20' :
            type === 'warning' ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/20' :
            'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
          }`}>{actionLabel}</button>
        </div>
      </div>
    </div>
  );
}
