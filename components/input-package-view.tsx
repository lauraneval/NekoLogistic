"use client";

import { useState } from "react";

export function InputPackageView() {
  // State untuk menyimpan data form
  const [formData, setFormData] = useState({
    nama_paket: "",
    nama_penerima: "",
    alamat: "",
    kota_tujuan: "",
    berat: "",
  });
  
  // State untuk efek loading saat tombol di-klik
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handler untuk mengupdate state setiap kali user mengetik
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handler untuk mensubmit data
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // --- LOGIKA API ANDA NANTINYA DI SINI ---
      // Contoh:
      // const res = await fetch('/api/admin/packages', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // });
      // if (!res.ok) throw new Error("Gagal menyimpan data");

      // Simulasi loading 1 detik (Bisa dihapus jika API sudah siap)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      console.log("Data Paket Baru:", formData);
      alert("Paket berhasil dibuat!");

      // Reset form setelah berhasil
      setFormData({
        nama_paket: "",
        nama_penerima: "",
        alamat: "",
        kota_tujuan: "",
        berat: "",
      });
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat menyimpan paket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 max-w-4xl">
      <h2 className="text-xl font-bold text-[#0F172A] mb-6">Input Packages</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Input Nama Paket */}
        <div>
          <input
            type="text"
            name="nama_paket"
            value={formData.nama_paket}
            onChange={handleChange}
            placeholder="Nama paket"
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0047BB] focus:border-transparent transition-all placeholder:text-gray-400 text-sm text-gray-700"
          />
        </div>

        {/* Input Nama Penerima */}
        <div>
          <input
            type="text"
            name="nama_penerima"
            value={formData.nama_penerima}
            onChange={handleChange}
            placeholder="Nama penerima"
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0047BB] focus:border-transparent transition-all placeholder:text-gray-400 text-sm text-gray-700"
          />
        </div>

        {/* Input Alamat Lengkap */}
        <div>
          <textarea
            name="alamat"
            value={formData.alamat}
            onChange={handleChange}
            placeholder="Alamat lengkap pengiriman"
            required
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0047BB] focus:border-transparent transition-all placeholder:text-gray-400 text-sm text-gray-700 resize-y"
          />
        </div>

        {/* Grid untuk Kota Tujuan dan Berat */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            name="kota_tujuan"
            value={formData.kota_tujuan}
            onChange={handleChange}
            placeholder="Kota tujuan"
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0047BB] focus:border-transparent transition-all placeholder:text-gray-400 text-sm text-gray-700"
          />
          <input
            type="number"
            name="berat"
            value={formData.berat}
            onChange={handleChange}
            placeholder="Berat (kg)"
            required
            min="0.1"
            step="0.1" // Mengizinkan input desimal
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0047BB] focus:border-transparent transition-all placeholder:text-gray-400 text-sm text-gray-700"
          />
        </div>

        {/* Tombol Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#0B1221] hover:bg-[#1E293B] text-white px-6 py-2.5 rounded-md font-medium text-sm transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Menyimpan..." : "Buat Paket"}
          </button>
        </div>
      </form>
    </div>
  );
}