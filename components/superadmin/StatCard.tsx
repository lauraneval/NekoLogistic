import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
}

export function StatCard({ label, value, sub, icon }: StatCardProps) {
  return (
    <div className="rounded-[2rem] glass border border-white/10 p-6 sm:p-8 hover:bg-white/5 hover:border-white/20 transition-all group relative overflow-hidden">
      <div className="absolute -right-4 -top-4 opacity-5 transform group-hover:scale-150 transition-transform duration-700 pointer-events-none">
        {icon}
      </div>
      <div className="flex items-start justify-between mb-6 relative z-10">
        <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
          {icon}
        </div>
      </div>
      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 relative z-10">{label}</h4>
      <p className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight relative z-10">{value}</p>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider relative z-10">{sub}</p>
    </div>
  );
}
