"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const MapPicker = dynamic(() => import("./map-picker").then((m) => m.MapPicker), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
      <span className="text-sm text-slate-400">Loading map…</span>
    </div>
  ),
});

type Props = { redirectTo: string };

function Field({
  label,
  id,
  type = "text",
  placeholder,
  value,
  onChange,
  required,
  className,
}: {
  label: string;
  id: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#1A3CA8] focus:ring-1 focus:ring-[#1A3CA8]"
      />
    </div>
  );
}

function generateResiPreview() {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `NEKO-${year}-${code}`;
}

export function PortalInputPackage({ redirectTo }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resiPreview, setResiPreview] = useState("");

  useEffect(() => {
    setResiPreview(generateResiPreview());
  }, []);

  const [form, setForm] = useState({
    packageName: "",
    senderName: "",
    senderContact: "",
    senderEmail: "",
    receiverName: "",
    receiverContact: "",
    streetAddress: "",
    city: "",
    state: "",
    zip: "",
    weightKg: "",
    lengthCm: "",
    widthCm: "",
    heightCm: "",
  });

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  function set(field: string) {
    return (val: string) => setForm((prev) => ({ ...prev, [field]: val }));
  }

  const fullAddress = [form.streetAddress, form.city, form.state, form.zip].filter(Boolean).join(", ");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      packageName: form.packageName || "Package",
      senderName: form.senderName,
      senderPhone: form.senderContact || null,
      senderEmail: form.senderEmail || null,
      receiverName: form.receiverName,
      receiverPhone: form.receiverContact || null,
      receiverAddress: fullAddress || form.streetAddress,
      receiverState: form.state || null,
      receiverZip: form.zip || null,
      destinationCity: form.city,
      weightKg: Number.parseFloat(form.weightKg) || 0,
      lengthCm: form.lengthCm ? Number.parseFloat(form.lengthCm) : null,
      widthCm: form.widthCm ? Number.parseFloat(form.widthCm) : null,
      heightCm: form.heightCm ? Number.parseFloat(form.heightCm) : null,
      targetLatitude: lat,
      targetLongitude: lng,
    };

    try {
      const res = await fetch("/api/admin/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error?.message ?? "Failed to save package");
        return;
      }
      setSuccess(`Package created: ${json.data.resi}`);
      setTimeout(() => router.push(redirectTo), 1200);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#1A3CA8]">
            Workflow: Intake
          </span>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Input New Package</h1>
          <p className="mt-1 text-sm text-slate-500">
            Initiate a new logistics record. Ensure all physical dimensions and weight are verified before generating the master tracking ID.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {success}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Left column - forms */}
        <div className="col-span-2 space-y-5">
          {/* Sender Information */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A3CA8" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-slate-800">Sender Information</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full Name" id="senderName" placeholder="e.g. Satoshi Nakamoto" value={form.senderName} onChange={set("senderName")} required />
              <Field label="Contact Number" id="senderContact" placeholder="+1 (555) 000-0000" value={form.senderContact} onChange={set("senderContact")} />
              <Field label="Email Address" id="senderEmail" type="email" placeholder="sender@provider.com" value={form.senderEmail} onChange={set("senderEmail")} className="col-span-2" />
            </div>
          </div>

          {/* Receiver Information */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A3CA8" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-slate-800">Receiver Information</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full Name" id="receiverName" placeholder="e.g. Vitalik Buterin" value={form.receiverName} onChange={set("receiverName")} required />
              <Field label="Contact Number" id="receiverContact" placeholder="+44 20 7946 0958" value={form.receiverContact} onChange={set("receiverContact")} />
            </div>
          </div>

          {/* Destination Address */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A3CA8" strokeWidth="2">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-slate-800">Destination Address</h2>
            </div>
            <div className="space-y-4">
              <Field label="Street Address" id="streetAddress" placeholder="Unit 42, Innovation Blvd" value={form.streetAddress} onChange={set("streetAddress")} required className="col-span-2" />
              <div className="grid grid-cols-3 gap-3">
                <Field label="City" id="city" placeholder="Jakarta" value={form.city} onChange={set("city")} required />
                <Field label="State / Province" id="state" placeholder="DKI" value={form.state} onChange={set("state")} />
                <Field label="ZIP" id="zip" placeholder="10110" value={form.zip} onChange={set("zip")} />
              </div>
            </div>
          </div>

          {/* Package name */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A3CA8" strokeWidth="2">
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-slate-800">Package Details</h2>
            </div>
            <Field label="Package Name / Description" id="packageName" placeholder="e.g. Electronics, Fragile Cargo" value={form.packageName} onChange={set("packageName")} />
          </div>
        </div>

        {/* Right column - metrics + identifier + map */}
        <div className="space-y-5">
          {/* Package Metrics */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-800">Package Metrics</h3>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Weight (KG)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  value={form.weightKg}
                  onChange={(e) => set("weightKg")(e.target.value)}
                  placeholder="0.0"
                  required
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1A3CA8] focus:ring-1 focus:ring-[#1A3CA8]"
                />
                <span className="text-xs font-semibold text-slate-400">KG</span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { label: "L (CM)", field: "lengthCm" },
                { label: "W (CM)", field: "widthCm" },
                { label: "H (CM)", field: "heightCm" },
              ].map((dim) => (
                <div key={dim.field}>
                  <label className="mb-1 block text-xs text-slate-400">{dim.label}</label>
                  <input
                    type="number"
                    min="0"
                    value={form[dim.field as keyof typeof form]}
                    onChange={(e) => set(dim.field)(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1A3CA8] focus:ring-1 focus:ring-[#1A3CA8]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Identifier Generator */}
          <div className="rounded-xl border border-slate-200 bg-[#1A3CA8] p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">Identifier Generator</p>
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#162E8A] px-3 py-2">
              <p className="flex-1 font-mono text-sm font-bold text-white"># {resiPreview}</p>
              <button
                type="button"
                onClick={() => setResiPreview(generateResiPreview())}
                className="rounded-md bg-white/20 px-2 py-1 text-xs font-semibold text-white hover:bg-white/30 transition"
              >
                Generate
              </button>
            </div>
            <p className="mt-2 text-xs text-blue-200">
              * Tracking number will be unique and encrypted upon generation.
            </p>
          </div>

          {/* Action buttons */}
          <button
            type="submit"
            disabled={loading || !!success}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A3CA8] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1530a0] disabled:opacity-70 transition"
          >
            {loading ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            )}
            Save Record
          </button>
          <button
            type="button"
            onClick={() => router.push(redirectTo)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            System: Synchronized
          </div>

          {/* Map */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Delivery Location Pin
              </h3>
              {lat !== null && (
                <button type="button" onClick={() => { setLat(null); setLng(null); }} className="text-xs text-red-400 hover:text-red-600">
                  Clear
                </button>
              )}
            </div>
            <MapPicker lat={lat} lng={lng} onChange={(la, lo) => { setLat(la); setLng(lo); }} />
            {lat !== null && lng !== null && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div>
                  <span className="font-semibold">Lat:</span> {lat.toFixed(6)}
                </div>
                <div>
                  <span className="font-semibold">Lng:</span> {lng.toFixed(6)}
                </div>
              </div>
            )}
            <p className="mt-2 text-[11px] text-slate-400">
              Global Routing Intelligence — click the map to assign delivery coordinates for the courier app.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
