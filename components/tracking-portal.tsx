"use client";

import { useState, useEffect } from "react";

type TrackingEvent = {
  event_code: string;
  event_label: string;
  location: string | null;
  description: string | null;
  created_at: string;
};

type TrackingResult = {
  resi: string;
  status: string;
  receiver_name: string;
  receiver_address: string;
  destination_city: string | null;
  created_at: string;
  delivered_at: string | null;
  timeline: TrackingEvent[];
};

const STATUS_MAP: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  IN_TRANSIT:       { label: "In Transit",        dot: "bg-blue-500",   text: "text-blue-600",   bg: "bg-blue-50" },
  DELIVERED:        { label: "Delivered",          dot: "bg-green-500",  text: "text-green-600",  bg: "bg-green-50" },
  PACKAGE_CREATED:  { label: "Label Created",      dot: "bg-slate-400",  text: "text-slate-600",  bg: "bg-slate-50" },
  IN_WAREHOUSE:     { label: "In Warehouse",       dot: "bg-yellow-500", text: "text-yellow-600", bg: "bg-yellow-50" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery",   dot: "bg-orange-500", text: "text-orange-600", bg: "bg-orange-50" },
  FAILED_DELIVERY:  { label: "Delivery Failed",    dot: "bg-red-500",    text: "text-red-600",    bg: "bg-red-50" },
};

