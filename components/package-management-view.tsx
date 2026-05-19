"use client";

import { useState, useEffect } from "react";
import { FilterIcon, ClockIcon, SuccessIcon, WarningIcon, DotsVerticalIcon, BoxIcon2, AlertTriangleIcon, CheckCircleIcon2 } from "./icons";

export function PackageManagementView() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State untuk Fitur Filter
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("ALL");

  useEffect(() => {
    async function fetchPackages() {
      try {
        // PERBAIKAN URL API DI SINI
        const res = await fetch("/api/admin/packages");
        
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const json = await res.json();
          if (json.ok) setPackages(json.data || []);
        } else {
          console.error("API merespons dengan HTML. Pastikan URL benar dan sesi login aktif.");
        }
      } catch (error) {
        console.error("Gagal menarik data packages:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPackages();
  }, []);

  // Filter Data dari API
  const filteredPackages = packages.filter(pkg => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "IN_TRANSIT") return pkg.status === "IN_TRANSIT" || pkg.status === "OUT_FOR_DELIVERY";
    if (activeFilter === "PENDING") return pkg.status === "PACKAGE_CREATED" || pkg.status === "IN_WAREHOUSE";
    if (activeFilter === "DELIVERED") return pkg.status === "DELIVERED";
    if (activeFilter === "DELAYED") return pkg.status === "DELAYED";
    return true;
  });

  const totalPackages = packages.length;
  const inTransit = packages.filter(p => p.status === "IN_TRANSIT" || p.status === "OUT_FOR_DELIVERY").length;
  const pending = packages.filter(p => p.status === "PACKAGE_CREATED" || p.status === "IN_WAREHOUSE").length;
  const delivered = packages.filter(p => p.status === "DELIVERED").length;
  const delayed = packages.filter(p => p.status === "DELAYED").length;

  if (loading) return <div className="animate-pulse p-4"><div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div><div className="grid grid-cols-4 gap-4 mb-8"><div className="h-24 bg-gray-200 rounded"></div><div className="h-24 bg-gray-200 rounded"></div><div className="h-24 bg-gray-200 rounded"></div><div className="h-24 bg-gray-200 rounded"></div></div><div className="h-64 bg-gray-200 rounded"></div></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Package Management</h1>
          <p className="text-gray-500 text-sm mt-1">Managing {totalPackages.toLocaleString()} active shipments across the kinetic network.</p>
        </div>
        <div className="flex gap-3 relative">
          
          <button 
            onClick={() => setFilterMenuOpen(!filterMenuOpen)}
            className={`px-4 py-2.5 rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-2 ${
              activeFilter !== "ALL" ? 'bg-blue-50 text-[#0047BB] border border-blue-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
            }`}
          >
            <FilterIcon /> 
            {activeFilter === "ALL" ? "Filter" : activeFilter.replace("_", " ")}
          </button>

          {filterMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <FilterOption label="All Packages" value="ALL" current={activeFilter} onClick={(v) => { setActiveFilter(v); setFilterMenuOpen(false); }} />
              <div className="h-px bg-gray-100 w-full"></div>
              <FilterOption label="In Transit" value="IN_TRANSIT" current={activeFilter} onClick={(v) => { setActiveFilter(v); setFilterMenuOpen(false); }} />
              <FilterOption label="Pending Consolidation" value="PENDING" current={activeFilter} onClick={(v) => { setActiveFilter(v); setFilterMenuOpen(false); }} />
              <FilterOption label="Delivered" value="DELIVERED" current={activeFilter} onClick={(v) => { setActiveFilter(v); setFilterMenuOpen(false); }} />
              <FilterOption label="Delayed" value="DELAYED" current={activeFilter} onClick={(v) => { setActiveFilter(v); setFilterMenuOpen(false); }} />
            </div>
          )}
          {/* TOMBOL + NEW SHIPMENT DIHAPUS DARI SINI */}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MiniStatCard title="IN TRANSIT" value={inTransit.toLocaleString()} subtext="~ 12% from last week" subtextColor="text-blue-600" />
        <MiniStatCard title="PENDING CONSOLIDATION" value={pending.toLocaleString()} subtext="Avg 4.2h wait time" subtextColor="text-gray-500" icon={<ClockIcon />} />
        <MiniStatCard title="DELIVERED TODAY" value={delivered.toLocaleString()} subtext="99.8% Success Rate" subtextColor="text-blue-500" icon={<SuccessIcon />} />
        <MiniStatCard title="AT RISK / DELAYED" value={delayed.toLocaleString()} subtext="Requires Attention" subtextColor="text-red-500" icon={<WarningIcon />} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col mt-4">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4 font-bold">Tracking Number</th>
                <th className="px-6 py-4 font-bold">Sender & Receiver</th>
                <th className="px-6 py-4 font-bold">Logistics Status</th>
                <th className="px-6 py-4 font-bold">Origin / Dest</th>
                <th className="px-6 py-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPackages.map((pkg) => <PackageTableRow key={pkg.id} pkg={pkg} />)}
              {filteredPackages.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-gray-400">
                    <p className="font-bold text-gray-500 mb-1">Tidak ada paket</p>
                    <p className="text-xs">Data paket dengan filter <span className="font-bold text-gray-600">{activeFilter.replace("_", " ")}</span> tidak ditemukan.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-white">
          <span className="text-xs text-gray-500 font-medium">Showing {filteredPackages.length} of {totalPackages} packages</span>
        </div>
      </div>
    </div>
  );
}

