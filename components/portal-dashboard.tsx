"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type DailyShipment = { day: string; count: number };

type RecentActivity = {
  id: number | string;
  resi: string | null;
  receiver_name: string | null;
  origin: string | null;
  destination: string | null;
  status: string;
  updated_at: string;
};

type DashboardData = {
  totalPackages: number;
  inTransit: number;
  delivered: number;
  successRate: number;
  dailyShipments: DailyShipment[];
  recentActivities: RecentActivity[];
};

type Props = { data: DashboardData };

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    IN_TRANSIT: { label: "In Transit", cls: "bg-blue-100 text-blue-700" },
    DELIVERED: { label: "Delivered", cls: "bg-green-100 text-green-700" },
    PACKAGE_CREATED: { label: "Created", cls: "bg-slate-100 text-slate-600" },
    IN_WAREHOUSE: { label: "In Warehouse", cls: "bg-yellow-100 text-yellow-700" },
    OUT_FOR_DELIVERY: { label: "Out for Delivery", cls: "bg-orange-100 text-orange-700" },
    FAILED_DELIVERY: { label: "Delayed", cls: "bg-red-100 text-red-700" },
  };
  const cfg = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {cfg.label}
    </span>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) > 1 ? "s" : ""} ago`;
}

export function PortalDashboard({ data }: Props) {
  const [activeDay, setActiveDay] = useState<string | null>(null);

  const deliveredPct = data.totalPackages > 0
    ? Math.round((data.delivered / data.totalPackages) * 100)
    : 0;
  const inTransitPct = data.totalPackages > 0
    ? Math.round((data.inTransit / data.totalPackages) * 100)
    : 0;
  const delayedPct = Math.max(0, 100 - deliveredPct - inTransitPct);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Logistics Overview</h1>
          <p className="mt-1 text-sm text-slate-500">Real-time status of current supply chain operations.</p>
        </div>
        <div className="flex gap-3">
          <a
            href="packages/new"
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
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A3CA8" strokeWidth="2">
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-green-500">+12.5%</span>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Total Packages</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{data.totalPackages.toLocaleString()}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A3CA8" strokeWidth="2">
                <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-green-500">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              LIVE
            </span>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Packages in Transit</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{data.inTransit.toLocaleString()}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <span className="text-xs text-slate-400">Global</span>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Delivered Packages</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{data.delivered.toLocaleString()}</p>
        </div>
      </div>

      {/* Chart + Distribution */}
      <div className="grid grid-cols-3 gap-4">
        {/* Bar chart */}
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Daily Shipments</h2>
            <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
              Last 7 Days
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.dailyShipments} barSize={28}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "#f1f5f9" }}
                contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
              />
              <Bar dataKey="count" name="Shipments" radius={[4, 4, 0, 0]}>
                {data.dailyShipments.map((entry) => (
                  <Cell
                    key={entry.day}
                    fill={activeDay === entry.day ? "#1A3CA8" : "#BFCFFF"}
                    onMouseEnter={() => setActiveDay(entry.day)}
                    onMouseLeave={() => setActiveDay(null)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status distribution */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Status Distribution</h2>
          <div className="flex items-center justify-center">
            <div className="relative flex h-36 w-36 items-center justify-center rounded-2xl border-4 border-[#1A3CA8] bg-[#1A3CA8]">
              <div className="text-center text-white">
                <p className="text-3xl font-bold">{data.successRate.toFixed(0)}%</p>
                <p className="text-[10px] font-semibold uppercase tracking-widest opacity-80">On Time</p>
              </div>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#1A3CA8]" />
                <span className="text-slate-600">Delivered</span>
              </div>
              <span className="font-semibold text-slate-800">{deliveredPct}%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                <span className="text-slate-600">In Transit</span>
              </div>
              <span className="font-semibold text-slate-800">{inTransitPct}%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                <span className="text-slate-600">Delayed</span>
              </div>
              <span className="font-semibold text-slate-800">{delayedPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Recent Logistics Activity</h2>
          <a href="packages" className="text-xs font-semibold text-[#1A3CA8] hover:underline">
            View All Shipments
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Package ID</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Origin/Destination</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Last Update</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.recentActivities.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-semibold text-[#1A3CA8]">#{item.resi ?? "—"}</span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-800">
                      {item.origin ?? "Warehouse"}{" "}
                      <span className="text-slate-400">→</span>{" "}
                      {item.destination ?? item.receiver_name ?? "—"}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-5 py-4 text-slate-500">{timeAgo(item.updated_at)}</td>
                  <td className="px-5 py-4">
                    <button className="text-slate-400 hover:text-slate-700">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              {data.recentActivities.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                    No recent activity
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
