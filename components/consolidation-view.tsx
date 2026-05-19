"use client";

import { useState, useEffect, useRef } from "react";
import { BoxIcon2, AlertTriangleIcon, CheckCircleIcon2 } from "./icons"; // Mengambil dari icon yang sudah ada

export function ConsolidationView() {
  const [availablePackages, setAvailablePackages] = useState<any[]>([]);
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  
  const [scanInput, setScanInput] = useState("");
  const [targetDestination, setTargetDestination] = useState("Singpost Hub - SIN (Singapore)");
  const [currentBagId, setCurrentBagId] = useState(`BAG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus ke input scan saat halaman dibuka
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const showToast = (message: string, type: "error" | "success" = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // AMBIL DATA PAKET YANG TERSEDIA DI GUDANG
  useEffect(() => {
    async function fetchPackages() {
      try {
        const res = await fetch("/api/admin/packages");
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const json = await res.json();
          if (json.ok) {
            // Hanya ambil paket yang belum delivered (siap di-bagging)
            const readyToBag = (json.data || []).filter((p: any) => p.status !== "DELIVERED");
            setAvailablePackages(readyToBag);
          }
        }
      } catch (error) {
        console.error("Gagal menarik data packages:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPackages();
  }, []);

  // FUNGSI SAAT BARCODE DI-SCAN (Atau tekan ENTER)
  const handleScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const resi = scanInput.trim().toUpperCase();
      if (!resi) return;

      // Cek apakah sudah di-scan sebelumnya
      if (scannedItems.some(item => item.resi?.toUpperCase() === resi)) {
        showToast("Paket ini sudah ada di dalam antrean scan.", "error");
        setScanInput("");
        return;
      }

      // Cari paket di database lokal (yang sudah di-fetch)
      const foundPkg = availablePackages.find(p => p.resi?.toUpperCase() === resi);

      if (foundPkg) {
        // Berhasil ditemukan
        setScannedItems([{ ...foundPkg, scanStatus: "SCANNED" }, ...scannedItems]);
      } else {
        // Gagal ditemukan (Error)
        setScannedItems([{ 
          id: `err-${Math.random()}`, 
          resi: resi, 
          weight_kg: 0,
          scanStatus: "ERROR", 
          errorMsg: "NOT FOUND IN SYSTEM" 
        }, ...scannedItems]);
      }
      
      setScanInput(""); // Kosongkan input untuk scan selanjutnya
    }
  };

  // FUNGSI SUBMIT KE API (POST /api/admin/manifests)
  const handleFinalize = async () => {
    const validPackages = scannedItems.filter(item => item.scanStatus === "SCANNED");
    
    if (validPackages.length === 0) {
      showToast("Tidak ada paket valid untuk di-bagging.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        packageIds: validPackages.map(p => p.id),
        resiNumbers: validPackages.map(p => p.resi),
        destinationCity: targetDestination,
        bagCode: currentBagId
      };

      const res = await fetch("/api/admin/manifests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const json = await res.json();
        if (json.ok || res.status === 201) {
          showToast(`Berhasil membuat Bagging: ${currentBagId}`, "success");
          // Reset Form
          setScannedItems([]);
          setCurrentBagId(`BAG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
        } else {
          showToast(json.error || "Gagal membuat bagging", "error");
        }
      } else {
        showToast("Gagal terhubung ke server API.", "error");
      }
    } catch (error) {
      showToast("Terjadi kesalahan jaringan.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Kalkulasi Statistik
  const successCount = scannedItems.filter(i => i.scanStatus === "SCANNED").length;
  const errorCount = scannedItems.filter(i => i.scanStatus === "ERROR").length;
  const totalWeight = scannedItems.reduce((acc, curr) => acc + (Number(curr.weight_kg) || 0), 0);
  
  // Asumsi kapasitas maksimum satu bag adalah 200kg (Bisa disesuaikan)
  const bagCapacityPct = Math.min(Math.round((totalWeight / 200) * 100), 100);

  // Helper untuk menentukan tipe visual berdasarkan berat (Mockup)
  const getTypeDisplay = (weight: number) => {
    if (!weight || weight < 1) return { label: "Envelope", type: "Env" };
    if (weight < 5) return { label: "Box (S)", type: "Box" };
    if (weight < 20) return { label: "Box (M)", type: "Box" };
    return { label: "Pallet (P)", type: "Pal" };
  };

  if (loading) return <div className="animate-pulse p-4"><div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div><div className="h-64 bg-gray-200 rounded"></div></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-5 fade-in duration-300">
          <div className={`px-5 py-3.5 rounded-xl shadow-lg flex items-center gap-3 border ${toast.type === "error" ? "bg-red-50 border-red-200 text-red-600" : "bg-green-50 border-green-200 text-green-700"}`}>
            <span className="text-sm font-bold">{toast.message}</span>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <header className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Consolidation</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage transit bags for outbound distribution.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-200 transition flex items-center gap-2">
            View Bag History
          </button>
          <button className="bg-[#0047BB] text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-blue-800 transition flex items-center gap-2">
            <span>+</span> Create New Bag
          </button>
        </div>
      </header>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* KOLOM KIRI (BAG PARAMETERS & SCAN) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* PARAMETERS CARD */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-4 h-4"><BoxIcon2 /></span> Bag Parameters
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Target Destination</label>
                <input 
                  type="text" 
                  value={targetDestination}
                  onChange={(e) => setTargetDestination(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Service Level</label>
                <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
                  <button className="flex-1 bg-[#0047BB] text-white text-xs font-bold py-2 rounded-md shadow-sm">Air Express</button>
                  <button className="flex-1 text-gray-500 text-xs font-bold py-2 rounded-md hover:bg-gray-100">Economy Land</button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-500 font-medium">Current Bag ID:</span>
                <span className="text-sm font-bold text-[#0047BB] bg-blue-50 px-2 py-1 rounded">{currentBagId}</span>
              </div>
            </div>
          </div>

          {/* LIVE SCAN INPUT CARD */}
          <div className="bg-[#0047BB] rounded-2xl shadow-lg shadow-blue-200/50 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-white">
              <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h6v6H4V4zm2 2v2h2V6H6zm10-2h6v6h-6V4zm2 2v2h2V6h-2zM4 14h6v6H4v-6zm2 2v2h2v-2H6zm10-2h6v6h-6v-6zm2 2v2h2v-2h-2zM10 4h2v2h-2V4zm0 14h2v2h-2v-2zm0-4h2v2h-2v-2zM4 10h2v2H4v-2zm14 0h2v2h-2v-2z"/></svg>
            </div>
            
            <h3 className="text-xs font-bold text-white/80 uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
              <span className="w-4 h-4"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg></span>
              Live Scan Input
            </h3>
            
            <div className="relative z-10">
              <input 
                ref={inputRef}
                type="text" 
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={handleScan}
                placeholder="Ready for barcode"
                className="w-full bg-white/95 border-none rounded-xl px-4 py-4 text-center text-lg font-mono tracking-wider focus:ring-4 focus:ring-blue-400/50 outline-none text-gray-900 placeholder:text-gray-400 shadow-inner"
              />
              <p className="text-center text-[10px] text-blue-200 mt-3 font-medium">Scanning input is focused and locked.</p>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN (STATS & QUEUE TABLE) */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          
          {/* 3 TOP STATS */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 text-[#0047BB] rounded-lg flex items-center justify-center"><BoxIcon2 /></div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Total Scanned</p>
                <p className="text-xl font-bold text-gray-900 leading-none">{successCount} <span className="text-xs font-normal text-gray-500">units</span></p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 text-[#0047BB] rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Total Weight</p>
                <p className="text-xl font-bold text-gray-900 leading-none">{totalWeight.toFixed(1)} <span className="text-xs font-normal text-gray-500">kg</span></p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Est. Pickup</p>
                <p className="text-xl font-bold text-gray-900 leading-none">14:30 <span className="text-xs font-normal text-gray-500">GMT+9</span></p>
              </div>
            </div>
          </div>

          {/* TABLE QUEUE */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Real-Time Scan Queue</h3>
              <div className="flex gap-2">
                <span className="bg-blue-50 text-[#0047BB] text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">{successCount} Success</span>
                <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">{errorCount} Errors</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[300px]">
              <table className="w-full text-left">
                <thead className="bg-white sticky top-0 border-b border-gray-100 text-[9px] font-bold text-gray-400 uppercase tracking-widest z-10">
                  <tr>
                    <th className="px-6 py-3">Tracking ID</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Weight</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {scannedItems.map((item, idx) => {
                    const isError = item.scanStatus === "ERROR";
                    const displayType = getTypeDisplay(item.weight_kg);

                    return (
                      <tr key={idx} className={`${isError ? 'bg-red-50/30' : 'hover:bg-gray-50'}`}>
                        <td className="px-6 py-4">
                          <p className={`text-sm font-bold ${isError ? 'text-red-600' : 'text-[#0047BB]'}`}>{item.resi}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{idx === 0 ? "Just now" : `${idx + 1} min ago`}</p>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-700">{isError ? "-" : displayType.label}</td>
                        <td className="px-6 py-4 text-xs font-medium text-gray-900">{isError ? "-" : `${item.weight_kg || 0} kg`}</td>
                        <td className="px-6 py-4 text-right">
                          {isError ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-red-600 uppercase tracking-widest">
                              {item.errorMsg} <AlertTriangleIcon />
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#0047BB] uppercase tracking-widest">
                              SCANNED <span className="w-4 h-4"><CheckCircleIcon2 /></span>
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  
                  {scannedItems.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-16 text-gray-400">
                        <div className="w-12 h-12 mx-auto mb-3 text-gray-200"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg></div>
                        <p className="text-sm font-medium">Menunggu input barcode...</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* CAPACITY FOOTER & ACTION */}
            <div className="p-5 bg-white border-t border-gray-100 flex items-center justify-between">
              <div className="flex-1 max-w-xs flex items-center gap-4">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Bag Capacity</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0047BB] rounded-full transition-all duration-500" style={{ width: `${bagCapacityPct}%` }}></div>
                </div>
                <span className="text-xs font-bold text-gray-700">{bagCapacityPct}% Full</span>
              </div>
              
              <button 
                onClick={handleFinalize}
                disabled={submitting || successCount === 0}
                className="bg-[#0047BB] hover:bg-blue-800 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all disabled:opacity-50"
              >
                {submitting ? "Processing..." : "Finalize & Print Manifest"}
              </button>
            </div>
          </div>

          {/* BOTTOM SUPPORT BAR */}
          <div className="bg-gray-100 rounded-xl p-4 flex justify-between items-center mt-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-[#0047BB] shadow-sm font-bold">?</div>
              <div>
                <p className="text-xs font-bold text-gray-900">Warehouse Support Line</p>
                <p className="text-[10px] text-gray-500">Instant troubleshooting for scanner hardware or label errors.</p>
              </div>
            </div>
            
            <div className="flex gap-8 text-right">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Printer Status</p>
                <p className="text-xs font-bold text-[#0047BB] flex items-center justify-end gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#0047BB]"></span> Online</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Network Latency</p>
                <p className="text-xs font-bold text-gray-900">12ms</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Last Sync</p>
                <p className="text-xs font-bold text-gray-900">0.2s ago</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}