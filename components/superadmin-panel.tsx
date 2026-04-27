"use client";

import { useEffect, useState } from "react";
import { 
  Users, Package, Activity, ShieldAlert, RefreshCcw, 
  LayoutDashboard, Settings, History, Menu, Bell, 
  UserPlus, Trash2, Ban, CheckCircle2, Search, Edit3, X, Filter,
  Camera, Upload
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
    setForm({ email: '', password: '', full_name: '', role: 'kurir', phone: '', employee_id: '', address: '' });
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

  const handleToggleSuspend = async (user: any) => {
    await fetch(`/api/superadmin/users/${user.user_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        ...user,
        is_suspended: !user.is_suspended 
      }),
    });
    fetchData();
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Hapus akun secara permanen?")) return;
    await fetch(`/api/superadmin/users/${userId}`, {
      method: "DELETE",
    });
    fetchData();
  };

  // Filter Logic
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (u.employee_id && u.employee_id.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading && !data) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F5F5F7]"><RefreshCcw className="animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="flex min-h-screen bg-[#F5F5F7] font-sans text-slate-900 selection:bg-blue-100">
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-white/80 backdrop-blur-3xl transition-transform duration-300 ease-in-out border-r border-white/40 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:relative lg:translate-x-0`}>
        <div className="flex h-full flex-col p-8">
          <div className="mb-12 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 shadow-xl shadow-blue-500/30 text-white"><Package size={20} /></div>
            <span className="text-2xl font-black tracking-tighter">NEKO<span className="text-blue-600">LOG.</span></span>
          </div>
          <nav className="flex-1 space-y-2">
            <SidebarItem icon={<Users size={18}/>} label="Staff Management" active={activeTab === "staff"} onClick={() => setActiveTab("staff")} />
            <SidebarItem icon={<LayoutDashboard size={18}/>} label="System Overview" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
            <SidebarItem icon={<History size={18}/>} label="Audit Trail" active={activeTab === "logs"} onClick={() => setActiveTab("logs")} />
          </nav>
          <div className="pt-6 border-t border-slate-100"><LogoutButton /></div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 relative">
        <header className="sticky top-0 z-40 flex h-24 items-center justify-between px-12 bg-[#F5F5F7]/80 backdrop-blur-xl border-b border-white/40">
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">{activeTab}</h2>
          <div className="flex items-center gap-4">
            <button onClick={fetchData} className="p-3 rounded-2xl bg-white shadow-sm border border-white hover:scale-105 transition-all"><RefreshCcw size={18} className="text-slate-600" /></button>
            <div className="h-11 w-11 rounded-2xl bg-white border border-white flex items-center justify-center shadow-sm"><Bell size={18} className="text-slate-500" /></div>
          </div>
        </header>

        <div className="p-12">
          {activeTab === "dashboard" && (
            <div className="space-y-12">
              <div>
                <h1 className="text-5xl font-extrabold tracking-tight mb-2">System Pulse.</h1>
                <p className="text-slate-500 font-medium">Real-time logistics analytics and throughput.</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard label="Live Packages" value={data?.stats?.total} sub="Total registered" icon={<Package className="text-blue-600" />} />
                <StatCard label="Success Rate" value={data?.stats?.delivered} sub="Delivered packages" icon={<CheckCircle2 className="text-green-600" />} />
                <StatCard label="Active Flow" value={data?.stats?.in_transit} sub="Currently in transit" icon={<Activity className="text-orange-600" />} />
                <StatCard label="Backlog" value={data?.stats?.pending} sub="Awaiting processing" icon={<RefreshCcw className="text-slate-400" />} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Workload Chart (Last 24h) */}
                <div className="lg:col-span-2 rounded-[2.5rem] bg-white border border-white p-10 shadow-xl">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8">Logistics Throughput (24h)</h3>
                  <div className="flex items-end gap-2 h-48">
                    {data?.hourlyWorkload?.map((item: any, i: number) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                        <div 
                          className="w-full bg-blue-50 rounded-t-lg group-hover:bg-blue-600 transition-all duration-500 relative" 
                          style={{ height: `${(item.count / (Math.max(...data.hourlyWorkload.map((h: any) => h.count)) || 1)) * 100}%` }}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.count}
                          </div>
                        </div>
                        <span className="text-[8px] font-black text-slate-300 rotate-45 mt-2">{item.hour}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Courier Productivity */}
                <div className="rounded-[2.5rem] bg-slate-900 text-white p-10 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-12 opacity-10"><ShieldAlert size={120} /></div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8">Elite Performers</h3>
                  <div className="space-y-6 relative z-10">
                    {data?.courierStats?.map((c: any, i: number) => (
                      <div key={i} className="flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-white/40">{i+1}</div>
                          <div>
                            <p className="font-bold text-sm">{c.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-black">Courier Unit</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-blue-400">{c.delivered}</p>
                          <p className="text-[8px] text-slate-500 uppercase font-black">Drops</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-5xl font-extrabold tracking-tight mb-2">Audit Trail.</h1>
                <p className="text-slate-500 font-medium">Immutable record of all system state changes.</p>
              </div>

              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" size={18} />
                <input 
                  type="text" 
                  placeholder="Filter by action, entity, or ID..." 
                  className="w-full bg-white border border-white rounded-2xl py-4 pl-14 pr-6 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                />
              </div>

              <div className="rounded-[2.5rem] bg-white border border-white overflow-hidden shadow-xl">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="px-8 py-5">Timestamp</th>
                      <th className="px-8 py-5">Actor</th>
                      <th className="px-8 py-5">Action</th>
                      <th className="px-8 py-5">Target</th>
                      <th className="px-8 py-5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {logs.filter(l => 
                      l.action.toLowerCase().includes(logSearch.toLowerCase()) || 
                      l.entity.toLowerCase().includes(logSearch.toLowerCase()) ||
                      l.actor_name.toLowerCase().includes(logSearch.toLowerCase())
                    ).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5 text-[10px] font-mono text-slate-400">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase">
                              {log.actor_name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-700">{log.actor_name}</p>
                              <p className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">{log.actor_role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{log.action}</span>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-xs font-bold text-slate-600">{log.entity}</p>
                          <p className="text-[9px] font-mono text-slate-400">{log.entity_id}</p>
                        </td>
                        <td className="px-8 py-5">
                          <pre className="text-[9px] font-mono text-slate-400 max-w-[200px] truncate">
                            {JSON.stringify(log.metadata)}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "staff" && (
            <div className="space-y-8">
              <div className="flex items-end justify-between">
                <div>
                  <h1 className="text-5xl font-extrabold tracking-tight mb-2">Staff Registry.</h1>
                  <p className="text-slate-500 font-medium">Create, edit, and manage operator identities.</p>
                </div>
                <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-[1.5rem] font-bold shadow-xl shadow-blue-500/30 hover:scale-105 transition-all"><UserPlus size={18} /> Add Staff Member</button>
              </div>

              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search name or employee ID..." 
                    className="w-full bg-white border border-white rounded-2xl py-4 pl-14 pr-6 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 bg-white rounded-2xl px-4 border border-white shadow-sm">
                  <Filter size={16} className="text-slate-400" />
                  <select 
                    className="bg-transparent border-none py-4 text-xs font-black uppercase tracking-widest text-slate-600 focus:ring-0"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="all">All Roles</option>
                    <option value="kurir">Kurir</option>
                    <option value="admin_gudang">Admin Gudang</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-[2.5rem] bg-white/70 backdrop-blur-2xl border border-white p-4 shadow-xl">
                <table className="w-full text-left border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="px-6 py-4">Personnel</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user: any) => (
                      <tr key={user.user_id} className="group bg-white/40 hover:bg-white transition-all rounded-3xl">
                        <td className="px-6 py-5 rounded-l-[1.5rem]">
                          <div className="flex items-center gap-4">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.full_name} className="h-12 w-12 rounded-2xl object-cover shadow-sm" />
                            ) : (
                              <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center font-bold text-slate-400 uppercase">{user.full_name.charAt(0)}</div>
                            )}
                            <div>
                              <p className="font-bold text-slate-800">{user.full_name}</p>
                              <p className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{user.employee_id || 'NO ID'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${user.role === 'superadmin' ? 'bg-slate-900 text-white' : user.role === 'admin_gudang' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{user.role}</span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`flex items-center gap-1.5 font-bold text-xs uppercase tracking-tighter ${user.is_suspended ? 'text-red-500' : 'text-green-600'}`}>
                            {user.is_suspended ? <Ban size={14} /> : <CheckCircle2 size={14} />} {user.is_suspended ? 'Suspended' : 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-5 rounded-r-[1.5rem] text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditModal(user)} className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors" title="Edit Profile"><Edit3 size={16} /></button>
                            <button onClick={() => handleToggleSuspend(user)} className={`p-2 rounded-xl transition-colors ${user.is_suspended ? 'bg-green-50 text-green-600 hover:bg-green-600 hover:text-white' : 'bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white'}`} title={user.is_suspended ? "Unsuspend" : "Suspend"}><Ban size={16} /></button>
                            <button onClick={() => handleDeleteUser(user.user_id)} className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors" title="Delete Account"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL (Create & Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-6">
          <div className="w-full max-w-2xl bg-white rounded-[3rem] p-10 shadow-2xl relative overflow-y-auto max-h-[90vh]">
            <button onClick={closeModal} className="absolute top-8 right-8 p-2 rounded-2xl hover:bg-slate-50"><X size={24} className="text-slate-400" /></button>
            <h2 className="text-3xl font-black tracking-tight mb-2">{editingUser ? 'Edit Personnel.' : 'New Staff Member.'}</h2>
            <p className="text-slate-500 mb-8 font-medium text-sm">Identity and terminal access authorization.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {editingUser && (
                <div className="flex flex-col items-center justify-center gap-4 mb-8">
                  <div className="relative group">
                    <div className="h-32 w-32 rounded-[2.5rem] bg-slate-100 overflow-hidden border-4 border-white shadow-xl">
                      {form.avatar_url ? (
                        <img src={form.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-3xl font-black text-slate-300">
                          {form.full_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera size={32} />
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                    </label>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {isUploading ? 'Uploading...' : 'Tap to change photo'}
                  </p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Personnel Name</label>
                  <input required value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} type="text" className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Employee ID / NIP</label>
                  <input value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} type="text" placeholder="NEKO-12345" className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
              </div>

              {!editingUser && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Email Address</label>
                    <input required value={form.email} onChange={e => setForm({...form, email: e.target.value})} type="email" className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Security Password</label>
                    <input required value={form.password} onChange={e => setForm({...form, password: e.target.value})} type="password" placeholder="••••••••" className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Terminal Role</label>
                  <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all">
                    <option value="kurir">Kurir / Courier</option>
                    <option value="admin_gudang">Admin Gudang</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Phone Number</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} type="tel" placeholder="+62..." className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Residential Address</label>
                <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} rows={3} className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all resize-none"></textarea>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-blue-500/30 hover:scale-[1.02] active:scale-95 transition-all">
                {editingUser ? 'Commit Changes' : 'Authorize Personnel'}
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
    <button onClick={onClick} className={`flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-[10px] font-black tracking-widest uppercase transition-all ${active ? "bg-blue-600 text-white shadow-xl shadow-blue-500/40 scale-[1.02]" : "text-slate-400 hover:bg-white hover:text-blue-600"}`}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function StatCard({ label, value, sub, icon }: any) {
  return (
    <div className="rounded-[2rem] bg-white border border-white p-8 shadow-sm hover:shadow-xl transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </div>
      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</h4>
      <p className="text-3xl font-black text-slate-800 mb-1">{value}</p>
      <p className="text-[10px] font-medium text-slate-400">{sub}</p>
    </div>
  );
}
