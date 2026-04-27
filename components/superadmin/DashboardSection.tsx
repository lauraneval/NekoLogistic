import React from 'react';
import { RefreshCcw, Package, CheckCircle2, Activity } from 'lucide-react';
import { StatCard } from './StatCard';

interface DashboardSectionProps {
  data: any;
}

export function DashboardSection({ data }: DashboardSectionProps) {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-white">Denyut Sistem.</h1>
        <p className="text-slate-400 font-medium">Pemantauan real-time operasional logistik NekoLogistic.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard label="Total Paket" value={data?.stats?.total} sub="Terdaftar" icon={<Package className="text-orange-500" />} />
        <StatCard label="Terkirim" value={data?.stats?.delivered} sub="Sukses" icon={<CheckCircle2 className="text-green-500" />} />
        <StatCard label="Aktif" value={data?.stats?.in_transit} sub="Kurir" icon={<Activity className="text-blue-500" />} />
        <StatCard label="Menunggu" value={data?.stats?.pending} sub="Gudang" icon={<RefreshCcw className="text-slate-400" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Workload Chart (Last 24h) */}
        <div className="lg:col-span-2 rounded-[2.5rem] glass border border-white/10 p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] rounded-full pointer-events-none"></div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 mb-8 relative z-10">Arus Logistik (24 Jam Terakhir)</h3>
          <div className="flex items-end gap-1 sm:gap-2 h-48 relative z-10">
            {data?.hourlyWorkload?.map((item: any, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                <div 
                  className="w-full bg-white/5 rounded-t-sm group-hover:bg-orange-500 transition-all duration-300 relative border-t border-white/10 group-hover:border-orange-400 group-hover:shadow-[0_0_15px_rgba(249,115,22,0.5)]" 
                  style={{ height: `${Math.max((item.count / (Math.max(...data.hourlyWorkload.map((h: any) => h.count)) || 1)) * 100, 2)}%` }}
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity border border-white/10 shadow-xl pointer-events-none whitespace-nowrap">
                    {item.count} Paket
                  </div>
                </div>
                <span className="text-[8px] font-black text-slate-500 group-hover:text-orange-400 transition-colors mt-2">{item.hour}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Courier Productivity */}
        <div className="rounded-[2.5rem] bg-gradient-to-b from-orange-600/20 to-transparent border border-orange-500/20 p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 opacity-10 text-orange-500"><Activity size={180} /></div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400 mb-8 relative z-10">Kurir Terbaik</h3>
          <div className="space-y-4 relative z-10">
            {data?.courierStats?.map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between group bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-orange-500/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm ${i === 0 ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)]' : 'bg-white/5 text-slate-400'}`}>
                    #{i+1}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white">{c.name}</p>
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Unit Ekspedisi</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-orange-400">{c.delivered}</p>
                  <p className="text-[8px] text-slate-500 uppercase font-black">Selesai</p>
                </div>
              </div>
            ))}
            {(!data?.courierStats || data.courierStats.length === 0) && (
              <div className="text-center py-8 text-slate-500 text-sm font-medium">Belum ada data pengiriman.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
