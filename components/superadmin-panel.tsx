"use client";

import { useEffect, useState } from "react";
import { 
  Users, Package, Activity, ShieldAlert, RefreshCcw, 
  LayoutDashboard, Settings, History, Menu, Bell, 
  UserPlus, Trash2, Ban, CheckCircle2, Search, Edit3, X, Filter,
  Camera, AlertTriangle
} from "lucide-react";
import { LogoutButton } from "./logout-button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SuperadminPanel() {
  const [activeTab, setActiveTab] = useState("staff");
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [data, setData] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  // UI States
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionLabel: string;
    type: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  } | null>(null);

  const [form, setForm] = useState({ 
    email: '', 
    password: '', 
    full_name: '', 
    role: 'kurir',
    phone: '',
    employee_id: '',
    address: '',
    avatar_url: ''
  });

  const supabase = createSupabaseBrowserClient();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, usersRes, logsRes] = await Promise.all([
        fetch("/api/superadmin/analytics"),
        fetch("/api/superadmin/users"),
        fetch("/api/superadmin/activity-logs")
      ]);
      const aData = await analyticsRes.json();
      const uData = await usersRes.json();
      const lData = await logsRes.json();
      if (aData.ok) setData(aData.data);
      if (uData.ok) setUsers(uData.data);
      if (lData.ok) setLogs(lData.data.logs);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openConfirm = (title: string, message: string, actionLabel: string, type: 'danger'|'warning'|'info', onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, title, message, actionLabel, type, onConfirm });
  };

  const closeConfirm = () => {
    setConfirmDialog(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const action = async () => {
      const url = editingUser ? `/api/superadmin/users/${editingUser.user_id}` : "/api/superadmin/users";
      const method = editingUser ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        closeModal();
        fetchData();
        closeConfirm();
      } else {
        alert("Terjadi kesalahan saat menyimpan data.");
        closeConfirm();
      }
    };

    if (editingUser) {
      openConfirm("Konfirmasi Pembaruan", "Apakah Anda yakin ingin memperbarui data profil staf ini?", "Perbarui Data", "info", action);
    } else {
      action(); // No confirm for creation, or you could add one
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
    setForm({ email: '', password: '', full_name: '', role: 'kurir', phone: '', employee_id: '', address: '', avatar_url: '' });
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setForm({ 
      email: user.email || '', 
      password: '', 
      full_name: user.full_name, 
      role: user.role,
      phone: user.phone || '',
      employee_id: user.employee_id || '',
      address: user.address || '',
      avatar_url: user.avatar_url || ''
    });
    setModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingUser) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${editingUser.user_id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setForm(prev => ({ ...prev, avatar_url: publicUrl }));
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleSuspend = (user: any) => {
    const isSuspending = !user.is_suspended;
    openConfirm(
      isSuspending ? "Tangguhkan Akses" : "Pulihkan Akses",
      `Apakah Anda yakin ingin ${isSuspending ? 'menangguhkan' : 'memulihkan'} akses terminal untuk ${user.full_name}? ${isSuspending ? 'Mereka tidak akan bisa login ke sistem.' : ''}`,
      isSuspending ? "Ya, Tangguhkan" : "Ya, Pulihkan",
      isSuspending ? "warning" : "info",
      async () => {
        await fetch(`/api/superadmin/users/${user.user_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            ...user,
            is_suspended: isSuspending 
          }),
        });
        fetchData();
        closeConfirm();
      }
    );
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    openConfirm(
      "Hapus Staf Permanen",
      `TINDAKAN KRITIS: Apakah Anda yakin ingin menghapus akun ${userName} secara permanen? Seluruh akses dan data otentikasi akan musnah.`,
      "Hapus Permanen",
      "danger",
      async () => {
        await fetch(`/api/superadmin/users/${userId}`, { method: "DELETE" });
        fetchData();
        closeConfirm();
      }
    );
  };

  // Filter Logic
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (u.employee_id && u.employee_id.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading && !data) {
    return <div className="flex min-h-screen items-center justify-center bg-[#0f0a05] text-orange-500"><RefreshCcw className="animate-spin" size={32} /></div>;
  }

  return (
    <div className="flex min-h-screen bg-[#0f0a05] font-sans text-slate-200 selection:bg-orange-500/30 selection:text-orange-200 relative overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-5 pointer-events-none"></div>
      
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-[#14100c] border-r border-white/10 transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:relative lg:translate-x-0`}>
        <div className="flex h-full flex-col p-8 relative z-10">
          <div className="mb-12 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-600/20 text-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.2)] border border-orange-500/20"><Package size={20} /></div>
              <span className="text-2xl font-black tracking-tighter text-white">NEKO<span className="text-orange-500">LOG.</span></span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          <nav className="flex-1 space-y-2">
            <SidebarItem icon={<Users size={18}/>} label="Manajemen Staf" active={activeTab === "staff"} onClick={() => { setActiveTab("staff"); if (window.innerWidth < 1024) setSidebarOpen(false); }} />
            <SidebarItem icon={<LayoutDashboard size={18}/>} label="Metrik Sistem" active={activeTab === "dashboard"} onClick={() => { setActiveTab("dashboard"); if (window.innerWidth < 1024) setSidebarOpen(false); }} />
            <SidebarItem icon={<History size={18}/>} label="Jejak Audit" active={activeTab === "logs"} onClick={() => { setActiveTab("logs"); if (window.innerWidth < 1024) setSidebarOpen(false); }} />
          </nav>
          <div className="pt-6 border-t border-white/10"><LogoutButton /></div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 relative z-10 h-screen overflow-y-auto">
        <header className="sticky top-0 z-40 flex h-20 sm:h-24 items-center justify-between px-6 sm:px-12 bg-[#14100c] border-b border-white/10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-300 hover:text-orange-500 transition-colors">
              <Menu size={24} />
            </button>
            <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-orange-500 truncate max-w-[150px] sm:max-w-none">
              {activeTab === 'staff' ? 'Manajemen Staf' : activeTab === 'dashboard' ? 'Metrik Sistem' : 'Jejak Audit'}
            </h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={fetchData} className="flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-orange-500/30 transition-all text-slate-300 hover:text-orange-400 group"><RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" /></button>
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 relative">
              <Bell size={16} />
              <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 h-2 w-2 rounded-full bg-orange-500 animate-pulse"></div>
            </div>
          </div>
        </header>

        <div className="p-6 sm:p-12 max-w-7xl mx-auto">
          {activeTab === "dashboard" && (
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
          )}

          {activeTab === "logs" && (
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
                  onChange={(e) => setLogSearch(e.target.value)}
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
                      {logs.filter(l => 
                        l.action.toLowerCase().includes(logSearch.toLowerCase()) || 
                        l.entity.toLowerCase().includes(logSearch.toLowerCase()) ||
                        l.actor_name.toLowerCase().includes(logSearch.toLowerCase())
                      ).map((log) => (
                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-8 py-5 text-[11px] font-mono text-slate-400">
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
                      {logs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-8 py-12 text-center text-slate-500 font-medium">Tidak ada jejak audit ditemukan.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "staff" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-white">Direktori Staf.</h1>
                  <p className="text-slate-400 font-medium">Kelola identitas, akses, dan wewenang operator.</p>
                </div>
                <button onClick={() => setModalOpen(true)} className="flex items-center justify-center gap-2 bg-orange-600 text-white px-6 py-4 rounded-2xl font-bold shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:bg-orange-500 transition-all hover:scale-105 active:scale-95 w-full md:w-auto">
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
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 border border-white/10 focus-within:border-orange-500/50 transition-all min-w-[200px]">
                  <Filter size={16} className="text-slate-500" />
                  <select 
                    className="w-full bg-transparent border-none py-4 text-xs font-black uppercase tracking-widest text-slate-300 outline-none cursor-pointer appearance-none"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
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
                                <img src={user.avatar_url} alt={user.full_name} className="h-12 w-12 rounded-xl object-cover shadow-md border border-white/10" />
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
                              <button onClick={() => openEditModal(user)} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-orange-500/20 hover:text-orange-400 hover:border-orange-500/30 transition-all" title="Edit Profil"><Edit3 size={16} /></button>
                              <button onClick={() => handleToggleSuspend(user)} className={`p-2.5 rounded-xl border transition-all ${user.is_suspended ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'}`} title={user.is_suspended ? "Pulihkan Akses" : "Tangguhkan Akses"}><Ban size={16} /></button>
                              <button onClick={() => handleDeleteUser(user.user_id, user.full_name)} className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all" title="Hapus Permanen"><Trash2 size={16} /></button>
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
          )}
        </div>
      </main>

      {/* Confirmation Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#1a1410] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl transform scale-100 animate-in zoom-in-95 duration-200">
            <div className={`mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl ${
              confirmDialog.type === 'danger' ? 'bg-red-500/20 text-red-500 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]' :
              confirmDialog.type === 'warning' ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.2)]' :
              'bg-blue-500/20 text-blue-500 border border-blue-500/30'
            }`}>
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white mb-3">{confirmDialog.title}</h2>
            <p className="text-sm font-medium text-slate-400 mb-8 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-4">
              <button onClick={closeConfirm} className="flex-1 bg-white/5 border border-white/10 text-white font-bold py-4 rounded-2xl hover:bg-white/10 transition-colors">Batal</button>
              <button onClick={confirmDialog.onConfirm} className={`flex-1 font-bold py-4 rounded-2xl text-white transition-all shadow-lg ${
                confirmDialog.type === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20' :
                confirmDialog.type === 'warning' ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/20' :
                'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
              }`}>{confirmDialog.actionLabel}</button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal (Create & Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#1a1410] border border-orange-500/20 rounded-[3rem] p-6 sm:p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-y-auto max-h-[90vh] custom-scrollbar">
            <button onClick={closeModal} className="absolute top-6 right-6 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"><X size={20} className="text-slate-300" /></button>
            <h2 className="text-3xl font-black tracking-tight text-white mb-2">{editingUser ? 'Perbarui Data Staf.' : 'Registrasi Staf Baru.'}</h2>
            <p className="text-slate-400 mb-8 font-medium text-sm">Formulir otorisasi dan identitas keamanan NekoLogistic.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {editingUser && (
                <div className="flex flex-col items-center justify-center gap-4 mb-8 bg-black/20 p-6 rounded-[2rem] border border-white/5">
                  <div className="relative group cursor-pointer">
                    <div className="h-32 w-32 rounded-[2rem] bg-slate-900 overflow-hidden border-2 border-white/10 shadow-xl transition-all group-hover:border-orange-500/50">
                      {form.avatar_url ? (
                        <img src={form.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-4xl font-black text-slate-600">
                          {form.full_name ? form.full_name.charAt(0).toUpperCase() : '?'}
                        </div>
                      )}
                    </div>
                    <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm rounded-[2rem]">
                      <Camera size={28} className="mb-2 text-orange-400" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-center px-2">Ubah<br/>Foto</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                    </label>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-500/70">
                    {isUploading ? 'MENGUNGGAH ASET...' : 'FORMAT: JPG/PNG/WEBP'}
                  </p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Nama Lengkap</label>
                  <input required value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} type="text" placeholder="John Doe" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Nomor Induk Pegawai (NIP)</label>
                  <input value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} type="text" placeholder="NEKO-12345" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all" />
                </div>
              </div>

              {!editingUser && (
                <div className="grid md:grid-cols-2 gap-6 bg-black/20 p-5 rounded-[2rem] border border-white/5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Alamat Email (Kredensial)</label>
                    <input required value={form.email} onChange={e => setForm({...form, email: e.target.value})} type="email" placeholder="nama@nekologistic.id" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Kata Sandi Sementara</label>
                    <input required value={form.password} onChange={e => setForm({...form, password: e.target.value})} type="password" placeholder="Minimal 8 Karakter" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all" />
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Hak Akses Sistem</label>
                  <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all appearance-none cursor-pointer">
                    <option value="kurir" className="bg-[#1a1410]">Kurir Pengiriman</option>
                    <option value="admin_gudang" className="bg-[#1a1410]">Administrator Gudang</option>
                    <option value="superadmin" className="bg-[#1a1410]">Super Administrator</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Nomor Kontak Aktif</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} type="tel" placeholder="+62 8..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Alamat Domisili</label>
                <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} rows={3} placeholder="Alamat lengkap sesuai identitas..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all resize-none"></textarea>
              </div>

              <button type="submit" className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:bg-orange-500 transition-all hover:scale-[1.02] active:scale-95 border border-orange-500/50">
                {editingUser ? 'Simpan Pembaruan Identitas' : 'Otorisasi Anggota Baru'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-4 rounded-xl px-5 py-4 text-[10px] font-black tracking-widest uppercase transition-all border ${active ? "bg-orange-600/20 text-orange-400 border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.1)]" : "border-transparent text-slate-400 hover:bg-white/5 hover:text-white"}`}>
      <span className={active ? "text-orange-500" : ""}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function StatCard({ label, value, sub, icon }: any) {
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