function FilterOption({ label, value, current, onClick }: { label: string, value: string, current: string, onClick: (val: string) => void }) {
  const isActive = current === value;
  return (
    <button 
      onClick={() => onClick(value)} 
      className={`w-full text-left px-4 py-3 text-xs font-bold transition flex items-center justify-between ${isActive ? 'bg-blue-50 text-[#0047BB]' : 'text-gray-600 hover:bg-gray-50'}`}
    >
      {label}
      {isActive && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
    </button>
  );
}

function MiniStatCard({ title, value, subtext, subtextColor, icon }: any) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">{value}</h3>
      <div className={`flex items-center gap-1 text-[10px] font-bold ${subtextColor}`}>{icon && <span className="w-3 h-3">{icon}</span>}{subtext}</div>
    </div>
  );
}

function PackageTableRow({ pkg }: { pkg: any }) {
  const getInitials = (name: string) => {
    if (!name) return "??";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };
  const senderName = pkg.sender_name || "Unknown Sender";
  const receiverName = pkg.receiver_name || "Unknown Receiver";
  const initials = getInitials(senderName);

  let statusColor = "bg-gray-100 text-gray-600";
  let statusDot = "bg-gray-400";
  let statusLabel = pkg.status ? pkg.status.replace(/_/g, " ") : "Unknown";

  if (pkg.status === "IN_TRANSIT" || pkg.status === "OUT_FOR_DELIVERY") { statusColor = "bg-blue-50 text-blue-700"; statusDot = "bg-blue-600"; }
  else if (pkg.status === "DELIVERED") { statusColor = "bg-blue-50 text-blue-700 border border-blue-200"; statusDot = "bg-blue-600"; }
  else if (pkg.status === "DELAYED") { statusColor = "bg-red-50 text-red-700"; statusDot = "bg-red-500"; }

  let ResiIcon = <BoxIcon2 />;
  if (pkg.status === "DELAYED") ResiIcon = <AlertTriangleIcon />;
  if (pkg.status === "DELIVERED") ResiIcon = <CheckCircleIcon2 />;

  return (
    <tr className="hover:bg-gray-50/50 transition-colors group">
      <td className="px-6 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-gray-400 w-5 h-5 flex-shrink-0">{ResiIcon}</div>
          <div><p className="text-sm font-bold text-gray-900">{pkg.resi || "-"}</p><p className="text-[10px] text-gray-500 mt-0.5">Standard Courier</p></div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${pkg.status === 'DELAYED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{initials}</div>
          <div className="flex flex-col"><span className="text-xs font-bold text-gray-900 leading-tight">{senderName}</span><span className="text-[10px] text-gray-400 leading-tight">↓</span><span className="text-xs font-medium text-gray-700 leading-tight">{receiverName}</span></div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold ${statusColor}`}><span className={`w-1.5 h-1.5 rounded-full ${statusDot}`}></span>{statusLabel}</span>
      </td>
      <td className="px-6 py-4">
        <p className="text-xs font-medium text-gray-800">Warehouse</p><p className="text-[10px] text-gray-400 mt-0.5">to {pkg.destination_city || "Unknown"}</p>
      </td>
      <td className="px-6 py-4 text-center">
        <button className="text-gray-400 hover:text-gray-900 transition-colors p-1"><DotsVerticalIcon /></button>
      </td>
    </tr>
  );
}