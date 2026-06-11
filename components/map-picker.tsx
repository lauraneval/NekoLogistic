"use client";

import { useEffect, useRef, useState } from "react";

type NominatimResult = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
};

type Props = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
};

declare global {
  interface Window {
    L: typeof import("leaflet");
  }
}

export function MapPicker({ lat, lng, onChange }: Readonly<Props>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const iconRef = useRef<import("leaflet").DivIcon | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a ref to onChange so dragend handler always calls the latest version
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Place or move marker on the map without calling onChange (caller is responsible)
  function placeMarkerOnMap(pinLat: number, pinLng: number) {
    const L = leafletRef.current;
    const map = mapRef.current;
    const icon = iconRef.current;
    if (!L || !map || !icon) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([pinLat, pinLng]);
    } else {
      const m = L.marker([pinLat, pinLng], { icon, draggable: true }).addTo(map);
      markerRef.current = m;
      m.on("dragend", () => {
        const pos = m.getLatLng();
        onChangeRef.current(pos.lat, pos.lng);
      });
    }
  }

  async function searchPlaces(q: string) {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setSearching(true);
    setGeoError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=6&addressdetails=1&countrycodes=id`,
        { headers: { "Accept-Language": "id,en" } },
      );
      if (!res.ok) throw new Error("Geocoding request failed");
      const data = await res.json() as NominatimResult[];
      setResults(data);
      setShowResults(data.length > 0);
      if (data.length === 0) setGeoError("Location not found. Try a different keyword.");
    } catch {
      setGeoError("Search failed. Please check your internet connection.");
      setResults([]);
    }
    setSearching(false);
  }

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    setGeoError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void searchPlaces(v); }, 450);
  }

  function handleSelectResult(result: NominatimResult) {
    const rlat = Number.parseFloat(result.lat);
    const rlng = Number.parseFloat(result.lon);
    onChange(rlat, rlng);
    placeMarkerOnMap(rlat, rlng);
    mapRef.current?.flyTo([rlat, rlng], 16, { animate: true, duration: 1 });
    // Show shortened display name in search box
    const parts = result.display_name.split(", ");
    setQuery(parts.slice(0, 3).join(", "));
    setShowResults(false);
    setGeoError(null);
  }

  // Initialize map (runs once on mount)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    void import("leaflet").then((L) => {
      if (!containerRef.current || mapRef.current) return;
      leafletRef.current = L;

      const defaultLat = lat ?? -6.2088;
      const defaultLng = lng ?? 106.8456;

      const map = L.map(containerRef.current).setView([defaultLat, defaultLng], lat ? 15 : 10);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const icon = L.divIcon({
        html: `<div style="background:#1A3CA8;width:14px;height:14px;border-radius:50%;border:2.5px solid white;box-shadow:0 0 0 2px #1A3CA8;"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        className: "",
      });
      iconRef.current = icon;

      if (lat !== null && lng !== null) {
        const m = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
        markerRef.current = m;
        m.on("dragend", () => {
          const pos = m.getLatLng();
          onChangeRef.current(pos.lat, pos.lng);
        });
      }

      map.on("click", (e) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        onChangeRef.current(clickLat, clickLng);
        placeMarkerOnMap(clickLat, clickLng);
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        leafletRef.current = null;
        iconRef.current = null;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker when lat/lng prop changes externally
  useEffect(() => {
    if (!mapRef.current || lat === null || lng === null) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
    mapRef.current.setView([lat, lng], 15);
  }, [lat, lng]);

  return (
    <div>
      {/* Search box */}
      <div className="relative mb-2">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition focus-within:border-[#1A3CA8] focus-within:ring-1 focus-within:ring-[#1A3CA8]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" className="shrink-0">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            onFocus={() => { if (results.length > 0) setShowResults(true); }}
            onBlur={() => { setTimeout(() => setShowResults(false), 180); }}
            placeholder="Search location... (e.g. Jl. Sudirman Jakarta)"
            className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none"
            aria-label="Search delivery location"
            autoComplete="off"
          />
          {searching && (
            <svg className="h-3.5 w-3.5 shrink-0 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {!searching && query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setResults([]); setShowResults(false); setGeoError(null); }}
              className="shrink-0 text-slate-300 hover:text-slate-500 transition"
              aria-label="Clear search"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Dropdown results */}
        {showResults && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {results.map((r) => (
              <button
                key={r.place_id}
                type="button"
                onMouseDown={() => handleSelectResult(r)}
                className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-blue-50 transition border-b border-slate-50 last:border-0"
              >
                <svg className="mt-0.5 shrink-0 text-[#1A3CA8]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                <span className="text-xs leading-relaxed text-slate-700">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}

        {geoError && !showResults && (
          <p className="mt-1 text-xs text-red-500">{geoError}</p>
        )}
      </div>

      {/* Map */}
      <div className="relative">
        <div ref={containerRef} className="h-64 w-full rounded-xl border border-slate-200" style={{ zIndex: 0 }} />
        <div className="absolute bottom-2 left-2 z-10 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow">
          {lat !== null && lng !== null
            ? `${lat.toFixed(6)}, ${lng.toFixed(6)}`
            : "Click map or search a location above"}
        </div>
      </div>
    </div>
  );
}
