"use client";

import { useState } from "react";
import { SearchIcon, TruckIcon, BoxIcon, DocumentIcon, LocationIcon } from "./icons"; // Pastikan path import benar

export function TrackingPortalView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [packageData, setPackageData] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleTrack = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setErrorMsg("");
    setPackageData(null);

    try {
      // 1. Menggunakan API Anda yang sudah ada
      const res = await fetch("/api/admin/packages");
      const contentType = res.headers.get("content-type");
      
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const json = await res.json();
        if (json.ok && json.data) {
          // 2. Mencari paket yang resi-nya cocok dengan inputan
          const foundPackage = json.data.find(
            (p: any) => p.resi.toLowerCase() === searchQuery.toLowerCase()
          );

          if (foundPackage) {
            setPackageData(foundPackage);
          } else {
            setErrorMsg("Tracking ID tidak ditemukan di sistem kami.");
          }
        }
      } else {
        setErrorMsg("Gagal terhubung ke server.");
      }
    } catch (error) {
      setErrorMsg("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  };

  // Fungsi mengubah status API menjadi teks UI yang cantik
  const formatStatus = (status: string) => {
    if (!status) return "Unknown";
    const s = status.toUpperCase();
    if (s === "IN_TRANSIT" || s === "OUT_FOR_DELIVERY") return "In Transit";
    if (s === "DELIVERED") return "Delivered";
    if (s === "DELAYED") return "Delayed";
    if (s === "PACKAGE_CREATED") return "Label Created";
    if (s === "IN_WAREHOUSE") return "In Warehouse";
    return status.replace(/_/g, " ");
  };

  return (
    <div className="animate-in fade-in duration-500 w-full max-w-5xl mx-auto py-8">
      
      {/* HEADER SECTION */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-4">The Kinetic Curator</h1>
        <p className="text-gray-500 text-sm max-w-lg mx-auto mb-8">
          Real-time precision for your global shipments. Enter your tracking number to visualize the journey.
        </p>
        
        {/* SEARCH BAR */}
        <div className="max-w-xl mx-auto flex items-center bg-white p-2 rounded-xl shadow-sm border border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <div className="pl-3 text-gray-400">
            <SearchIcon />
          </div>
          <input 
            type="text" 
            placeholder="NEKO-882-991" 
            className="flex-1 px-4 py-2 outline-none text-gray-800 font-medium placeholder:text-gray-300 uppercase"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
          />
          <button 
            onClick={handleTrack}
            disabled={loading}
            className="bg-[#0047BB] hover:bg-blue-800 text-white px-8 py-3 rounded-lg text-sm font-bold shadow-md transition-all disabled:opacity-70"
          >
            {loading ? "Searching..." : "Track"}
          </button>
        </div>
        
        {errorMsg && <p className="mt-4 text-red-500 text-sm font-bold animate-pulse">{errorMsg}</p>}
      </div>

      {/* HASIL TRACKING */}
      {packageData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start animate-in slide-in-from-bottom-8 duration-500">
          
          {/* KOLOM KIRI: STATUS SUMMARY */}
          <div className="col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Current Status</p>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${packageData.status === 'DELIVERED' ? 'bg-green-500' : 'bg-[#0047BB]'}`}></span>
                <h2 className={`text-2xl font-bold ${packageData.status === 'DELIVERED' ? 'text-green-600' : 'text-[#0047BB]'}`}>
                  {formatStatus(packageData.status)}
                </h2>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Estimated Delivery</p>
              <p className="text-sm font-bold text-gray-900">
                {new Date(new Date(packageData.created_at).getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • 14:00 - 18:00
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Origin</p>
              <p className="text-sm font-bold text-gray-900">NEKO Warehouse Hub, ID</p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Destination</p>
              <p className="text-sm font-bold text-gray-900">{packageData.destination_city || "Unknown Destination"}</p>
              <p className="text-xs text-gray-500 mt-1">{packageData.receiver_address || "Address not provided"}</p>
            </div>
          </div>

          {/* KOLOM KANAN: TIMELINE JOURNEY */}
          <div className="col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-bold text-gray-900">Package Journey</h3>
              <span className="text-xs text-gray-500 font-medium">Tracking ID: <span className="font-bold text-gray-900">{packageData.resi}</span></span>
            </div>

            {/* TIMELINE */}
            <div className="relative pl-6 space-y-8 before:absolute before:inset-0 before:ml-11 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-200 before:to-gray-100">
              
              {/* Event 1: Current Status (Active) */}
              <div className="relative flex items-start gap-6">
                <div className="absolute -left-[35px] w-8 h-8 bg-[#0047BB] rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-200 z-10">
                   <div className="w-4 h-4"><TruckIcon /></div>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-gray-900">{formatStatus(packageData.status)}</h4>
                  <p className="text-xs text-gray-500 mt-1">Package status updated by system. Currently processed at facility.</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-[#0047BB]">Today</p>
                  <p className="text-[10px] text-gray-400">Just now</p>
                </div>
              </div>

              {/* Event 2: In Warehouse */}
              <div className="relative flex items-start gap-6">
                <div className="absolute -left-[35px] w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 border border-gray-200 z-10">
                   <div className="w-4 h-4"><BoxIcon /></div>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-gray-700">Processed at Origin Hub</h4>
                  <p className="text-xs text-gray-500 mt-1">Package received and processed at NEKO Logistics Center.</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-600">{new Date(packageData.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  <p className="text-[10px] text-gray-400">08:30 AM</p>
                </div>
              </div>

              {/* Event 3: Label Created */}
              <div className="relative flex items-start gap-6">
                <div className="absolute -left-[35px] w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 border border-gray-200 z-10">
                   <div className="w-4 h-4"><DocumentIcon /></div>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-gray-700">Label Created</h4>
                  <p className="text-xs text-gray-500 mt-1">Shipping information received by NEKO Logistic. Electronic label generated.</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-600">{new Date(packageData.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  <p className="text-[10px] text-gray-400">{new Date(packageData.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

            </div>

            {/* ACTION BUTTONS */}
            <div className="mt-10 pt-6 border-t border-gray-100 flex flex-wrap gap-3">
              <button className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold transition">
                <span className="w-4 h-4"><DocumentIcon /></span> Print Details
              </button>
              <button className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold transition">
                <span className="w-4 h-4"><LocationIcon /></span> Share Tracking
              </button>
              <button className="flex items-center gap-2 border border-[#0047BB] text-[#0047BB] hover:bg-blue-50 px-4 py-2 rounded-lg text-xs font-bold transition ml-auto">
                <span className="w-4 h-4"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></span> 
                Get Email Alerts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}