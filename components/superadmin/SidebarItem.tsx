import React from 'react';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

export function SidebarItem({ icon, label, active, onClick }: SidebarItemProps) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-4 rounded-xl px-5 py-4 text-[10px] font-black tracking-widest uppercase transition-all border ${active ? "bg-orange-600/20 text-orange-400 border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.1)]" : "border-transparent text-slate-400 hover:bg-white/5 hover:text-white"}`}>
      <span className={active ? "text-orange-500" : ""}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
