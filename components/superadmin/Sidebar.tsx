"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, LayoutDashboard, History, Package, X } from "lucide-react";
import { SidebarItem } from "./SidebarItem";
import { LogoutButton } from "../logout-button";

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Helper to check if a route is active
  const isActive = (path: string) => {
    if (path === '/superadmin') return pathname === '/superadmin';
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Toggle Trigger (Hidden on Desktop) */}
      <button 
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-6 left-6 z-[60] p-3 rounded-2xl bg-orange-600 text-white shadow-lg"
      >
        <Package size={20} />
      </button>

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-[#14100c] border-r border-white/10 transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:relative lg:translate-x-0`}>
        <div className="flex h-full flex-col p-8 relative z-10">
          <div className="mb-12 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-600/20 text-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.2)] border border-orange-500/20"><Package size={20} /></div>
              <span className="text-2xl font-black tracking-tighter text-white">NEKO<span className="text-orange-500">LOG.</span></span>
            </div>
            <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          <nav className="flex-1 space-y-2">
            <Link href="/superadmin/staff">
              <SidebarItem 
                icon={<Users size={18}/>} 
                label="Manajemen Staf" 
                active={isActive("/superadmin/staff")} 
                onClick={() => setIsOpen(false)}
              />
            </Link>
            <Link href="/superadmin">
              <SidebarItem 
                icon={<LayoutDashboard size={18}/>} 
                label="Metrik Sistem" 
                active={isActive("/superadmin") && pathname === "/superadmin"} 
                onClick={() => setIsOpen(false)}
              />
            </Link>
            <Link href="/superadmin/logs">
              <SidebarItem 
                icon={<History size={18}/>} 
                label="Jejak Audit" 
                active={isActive("/superadmin/logs")} 
                onClick={() => setIsOpen(false)}
              />
            </Link>
          </nav>
          <div className="pt-6 border-t border-white/10"><LogoutButton /></div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
