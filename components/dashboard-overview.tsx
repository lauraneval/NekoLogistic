"use client";

import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BoxIcon, TruckIcon, CheckCircleIcon } from "./icons";

export function DashboardOverview() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const showToast = (message: string, type: "error" | "success" = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // PERBAIKAN URL API DI SINI
        const res = await fetch("/api/admin/packages");
        
        // PENCEGAHAN ERROR HTML
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const json = await res.json();
          if (json.ok) setPackages(json.data || []);
        } else {
          console.error("API merespons dengan format HTML, bukan JSON. Anda mungkin ter-redirect ke halaman login.");
          showToast("Gagal memuat data. Silakan cek sesi login Anda.", "error");
        }
      } catch (error) {
        console.error("Gagal menarik data packages:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  const handleExportExcel = () => {
    setShowExportMenu(false);
    if (!packages || packages.length === 0) {
      showToast("Tidak ada data logistik untuk diekspor ke Excel.", "error");
      return;
    }
    const dataToExport = packages.map(pkg => ({
      "Resi ID": pkg.resi || "-",
      "Receiver Name": pkg.receiver_name || "-",
      "Destination": pkg.destination_city || "-",
      "Status": pkg.status ? pkg.status.replace(/_/g, " ") : "-",
      "Created At": new Date(pkg.created_at).toLocaleString('id-ID')
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Logistics Report");
    XLSX.writeFile(workbook, `NEKO_Logistics_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast("Berhasil mengunduh laporan Excel!", "success");
  };

  const handleExportPDF = () => {
    setShowExportMenu(false);
    if (!packages || packages.length === 0) {
      showToast("Tidak ada data logistik untuk diekspor ke PDF.", "error");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("NEKO Logistic - Overview Report", 14, 20);
    autoTable(doc, {
      head: [["Resi ID", "Receiver Name", "Destination", "Status", "Created At"]],
      body: packages.map(pkg => [
        pkg.resi || "-", pkg.receiver_name || "-", pkg.destination_city || "-",
        pkg.status ? pkg.status.replace(/_/g, " ") : "-", new Date(pkg.created_at).toLocaleString('id-ID')
      ]),
      startY: 30, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [0, 71, 187] }
    });
    doc.save(`NEKO_Logistics_${new Date().toISOString().slice(0, 10)}.pdf`);
    showToast("Berhasil mengunduh laporan PDF!", "success");
  };

  const totalPackages = packages.length;
  const inTransit = packages.filter(p => p.status === "IN_TRANSIT" || p.status === "OUT_FOR_DELIVERY").length;
  const delivered = packages.filter(p => p.status === "DELIVERED").length;
  const delayed = packages.filter(p => p.status === "DELAYED").length;
  const pctDelivered = totalPackages ? Math.round((delivered / totalPackages) * 100) : 0;
  const pctTransit = totalPackages ? Math.round((inTransit / totalPackages) * 100) : 0;
  const pctDelayed = totalPackages ? Math.round((delayed / totalPackages) * 100) : 0;
  const pctOnTime = totalPackages ? 100 - pctDelayed : 0;

  const dailyCounts = [0, 0, 0, 0, 0, 0, 0];
  packages.forEach(pkg => { if (pkg.created_at) dailyCounts[new Date(pkg.created_at).getDay()]++; });
  const chartData = [1, 2, 3, 4, 5, 6, 0].map(d => ({ day: ['SUN','MON','TUE','WED','THU','FRI','SAT'][d], count: dailyCounts[d] }));
  const maxDaily = Math.max(...chartData.map(d => d.count), 1);

  if (loading) return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-6 py-1"><div className="h-4 bg-gray-200 rounded w-1/4"></div><div className="space-y-3"><div className="grid grid-cols-3 gap-4"><div className="h-32 bg-gray-200 rounded"></div></div></div></div></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-5 fade-in duration-300">
          <div className={`px-5 py-3.5 rounded-xl shadow-lg flex items-center gap-3 border ${toast.type === "error" ? "bg-red-50 border-red-200 text-red-600" : "bg-green-50 border-green-200 text-green-700"}`}>
            <span className="text-sm font-bold">{toast.message}</span>
          </div>
        </div>
      )}
      <header className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Logistics Overview</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time status of current supply chain operations.</p>
        </div>
        <div className="flex gap-3 relative">
          <button onClick={() => setShowExportMenu(!showExportMenu)} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 transition active:scale-95 flex items-center gap-2">
            Export Report <svg className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {showExportMenu && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <button onClick={handleExportExcel} className="w-full text-left px-4 py-3 text-sm font-bold text-green-700 hover:bg-green-50 transition">Export to Excel</button>
              <div className="h-px bg-gray-100 w-full"></div>
              <button onClick={handleExportPDF} className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition">Export to PDF</button>
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={<BoxIcon />} label="Total Packages" value={totalPackages.toLocaleString()} trend="Live" />
        <StatCard icon={<TruckIcon />} label="Packages In Transit" value={inTransit.toLocaleString()} isLive />
        <StatCard icon={<CheckCircleIcon />} label="Delivered Packages" value={delivered.toLocaleString()} note="Global" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[300px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-900">Daily Shipments</h3>
            <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-md">Last 7 Days 📅</span>
          </div>
          <div className="flex-1 flex items-end justify-between px-4 pb-2 h-40">
              {chartData.map((data) => (
                  <div key={data.day} className="flex flex-col items-center gap-3 w-full h-full justify-end">
                    <div className={`w-8 rounded-t-sm transition-all duration-1000 ${data.count === maxDaily && data.count > 0 ? 'bg-[#0047BB]' : 'bg-gray-100'}`} style={{ height: `${Math.round((data.count / maxDaily) * 100)}%`, minHeight: data.count > 0 ? '10%' : '5px' }}></div>
                    <span className={`text-[10px] font-bold ${data.count === maxDaily && data.count > 0 ? 'text-gray-900' : 'text-gray-400'}`}>{data.day}</span>
                  </div>
              ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center">
          <h3 className="font-bold text-gray-900 w-full mb-6 text-left">Status Distribution</h3>
          <div className="relative w-40 h-40 flex items-center justify-center">
            <div className="w-full h-full rounded-xl border-[16px] border-[#0047BB] flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{pctOnTime}%</p>
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">ON TIME</p>
              </div>
            </div>
          </div>
          <div className="w-full mt-8 space-y-3">
            <div className="flex justify-between text-xs font-bold"><span className="text-gray-500"><span className="text-[#0047BB] mr-2">●</span>Delivered</span><span>{pctDelivered}%</span></div>
            <div className="flex justify-between text-xs font-bold"><span className="text-gray-500"><span className="text-blue-300 mr-2">●</span>In Transit</span><span>{pctTransit}%</span></div>
            <div className="flex justify-between text-xs font-bold"><span className="text-gray-500"><span className="text-red-500 mr-2">●</span>Delayed</span><span>{pctDelayed}%</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, trend, isLive, note, icon }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
      <div className="flex justify-between items-start relative z-10 mb-6">
        <div className={`w-12 h-12 flex items-center justify-center p-2.5 rounded-xl ${note ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'}`}>{icon}</div>
        {trend && <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-md">{trend}</span>}
        {isLive && <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-md"><span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span><span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Live</span></div>}
        {note && <span className="text-[10px] font-bold text-gray-400 uppercase">{note}</span>}
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        <h3 className="text-3xl font-bold text-gray-900 mt-1 tracking-tight">{value}</h3>
      </div>
      <div className="absolute -right-4 -bottom-4 text-gray-50 w-24 h-24 select-none opacity-40 group-hover:opacity-100 transition-opacity">{icon}</div>
    </div>
  );
}