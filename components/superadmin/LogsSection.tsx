import React from 'react';
import { Search } from 'lucide-react';

interface LogsSectionProps {
  logs: any[];
  logSearch: string;
  onSearchChange: (value: string) => void;
}

export function LogsSection({ logs, logSearch, onSearchChange }: LogsSectionProps) {
  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(logSearch.toLowerCase()) || 
    l.entity.toLowerCase().includes(logSearch.toLowerCase()) ||
    l.actor_name.toLowerCase().includes(logSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-white">Jejak Audit.</h1>
        <p className="text-slate-400 font-medium">Rekaman aktivitas yang tidak dapat diubah (Immutable).</p>
      </div>

      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-orange-500" size={20} />
        <input 
          type="text" 
          placeholder="Cari berdasarkan aksi, entitas, atau ID target..." 
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-16 pr-6 text-sm font-bold text-white placeholder-slate-500 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all shadow-xl"
          value={logSearch}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="rounded-[2.5rem] glass border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-white/5 border-b border-white/10">
              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-8 py-6">Waktu</th>
                <th className="px-8 py-6">Aktor</th>
                <th className="px-8 py-6">Tindakan</th>
                <th className="px-8 py-6">Target</th>
                <th className="px-8 py-6">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td suppressHydrationWarning className="px-8 py-5 text-[11px] font-mono text-slate-400">
                    {new Date(log.created_at).toLocaleString('id-ID')}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xs font-black text-orange-500 uppercase">
                        {log.actor_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{log.actor_name}</p>
                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{log.actor_role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-lg inline-block">{log.action}</span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-slate-200">{log.entity}</p>
                    <p className="text-[10px] font-mono text-slate-500">{log.entity_id || '-'}</p>
                  </td>
                  <td className="px-8 py-5">
                    <pre className="text-[10px] font-mono text-slate-400 bg-black/30 p-2 rounded-lg max-w-[200px] overflow-x-auto border border-white/5">
                      {JSON.stringify(log.metadata)}
                    </pre>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-500 font-medium">Tidak ada jejak audit ditemukan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
