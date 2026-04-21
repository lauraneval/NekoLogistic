"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Users, 
  Package, 
  BarChart3, 
  UserPlus, 
  Trash2, 
  ShieldCheck,
  Menu,
  X,
  LogOut,
  Loader2,
  Search,
  Filter,
  ArrowUpRight,
  TrendingUp,
  Activity,
  History,
  MoreVertical,
  Bell,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Ban,
  Unlock,
  Calendar
} from "lucide-react";
import { useRouter } from "next/navigation";

type UserProfile = {
  user_id: string;
  full_name: string;
  role: "superadmin" | "admin_gudang" | "kurir";
  created_at: string;
  is_blocked?: boolean;
};

export default function SuperadminPanel() {
  const [activeTab, setActiveTab] = useState<"users" | "analytics" | "activity">("users");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // Form states
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "", role: "kurir" });
  const [editFormData, setEditFormData] = useState({ fullName: "", role: "kurir", is_blocked: false });

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (roleFilter !== "all") count++;
    if (statusFilter !== "all") count++;
    return count;
  }, [roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/superadmin/users");
      const json = await res.json();
      if (json.ok) setUsers(json.data);
    } catch (err) {
      console.error("Gagal memuat data pengguna");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.full_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || 
                           (statusFilter === "blocked" ? user.is_blocked : !user.is_blocked);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.ok) {
        setIsModalOpen(false);
        setFormData({ fullName: "", email: "", password: "", role: "kurir" });
        fetchUsers();
      } else alert(json.error?.message || "Gagal membuat user");
    } catch (err) { alert("Terjadi kesalahan sistem"); }
    finally { setLoading(false); }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/superadmin/users/${selectedUser.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });
      const json = await res.json();
      if (json.ok) {
        setIsEditModalOpen(false);
        fetchUsers();
      } else alert(json.error?.message || "Gagal memperbarui user");
    } catch (err) { alert("Terjadi kesalahan sistem"); }
    finally { setLoading(false); }
  };

  const toggleBlockUser = async (user: UserProfile) => {
    const action = user.is_blocked ? "Mengaktifkan" : "Memblokir";
    if (!confirm(`${action} akun ${user.full_name}?`)) return;
    
    try {
      const res = await fetch(`/api/superadmin/users/${user.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          fullName: user.full_name, 
          role: user.role, 
          is_blocked: !user.is_blocked 
        }),
      });
      if (res.ok) fetchUsers();
    } catch (err) { alert("Gagal mengubah status blokir"); }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Hapus akun ini secara permanen?")) return;
    try {
      const res = await fetch(`/api/superadmin/users/${id}`, { method: "DELETE" });
      if (res.ok) fetchUsers();
      else alert("Gagal menghapus user");
    } catch (err) { alert("Terjadi kesalahan sistem"); }
  };

  const openEditModal = (user: UserProfile) => {
    setSelectedUser(user);
    setEditFormData({ 
      fullName: user.full_name, 
      role: user.role as any, 
      is_blocked: !!user.is_blocked 
    });
    setIsEditModalOpen(true);
  };

  const formatDateFull = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const NavItem = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
        activeTab === id 
          ? "bg-orange-500 text-white shadow-lg orange-shadow" 
          : "text-orange-200/50 hover:bg-white/5 hover:text-orange-400"
      }`}
    >
      <Icon size={20} />
      <span className="font-semibold tracking-wide">{label}</span>
      {activeTab === id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0f0a05] text-[#fffcf0] flex overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-600/10 blur-[120px] rounded-full z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-800/10 blur-[120px] rounded-full z-0" />

      {/* Sidebar Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 w-72 glass border-r border-white/5 z-[70] transform transition-all duration-500 lg:translate-x-0
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="p-8 h-full flex flex-col">
          <div className="flex items-center space-x-3 mb-12">
            <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg orange-shadow rotate-3 hover:rotate-0 transition-transform">
              <Package className="text-white" size={28} />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tighter block leading-none">NEKO</span>
              <span className="text-orange-500 text-sm font-bold tracking-widest uppercase">Logistik</span>
            </div>
          </div>

          <nav className="flex-1 space-y-3">
            <NavItem id="users" label="Kelola Akun" icon={Users} />
            <NavItem id="analytics" label="Statistik" icon={BarChart3} />
            <NavItem id="activity" label="Riwayat Sesi" icon={History} />
          </nav>

          <div className="mt-auto pt-8 border-t border-white/5">
            <button 
              onClick={() => { fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); }}
              className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-2xl transition-colors group"
            >
              <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="font-bold">Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto z-10">
        <header className="h-20 glass border-b border-white/5 sticky top-0 z-50 flex items-center justify-between px-8">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-white/5 rounded-xl text-orange-200">
            <Menu size={24} />
          </button>
          <h1 className="text-lg font-bold hidden sm:block">Dashboard Superadmin</h1>
          <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-white font-black shadow-lg orange-shadow border-2 border-white/10">SA</div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {activeTab === "users" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-black mb-1">Manajemen User</h2>
                  <p className="text-orange-100/40 text-sm">Kelola, blokir, dan pantau akses personel</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                  {/* Search Input */}
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-200/30 group-focus-within:text-orange-500 transition-colors" size={18} />
                    <input 
                      type="text" placeholder="Cari nama..." value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="glass-orange rounded-2xl pl-12 pr-6 py-3 text-sm min-w-[240px] focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all placeholder:text-orange-200/20"
                    />
                  </div>
                  
                  {/* Single Filter Button */}
                  <button 
                    onClick={() => setIsFilterModalOpen(true)}
                    className={`relative p-3 rounded-2xl border transition-all ${
                      activeFilterCount > 0 
                      ? "bg-orange-500 border-orange-500 text-white shadow-lg orange-shadow" 
                      : "glass text-orange-200/50 hover:text-orange-400 border-white/5"
                    }`}
                  >
                    <Filter size={20} />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-orange-500 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#0f0a05]">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl flex items-center space-x-2 transition-all shadow-lg orange-shadow font-black text-sm"
                  >
                    <UserPlus size={18} />
                    <span>User Baru</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? Array(3).fill(0).map((_, i) => <div key={i} className="h-64 glass rounded-[2.5rem] animate-pulse" />) :
                  filteredUsers.map((user) => (
                    <div key={user.user_id} className={`group relative glass rounded-[2.5rem] p-8 transition-all duration-500 ${user.is_blocked ? 'grayscale opacity-60 border-red-500/20' : 'hover:-translate-y-2'}`}>
                      <div className="absolute top-8 right-8 flex items-center space-x-2">
                        <button onClick={() => openEditModal(user)} className="p-2 rounded-xl bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white transition-all">
                          <Edit3 size={16} />
                        </button>
                        <button onClick={() => toggleBlockUser(user)} className={`p-2 rounded-xl transition-all ${user.is_blocked ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white' : 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white'}`}>
                          {user.is_blocked ? <Unlock size={16} /> : <Ban size={16} />}
                        </button>
                        {user.role !== 'superadmin' && (
                          <button onClick={() => handleDeleteUser(user.user_id)} className="p-2 rounded-xl bg-white/5 text-gray-400 hover:bg-red-600 hover:text-white transition-all">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${
                        user.is_blocked ? 'bg-red-500/20 text-red-400' :
                        user.role === 'superadmin' ? 'bg-orange-500 text-white orange-shadow' : 'bg-orange-500/10 text-orange-400'
                      }`}>
                        {user.is_blocked ? <Ban size={28} /> : user.role === 'superadmin' ? <ShieldCheck size={28} /> : <Users size={28} />}
                      </div>

                      <div className="space-y-1 mb-6">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-black text-xl">{user.full_name}</h3>
                          {user.is_blocked && <span className="bg-red-500 text-[8px] font-black px-1.5 py-0.5 rounded text-white uppercase">Blocked</span>}
                        </div>
                        <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em]">{user.role.replace('_', ' ')}</p>
                      </div>

                      <div className="pt-6 border-t border-white/5">
                        <div className="flex items-center space-x-2 text-orange-100/30 mb-1">
                          <Calendar size={12} />
                          <p className="text-[10px] font-black uppercase tracking-widest">Terdaftar Pada</p>
                        </div>
                        <p className="text-xs font-medium text-orange-100/60">{formatDateFull(user.created_at)}</p>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Filter Modal */}
      {isFilterModalOpen && (
        <Modal title="Parameter Filter" onClose={() => setIsFilterModalOpen(false)}>
          <div className="space-y-10">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 ml-1">
                <ShieldCheck size={14} className="text-orange-500" />
                <label className="text-[11px] font-black text-orange-400 uppercase tracking-widest">Jabatan Personel</label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(['all', 'superadmin', 'admin_gudang', 'kurir'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-4 py-4 rounded-2xl text-[11px] font-bold capitalize border-2 transition-all duration-300 ${
                      roleFilter === r 
                      ? "bg-orange-500 border-white/20 text-white shadow-lg orange-shadow scale-[1.02]" 
                      : "bg-white/5 border-white/5 text-orange-100/30 hover:border-orange-500/30 hover:text-orange-300"
                    }`}
                  >
                    {r === 'all' ? 'Semua Jabatan' : r.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2 ml-1">
                <Activity size={14} className="text-orange-500" />
                <label className="text-[11px] font-black text-orange-400 uppercase tracking-widest">Status Keaktifan</label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(['all', 'active', 'blocked'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-4 py-4 rounded-2xl text-[11px] font-bold capitalize border-2 transition-all duration-300 ${
                      statusFilter === s 
                      ? "bg-orange-500 border-white/20 text-white shadow-lg orange-shadow scale-[1.02]" 
                      : "bg-white/5 border-white/5 text-orange-100/30 hover:border-orange-500/30 hover:text-orange-300"
                    }`}
                  >
                    {s === 'all' ? 'Semua' : s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t border-white/10">
              <button 
                onClick={() => { setRoleFilter('all'); setStatusFilter('all'); }}
                className="flex-1 px-4 py-4.5 rounded-3xl bg-white/5 border-2 border-white/5 text-[11px] font-black uppercase text-orange-200/40 hover:text-white hover:bg-red-500/20 hover:border-red-500/30 transition-all active:scale-95"
              >
                Reset
              </button>
              <button 
                onClick={() => setIsFilterModalOpen(false)}
                className="flex-[2] bg-orange-500 text-white px-4 py-4.5 rounded-3xl text-[11px] font-black uppercase shadow-xl orange-shadow border-2 border-white/20 hover:bg-orange-400 transition-all active:scale-95 flex items-center justify-center space-x-2"
              >
                <CheckCircle2 size={16} />
                <span>Terapkan Filter</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Tambah User */}
      {isModalOpen && (
        <Modal title="Personel Baru" onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleCreateUser} className="space-y-6">
            <Input label="Nama Lengkap" value={formData.fullName} onChange={(v: string) => setFormData({...formData, fullName: v})} placeholder="Galih Wijaya" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input label="Email" type="email" value={formData.email} onChange={(v: string) => setFormData({...formData, email: v})} placeholder="email@neko.com" />
              <div className="space-y-2">
                <div className="flex items-center space-x-2 ml-1">
                  <ShieldCheck size={12} className="text-orange-500" />
                  <label className="text-[11px] font-black text-orange-400 uppercase tracking-wider">Jabatan</label>
                </div>
                <div className="relative">
                  <select 
                    value={formData.role} 
                    onChange={e => setFormData({...formData, role: e.target.value})}
                    className="w-full bg-white/5 border-2 border-white/5 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-orange-500/50 appearance-none transition-all cursor-pointer"
                  >
                    <option value="kurir" className="bg-[#1a140f]">Kurir</option>
                    <option value="admin_gudang" className="bg-[#1a140f]">Admin Gudang</option>
                  </select>
                  <MoreVertical size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-orange-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <Input label="Password" type="password" value={formData.password} onChange={(v: string) => setFormData({...formData, password: v})} placeholder="••••••••" />
            <SubmitButton loading={loading} label="Aktifkan Akun" />
          </form>
        </Modal>
      )}

      {/* Modal Edit User */}
      {isEditModalOpen && (
        <Modal title="Edit Akun" onClose={() => setIsEditModalOpen(false)}>
          <form onSubmit={handleUpdateUser} className="space-y-6">
            <Input label="Nama Lengkap" value={editFormData.fullName} onChange={(v: string) => setEditFormData({...editFormData, fullName: v})} />
            <div className="space-y-2">
              <div className="flex items-center space-x-2 ml-1">
                <ShieldCheck size={12} className="text-orange-500" />
                <label className="text-[11px] font-black text-orange-400 uppercase tracking-wider">Jabatan</label>
              </div>
              <div className="relative">
                <select 
                  value={editFormData.role} 
                  onChange={e => setEditFormData({...editFormData, role: e.target.value as any})}
                  disabled={selectedUser?.role === 'superadmin'}
                  className="w-full bg-white/5 border-2 border-white/5 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-orange-500/50 appearance-none transition-all cursor-pointer disabled:opacity-50"
                >
                  <option value="kurir" className="bg-[#1a140f]">Kurir</option>
                  <option value="admin_gudang" className="bg-[#1a140f]">Admin Gudang</option>
                  <option value="superadmin" className="bg-[#1a140f]">Superadmin</option>
                </select>
                <MoreVertical size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-orange-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex items-center justify-between p-5 bg-white/5 border-2 border-orange-500/10 rounded-2xl transition-colors hover:border-orange-500/30">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${editFormData.is_blocked ? "bg-red-500/20 text-red-500" : "bg-orange-500/10 text-orange-400"}`}>
                  <Ban size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold">Status Blokir Akun</span>
                  <span className="text-[10px] font-medium text-white/30 tracking-tight">{editFormData.is_blocked ? "Akses ditangguhkan" : "Akses aktif"}</span>
                </div>
              </div>
              <input 
                type="checkbox" checked={editFormData.is_blocked} 
                onChange={e => setEditFormData({...editFormData, is_blocked: e.target.checked})}
                className="w-6 h-6 accent-orange-500 cursor-pointer shadow-lg"
              />
            </div>
            <SubmitButton loading={loading} label="Simpan Perubahan" />
          </form>
        </Modal>
      )}
    </div>
  );
}

// Reusable Components
function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative bg-[#0f0a05] border-2 border-white/10 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-10 border-b border-white/5 flex items-center justify-between bg-gradient-to-br from-orange-500/10 to-transparent">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-1">Pengaturan</span>
            <h3 className="text-2xl font-black text-white leading-none">{title}</h3>
          </div>
          <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl text-orange-200/50 hover:text-white hover:bg-red-500/20 transition-all">
            <X size={24} />
          </button>
        </div>
        <div className="p-10">{children}</div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder }: any) {
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 ml-1">
        <div className="w-1 h-1 bg-orange-500 rounded-full" />
        <label className="text-[11px] font-black text-orange-400 uppercase tracking-wider">{label}</label>
      </div>
      <input 
        required type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-white/5 border-2 border-white/5 rounded-2xl px-6 py-4.5 focus:ring-2 focus:ring-orange-500/50 focus:border-transparent outline-none text-white placeholder:text-white/10 transition-all font-medium"
        placeholder={placeholder}
      />
    </div>
  );
}

function SubmitButton({ loading, label }: any) {
  return (
    <button 
      disabled={loading} type="submit"
      className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-5 rounded-[2rem] mt-4 transition-all flex items-center justify-center space-x-3 shadow-xl orange-shadow active:scale-95 border-2 border-white/20"
    >
      {loading ? <Loader2 className="animate-spin text-white" /> : <><CheckCircle2 size={20} /><span>{label}</span></>}
    </button>
  );
}

