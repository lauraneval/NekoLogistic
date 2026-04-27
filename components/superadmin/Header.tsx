"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { RefreshCcw, Bell } from 'lucide-react';

export function Header() {
  const pathname = usePathname();

  const getTitle = () => {
    if (pathname.includes('/staff')) return 'Manajemen Staf';
    if (pathname.includes('/logs')) return 'Jejak Audit';
    return 'Metrik Sistem';
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-40 flex h-20 sm:h-24 items-center justify-between px-6 sm:px-12 bg-[#14100c] border-b border-white/10">
      <div className="flex items-center gap-4">
        {/* Mobile Spacer (for sidebar trigger) */}
        <div className="w-10 lg:hidden" />
        
        <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-orange-500 truncate max-w-[150px] sm:max-w-none">
          {getTitle()}
        </h2>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <button 
          onClick={handleRefresh} 
          className="flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-orange-500/30 transition-all text-slate-300 hover:text-orange-400 group"
        >
          <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
        </button>
        <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 relative">
          <Bell size={16} />
          <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 h-2 w-2 rounded-full bg-orange-500 animate-pulse"></div>
        </div>
      </div>
    </header>
  );
}
