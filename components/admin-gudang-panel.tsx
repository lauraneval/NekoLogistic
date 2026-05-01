"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  adminPackageStatuses,
  packageStatusLabels,
  type PackageStatus,
} from "@/lib/types";

type PackageItem = {
  id: string;
  resi: string;
  package_name?: string | null;
  sender_name: string;
  receiver_name: string;
  receiver_address: string;
  destination_city?: string | null;
  weight_kg: number | string;
  status: PackageStatus;
  created_at: string;
};

type BagItemPackage = {
  id: string;
  resi: string;
  package_name?: string | null;
  receiver_name: string;
  receiver_address: string;
  destination_city?: string | null;
  status: PackageStatus;
};

type BaggingItem = {
  id: string;
  bag_code: string;
  destination_city?: string | null;
  status: string;
  created_at: string;
  bag_items?: Array<{
    packages?: BagItemPackage | BagItemPackage[] | null;
  }>;
};

const emptyPackageForm = {
  packageName: "",
  senderName: "Admin Gudang",
  receiverName: "",
  receiverAddress: "",
  destinationCity: "",
  weightKg: "",
};

function normalizeCity(value: string | null | undefined) {
  return (value ?? "").trim();
}

function inferCityFromAddress(address: string) {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.at(-1) ?? "";
}

function packageCity(pkg: PackageItem | BagItemPackage) {
  return normalizeCity(pkg.destination_city) || inferCityFromAddress(pkg.receiver_address);
}

function packageName(pkg: PackageItem | BagItemPackage) {
  return normalizeCity(pkg.package_name) || `Paket ${pkg.resi}`;
}

function statusLabel(status: PackageStatus) {
  return packageStatusLabels[status] ?? status;
}