function EventIcon({ code }: { code: string }) {
  const icons: Record<string, React.ReactNode> = {
    IN_TRANSIT: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    ),
    IN_WAREHOUSE: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    OUT_FOR_DELIVERY: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    PACKAGE_CREATED: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    DELIVERED: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    FAILED_DELIVERY: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  };
  const isDelivered = code === "DELIVERED";
  const isActive = code === "IN_TRANSIT" || code === "OUT_FOR_DELIVERY";
  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
        isDelivered ? "bg-green-100 text-green-600" : isActive ? "bg-[#1A3CA8] text-white" : "bg-slate-100 text-slate-500"
      }`}
    >
      {icons[code] ?? icons.PACKAGE_CREATED}
    </div>
  );
}

function IconTruck() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function estimatedDelivery(createdAt: string) {
  const d = new Date(createdAt);
  d.setDate(d.getDate() + 3);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " • 14:00–18:00"
  );
}

const SERVICES = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    title: "Express Delivery",
    desc: "Same-day and next-day shipping options across major Indonesian cities with guaranteed on-time delivery.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    title: "Warehouse & Storage",
    desc: "Secure warehouse facilities with real-time inventory management and automated stock tracking.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    ),
    title: "Manifest & Bagging",
    desc: "Professional consolidation of shipments into optimized delivery bags for efficient last-mile routing.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
    title: "Live Tracking",
    desc: "Real-time package status updates with full timeline history, accessible via web or our courier mobile app.",
  },
];

const FAQS = [
  {
    q: "How do I track my package?",
    a: "Enter your NEKO tracking number (format: NEKO-YYYY-XXXX) in the search box above. If the package has a registered receiver phone number, you will also need to enter it for verification.",
  },
  {
    q: "Why is a phone number required?",
    a: "For packages where the sender registered a receiver phone number, we require verification to protect your shipment privacy. This ensures only the recipient can view the full tracking details.",
  },
  {
    q: "My phone number doesn't match. What should I do?",
    a: "Make sure you're entering the phone number registered by the sender. Try with and without the country code (e.g., 08123456789 or +628123456789). If the issue persists, contact the sender or our support team.",
  },
  {
    q: "How long does delivery take?",
    a: "Delivery times vary by service level and destination. Express shipments typically arrive within 1–2 business days for major cities. Standard shipments take 3–5 business days.",
  },
];

export function TrackingPortal() {
  const [query, setQuery] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phoneRequired, setPhoneRequired] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<"tracking" | "services" | "support">("tracking");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const sectionIds = ["services", "support"] as const;
    const observers: IntersectionObserver[] = [];

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (!el) continue;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { threshold: 0.25 },
      );
      obs.observe(el);
      observers.push(obs);
    }

    const hero = document.getElementById("tracking-hero");
    if (hero) {
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection("tracking"); },
        { threshold: 0.1 },
      );
      obs.observe(hero);
      observers.push(obs);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  async function handleTrack(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setPhoneRequired(false);
    try {
      const resi = query.trim().toUpperCase();
      const params = new URLSearchParams();
      if (phone.trim()) params.set("phone", phone.trim());
      const res = await fetch(
        `/api/public/tracking/${encodeURIComponent(resi)}?${params.toString()}`,
      );
      const json = await res.json();
      if (res.status === 403) {
        setPhoneRequired(true);
        setError(json?.error?.message ?? "Phone verification required.");
        return;
      }
      if (!res.ok || !json.ok) {
        setError(json?.error?.message ?? "Package not found");
        return;
      }
      setResult(json.data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function scrollTo(id: "services" | "support" | "tracking") {
    if (id === "tracking") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
    setActiveSection(id);
  }

  function navCls(section: "tracking" | "services" | "support") {
    return activeSection === section
      ? "font-semibold text-[#1A3CA8] underline underline-offset-4 transition-colors"
      : "font-medium text-slate-600 hover:text-[#1A3CA8] transition-colors";
  }

  const statusCfg = result ? (STATUS_MAP[result.status] ?? STATUS_MAP.IN_TRANSIT) : null;

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Sticky top nav */}
      <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-[#1A3CA8]"><IconTruck /></span>
            <div>
              <p className="text-sm font-bold text-[#1A3CA8] leading-tight">NEKO Logistic</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Delivery Cat</p>
            </div>
          </div>

          {/* Desktop nav links */}
          <div className="hidden items-center gap-6 text-sm md:flex">
            <button type="button" onClick={() => scrollTo("services")} className={navCls("services")}>Services</button>
            <button type="button" onClick={() => scrollTo("tracking")} className={navCls("tracking")}>Tracking Portal</button>
            <button type="button" onClick={() => scrollTo("support")} className={navCls("support")}>Support</button>
          </div>

          {/* Hamburger (mobile only) */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 md:hidden"
          >
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="border-t border-slate-100 bg-white px-6 py-3 md:hidden">
            <div className="flex flex-col gap-1 text-sm">
              <button type="button" onClick={() => { scrollTo("services"); setMenuOpen(false); }}
                className={`rounded-lg px-3 py-2 text-left ${navCls("services")}`}>Services</button>
              <button type="button" onClick={() => { scrollTo("tracking"); setMenuOpen(false); }}
                className={`rounded-lg px-3 py-2 text-left ${navCls("tracking")}`}>Tracking Portal</button>
              <button type="button" onClick={() => { scrollTo("support"); setMenuOpen(false); }}
                className={`rounded-lg px-3 py-2 text-left ${navCls("support")}`}>Support</button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero + search */}
      <section id="tracking-hero" className="border-b border-slate-200 bg-white py-14">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#1A3CA8]">
            NEKO Logistic · The Delivery Cat
          </p>
          <h1 className="mt-3 text-4xl font-bold text-slate-900">
            Track Your Shipment
          </h1>
          <p className="mt-3 text-slate-500">
            Enter your tracking number to see real-time status and the full
            package journey.
          </p>

          <form
            onSubmit={handleTrack}
            className="mx-auto mt-8 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden"
          >
            {/* Tracking number input */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <svg
                width="16"
                height="16"
                className="shrink-0 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value.toUpperCase())}
                placeholder="NEKO-2024-XXXX"
                className="flex-1 font-mono text-sm text-slate-800 placeholder-slate-400 outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); setResult(null); setError(null); setPhoneRequired(false); }}
                  className="text-slate-300 hover:text-slate-500 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Phone input */}
            <div
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                phoneRequired ? "bg-orange-50 border-b border-orange-200" : "border-b border-slate-100"
              }`}
            >
              <svg
                width="16"
                height="16"
                className={`shrink-0 ${phoneRequired ? "text-orange-400" : "text-slate-400"}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={
                  phoneRequired
                    ? "Receiver phone required for this package"
                    : "Receiver phone number (if required)"
                }
                type="tel"
                className={`flex-1 text-sm placeholder-slate-400 outline-none ${
                  phoneRequired ? "text-orange-700 placeholder-orange-400" : "text-slate-800"
                } bg-transparent`}
              />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-xs text-slate-400">
                {phoneRequired
                  ? "Phone verification is required for this package."
                  : "Phone required only if registered by sender."}
              </p>
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="rounded-xl bg-[#1A3CA8] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1530a0] disabled:opacity-60 transition-colors"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Tracking…
                  </span>
                ) : (
                  "Track →"
                )}
              </button>
            </div>
          </form>

          {error && (
            <div
              className={`mx-auto mt-4 max-w-lg rounded-xl border px-5 py-3 text-sm font-medium text-left ${
                phoneRequired
                  ? "border-orange-200 bg-orange-50 text-orange-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {error}
            </div>
          )}
        </div>
      </section>

      {/* Results */}
      {result && statusCfg && (
        <section className="mx-auto max-w-5xl px-6 py-10">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Status sidebar */}
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Current Status
                </p>
                <div className={`mt-2 flex items-center gap-2 text-lg font-bold ${statusCfg.text}`}>
                  <span className={`h-3 w-3 rounded-full ${statusCfg.dot}`} />
                  {statusCfg.label}
                </div>

                <div className="mt-4 space-y-2">
                  <div className="rounded-lg bg-slate-50 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Recipient
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{result.receiver_name}</p>
                  </div>
                  {result.destination_city && (
                    <div className="rounded-lg bg-slate-50 px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Destination
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-700">{result.destination_city}</p>
                    </div>
                  )}
                  {result.status !== "DELIVERED" && (
                    <div className="rounded-lg bg-slate-50 px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Est. Delivery
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {estimatedDelivery(result.created_at)}
                      </p>
                    </div>
                  )}
                  {result.delivered_at && (
                    <div className="rounded-lg bg-green-50 px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-green-500">
                        Delivered On
                      </p>
                      <p className="mt-1 text-sm font-medium text-green-700">
                        {new Date(result.delivered_at).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-800">Package Journey</h2>
                <span className="text-xs text-slate-400">ID: {result.resi}</span>
              </div>
              <div className="space-y-4">
                {result.timeline.map((event, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <EventIcon code={event.event_code} />
                      {idx < result.timeline.length - 1 && (
                        <div className="mt-2 h-5 w-px bg-slate-200" />
                      )}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p
                            className={`font-semibold ${
                              idx === 0 ? "text-slate-900" : "text-slate-500"
                            }`}
                          >
                            {event.event_label}
                          </p>
                          {event.location && (
                            <p className="mt-0.5 text-xs text-slate-400">{event.location}</p>
                          )}
                          {event.description && (
                            <p className="mt-0.5 text-xs text-slate-400">{event.description}</p>
                          )}
                        </div>
                        <div className="ml-4 shrink-0 text-right text-xs">
                          <p
                            className={`font-semibold ${
                              idx === 0 ? "text-[#1A3CA8]" : "text-slate-400"
                            }`}
                          >
                            {new Date(event.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                          <p className="text-slate-400">
                            {new Date(event.created_at).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {result.timeline.length === 0 && (
                  <p className="text-sm text-slate-400">No tracking events yet.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {!result && !error && !loading && (
        <div className="py-10 text-center">
          <p className="text-sm text-slate-400">
            Enter your NEKO tracking number above to view the package journey.
          </p>
        </div>
      )}

      {/* Services section */}
      <section id="services" className="border-t border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#1A3CA8]">
              What we offer
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Our Services</h2>
            <p className="mt-3 text-slate-500">
              End-to-end logistics solutions built for speed, security, and transparency.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {SERVICES.map((s) => (
              <div
                key={s.title}
                className="rounded-2xl border border-slate-200 bg-[#F5F7FA] p-6 hover:border-[#1A3CA8] hover:shadow-sm transition-all"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#1A3CA8]">
                  {s.icon}
                </div>
                <h3 className="text-base font-semibold text-slate-800">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Support section */}
      <section id="support" className="border-t border-slate-200 bg-[#F5F7FA] py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#1A3CA8]">
              We&apos;re here to help
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Support</h2>
            <p className="mt-3 text-slate-500">
              Reach out to our team or find answers in the FAQ below.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-5">
            {/* Contact card */}
            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Contact Us
              </h3>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#1A3CA8]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.55 2.73h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91A16 16 0 0 0 14 15.82l.8-.8a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.27 17z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Customer Hotline</p>
                  <p className="text-sm font-semibold text-slate-800">+62 21 5099 8888</p>
                  <p className="text-xs text-slate-400">Mon–Fri 08:00–17:00 WIB</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#1A3CA8]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Email Support</p>
                  <p className="text-sm font-semibold text-slate-800">support@nekologistic.id</p>
                  <p className="text-xs text-slate-400">Response within 1 business day</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#1A3CA8]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Head Office</p>
                  <p className="text-sm font-semibold text-slate-800">Jakarta Logistic Belt</p>
                  <p className="text-xs text-slate-400">Jakarta, Indonesia</p>
                </div>
              </div>

              <div className="rounded-lg bg-[#EEF2FF] px-4 py-3">
                <p className="text-xs font-medium text-[#1A3CA8]">
                  Saturday support available via email only. Response time may be longer on weekends and public holidays.
                </p>
              </div>
            </div>

            {/* FAQ */}
            <div className="md:col-span-3 rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Frequently Asked Questions
              </h3>
              <div className="divide-y divide-slate-100">
                {FAQS.map((faq, idx) => (
                  <div key={idx}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                      className="flex w-full items-start justify-between gap-4 py-4 text-left text-sm font-semibold text-slate-700 hover:text-[#1A3CA8] transition-colors"
                    >
                      <span>{faq.q}</span>
                      <svg
                        width="16"
                        height="16"
                        className={`mt-0.5 shrink-0 transition-transform ${openFaq === idx ? "rotate-180" : ""}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                    {openFaq === idx && (
                      <p className="pb-4 text-sm text-slate-500">{faq.a}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <p className="text-base font-bold text-[#1A3CA8]">NEKO Logistic</p>
          <p className="mt-1 text-xs text-slate-400">
            © 2024 NEKO Logistic Group. All rights reserved. Precise logistics for a kinetic world.
          </p>
          <div className="mt-4 flex justify-center gap-6 text-xs text-slate-400">
            <button type="button" onClick={() => scrollTo("services")} className="hover:text-slate-600">
              Services
            </button>
            <button type="button" onClick={() => scrollTo("support")} className="hover:text-slate-600">
              Support
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
