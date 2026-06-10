"use client";

import { useState } from "react";

type UserItem = {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  status: "active" | "offline" | "restricted";
};

type Props = {
  users: UserItem[];
  stats: {
    activeOperators: number;
    systemAdmins: number;
    courierFleet: number;
    authExceptions: number;
    onDutyCount: number;
  };
};

const ROLE_BADGE: Record<string, string> = {
  superadmin: "bg-purple-100 text-purple-700",
  admin_gudang: "bg-blue-100 text-blue-700",
  kurir: "bg-green-100 text-green-700",
};

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Admin",
  admin_gudang: "Warehouse",
  kurir: "Courier",
};

const STATUS_CONFIG = {
  active: { cls: "bg-green-500", label: "Active" },
  offline: { cls: "bg-slate-300", label: "Offline" },
  restricted: { cls: "bg-red-500", label: "Restricted" },
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-200 text-blue-800",
  "bg-green-200 text-green-800",
  "bg-purple-200 text-purple-800",
  "bg-orange-200 text-orange-800",
  "bg-pink-200 text-pink-800",
];

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

export function PortalUsers({ users: initialUsers, stats }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ email: "", password: "", fullName: "", role: "kurir" });
  const [addStatus, setAddStatus] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ fullName: "", role: "kurir" });
  const [search, setSearch] = useState("");

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddStatus(null);
    try {
      const res = await fetch("/api/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: addForm.email.trim().toLowerCase(),
          password: addForm.password,
          fullName: addForm.fullName.trim(),
          role: addForm.role,
        }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setAddStatus("ok:User created successfully.");
        setAddForm({ email: "", password: "", fullName: "", role: "kurir" });
        setUsers((prev) => [
          {
            user_id: json.data.user_id ?? crypto.randomUUID(),
            full_name: addForm.fullName.trim(),
            email: addForm.email.trim().toLowerCase(),
            role: addForm.role,
            created_at: new Date().toISOString(),
            status: "active",
          },
          ...prev,
        ]);
        setTimeout(() => { setShowAddForm(false); setAddStatus(null); }, 1500);
      } else {
        const base = json?.error?.message ?? "Failed to create user. Please try again.";
        const fieldErrors = json?.error?.details?.fieldErrors as Record<string, string[]> | undefined;
        if (fieldErrors && Object.keys(fieldErrors).length > 0) {
          const msgs = Object.entries(fieldErrors)
            .map(([f, errs]) => `${f}: ${(errs as string[]).join(", ")}`)
            .join(" · ");
          setAddStatus("err:" + base + " — " + msgs);
        } else {
          setAddStatus("err:" + base);
        }
      }
    } catch {
      setAddStatus("err:Network error. Please check your connection and try again.");
    }
    setAddLoading(false);
  }

  function startEdit(user: UserItem) {
    setEditingId(user.user_id);
    setEditForm({ fullName: user.full_name, role: user.role });
  }

  async function handleEdit(userId: string) {
    const res = await fetch("/api/superadmin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, fullName: editForm.fullName, role: editForm.role }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, full_name: editForm.fullName, role: editForm.role } : u));
    }
    setEditingId(null);
  }

  async function handleDelete(userId: string, name: string) {
    if (!confirm(`Delete user "${name}"?`)) return;
    const res = await fetch(`/api/superadmin/users?userId=${userId}`, { method: "DELETE" });
    if (res.ok) setUsers((prev) => prev.filter((u) => u.user_id !== userId));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage organizational access and roles.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 rounded-lg bg-[#1A3CA8] px-4 py-2 text-sm font-medium text-white hover:bg-[#1530a0] transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          Add User
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active Operators", value: stats.activeOperators, sub: "+4 this week", subCls: "text-green-500" },
          { label: "System Admins", value: stats.systemAdmins, sub: "Fixed capacity", subCls: "text-slate-400" },
          { label: "Courier Fleet", value: stats.courierFleet, sub: `${stats.onDutyCount} currently on duty`, subCls: "text-blue-500" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{card.label}</p>
            <p className={`mt-1 text-3xl font-bold : "text-slate-900"}`}>{String(card.value).padStart(2, "0")}</p>
            <p className={`mt-1 text-xs ${card.subCls}`}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Add user modal */}
      {showAddForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Add New User</h2>
            <button onClick={() => { setShowAddForm(false); setAddStatus(null); }} className="text-slate-400 hover:text-slate-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          {addStatus && (
            <div
              className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
                addStatus.startsWith("ok:") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}
            >
              {addStatus.startsWith("ok:") || addStatus.startsWith("err:")
                ? addStatus.slice(3)
                : addStatus}
            </div>
          )}
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
            {[
              { label: "Full Name", field: "fullName", type: "text", placeholder: "John Doe" },
              { label: "Email Address", field: "email", type: "email", placeholder: "john@company.com" },
              { label: "Password (min 10 chars)", field: "password", type: "password", placeholder: "••••••••••" },
            ].map((f) => (
              <div key={f.field}>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">{f.label}</label>
                <input
                  type={f.type}
                  value={addForm[f.field as keyof typeof addForm]}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, [f.field]: e.target.value }))}
                  placeholder={f.placeholder}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1A3CA8] focus:ring-1 focus:ring-[#1A3CA8]"
                />
              </div>
            ))}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Access Role</label>
              <select
                value={addForm.role}
                onChange={(e) => setAddForm((prev) => ({ ...prev, role: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1A3CA8] focus:ring-1 focus:ring-[#1A3CA8]"
              >
                <option value="admin_gudang">Warehouse Admin</option>
                <option value="kurir">Courier</option>
              </select>
            </div>
            <div className="col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => setShowAddForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={addLoading} className="rounded-lg bg-[#1A3CA8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1530a0] disabled:opacity-60">
                {addLoading ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Directory Listing */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Directory Listing</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm outline-none focus:border-[#1A3CA8] focus:ring-1 focus:ring-[#1A3CA8]"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Name & Identity</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Email Address</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Access Role</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Network Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((user) => {
                const status = STATUS_CONFIG[user.status] ?? STATUS_CONFIG.offline;
                const isEditing = editingId === user.user_id;
                return (
                  <tr key={user.user_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(user.full_name)}`}>
                          {initials(user.full_name)}
                        </span>
                        {isEditing ? (
                          <input
                            value={editForm.fullName}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, fullName: e.target.value }))}
                            className="rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-[#1A3CA8]"
                          />
                        ) : (
                          <span className="font-semibold text-slate-800">{user.full_name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{user.email}</td>
                    <td className="px-5 py-4">
                      {isEditing ? (
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
                          className="rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#1A3CA8]"
                        >
                          <option value="admin_gudang">Warehouse</option>
                          <option value="kurir">Courier</option>
                        </select>
                      ) : (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${ROLE_BADGE[user.role] ?? "bg-slate-100 text-slate-600"}`}>
                          {ROLE_LABEL[user.role] ?? user.role}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className={`h-2 w-2 rounded-full ${status.cls}`} />
                        <span className={user.status === "restricted" ? "font-semibold text-red-600" : "text-slate-600"}>
                          {status.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button onClick={() => handleEdit(user.user_id)} className="text-xs font-semibold text-green-600 hover:underline">Save</button>
                            <button onClick={() => setEditingId(null)} className="text-xs text-slate-400 hover:underline">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(user)} className="text-slate-400 hover:text-[#1A3CA8]">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                            </button>
                            <button onClick={() => handleDelete(user.user_id, user.full_name)} className="text-slate-400 hover:text-red-500">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-5 py-3">
          <p className="text-xs text-slate-400">Showing {filtered.length} of {users.length} total kinetic agents</p>
        </div>
      </div>

      {/* Permission matrix */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { title: "Admin Matrix", color: "text-[#1A3CA8]", icon: "🛡", desc: "Full system governance. Access to financial records, user provisioning, and network-wide tracking overrides." },
          { title: "Warehouse Ops", color: "text-blue-600", icon: "🏭", desc: "Inventory management and consolidation tools. No access to user management or billing modules." },
          { title: "Courier Node", color: "text-slate-700", icon: "🚚", desc: "Last-mile delivery tracking and confirmation portals. Read-only access to specific package routing data." },
        ].map((m) => (
          <div key={m.title} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className={`mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${m.color}`}>
              <span>{m.icon}</span> {m.title}
            </div>
            <p className="text-xs text-slate-500">{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
