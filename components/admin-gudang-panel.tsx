"use client";

import { useState } from "react";

export function AdminGudangPanel() {
  const [createPackageForm, setCreatePackageForm] = useState({
    senderName: "",
    receiverName: "",
    receiverAddress: "",
    weightKg: "",
  });
  const [manifestForm, setManifestForm] = useState({
    bagCode: "",
    resiNumbers: "",
  });
  const [packageStatus, setPackageStatus] = useState<string | null>(null);
  const [manifestStatus, setManifestStatus] = useState<string | null>(null);

  async function handleCreatePackage(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setPackageStatus(null);

    const response = await fetch("/api/admin/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderName: createPackageForm.senderName,
        receiverName: createPackageForm.receiverName,
        receiverAddress: createPackageForm.receiverAddress,
        weightKg: Number(createPackageForm.weightKg),
      }),
    });

    const json = await response.json();

    if (!response.ok || !json.ok) {
      setPackageStatus(json?.error?.message ?? "Gagal membuat paket");
      return;
    }

    setPackageStatus(`Paket berhasil dibuat. Resi: ${json.data.resi}`);
    setCreatePackageForm({ senderName: "", receiverName: "", receiverAddress: "", weightKg: "" });
  }

  async function handleCreateManifest(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setManifestStatus(null);

    const resiNumbers = manifestForm.resiNumbers
      .split(/[\n,]/)
      .map((resi) => resi.trim())
      .filter(Boolean)
      .map((resi) => resi.toUpperCase());

    const response = await fetch("/api/admin/manifests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bagCode: manifestForm.bagCode || undefined,
        resiNumbers,
      }),
    });

    const json = await response.json();

    if (!response.ok || !json.ok) {
      setManifestStatus(json?.error?.message ?? "Gagal membuat manifest");
      return;
    }

    setManifestStatus(
      `Manifest ${json.data.bag_code} berhasil. Paket tergabung: ${json.data.package_count}`,
    );
    setManifestForm({ bagCode: "", resiNumbers: "" });
  }

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-mono text-xl font-semibold text-slate-900">Input Paket Baru</h2>
        <form onSubmit={handleCreatePackage} className="mt-4 space-y-3">
          <input
            value={createPackageForm.senderName}
            onChange={(event) => setCreatePackageForm((prev) => ({ ...prev, senderName: event.target.value }))}
            placeholder="Nama Pengirim"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <input
            value={createPackageForm.receiverName}
            onChange={(event) => setCreatePackageForm((prev) => ({ ...prev, receiverName: event.target.value }))}
            placeholder="Nama Penerima"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <textarea
            value={createPackageForm.receiverAddress}
            onChange={(event) => setCreatePackageForm((prev) => ({ ...prev, receiverAddress: event.target.value }))}
            placeholder="Alamat Penerima"
            className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <input
            value={createPackageForm.weightKg}
            onChange={(event) => setCreatePackageForm((prev) => ({ ...prev, weightKg: event.target.value }))}
            placeholder="Berat (kg)"
            type="number"
            min={0.01}
            step={0.01}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">
            Buat Paket
          </button>
          {packageStatus ? <p className="text-sm text-slate-600">{packageStatus}</p> : null}
        </form>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-mono text-xl font-semibold text-slate-900">Konsolidasi Manifest</h2>
        <form onSubmit={handleCreateManifest} className="mt-4 space-y-3">
          <input
            value={manifestForm.bagCode}
            onChange={(event) => setManifestForm((prev) => ({ ...prev, bagCode: event.target.value.toUpperCase() }))}
            placeholder="Kode Karung (opsional), contoh BAG-2026-AB12"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            value={manifestForm.resiNumbers}
            onChange={(event) => setManifestForm((prev) => ({ ...prev, resiNumbers: event.target.value }))}
            placeholder="Daftar resi, pisahkan dengan koma atau baris baru"
            className="min-h-36 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <button className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white" type="submit">
            Buat Manifest
          </button>
          {manifestStatus ? <p className="text-sm text-slate-600">{manifestStatus}</p> : null}
        </form>
      </article>
    </section>
  );
}
