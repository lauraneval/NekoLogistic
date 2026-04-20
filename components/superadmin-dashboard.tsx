"use client";

import { useState } from "react";

type AnalyticsResponse = {
  metrics: {
    totalPackages: number;
    deliveredPackages: number;
    successRate: number;
  };
  recentActivities: Array<{
    id: number;
    action: string;
    entity: string;
    entity_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
};

type Props = {
  initialData: AnalyticsResponse;
};

export function SuperadminDashboard({ initialData }: Props) {
  const [data, setData] = useState<AnalyticsResponse>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userForm, setUserForm] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "admin_gudang",
  });
  const [createStatus, setCreateStatus] = useState<string | null>(null);

  async function loadAnalytics() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/superadmin/analytics", { cache: "no-store" });
      const json = await response.json();

      if (!response.ok || !json.ok) {
        setError(json?.error?.message ?? "Gagal mengambil analytics");
        return;
      }

      setData(json.data as AnalyticsResponse);
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateStatus(null);

    const response = await fetch("/api/superadmin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userForm),
    });

    const json = await response.json();

    if (!response.ok || !json.ok) {
      setCreateStatus(json?.error?.message ?? "Gagal membuat akun");
      return;
    }

    setCreateStatus(`Akun ${json.data.email} berhasil dibuat`);
    setUserForm({ email: "", password: "", fullName: "", role: "admin_gudang" });
    void loadAnalytics();
  }

  return (
    <section className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Total Paket</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{loading ? "..." : data.metrics.totalPackages}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Paket Sukses</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{loading ? "..." : data.metrics.deliveredPackages}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Success Rate</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{loading ? "..." : data.metrics.successRate}%</p>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-mono text-xl font-semibold text-slate-900">Daftarkan User Baru</h2>
          <form onSubmit={handleCreateUser} className="mt-4 space-y-3">
            <input
              value={userForm.fullName}
              onChange={(event) => setUserForm((prev) => ({ ...prev, fullName: event.target.value }))}
              placeholder="Nama Lengkap"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              value={userForm.email}
              onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
              type="email"
              placeholder="Email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              value={userForm.password}
              onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
              type="password"
              placeholder="Password minimal 10 karakter"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              minLength={10}
              required
            />
            <select
              value={userForm.role}
              onChange={(event) => setUserForm((prev) => ({ ...prev, role: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="admin_gudang">Admin Gudang</option>
              <option value="kurir">Kurir</option>
            </select>
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">
              Simpan User
            </button>
            {createStatus ? <p className="text-sm text-slate-600">{createStatus}</p> : null}
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-mono text-xl font-semibold text-slate-900">Activity Logs</h2>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            onClick={() => {
              void loadAnalytics();
            }}
            className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            Refresh Data
          </button>
          <div className="mt-3 max-h-80 space-y-3 overflow-auto pr-2">
            {data.recentActivities.map((log) => (
              <article key={log.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">{log.action}</p>
                <p className="text-sm text-slate-600">
                  {log.entity} {log.entity_id ?? ""}
                </p>
                <p className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString("id-ID")}</p>
              </article>
            ))}
            {!loading && data.recentActivities.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada log.</p>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}
