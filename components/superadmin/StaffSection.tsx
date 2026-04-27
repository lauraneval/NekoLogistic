import React from 'react';
import Image from 'next/image';
import { UserPlus, Search, Filter, Edit3, Ban, Trash2, CheckCircle2 } from 'lucide-react';

interface StaffSectionProps {
  users: any[];
  searchTerm: string;
  roleFilter: string;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: string) => void;
  onAddStaff: () => void;
  onEditStaff: (user: any) => void;
  onToggleSuspend: (user: any) => void;
  onDeleteStaff: (userId: string, userName: string) => void;
}

export function StaffSection({
  users,
  searchTerm,
  roleFilter,
  onSearchChange,
  onRoleFilterChange,
  onAddStaff,
  onEditStaff,
  onToggleSuspend,
  onDeleteStaff
}: StaffSectionProps) {
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (u.employee_id && u.employee_id.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-white">Direktori Staf.</h1>
          <p className="text-slate-400 font-medium">Kelola identitas, akses, dan wewenang operator.</p>
        </div>
        <button onClick={onAddStaff} className="flex items-center justify-center gap-2 bg-orange-600 text-white px-6 py-4 rounded-2xl font-bold shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:bg-orange-500 transition-all hover:scale-105 active:scale-95 w-full md:w-auto">
          <UserPlus size={18} /> Daftarkan Staf Baru
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-orange-500" size={18} />
          <input 
            type="text" 
            placeholder="Cari nama atau NIP staf..." 
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-white placeholder-slate-500 outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 border border-white/10 focus-within:border-orange-500/50 transition-all min-w-[200px]">
          <Filter size={16} className="text-slate-500" />
          <select 
            className="w-full bg-transparent border-none py-4 text-xs font-black uppercase tracking-widest text-slate-300 outline-none cursor-pointer appearance-none"
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
          >
            <option value="all" className="bg-[#1a1410]">Semua Peran</option>
            <option value="kurir" className="bg-[#1a1410]">Kurir Logistik</option>
            <option value="admin_gudang" className="bg-[#1a1410]">Admin Gudang</option>
            <option value="superadmin" className="bg-[#1a1410]">Superadmin</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-[2.5rem] glass border border-white/10 p-2 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-2 whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                <th className="px-6 py-4">Identitas Personil</th>
                <th className="px-6 py-4">Posisi</th>
                <th className="px-6 py-4">Status Akses</th>
                <th className="px-6 py-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user: any) => (
                <tr key={user.user_id} className="group bg-white/5 hover:bg-white/10 transition-all rounded-3xl border border-transparent hover:border-white/10">
                  <td className="px-6 py-4 rounded-l-[1.5rem]">
                    <div className="flex items-center gap-4">
                      {user.avatar_url ? (
                        <div className="h-12 w-12 rounded-xl overflow-hidden shadow-md border border-white/10">
                          <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-lg font-black text-slate-400 uppercase">{user.full_name.charAt(0)}</div>
                      )}
                      <div>
                        <p className="font-bold text-white text-sm">{user.full_name}</p>
                        <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">{user.employee_id || 'ID BELUM DITETAPKAN'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                      user.role === 'superadmin' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 
                      user.role === 'admin_gudang' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                      'bg-white/5 text-slate-300 border-white/10'
                    }`}>{user.role.replace('_', ' ')}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest ${user.is_suspended ? 'text-red-400' : 'text-green-400'}`}>
                      {user.is_suspended ? (
                        <><span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20"><Ban size={12} /></span> DITANGGUHKAN</>
                      ) : (
                        <><span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20"><CheckCircle2 size={12} /></span> AKTIF</>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 rounded-r-[1.5rem] text-right">
                    <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEditStaff(user)} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-orange-500/20 hover:text-orange-400 hover:border-orange-500/30 transition-all" title="Edit Profil"><Edit3 size={16} /></button>
                      <button onClick={() => onToggleSuspend(user)} className={`p-2.5 rounded-xl border transition-all ${user.is_suspended ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'}`} title={user.is_suspended ? "Pulihkan Akses" : "Tangguhkan Akses"}><Ban size={16} /></button>
                      <button onClick={() => onDeleteStaff(user.user_id, user.full_name)} className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all" title="Hapus Permanen"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">Tidak ada personil yang sesuai dengan filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
