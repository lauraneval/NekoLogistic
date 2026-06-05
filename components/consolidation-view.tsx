"use client";

import { useState, useEffect } from "react";

export function ConsolidationView() {
  const [availablePackages, setAvailablePackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [baggingCode, setBaggingCode] = useState("");
  const [baggingCity, setBaggingCity] = useState("");
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [manualResi, setManualResi] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Ambil Data Paket dari API (dengan fallback Mock Data agar sesuai gambar)
  useEffect(() => {
    async function fetchPackages() {
      try {
        const res = await fetch("/api/admin/packages");
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const json = await res.json();
          if (json.ok && json.data) {
            setAvailablePackages(json.data.filter((p: any) => p.status !== "Sudah terkirim"));
            return;
          }
        }
        throw new Error("Gunakan mock data");
      } catch (error) {
        // Mock Data menyesuaikan dengan gambar yang Anda berikan
        setAvailablePackages([
          { resi: "NEKO-2026-8DEB", paket_name: "Hehe", receiver_name: "Tsaqif", alamat: "Semarang, Central Java, Indonesia" },
          { resi: "NEKO-2026-2C31", paket_name: "JNJNK", receiver_name: "THORIQ", alamat: "NJNKK L" },
          { resi: "NEKO-2026-6854", paket_name: "Paket", receiver_name: "Receiver 11", alamat: "Jl. Kurir No. 11, Bandung" },
          { resi: "NEKO-2026-24CE", paket_name: "Paket", receiver_name: "Receiver 7", alamat: "Jl. Kurir No. 7, Bandung" },
          { resi: "NEKO-2026-8A6F", paket_name: "Paket", receiver_name: "Receiver 8", alamat: "Jl. Kurir No. 8, Bandung" },
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchPackages();
  }, []);

  // Handler untuk Checkbox
  const handleCheckboxChange = (resi: string) => {
    setSelectedPackages((prev) => 
      prev.includes(resi) ? prev.filter((r) => r !== resi) : [...prev, resi]
    );
  };

  // Handler untuk Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Ekstrak resi dari text area manual (pisahkan berdasarkan koma atau baris baru)
      const manualResiArray = manualResi
        .split(/[\n,]+/)
        .map((r) => r.trim())
        .filter(Boolean);

      // Gabungkan resi dari checkbox dan resi manual
      const allResiToBag = [...new Set([...selectedPackages, ...manualResiArray])];

      if (allResiToBag.length === 0) {
        alert("Pilih minimal satu paket atau masukkan resi manual.");
        setSubmitting(false);
        return;
      }

      const payload = {
        baggingCode: baggingCode || `BAG-${new Date().getTime()}`,
        baggingCity,
        resiList: allResiToBag,
      };

      // --- LOGIKA API ANDA NANTINYA DI SINI ---
      // const res = await fetch("/api/admin/bagging", { ... });
      
      // Simulasi loading 1 detik
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      console.log("Data Bagging Disubmit:", payload);
      alert(`Berhasil membuat bagging dengan ${allResiToBag.length} paket!`);

      // Reset Form
      setBaggingCode("");
      setBaggingCity("");
      setSelectedPackages([]);
      setManualResi("");
      
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat membuat bagging.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse p-6 bg-white rounded-xl h-64"></div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-4xl animate-in fade-in duration-500">
      <h2 className="text-xl font-bold text-[#0F172A] mb-6">Bagging Manual</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* ROW 1: Kode Bagging & Kota */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Kode bagging opsional"
            value={baggingCode}
            onChange={(e) => setBaggingCode(e.target.value)}
            className="w-full px-4 py-2.5 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-800 placeholder:text-gray-400"
          />
          <select
            value={baggingCity}
            onChange={(e) => setBaggingCity(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-800 bg-white"
          >
            <option value="" disabled>Pilih kota bagging</option>
            <option value="Jakarta">Jakarta</option>
            <option value="Bandung">Bandung</option>
            <option value="Semarang">Semarang</option>
            <option value="Surabaya">Surabaya</option>
          </select>
        </div>

        {/* ROW 2: Daftar Paket (Scrollable) */}
        <div className="border border-gray-200 rounded-md max-h-[250px] overflow-y-auto bg-white">
          {availablePackages.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {availablePackages.map((pkg) => (
                <label 
                  key={pkg.resi} 
                  className="flex items-start gap-3 p-3.5 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedPackages.includes(pkg.resi)}
                    onChange={() => handleCheckboxChange(pkg.resi)}
                    className="mt-1 w-4 h-4 text-blue-600 bg-white border-gray-300 rounded cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-900">
                      <span className="font-medium">{pkg.paket_name}</span> - <span className="font-bold">{pkg.resi}</span>
                    </span>
                    <span className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                      {pkg.receiver_name}{pkg.alamat ? `, ${pkg.alamat}` : ''}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400 text-sm">
              Tidak ada paket yang siap di-bagging.
            </div>
          )}
        </div>

        {/* ROW 3: Textarea Resi Manual */}
        <div>
          <textarea
            placeholder="TAMBAHKAN RESI MANUAL BILA PERLU, PISAHKAN KOMA ATAU BARIS BARU"
            value={manualResi}
            onChange={(e) => setManualResi(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-800 placeholder:text-gray-400 resize-y uppercase"
          />
        </div>

        {/* ROW 4: Tombol Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-[#F97316] hover:bg-[#EA580C] text-white px-6 py-2.5 rounded-md font-bold text-sm transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? "Memproses..." : "Buat Bagging"}
          </button>
        </div>

      </form>
    </div>
  );
}