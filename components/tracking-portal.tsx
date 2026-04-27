"use client";

import { useState } from "react";

type TimelineItem = {
  event_code: string;
  event_label: string;
  location: string | null;
  description: string | null;
  created_at: string;
};

type TrackingResult = {
  package: {
    resi: string;
    sender_name: string;
    receiver_name: string;
    status: string;
    created_at: string;
  };
  timeline: TimelineItem[];
};

export function TrackingPortal() {
  const [resi, setResi] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackingResult | null>(null);

  async function onSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/public/tracking/${encodeURIComponent(resi.trim().toUpperCase())}`);
      const json = await response.json();

      if (!response.ok || !json.ok) {
        setError(json?.error?.message ?? "Tracking data tidak ditemukan");
        return;
      }

      setResult(json.data as TrackingResult);
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="tracking" className="rounded-3xl border border-white/15 bg-white/80 p-6 shadow-xl backdrop-blur md:p-8">
      <h2 className="font-mono text-2xl font-semibold text-slate-900">Portal Pelacakan Resi</h2>
      <p className="mt-2 text-sm text-slate-600">Masukkan resi dengan format NEKO-YYYY-XXXX.</p>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          value={resi}
          onChange={(event) => setResi(event.target.value)}
          placeholder="NEKO-2026-1A2B"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm uppercase text-slate-900 outline-none ring-orange-500 transition focus:ring"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Mencari..." : "Lacak"}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}

      {result ? (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl bg-slate-900 p-4 text-white">
            <p className="text-xs uppercase tracking-[0.2em] text-orange-300">Status Terakhir</p>
            <p className="mt-1 text-lg font-semibold">{result.package.status}</p>
            <p className="mt-1 text-xs text-slate-300">Resi {result.package.resi}</p>
          </div>

          <ol className="relative border-s border-slate-200 ps-6">
            {result.timeline.map((item) => (
              <li key={`${item.event_code}-${item.created_at}`} className="mb-8 ms-4">
                <span className="absolute -start-2 mt-1.5 h-3 w-3 rounded-full bg-orange-500" />
                <time suppressHydrationWarning className="text-xs font-medium text-slate-500">
                  {new Date(item.created_at).toLocaleString("id-ID")}
                </time>
                <h3 className="text-base font-semibold text-slate-900">{item.event_label}</h3>
                <p className="text-sm text-slate-600">{item.location ?? "Lokasi belum tersedia"}</p>
                {item.description ? <p className="text-sm text-slate-500">{item.description}</p> : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
