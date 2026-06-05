"use client";

import { useState, useEffect } from "react";
// Pastikan icon-icon ini tersedia di file Anda, atau ganti dengan icon dari library seperti lucide-react / heroicons
import { FilterIcon, ClockIcon, SuccessIcon, WarningIcon } from "./icons"; 

export function PackageManagementView() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("Semua");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchPackages() {
      try {
        const res = await fetch("/api/admin/packages");
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const json = await res.json();
          if (json.ok) setPackages(json.data || []);
        } else {
          console.error("API merespons dengan HTML.");
        }
      } catch (error) {
        console.error("Gagal menarik data packages:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPackages();
  }, []);

  // Filter Data
  const filteredPackages = packages.filter(pkg => {
    if (activeFilter === "Semua") return true;
    return pkg.status === activeFilter;
  });

  // Kalkulasi Statistik (Sesuaikan kondisi statusnya dengan data riil Anda)
  const totalPackages = packages.length;
  const inTransit = packages.filter(p => p.status === "Proses pengiriman").length;
  const pending = packages.filter(p => p.status === "Dikemas" || p.status === "Di bagging").length;
  const delivered = packages.filter(p => p.status === "Sudah terkirim").length;
  const delayed = packages.filter(p => p.status === "Delayed").length;

  if (loading) {
    return (
      <div className="animate-pulse p-6">
        <div className="h-12 bg-gray-200 rounded-md w-full mb-8"></div>
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="h-32 bg-gray-200 rounded-xl"></div>
          <div className="h-32 bg-gray-200 rounded-xl"></div>
          <div className="h-32 bg-gray-200 rounded-xl"></div>
          <div className="h-32 bg-gray-200 rounded-xl"></div>
        </div>
        <div className="h-64 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900 pb-10">
      {/* 1. TOP NAVBAR (Search & Admin Controls) */}
      <div className="flex items-center justify-between px-6 py-4 mb-4">
        {/* Search Bar */}
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm"
            placeholder="Search tracking ID or packages..."
          />
        </div>

        {/* Admin Controls */}
        <div className="flex items-center gap-4">
          <button className="text-gray-400 hover:text-gray-600 transition">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <button className="text-gray-400 hover:text-gray-600 transition">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <div className="h-6 w-px bg-gray-200"></div>
          <span className="font-bold text-[#0047BB]">Admin Control</span>
          <button className="px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition">
            Logout
          </button>
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* 2. HEADER & FILTER */}
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1E293B]">Package Management</h1>
            <p className="text-gray-500 text-sm mt-1">Managing {totalPackages} active shipments across the kinetic network.</p>
          </div>
          <div className="relative">
            <button 
              onClick={() => setFilterMenuOpen(!filterMenuOpen)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-2 hover:bg-gray-50 text-gray-700"
            >
              <FilterIcon /> 
              {activeFilter === "Semua" ? "Filter" : activeFilter}
            </button>
            
            {/* Opsi Dropdown Filter (Opsional jika ingin difungsikan) */}
            {filterMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-30 overflow-hidden">
                <FilterOption label="Semua Paket" value="Semua" current={activeFilter} onClick={(v) => { setActiveFilter(v); setFilterMenuOpen(false); }} />
                <FilterOption label="Siap Dikirim" value="Siap dikirim" current={activeFilter} onClick={(v) => { setActiveFilter(v); setFilterMenuOpen(false); }} />
                <FilterOption label="Proses Pengiriman" value="Proses pengiriman" current={activeFilter} onClick={(v) => { setActiveFilter(v); setFilterMenuOpen(false); }} />
              </div>
            )}
          </div>
        </header>

        {/* 3. STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MiniStatCard 
            title="IN TRANSIT" 
            value={inTransit.toString()} 
            subtext="~ 12% from last week" 
            subtextColor="text-blue-600" 
          />
          <MiniStatCard 
            title="PENDING CONSOLIDATION" 
            value={pending.toString()} 
            subtext="Avg 4.2h wait time" 
            subtextColor="text-gray-500" 
            icon={<ClockIcon />} 
          />
          <MiniStatCard 
            title="DELIVERED TODAY" 
            value={delivered.toString()} 
            subtext="99.8% Success Rate" 
            subtextColor="text-blue-500" 
            icon={<SuccessIcon />} 
          />
          <MiniStatCard 
            title="AT RISK / DELAYED" 
            value={delayed.toString()} 
            subtext="Requires Attention" 
            subtextColor="text-red-500" 
            icon={<WarningIcon />} 
          />
        </div>

        {/* 4. TABEL DATA */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Seluruh Package</h2>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition"
            >
              Refresh
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white border-b border-gray-100 text-xs font-bold text-gray-500 uppercase">
                  <tr>
                    <th className="px-6 py-4">RESI</th>
                    <th className="px-6 py-4">PAKET</th>
                    <th className="px-6 py-4">ALAMAT</th>
                    <th className="px-6 py-4">KOTA</th>
                    <th className="px-6 py-4">BERAT</th>
                    <th className="px-6 py-4">STATUS</th>
                    <th className="px-6 py-4">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPackages.length > 0 ? (
                    filteredPackages.map((pkg) => <PackageTableRow key={pkg.id || pkg.resi} pkg={pkg} />)
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-gray-400">
                        <p className="font-bold text-gray-500 mb-1">Tidak ada paket</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// === KOMPONEN PENDUKUNG ===

function MiniStatCard({ title, value, subtext, subtextColor, icon }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">{title}</p>
      <h3 className="text-4xl font-bold text-gray-900 tracking-tight mb-3">{value}</h3>
      <div className={`flex items-center gap-1.5 text-xs font-medium ${subtextColor}`}>
        {icon && <span className="w-4 h-4">{icon}</span>}
        {subtext}
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
    </button>
  );
}

function PackageTableRow({ pkg }: { pkg: any }) {
  const resi = pkg.resi || "-";
  const paketName = pkg.paket_name || "Paket";
  const receiverName = pkg.receiver_name || "Receiver";
  const alamat = pkg.alamat || pkg.address || "-";
  const kota = pkg.kota || pkg.destination_city || "-";
  const berat = pkg.berat || pkg.weight || 0;
  const status = pkg.status || "Siap dikirim";

  return (
    <tr className="hover:bg-gray-50/50 transition-colors bg-white">
      <td className="px-6 py-4"><span className="text-sm font-bold text-gray-900">{resi}</span></td>
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900">{paketName}</span>
          <span className="text-sm text-gray-500 mt-0.5">{receiverName}</span>
        </div>
      </td>
      <td className="px-6 py-4"><span className="text-sm text-gray-600">{alamat}</span></td>
      <td className="px-6 py-4"><span className="text-sm text-gray-600">{kota}</span></td>
      <td className="px-6 py-4"><span className="text-sm text-gray-600">{berat} kg</span></td>
      <td className="px-6 py-4">
        <select 
          defaultValue={status}
          className="border border-gray-300 text-gray-700 text-sm rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm min-w-[140px]"
          onChange={(e) => console.log(`Update ${resi} status to:`, e.target.value)}
        >
          <option value="Dikemas">Dikemas</option>
          <option value="Di bagging">Di bagging</option>
          <option value="Siap dikirim">Siap dikirim</option>
          <option value="Proses pengiriman">Proses pengiriman</option>
          <option value="Sudah terkirim">Sudah terkirim</option>
        </select>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <button className="px-4 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">Edit</button>
          <button className="px-4 py-1.5 border border-red-200 rounded-md text-xs font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors">Hapus</button>
        </div>
      </td>
    </tr>
  );
}