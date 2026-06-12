"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type Courier = { id: string; full_name: string };

type BagPackage = {
  id: string;
  resi: string;
  package_name: string | null;
  receiver_name: string;
  receiver_address: string;
  destination_city: string | null;
  weight_kg: number | string;
  status: string;
};

type BagRecord = {
  id: string;
  bag_code: string;
  destination_city: string | null;
  status: string;
  created_at: string;
  package_count: number;
  assigned_courier_id: string | null;
  bag_items?: Array<{
    packages?: BagPackage | { id?: string };
  }>;
};

type Props = {
  availablePackages: BagPackage[];
  existingBags: BagRecord[];
  couriers: Courier[];
};

type ScanEntry = {
  id: string;
  resi: string;
  type: string;
  weight: string;
  status: "SCANNED" | "INVALID";
  error?: string;
  time: string;
};

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-slate-100 text-slate-600",
  OUT_FOR_DELIVERY: "bg-orange-100 text-orange-700",
  IN_TRANSIT: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function PortalBagging({ availablePackages, existingBags, couriers }: Readonly<Props>) {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [autoAddedPackageIds, setAutoAddedPackageIds] = useState<Set<string>>(new Set());
  const [pkgSearch, setPkgSearch] = useState("");
  const [scanQueue, setScanQueue] = useState<ScanEntry[]>([]);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Bag management state — synced with server prop via useEffect
  const [bags, setBags] = useState<BagRecord[]>(existingBags);
  const [courierPickers, setCourierPickers] = useState<Record<string, string>>({});
  const [assigningBagId, setAssigningBagId] = useState<string | null>(null);
  const [assignMsgs, setAssignMsgs] = useState<Record<string, { text: string; ok: boolean }>>({});
  const [deletingBagId, setDeletingBagId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const scanRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setBags(existingBags); }, [existingBags]);
  useEffect(() => { scanRef.current?.focus(); }, []);

  // Calculate package IDs already in bags
  const baggingIds = new Set<string>();
  for (const bag of bags) {
    const items = Array.isArray(bag.bag_items) ? bag.bag_items : [];
    for (const item of items) {
      const pkg = item?.packages;
      if (pkg && typeof pkg === "object" && "id" in pkg) {
        baggingIds.add(String(pkg.id));
      }
    }
  }

  const scanned = scanQueue.filter((e) => e.status === "SCANNED");
  const scannedIds = new Set(scanned.map((e) => e.id));
  const q = pkgSearch.toLowerCase();

  // Determine current city: from dropdown or inferred from first scanned package
  const currentCity = selectedCity || (scanned.length > 0 ? availablePackages.find((p) => p.id === scanned[0].id)?.destination_city : "");

  // Filter available packages: exclude scanned + already bagged + enforce single city per bag
  const filteredAvailable = availablePackages.filter(
    (p) =>
      !scannedIds.has(p.id) &&
      !baggingIds.has(p.id) &&
      (currentCity === "" || p.destination_city === currentCity) &&
      (q === "" ||
        p.resi.toLowerCase().includes(q) ||
        p.receiver_name.toLowerCase().includes(q) ||
        (p.destination_city ?? "").toLowerCase().includes(q)),
  );

  // Get unique cities ONLY from filtered available packages
  const availableCities = [...new Set(filteredAvailable
    .map((p) => p.destination_city)
    .filter(Boolean))] as string[];

  // Auto-add packages when city is selected + validate single-city enforcement
  useEffect(() => {
    if (selectedCity) {
      setScanQueue((prev) => {
        // Calculate current scanned IDs from previous state
        const currentScannedIds = new Set(prev.filter((e) => e.status === "SCANNED").map((e) => e.id));
        
        // Recalculate baggingIds inside useEffect to use latest bags
        const currentBaggingIds = new Set<string>();
        for (const bag of bags) {
          const items = Array.isArray(bag.bag_items) ? bag.bag_items : [];
          for (const item of items) {
            const pkg = item?.packages;
            if (pkg && typeof pkg === "object" && "id" in pkg) {
              currentBaggingIds.add(String(pkg.id));
            }
          }
        }
        
        // Build map of packageId -> package for lookup
        const pkgMap = new Map(availablePackages.map((p) => [p.id, p]));
        
        // Filter: keep ONLY packages from selected city, remove any from other cities
        const validatedQueue = prev.filter((entry) => {
          const pkg = pkgMap.get(entry.id);
          return pkg && pkg.destination_city === selectedCity;
        });
        
        const packagesToAdd = availablePackages.filter(
          (pkg) =>
            pkg.destination_city === selectedCity &&
            !currentScannedIds.has(pkg.id) &&
            !currentBaggingIds.has(pkg.id),
        );
        
        if (packagesToAdd.length === 0) return validatedQueue; // Return validated queue even if no new packages
        
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const newAutoAddedIds = new Set(packagesToAdd.map((pkg) => pkg.id));
        setAutoAddedPackageIds(newAutoAddedIds);

        return [
          ...packagesToAdd.map((pkg) => ({
            id: pkg.id,
            resi: pkg.resi,
            type: pkg.package_name ?? "Package",
            weight: String(pkg.weight_kg ?? "0"),
            status: "SCANNED" as const,
            time,
          })),
          ...validatedQueue,
        ];
      });
    } else {
      // If city is deselected, remove auto-added packages
      setScanQueue((prev) => prev.filter((e) => !autoAddedPackageIds.has(e.id)));
      setAutoAddedPackageIds(new Set());
    }
  }, [selectedCity, availablePackages, bags]);

  const successCount = scanned.length;
  const errorCount = scanQueue.filter((e) => e.status === "INVALID").length;
  const totalWeight = scanned.reduce((sum, e) => sum + Number.parseFloat(e.weight || "0"), 0);
  const bagCapacity = Math.min(100, Math.round((totalWeight / 200) * 100));

  function addPackageToQueue(pkg: BagPackage) {
    if (scannedIds.has(pkg.id) || baggingIds.has(pkg.id)) return;
    
    // Enforce single-city rule
    // If city already selected, only allow packages from that city
    if (selectedCity && pkg.destination_city !== selectedCity) return;
    
    // If no city selected but packages already in queue, infer city from first scanned package
    if (!selectedCity && scanned.length > 0) {
      const firstCity = availablePackages.find((p) => p.id === scanned[0].id)?.destination_city;
      if (firstCity && pkg.destination_city !== firstCity) return;
    }
    
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setScanQueue((prev) => [
      { id: pkg.id, resi: pkg.resi, type: pkg.package_name ?? "Package", weight: String(pkg.weight_kg ?? "0"), status: "SCANNED", time },
      ...prev,
    ]);
  }

  function removeFromQueue(id: string) {
    setScanQueue((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleFinalize() {
    const validResi = scanned.map((e) => e.resi);
    if (!validResi.length) { setCreateMsg({ text: "No packages scanned yet.", ok: false }); return; }
    
    // Determine final city: use selected city or infer from first scanned package
    let finalCity = selectedCity.trim();
    
    if (!finalCity && scanned.length > 0) {
      // Infer city from first package in queue
      const firstPkgId = scanned[0].id;
      const firstPkg = availablePackages.find((p) => p.id === firstPkgId);
      finalCity = firstPkg?.destination_city?.trim() ?? "";
    }
    
    if (!finalCity) { 
      setCreateMsg({ text: "Cannot determine destination city. Please select a city or add packages from same city.", ok: false }); 
      return; 
    }

    setCreating(true);
    setCreateMsg(null);

    try {
      const payload: Record<string, unknown> = {
        resiNumbers: validResi,
        packageIds: scanned.map((e) => e.id),
        destinationCity: finalCity,
      };
      
      const res = await fetch("/api/admin/manifests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json() as {
        ok?: boolean;
        data?: { bag_id?: string; bag_code?: string; destination_city?: string; package_count?: number };
        error?: { message?: string };
      };

      if (res.ok && json.ok && json.data) {
        const newBag: BagRecord = {
          id: json.data.bag_id ?? crypto.randomUUID(),
          bag_code: json.data.bag_code ?? "BAG-???",
          destination_city: json.data.destination_city ?? finalCity,
          status: "OPEN",
          created_at: new Date().toISOString(),
          package_count: json.data.package_count ?? validResi.length,
          assigned_courier_id: null,
        };
        setBags((prev) => [newBag, ...prev]);
        setCreateMsg({
          text: `Bag ${newBag.bag_code} created with ${newBag.package_count} packages. Assign a courier in the table below.`,
          ok: true,
        });
        setScanQueue([]);
        setDestination("");
        setSelectedCity("");
        setAutoAddedPackageIds(new Set());
        router.refresh();
      } else {
        setCreateMsg({ text: json?.error?.message ?? "Failed to create bag.", ok: false });
      }
    } catch {
      setCreateMsg({ text: "Connection failed. Please try again.", ok: false });
    }
    setCreating(false);
  }

  async function handleAssign(bag: BagRecord, courierId: string | null) {
    setAssigningBagId(bag.id);

    try {
      const res = await fetch("/api/admin/manifests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bagId: bag.id, assignedCourierId: courierId }),
      });
      const json = await res.json() as { ok?: boolean; error?: { message?: string } };

      if (res.ok && json.ok) {
        const courier = courierId ? couriers.find((c) => c.id === courierId) : null;
        setBags((prev) =>
          prev.map((b) =>
            b.id === bag.id
              ? { ...b, assigned_courier_id: courierId, status: courierId ? "OUT_FOR_DELIVERY" : "OPEN" }
              : b,
          ),
        );
        setAssignMsgs((prev) => ({
          ...prev,
          [bag.id]: {
            text: courierId ? `Assigned to ${courier?.full_name ?? "courier"}.` : "Courier assignment removed.",
            ok: true,
          },
        }));
        if (courierId) {
          setCourierPickers((prev) => ({ ...prev, [bag.id]: "" }));
        }
        router.refresh();
      } else {
        setAssignMsgs((prev) => ({
          ...prev,
          [bag.id]: { text: json?.error?.message ?? "Failed to assign courier.", ok: false },
        }));
      }
    } catch {
      setAssignMsgs((prev) => ({ ...prev, [bag.id]: { text: "Connection failed.", ok: false } }));
    }
    setAssigningBagId(null);
  }

  async function handleDeleteBag(bagId: string) {
    setDeletingBagId(bagId);
    try {
      const res = await fetch(`/api/admin/manifests?bagId=${bagId}`, { method: "DELETE" });
      const json = await res.json() as { ok?: boolean; error?: { message?: string } };
      if (res.ok && json.ok) {
        setBags((prev) => prev.filter((b) => b.id !== bagId));
        setDeleteConfirmId(null);
        router.refresh();
      } else {
        setAssignMsgs((prev) => ({
          ...prev,
          [bagId]: { text: json?.error?.message ?? "Failed to delete bag.", ok: false },
        }));
      }
    } catch {
      setAssignMsgs((prev) => ({ ...prev, [bagId]: { text: "Connection failed.", ok: false } }));
    }
    setDeletingBagId(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consolidation</h1>
          <p className="mt-1 text-sm text-slate-500">Group packages by destination and assign to couriers.</p>
        </div>
        <button
          onClick={() => { 
            setScanQueue([]); 
            setDestination(""); 
            setSelectedCity("");

            setAutoAddedPackageIds(new Set());
            setCreateMsg(null); 
          }}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 3h18M3 9h18M3 15h18M3 21h18" /></svg>
          Reset Form
        </button>
      </div>

      {/* Create Bag Notification */}
      {createMsg && (
        <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${createMsg.ok ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {createMsg.text}
        </div>
      )}

      {/* Create Bag section */}
      <div className="grid grid-cols-5 gap-6">
        {/* Left: Parameters + Scan */}
        <div className="col-span-2 space-y-5">
          {/* Bag Parameters */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
              </svg>
              New Bag Parameters
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="city-select" className="mb-1.5 block text-xs font-semibold text-slate-500">Filter by City</label>
                <select
                  id="city-select"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  disabled={successCount > 0}
                  className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#1A3CA8] focus:ring-1 focus:ring-[#1A3CA8] ${successCount > 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <option value="">-- Pilih Kota (opsional) --</option>
                  {availableCities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                {selectedCity && (
                  <p className="mt-2 text-xs text-[#1A3CA8] font-medium">
                    ✓ Packages dari <strong>{selectedCity}</strong> akan otomatis ditambahkan ke antrian.
                    {successCount > 0 && " (Kota terkunci - tekan Reset Form untuk ubah)"}
                  </p>
                )}
                {!selectedCity && successCount > 0 && (
                  <p className="mt-2 text-xs text-red-600 font-medium">⚠ Tekan Reset Form untuk ubah atau finalize bag ini.</p>
                )}
              </div>

            </div>
          </div>

          {/* Available Packages */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                Available Packages ({filteredAvailable.length})
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                <input
                  type="text"
                  value={pkgSearch}
                  onChange={(e) => setPkgSearch(e.target.value)}
                  placeholder="Search tracking no., name, city..."
                  className="flex-1 text-xs outline-none text-slate-700 placeholder-slate-400"
                />
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto divide-y divide-slate-50">
              {filteredAvailable.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => addPackageToQueue(pkg)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-blue-50 transition group"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-slate-800 truncate">{pkg.resi}</p>
                    <p className="text-xs text-slate-400 truncate">{pkg.destination_city ?? pkg.receiver_address} · {String(pkg.weight_kg)} kg</p>
                  </div>
                  <div className="ml-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-[#1A3CA8] group-hover:text-white transition">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                  </div>
                </button>
              ))}
              {filteredAvailable.length === 0 && (
                <p className="px-4 py-6 text-center text-xs text-slate-400">
                  {availablePackages.length === 0 ? "No packages with status PACKAGE_CREATED / IN_WAREHOUSE" : "No results found"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Stats + Queue + Finalize */}
        <div className="col-span-3 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-400">Total Scanned</p>
              <p className="text-2xl font-bold text-slate-900">{successCount} <span className="text-sm font-normal text-slate-400">packages</span></p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-400">Total Weight</p>
              <p className="text-2xl font-bold text-slate-900">{totalWeight.toFixed(1)} <span className="text-sm font-normal text-slate-400">kg</span></p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-400">Error</p>
              <p className={`text-2xl font-bold ${errorCount > 0 ? "text-red-600" : "text-slate-400"}`}>{errorCount}</p>
            </div>
          </div>

          {/* Scan Queue */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Scan Queue</p>
              <div className="flex gap-2">
                {successCount > 0 && <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">{successCount} OK</span>}
                {errorCount > 0 && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">{errorCount} Error</span>}
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400">Tracking No.</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400">Package Name</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-400">Weight</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-400">Status</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {scanQueue.map((entry) => {
                    const isAutoAdded = autoAddedPackageIds.has(entry.id);
                    return (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <p className={`font-mono text-xs font-semibold ${entry.status === "INVALID" ? "text-red-600" : "text-slate-800"}`}>{entry.resi}</p>
                          {isAutoAdded && <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Auto</span>}
                        </div>
                        <p className="text-xs text-slate-400">{entry.time}</p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs">{entry.type}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-slate-600">{Number.parseFloat(entry.weight).toFixed(1)} kg</td>
                      <td className="px-4 py-2.5 text-right">
                        {entry.status === "SCANNED" ? (
                          <span className="text-xs font-semibold text-[#1A3CA8]">✓ SCANNED</span>
                        ) : (
                          <span className="text-xs font-semibold text-red-600">{entry.error ?? "INVALID"}</span>
                        )}
                      </td>
                      <td className="pr-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeFromQueue(entry.id)}
                          className="flex h-5 w-5 items-center justify-center rounded text-slate-300 hover:bg-red-50 hover:text-red-500 transition"
                          title="Remove from queue"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                  {scanQueue.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">Scan or type a tracking number above, then press Enter</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Capacity + Finalize */}
            <div className="border-t border-slate-100 px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-semibold text-slate-500">Bag Capacity</span>
                    <span className="font-semibold text-slate-700">{bagCapacity}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    {(() => {
                      let barColor = "bg-[#1A3CA8]";
                      if (bagCapacity > 80) barColor = "bg-red-500";
                      else if (bagCapacity > 60) barColor = "bg-orange-400";
                      return <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${bagCapacity}%` }} />;
                    })()}
                  </div>
                </div>
                <button
                  onClick={handleFinalize}
                  disabled={creating || successCount === 0}
                  className="flex items-center gap-2 rounded-xl bg-[#1A3CA8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1530a0] disabled:opacity-50 transition shrink-0"
                >
                  {creating ? (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                  )}
                  {creating ? "Creating..." : "Finalize & Create Bag"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bag Management */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-800">Bag Management & Courier Assignment</h2>
          <p className="mt-0.5 text-xs text-slate-400">Select a courier for each bag. The courier will automatically receive delivery tasks.</p>
        </div>

        {bags.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              </svg>
            </div>
            <p className="text-sm text-slate-500">No bags yet. Create your first bag above.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {bags.map((bag) => {
              const courier = bag.assigned_courier_id
                ? couriers.find((c) => c.id === bag.assigned_courier_id)
                : null;
              const assignMsg = assignMsgs[bag.id];
              const selectedCourier = courierPickers[bag.id] ?? "";
              const isAssigning = assigningBagId === bag.id;
              const isDeleting = deletingBagId === bag.id;
              const isConfirmingDelete = deleteConfirmId === bag.id;

              return (
                <div key={bag.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-start gap-4">
                    {/* Bag Info */}
                    <div className="min-w-45 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#1A3CA8]">{bag.bag_code}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[bag.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {bag.status}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                          {bag.destination_city ?? "Not specified"}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /></svg>
                          {bag.package_count} packages
                        </span>
                        <span>{formatDate(bag.created_at)}</span>
                      </div>
                    </div>

                    {/* Courier Assignment + Delete */}
                    <div className="flex flex-col items-end gap-2">
                      {bag.assigned_courier_id && courier && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1A3CA8] text-xs font-bold text-white">
                              {courier.full_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-semibold text-[#1A3CA8]">{courier.full_name}</span>
                          </div>
                          <button
                            onClick={() => handleAssign(bag, null)}
                            disabled={isAssigning}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
                          >
                            {isAssigning ? "..." : "Unassign"}
                          </button>
                        </div>
                      )}
                      {!bag.assigned_courier_id && couriers.length > 0 && (
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedCourier}
                            onChange={(e) => setCourierPickers((prev) => ({ ...prev, [bag.id]: e.target.value }))}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-[#1A3CA8] focus:ring-1 focus:ring-[#1A3CA8]"
                          >
                            <option value="">Select courier...</option>
                            {couriers.map((c) => (
                              <option key={c.id} value={c.id}>{c.full_name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAssign(bag, selectedCourier)}
                            disabled={!selectedCourier || isAssigning}
                            className="flex items-center gap-1.5 rounded-lg bg-[#1A3CA8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1530a0] disabled:opacity-50 transition"
                          >
                            {isAssigning ? (
                              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            ) : (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                            )}
                            Assign Courier
                          </button>
                        </div>
                      )}
                      {!bag.assigned_courier_id && couriers.length === 0 && (
                        <span className="text-xs text-slate-400">No couriers available</span>
                      )}

                      {/* Delete bag */}
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-600 font-medium">Delete this bag?</span>
                          <button
                            onClick={() => handleDeleteBag(bag.id)}
                            disabled={isDeleting}
                            className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition"
                          >
                            {isDeleting ? "..." : "Yes, Delete"}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(bag.id)}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                          Delete Bag
                        </button>
                      )}

                      {assignMsg && (
                        <p className={`text-xs font-medium ${assignMsg.ok ? "text-green-600" : "text-red-600"}`}>
                          {assignMsg.text}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
