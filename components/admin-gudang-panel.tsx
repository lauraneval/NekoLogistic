"use client";

import { useState } from "react";
import { LogoutButton } from "@/components/logout-button";

// IMPORT SEMUA KOMPONEN VIEW
import { DashboardOverview } from "./dashboard-overview";
import { PackageManagementView } from "./package-management-view";
import { TrackingPortalView } from "./tracking-portal-view";
import { ConsolidationView } from "./consolidation-view"; 

// IMPORT KUMPULAN ICON
import { DashboardIcon, PackageIcon, PlusIcon, ConsolidateIcon, LocationIcon, UserIcon, SearchIcon, BellIcon, SettingsIcon } from "./icons";

interface AdminGudangPanelProps {
  profile: {
    fullName: string;
    role: string;
  };
}

export function AdminGudangPanel({ profile }: AdminGudangPanelProps) {
  const [activeTab, setActiveTab] = useState("Dashboard");

  return (
    <div className="flex h-screen w-full font-sans text-gray-900 bg-[#F4F7FA]">
      
      {/* ================= SIDEBAR KIRI ================= */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col flex-shrink-0 z-20">
        <div className="p-6">
          <div className="flex flex-col mb-10">
            <h2 className="text-[20px] font-bold text-[#0047BB] tracking-tight">NEKO Logistic</h2>
            <span className="text-[9px] text-gray-400 uppercase tracking-[0.2em] font-bold mt-0.5">Kinetic Curator</span>
          </div>

          <nav className="space-y-1.5">
            <NavItem icon={<DashboardIcon />} label="Dashboard" active={activeTab === "Dashboard"} onClick={() => setActiveTab("Dashboard")} />
            <NavItem icon={<PackageIcon />} label="Package Management" active={activeTab === "Package Management"} onClick={() => setActiveTab("Package Management")} />
            <NavItem icon={<PlusIcon />} label="Input New Package" active={activeTab === "Input New Package"} onClick={() => setActiveTab("Input New Package")} />
            <NavItem icon={<ConsolidateIcon />} label="Consolidation / Bagging" active={activeTab === "Consolidation / Bagging"} onClick={() => setActiveTab("Consolidation / Bagging")} />
            <NavItem icon={<LocationIcon />} label="Tracking Portal" active={activeTab === "Tracking Portal"} onClick={() => setActiveTab("Tracking Portal")} />
            <NavItem icon={<UserIcon />} label="User Management" active={activeTab === "User Management"} onClick={() => setActiveTab("User Management")} />
          </nav>
        </div>

        {/* --- PROFIL PENGGUNA DI BAWAH SIDEBAR --- */}
        <div className="mt-auto p-6">
          <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3 border border-gray-100">
            <div className="w-10 h-10 bg-[#0047BB] rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold shadow-sm">
              <UserIcon />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate">{profile?.fullName || "Admin"}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">{(profile?.role || "Gudang").replace("_", " ")}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ================= AREA KONTEN KANAN ================= */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* --- TOP HEADER BAR --- */}
        <header className="bg-[#F4F7FA] p-6 flex justify-between items-center z-10">
          <div className="relative w-full max-w-md">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400"><SearchIcon /></span>
            <input 
              type="text" 
              placeholder="Search tracking ID or packages..." 
              className="w-full bg-white border border-gray-100 shadow-sm rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none" 
            />
          </div>
          
          <div className="flex items-center gap-5">
             <button className="text-gray-400 hover:text-gray-600 transition"><BellIcon /></button>
             <button className="text-gray-400 hover:text-gray-600 transition"><SettingsIcon /></button>
             <div className="flex items-center gap-3 ml-2 border-l border-gray-200 pl-4">
               <span className="text-sm font-bold text-[#0047BB]">Admin Control</span>
               <LogoutButton />
             </div>
          </div>
        </header>

        {/* --- PANEL RENDERING UTAMA --- */}
        <main className="flex-1 overflow-y-auto px-8 pb-8">
          
          {activeTab === "Dashboard" && <DashboardOverview />}
          {activeTab === "Package Management" && <PackageManagementView />}
          {activeTab === "Tracking Portal" && <TrackingPortalView />}
          {activeTab === "Consolidation / Bagging" && <ConsolidationView />}

          {activeTab === "Input New Package" && (
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 animate-in fade-in duration-500">
               <h2 className="text-xl font-bold mb-4">Input New Package</h2>
               <p className="text-gray-500 text-sm">Komponen Form Input Package Anda dapat diletakkan di sini.</p>
            </div>
          )}

          {activeTab === "User Management" && (
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 animate-in fade-in duration-500">
               <h2 className="text-xl font-bold mb-4">User Management</h2>
               <p className="text-gray-500 text-sm">Halaman manajemen hak akses pengguna.</p>
            </div>
          )}
          
        </main>
      </div>
    </div>
  );
}

// ===============================================
// HELPER COMPONENT UNTUK NAVIGASI SIDEBAR
// ===============================================
function NavItem({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all border-l-2 text-left cursor-pointer ${
        active 
          ? 'bg-blue-50/50 text-[#0047BB] font-bold border-[#0047BB]' 
          : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700 font-medium'
      }`}
    >
      <span className={`flex items-center justify-center w-5 h-5 ${active ? 'text-[#0047BB]' : 'text-gray-400'}`}>
        {icon}
      </span>
      <span className="text-sm">{label}</span>
    </button>
  );
}