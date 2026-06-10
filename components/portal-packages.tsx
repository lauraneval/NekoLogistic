"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { packageStatusLabels, type PackageStatus } from "@/lib/types";

type PackageItem = {
  id: string;
  resi: string;
  package_name: string | null;
  sender_name: string;
  receiver_name: string;
  receiver_address: string;
  destination_city: string | null;
  weight_kg: number | string;
  status: PackageStatus;
  created_at: string;
};

type Props = {
  packages: PackageItem[];
  basePath: string;
};

const STATUS_COLORS: Record<string, string> = {
  IN_TRANSIT: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-green-100 text-green-700",
  PACKAGE_CREATED: "bg-slate-100 text-slate-600",
  IN_WAREHOUSE: "bg-yellow-100 text-yellow-700",
  OUT_FOR_DELIVERY: "bg-orange-100 text-orange-700",
  FAILED_DELIVERY: "bg-red-100 text-red-700",
};

const STATUS_DOT: Record<string, string> = {
  IN_TRANSIT: "bg-blue-500",
  DELIVERED: "bg-green-500",
  PACKAGE_CREATED: "bg-slate-400",
  IN_WAREHOUSE: "bg-yellow-500",
  OUT_FOR_DELIVERY: "bg-orange-500",
  FAILED_DELIVERY: "bg-red-500",
};

const PKG_ICON: Record<string, string> = {
  IN_TRANSIT: "text-blue-500",
  DELIVERED: "text-green-500",
  PACKAGE_CREATED: "text-slate-400",
  IN_WAREHOUSE: "text-yellow-500",
  OUT_FOR_DELIVERY: "text-orange-500",
  FAILED_DELIVERY: "text-red-500",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const BG_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-green-100 text-green-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
];

function senderColor(name: string) {
  const idx = name.charCodeAt(0) % BG_COLORS.length;
  return BG_COLORS[idx];
}

const PAGE_SIZE = 25;

export function PortalPackages({ packages, basePath }: Props) {
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [page, setPage] = useState(1);

  // Sync search state when URL ?q param changes (e.g. navigated from top-bar search)
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setSearch(q);
    if (q) setPage(1);
  }, [searchParams]);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [localPackages, setLocalPackages] = useState(packages);

  const filtered = localPackages.filter((pkg) => {
    const matchStatus = filter === "ALL" || pkg.status === filter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      pkg.resi.toLowerCase().includes(q) ||
      pkg.receiver_name.toLowerCase().includes(q) ||
      pkg.sender_name.toLowerCase().includes(q) ||
      (pkg.destination_city ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    inTransit: localPackages.filter((p) => ["IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(p.status)).length,
    pending: localPackages.filter((p) => ["PACKAGE_CREATED", "IN_WAREHOUSE"].includes(p.status)).length,
    delivered: localPackages.filter((p) => p.status === "DELIVERED").length,
    atRisk: localPackages.filter((p) => p.status === "FAILED_DELIVERY").length,
  };

  async function handleDelete(id: string, resi: string) {
    if (!confirm(`Delete package ${resi}?`)) return;
    const res = await fetch(`/api/admin/packages?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setLocalPackages((prev) => prev.filter((p) => p.id !== id));
    }
    setActionMenu(null);
  }

  async function handleStatusChange(id: string, status: string) {
    setUpdating(id);
    const res = await fetch("/api/admin/packages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setLocalPackages((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: status as PackageStatus } : p)),
      );
    }
    setUpdating(null);
    setActionMenu(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Package Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Managing {localPackages.length.toLocaleString()} active shipments.
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href={`${basePath}/packages/new`}
            className="flex items-center gap-2 rounded-lg bg-[#1A3CA8] px-4 py-2 text-sm font-medium text-white hover:bg-[#1530a0] transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Shipment
          </a>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "In Transit", value: stats.inTransit, sub: "↑ 12% from last week", subCls: "text-green-500", border: "border-l-4 border-l-blue-500" },
          { label: "Pending Consolidation", value: stats.pending, sub: "Avg 4.2h wait time", subCls: "text-slate-400", border: "" },
          { label: "Delivered Today", value: stats.delivered, sub: "99.8% Success Rate", subCls: "text-green-500", border: "" },
          { label: "At Risk / Delayed", value: stats.atRisk, sub: "Requires Attention", subCls: "text-red-500", border: "" },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl border border-slate-200 bg-white p-5 ${card.border}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{card.label}</p>
            <p className={`mt-1 text-3xl font-bold ${card.value > 0 && card.label.includes("Risk") ? "text-red-600" : "text-slate-900"}`}>
              {card.value}
            </p>
            <p className={`mt-1 text-xs ${card.subCls}`}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Quick find package..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none focus:border-[#1A3CA8] focus:ring-1 focus:ring-[#1A3CA8]"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Tracking Number</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Sender & Receiver</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Logistics Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Origin / Dest</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.map((pkg) => (
                <tr key={pkg.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 ${PKG_ICON[pkg.status]}`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                          <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
                        </svg>
                      </span>
                      <div>
                        <p className="font-semibold text-[#1A3CA8]">{pkg.resi}</p>
                        <p className="text-xs text-slate-400">{pkg.package_name ?? "Standard Courier"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${senderColor(pkg.sender_name)}`}>
                        {initials(pkg.sender_name)}
                      </span>
                      <div>
                        <p className="font-medium text-slate-800">{pkg.sender_name}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /></svg>
                          {pkg.receiver_name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[pkg.status] ?? "bg-slate-100 text-slate-600"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[pkg.status] ?? "bg-slate-400"}`} />
                      {packageStatusLabels[pkg.status as PackageStatus] ?? pkg.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-slate-700">Warehouse</p>
                    <p className="text-xs text-slate-400">to {pkg.destination_city ?? pkg.receiver_address}</p>
                  </td>
                  <td className="px-5 py-4 relative">
                    <button
                      onClick={() => setActionMenu(actionMenu === pkg.id ? null : pkg.id)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="12" cy="19" r="1.5" />
                      </svg>
                    </button>
                    {actionMenu === pkg.id && (
                      <div className="absolute right-4 top-8 z-10 w-52 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
                        <p className="px-3 pt-1 pb-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Update Status</p>
                        {(["IN_WAREHOUSE", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED_DELIVERY"] as PackageStatus[]).map((s) => (
                          <button
                            key={s}
                            disabled={updating === pkg.id || pkg.status === s}
                            onClick={() => handleStatusChange(pkg.id, s)}
                            className="w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                          >
                            {packageStatusLabels[s]}
                          </button>
                        ))}
                        <div className="my-1 border-t border-slate-100" />
                        <button
                          onClick={() => handleDelete(pkg.id, pkg.resi)}
                          className="w-full px-3 py-1.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete Package
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    No packages found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <p className="text-xs text-slate-500">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()} packages
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`flex h-7 w-7 items-center justify-center rounded border text-xs font-medium transition ${
                  page === p
                    ? "border-[#1A3CA8] bg-[#1A3CA8] text-white"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {p}
              </button>
            ))}
            {totalPages > 5 && (
              <span className="px-1 text-slate-400">...</span>
            )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Footer status bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-2">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          Live Updates Active · Last sync: just now
        </div>
        <div className="flex gap-4">
          <button className="hover:text-slate-600 transition">Export Report</button>
          <button className="hover:text-slate-600 transition">Bulk Actions</button>
        </div>
      </div>
    </div>
  );
}
