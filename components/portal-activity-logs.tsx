"use client";

import { useState, useMemo, useEffect } from "react";

export type ActivityLogEntry = {
  id: number;
  actor_id: string | null;
  actor_name: string;
  actor_role: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type Props = {
  logs: ActivityLogEntry[];
};

type ActionMeta = { label: string; bg: string; text: string };

const ACTION_META: Record<string, ActionMeta> = {
  CREATE_PACKAGE:        { label: "Create Package",  bg: "bg-emerald-100", text: "text-emerald-700" },
  UPDATE_PACKAGE:        { label: "Update Package",  bg: "bg-blue-100",    text: "text-blue-700"    },
  UPDATE_PACKAGE_STATUS: { label: "Update Status",   bg: "bg-indigo-100",  text: "text-indigo-700"  },
  DELETE_PACKAGE:        { label: "Delete Package",  bg: "bg-red-100",     text: "text-red-700"     },
  CREATE_USER:           { label: "Create User",     bg: "bg-emerald-100", text: "text-emerald-700" },
  DELETE_USER:           { label: "Delete User",     bg: "bg-red-100",     text: "text-red-700"     },
  UPDATE_USER:           { label: "Update User",     bg: "bg-blue-100",    text: "text-blue-700"    },
  CREATE_BAG:            { label: "Create Bag",      bg: "bg-amber-100",   text: "text-amber-700"   },
  ASSIGN_COURIER:        { label: "Assign Courier",  bg: "bg-violet-100",  text: "text-violet-700"  },
  DELIVER_PACKAGE:       { label: "Deliver Package", bg: "bg-teal-100",    text: "text-teal-700"    },
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const DATE_FILTERS = [
  { value: "all", label: "All Time" },
  { value: "1d",  label: "Today" },
  { value: "7d",  label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
] as const;
type DateFilter = (typeof DATE_FILTERS)[number]["value"];

function actionMeta(action: string): ActionMeta {
  return ACTION_META[action] ?? { label: action, bg: "bg-slate-100", text: "text-slate-600" };
}
function roleColor(role: string | null) {
  if (role === "superadmin")  return "bg-violet-100 text-violet-700";
  if (role === "admin_gudang") return "bg-indigo-100 text-indigo-700";
  if (role === "kurir")       return "bg-amber-100  text-amber-700";
  return "bg-slate-100 text-slate-500";
}
function roleLabel(role: string | null) {
  if (role === "superadmin")  return "Superadmin";
  if (role === "admin_gudang") return "Admin";
  if (role === "kurir")       return "Kurir";
  return "—";
}
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
function formatTime(iso: string) {
  const date = new Date(iso);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1)  return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `${diffH}h ago`;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
function formatAbsolute(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function MetadataChips({ meta }: { meta: Record<string, unknown> }) {
  const entries = Object.entries(meta).filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (entries.length === 0) return <span className="text-slate-400 text-xs">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {entries.slice(0, 3).map(([k, v]) => (
        <span key={k} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
          <span className="font-medium text-slate-500">{k}:</span> {String(v)}
        </span>
      ))}
      {entries.length > 3 && (
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-400">
          +{entries.length - 3} more
        </span>
      )}
    </span>
  );
}

function buildPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [];
  const addPage = (n: number) => { if (!pages.includes(n)) pages.push(n); };
  addPage(1);
  if (current > 3) pages.push("…");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) addPage(i);
  if (current < total - 2) pages.push("…");
  addPage(total);
  return pages;
}

function Pagination({
  page, totalPages, pageSize, totalItems,
  onPage, onPageSize,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPage: (p: number) => void;
  onPageSize: (s: PageSize) => void;
}) {
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, totalItems);
  const pages = buildPageNumbers(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3">
      {/* Entry range */}
      <p className="text-xs text-slate-500 shrink-0">
        Showing{" "}
        <span className="font-semibold text-slate-700">{from}–{to}</span>
        {" "}of{" "}
        <span className="font-semibold text-slate-700">{totalItems}</span>
        {" "}entries
      </p>

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {/* Prev */}
        <PageBtn
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          label="‹"
          title="Previous page"
        />

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-1 text-slate-400 text-xs select-none">…</span>
          ) : (
            <PageBtn
              key={p}
              onClick={() => onPage(p)}
              active={p === page}
              label={String(p)}
            />
          ),
        )}

        {/* Next */}
        <PageBtn
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          label="›"
          title="Next page"
        />
      </div>

      {/* Rows per page */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-slate-400">Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value) as PageSize)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-[#1A3CA8] focus:ring-1 focus:ring-[#1A3CA8]"
        >
          {PAGE_SIZE_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function PageBtn({
  onClick, disabled, active, label, title,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  label: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`min-w-7 h-7 rounded-md px-1.5 text-xs font-medium transition-colors
        ${active
          ? "bg-[#1A3CA8] text-white shadow-sm"
          : disabled
            ? "text-slate-300 cursor-not-allowed"
            : "text-slate-600 hover:bg-slate-200"
        }`}
    >
      {label}
    </button>
  );
}

export function PortalActivityLogs({ logs }: Props) {
  const [search,       setSearch]       = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [dateFilter,   setDateFilter]   = useState<DateFilter>("all");
  const [page,         setPage]         = useState(1);
  const [pageSize,     setPageSize]     = useState<PageSize>(25);
  const [hoveredRow,   setHoveredRow]   = useState<number | null>(null);

  const uniqueActions  = useMemo(
    () => ["all", ...Array.from(new Set(logs.map((l) => l.action))).sort()],
    [logs],
  );
  const uniqueEntities = useMemo(
    () => ["all", ...Array.from(new Set(logs.map((l) => l.entity))).sort()],
    [logs],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    const cutoff: Record<DateFilter, number> = {
      all:  0,
      "1d": now - 86_400_000,
      "7d": now - 7  * 86_400_000,
      "30d": now - 30 * 86_400_000,
    };
    return logs.filter((log) => {
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (entityFilter !== "all" && log.entity !== entityFilter) return false;
      if (dateFilter !== "all" && new Date(log.created_at).getTime() < cutoff[dateFilter]) return false;
      if (q) {
        const hay = [log.actor_name, log.action, log.entity, log.entity_id ?? "", JSON.stringify(log.metadata)]
          .join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, search, actionFilter, entityFilter, dateFilter]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [search, actionFilter, entityFilter, dateFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const stats = useMemo(() => {
    const actors = new Set(logs.filter((l) => l.actor_id).map((l) => l.actor_id)).size;
    const today  = logs.filter((l) => Date.now() - new Date(l.created_at).getTime() < 86_400_000).length;
    const counts = logs.reduce<Record<string, number>>((acc, l) => {
      acc[l.action] = (acc[l.action] ?? 0) + 1;
      return acc;
    }, {});
    const topAction = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return { actors, today, topAction };
  }, [logs]);

  function clearFilters() {
    setSearch("");
    setActionFilter("all");
    setEntityFilter("all");
    setDateFilter("all");
  }

  const hasActiveFilters = search || actionFilter !== "all" || entityFilter !== "all" || dateFilter !== "all";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Activity Logs</h1>
          <p className="mt-0.5 text-sm text-slate-500">Audit trail of all system actions</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
          {filtered.length} / {logs.length} entries
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Logs"       value={logs.length.toLocaleString()}    icon="📋" />
        <StatCard label="Unique Actors"    value={stats.actors.toLocaleString()}   icon="👤" />
        <StatCard
          label="Today's Activity"
          value={stats.today.toLocaleString()}
          icon="📅"
          sub={stats.topAction ? `Most common: ${actionMeta(stats.topAction[0]).label}` : undefined}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="relative flex-1 min-w-45">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actor, action, resi…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-[#1A3CA8] focus:ring-1 focus:ring-[#1A3CA8]"
          />
        </div>

        <Select
          value={actionFilter}
          onChange={setActionFilter}
          options={uniqueActions.map((a) => ({ value: a, label: a === "all" ? "All Actions" : actionMeta(a).label }))}
        />
        <Select
          value={entityFilter}
          onChange={setEntityFilter}
          options={uniqueEntities.map((e) => ({ value: e, label: e === "all" ? "All Entities" : e }))}
        />
        <Select
          value={dateFilter}
          onChange={(v) => setDateFilter(v as DateFilter)}
          options={DATE_FILTERS.map((f) => ({ value: f.value, label: f.label }))}
        />

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-40">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <p className="text-sm font-medium">No logs match your filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 w-36">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Entity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Reference</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map((log) => {
                    const meta    = actionMeta(log.action);
                    const ref     = (log.metadata?.resi as string | undefined) ?? log.entity_id;
                    const hovered = hoveredRow === log.id;
                    return (
                      <tr
                        key={log.id}
                        onMouseEnter={() => setHoveredRow(log.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        className={`transition-colors ${hovered ? "bg-slate-50" : "bg-white"}`}
                      >
                        {/* Time */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className="text-slate-700 font-medium text-xs cursor-default"
                            title={formatAbsolute(log.created_at)}
                          >
                            {formatTime(log.created_at)}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(log.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </td>

                        {/* Actor */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1A3CA8]/10 text-[10px] font-bold text-[#1A3CA8]">
                              {log.actor_id ? initials(log.actor_name) : "SY"}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-slate-800 max-w-30">
                                {log.actor_name}
                              </p>
                              <span className={`rounded px-1.5 py-px text-[10px] font-medium ${roleColor(log.actor_role)}`}>
                                {roleLabel(log.actor_role)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.bg} ${meta.text}`}>
                            {meta.label}
                          </span>
                        </td>

                        {/* Entity */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 capitalize">
                            {log.entity}
                          </span>
                        </td>

                        {/* Reference */}
                        <td className="px-4 py-3">
                          {ref ? (
                            <span className="font-mono text-xs text-slate-600 bg-slate-100 rounded px-1.5 py-0.5">
                              {String(ref).length > 20 ? String(ref).slice(0, 8) + "…" : ref}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>

                        {/* Details */}
                        <td className="px-4 py-3 max-w-xs">
                          <MetadataChips meta={log.metadata} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              page={safePage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPage={setPage}
              onPageSize={(s) => setPageSize(s)}
            />
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, sub }: {
  label: string; value: string; icon: string; sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

function Select({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-[#1A3CA8] focus:ring-1 focus:ring-[#1A3CA8]"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