export function AdminGudangPanel() {
  const [createPackageForm, setCreatePackageForm] = useState(emptyPackageForm);
  const [baggingForm, setBaggingForm] = useState({
    bagCode: "",
    destinationCity: "",
    resiNumbers: "",
  });
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [baggings, setBaggings] = useState<BaggingItem[]>([]);
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [editPackageForm, setEditPackageForm] = useState({
    packageName: "",
    receiverName: "",
    receiverAddress: "",
    destinationCity: "",
    weightKg: "",
  });
  const [packageStatus, setPackageStatus] = useState<string | null>(null);
  const [baggingStatus, setBaggingStatus] = useState<string | null>(null);
  const [listStatus, setListStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refreshData() {
    setListStatus(null);

    try {
      const [packagesResponse, baggingsResponse] = await Promise.all([
        fetch("/api/admin/packages", { cache: "no-store" }),
        fetch("/api/admin/manifests", { cache: "no-store" }),
      ]);
      const [packagesJson, baggingsJson] = await Promise.all([
        packagesResponse.json(),
        baggingsResponse.json(),
      ]);

      if (!packagesResponse.ok || !packagesJson.ok) {
        throw new Error(packagesJson?.error?.message ?? "Gagal mengambil paket");
      }

      if (!baggingsResponse.ok || !baggingsJson.ok) {
        throw new Error(baggingsJson?.error?.message ?? "Gagal mengambil bagging");
      }

      setPackages(packagesJson.data as PackageItem[]);
      setBaggings(baggingsJson.data as BaggingItem[]);
    } catch (error) {
      setListStatus(error instanceof Error ? error.message : "Gagal memuat data gudang");
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const destinationCities = useMemo(() => {
    const cities = packages
      .map((pkg) => packageCity(pkg))
      .filter(Boolean);

    return Array.from(new Set(cities)).sort((a, b) => a.localeCompare(b));
  }, [packages]);

  const availablePackages = useMemo(() => {
    return packages.filter((pkg) => pkg.status !== "DELIVERED");
  }, [packages]);

  async function handleCreatePackage(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setPackageStatus(null);
    setLoading(true);

    const response = await fetch("/api/admin/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...createPackageForm,
        weightKg: Number(createPackageForm.weightKg),
      }),
    });

    const json = await response.json();
    setLoading(false);

    if (!response.ok || !json.ok) {
      setPackageStatus(json?.error?.message ?? "Gagal membuat paket");
      return;
    }

    setPackageStatus(`Paket berhasil dibuat. Resi: ${json.data.resi}`);
    setCreatePackageForm(emptyPackageForm);
    await refreshData();
  }

  async function handleCreateBagging(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBaggingStatus(null);
    setLoading(true);

    const selectedResi = packages
      .filter((pkg) => selectedPackageIds.includes(pkg.id))
      .map((pkg) => pkg.resi);
    const typedResi = baggingForm.resiNumbers
      .split(/[\n,]/)
      .map((resi) => resi.trim())
      .filter(Boolean)
      .map((resi) => resi.toUpperCase());
    const resiNumbers = Array.from(new Set([...selectedResi, ...typedResi]));

    const response = await fetch("/api/admin/manifests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bagCode: baggingForm.bagCode || undefined,
        destinationCity: baggingForm.destinationCity,
        resiNumbers,
        packageIds: selectedPackageIds,
      }),
    });

    const json = await response.json();
    setLoading(false);

    if (!response.ok || !json.ok) {
      setBaggingStatus(json?.error?.message ?? "Gagal membuat bagging");
      return;
    }

    setBaggingStatus(
      `Bagging ${json.data.bag_code} berhasil. Paket tergabung: ${json.data.package_count}`,
    );
    setBaggingForm({ bagCode: "", destinationCity: "", resiNumbers: "" });
    setSelectedPackageIds([]);
    await refreshData();
  }

  async function handleStatusChange(packageId: string, status: PackageStatus) {
    setListStatus(null);

    const response = await fetch("/api/admin/packages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: packageId, status }),
    });
    const json = await response.json();

    if (!response.ok || !json.ok) {
      setListStatus(json?.error?.message ?? "Gagal mengubah status paket");
      return;
    }

    setPackages((current) =>
      current.map((pkg) => (pkg.id === packageId ? { ...pkg, status } : pkg)),
    );
    await refreshData();
  }

  function startEditPackage(pkg: PackageItem) {
    setEditingPackageId(pkg.id);
    setEditPackageForm({
      packageName: packageName(pkg),
      receiverName: pkg.receiver_name,
      receiverAddress: pkg.receiver_address,
      destinationCity: packageCity(pkg),
      weightKg: String(pkg.weight_kg),
    });
  }

  function cancelEditPackage() {
    setEditingPackageId(null);
    setEditPackageForm({
      packageName: "",
      receiverName: "",
      receiverAddress: "",
      destinationCity: "",
      weightKg: "",
    });
  }

  async function handleUpdatePackage(packageId: string) {
    setListStatus(null);

    const response = await fetch("/api/admin/packages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: packageId,
        ...editPackageForm,
        weightKg: Number(editPackageForm.weightKg),
      }),
    });
    const json = await response.json();

    if (!response.ok || !json.ok) {
      setListStatus(json?.error?.message ?? "Gagal mengedit paket");
      return;
    }

    cancelEditPackage();
    await refreshData();
  }

  async function handleDeletePackage(packageId: string) {
    const confirmed = window.confirm("Hapus paket ini? Data paket akan dihapus dari database.");

    if (!confirmed) {
      return;
    }

    setListStatus(null);

    const response = await fetch(`/api/admin/packages?id=${encodeURIComponent(packageId)}`, {
      method: "DELETE",
    });
    const json = await response.json();

    if (!response.ok || !json.ok) {
      setListStatus(json?.error?.message ?? "Gagal menghapus paket");
      return;
    }

    await refreshData();
  }

  async function handleRemoveFromBagging(packageId: string) {
    setListStatus(null);

    const response = await fetch(
      `/api/admin/manifests?packageId=${encodeURIComponent(packageId)}`,
      { method: "DELETE" },
    );
    const json = await response.json();

    if (!response.ok || !json.ok) {
      setListStatus(json?.error?.message ?? "Gagal mengeluarkan paket dari bagging");
      return;
    }

    await refreshData();
  }

  function togglePackage(packageId: string) {
    setSelectedPackageIds((current) =>
      current.includes(packageId)
        ? current.filter((id) => id !== packageId)
        : [...current, packageId],
    );
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-mono text-xl font-semibold text-slate-900">Input Packages</h2>
          <form onSubmit={handleCreatePackage} className="mt-4 space-y-3">
            <input
              value={createPackageForm.packageName}
              onChange={(event) =>
                setCreatePackageForm((prev) => ({ ...prev, packageName: event.target.value }))
              }
              placeholder="Nama paket"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              value={createPackageForm.receiverName}
              onChange={(event) =>
                setCreatePackageForm((prev) => ({ ...prev, receiverName: event.target.value }))
              }
              placeholder="Nama penerima"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <textarea
              value={createPackageForm.receiverAddress}
              onChange={(event) =>
                setCreatePackageForm((prev) => ({ ...prev, receiverAddress: event.target.value }))
              }
              placeholder="Alamat lengkap pengiriman"
              className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={createPackageForm.destinationCity}
                onChange={(event) =>
                  setCreatePackageForm((prev) => ({ ...prev, destinationCity: event.target.value }))
                }
                placeholder="Kota tujuan"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                value={createPackageForm.weightKg}
                onChange={(event) =>
                  setCreatePackageForm((prev) => ({ ...prev, weightKg: event.target.value }))
                }
                placeholder="Berat (kg)"
                type="number"
                min={0.01}
                step={0.01}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              Buat Paket
            </button>
            {packageStatus ? <p className="text-sm text-slate-600">{packageStatus}</p> : null}
          </form>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-mono text-xl font-semibold text-slate-900">Bagging Manual</h2>
          <form onSubmit={handleCreateBagging} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={baggingForm.bagCode}
                onChange={(event) =>
                  setBaggingForm((prev) => ({ ...prev, bagCode: event.target.value.toUpperCase() }))
                }
                placeholder="Kode bagging opsional"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <select
                value={baggingForm.destinationCity}
                onChange={(event) => {
                  setBaggingForm((prev) => ({ ...prev, destinationCity: event.target.value }));
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                required
              >
                <option value="">Pilih kota bagging</option>
                {destinationCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div className="max-h-52 overflow-auto rounded-lg border border-slate-200">
              {availablePackages.length ? (
                availablePackages.map((pkg) => (
                  <label
                    key={pkg.id}
                    className="flex cursor-pointer items-start gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPackageIds.includes(pkg.id)}
                      onChange={() => togglePackage(pkg.id)}
                      className="mt-1"
                    />
                    <span className="text-sm text-slate-700">
                      <span className="block font-semibold text-slate-900">
                        {packageName(pkg)} - {pkg.resi}
                      </span>
                      {pkg.receiver_name}, {pkg.receiver_address}
                    </span>
                  </label>
                ))
              ) : (
                <p className="px-3 py-4 text-sm text-slate-500">
                  Pilih paket yang ingin dimasukkan ke bagging manual.
                </p>
              )}
            </div>

            <textarea
              value={baggingForm.resiNumbers}
              onChange={(event) =>
                setBaggingForm((prev) => ({ ...prev, resiNumbers: event.target.value }))
              }
              placeholder="Tambahkan resi manual bila perlu, pisahkan koma atau baris baru"
              className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase"
            />
            <button
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              Buat Bagging
            </button>
            {baggingStatus ? <p className="text-sm text-slate-600">{baggingStatus}</p> : null}
          </form>
        </article>
      </div>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-mono text-xl font-semibold text-slate-900">Seluruh Package</h2>
          <button
            type="button"
            onClick={() => void refreshData()}
            className="w-fit rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Refresh
          </button>
        </div>
        {listStatus ? <p className="mt-3 text-sm text-red-600">{listStatus}</p> : null}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-3 pe-3">Resi</th>
                <th className="px-3 py-3">Paket</th>
                <th className="px-3 py-3">Alamat</th>
                <th className="px-3 py-3">Kota</th>
                <th className="px-3 py-3">Berat</th>
                <th className="py-3 ps-3">Status</th>
                <th className="py-3 ps-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {packages.map((pkg) => {
                const isEditing = editingPackageId === pkg.id;

                return (
                  <Fragment key={pkg.id}>
                    <tr className="align-top">
                      <td className="py-3 pe-3 font-mono text-xs font-semibold text-slate-900">{pkg.resi}</td>
                      <td className="px-3 py-3">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              value={editPackageForm.packageName}
                              onChange={(event) =>
                                setEditPackageForm((prev) => ({ ...prev, packageName: event.target.value }))
                              }
                              className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                            />
                            <input
                              value={editPackageForm.receiverName}
                              onChange={(event) =>
                                setEditPackageForm((prev) => ({ ...prev, receiverName: event.target.value }))
                              }
                              className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                            />
                          </div>
                        ) : (
                          <>
                            <p className="font-semibold text-slate-900">{packageName(pkg)}</p>
                            <p className="text-slate-500">{pkg.receiver_name}</p>
                          </>
                        )}
                      </td>
                      <td className="max-w-xs px-3 py-3 text-slate-600">
                        {isEditing ? (
                          <textarea
                            value={editPackageForm.receiverAddress}
                            onChange={(event) =>
                              setEditPackageForm((prev) => ({ ...prev, receiverAddress: event.target.value }))
                            }
                            className="min-h-20 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                          />
                        ) : (
                          pkg.receiver_address
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {isEditing ? (
                          <input
                            value={editPackageForm.destinationCity}
                            onChange={(event) =>
                              setEditPackageForm((prev) => ({ ...prev, destinationCity: event.target.value }))
                            }
                            className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                          />
                        ) : (
                          packageCity(pkg) || "-"
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {isEditing ? (
                          <input
                            value={editPackageForm.weightKg}
                            onChange={(event) =>
                              setEditPackageForm((prev) => ({ ...prev, weightKg: event.target.value }))
                            }
                            type="number"
                            min={0.01}
                            step={0.01}
                            className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                          />
                        ) : (
                          `${pkg.weight_kg} kg`
                        )}
                      </td>
                      <td className="py-3 ps-3">
                        <select
                          value={pkg.status}
                          onChange={(event) =>
                            void handleStatusChange(pkg.id, event.target.value as PackageStatus)
                          }
                          disabled={isEditing}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-60"
                        >
                          {adminPackageStatuses.map((status) => (
                            <option key={status} value={status}>
                              {statusLabel(status)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 ps-3">
                        {isEditing ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void handleUpdatePackage(pkg.id)}
                              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              Simpan
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditPackage}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => startEditPackage(pkg)}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeletePackage(pkg.id)}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600"
                            >
                              Hapus
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {!packages.length ? <p className="py-6 text-sm text-slate-500">Belum ada paket.</p> : null}
        </div>
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-mono text-xl font-semibold text-slate-900">Seluruh Bagging</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {baggings.map((bag) => {
            const items = bag.bag_items ?? [];

            return (
              <div key={bag.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-semibold text-slate-900">{bag.bag_code}</p>
                    <p className="text-sm text-slate-600">
                      Kota tujuan: {normalizeCity(bag.destination_city) || "Mengikuti paket"}
                    </p>
                  </div>
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                    {items.length} paket
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {items.map((item, index) => {
                    const pkg = Array.isArray(item.packages) ? item.packages[0] : item.packages;

                    return pkg ? (
                      <div
                        key={`${bag.id}-${pkg.id}`}
                        className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {packageName(pkg)} - {pkg.resi}
                          </p>
                          <p className="text-slate-600">{pkg.receiver_name}</p>
                          <p className="text-xs font-semibold text-slate-500">{statusLabel(pkg.status)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleRemoveFromBagging(pkg.id)}
                          className="shrink-0 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                        >
                          Keluarkan
                        </button>
                      </div>
                    ) : (
                      <p key={`${bag.id}-${index}`} className="text-sm text-slate-500">
                        Detail paket tidak tersedia.
                      </p>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {!baggings.length ? <p className="mt-4 text-sm text-slate-500">Belum ada data bagging.</p> : null}
      </article>
    </section>
  );
}
