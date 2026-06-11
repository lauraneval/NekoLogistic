"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

type PortalLayoutProps = {
  children: React.ReactNode;
  role: "superadmin" | "admin_gudang";
  userName: string;
};

function IconDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconPackage() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function IconBag() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <circle cx="16" cy="8" r="2" />
      <path d="M6 8H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-3" />
    </svg>
  );
}

function IconTracking() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconActivityLogs() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
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

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function PortalLayout({ children, role, userName }: PortalLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [profileData, setProfileData] = useState<{
    full_name?: string;
    email?: string;
    role?: string;
    phone_number?: string | null;
    address?: string | null;
    employee_id?: string | null;
    avatar_url?: string | null;
    last_login_at?: string | null;
    created_at?: string;
  } | null>(null);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    phoneNumber: "",
    address: "",
  });

  useEffect(() => {
    if (!showProfile) return;
    fetch("/api/profile/me")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok && json.data) {
          setProfileData(json.data);
          setProfileForm({
            fullName: json.data.full_name ?? "",
            phoneNumber: json.data.phone_number ?? "",
            address: json.data.address ?? "",
          });
        }
      });
  }, [showProfile]);

  function openProfile() {
    setProfileData(null);
    setProfileMsg(null);
    setShowProfile(true);
  }

  // Inactivity auto-logout: 6 hours with no user interaction
  useEffect(() => {
    const TIMEOUT_MS = 6 * 60 * 60 * 1000;
    const STORAGE_KEY = "neko_last_active";

    async function doLogout() {
      localStorage.removeItem(STORAGE_KEY);
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login?auth=timeout");
    }

    let timer: ReturnType<typeof setTimeout>;

    function resetTimer() {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      clearTimeout(timer);
      timer = setTimeout(doLogout, TIMEOUT_MS);
    }

    // On mount: if last activity was >6h ago, logout immediately
    const stored = Number(localStorage.getItem(STORAGE_KEY) || 0);
    if (stored > 0 && Date.now() - stored > TIMEOUT_MS) {
      doLogout();
      return;
    }

    const events = ["click", "keydown", "scroll", "mousemove", "touchstart"] as const;
    for (const e of events) window.addEventListener(e, resetTimer, { passive: true });
    resetTimer();

    return () => {
      clearTimeout(timer);
      for (const e of events) window.removeEventListener(e, resetTimer);
    };
  }, [router]);

  // Heartbeat: update last_login_at in Supabase every 30 minutes while portal is open
  useEffect(() => {
    async function ping() {
      await fetch("/api/auth/heartbeat", { method: "POST" });
    }
    ping();
    const interval = setInterval(ping, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleSaveProfile() {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/profile/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: profileForm.fullName,
          phoneNumber: profileForm.phoneNumber || null,
          address: profileForm.address || null,
        }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setProfileMsg({ text: "Profile updated successfully.", ok: true });
        setProfileData((prev) => (prev ? { ...prev, ...json.data } : json.data));
        router.refresh();
      } else {
        setProfileMsg({ text: json?.error?.message ?? "Failed to update profile.", ok: false });
      }
    } catch {
      setProfileMsg({ text: "Network error. Please try again.", ok: false });
    } finally {
      setProfileSaving(false);
    }
  }

  const base = role === "superadmin" ? "/superadmin" : "/admin-gudang";

  const navItems: NavItem[] = [
    { label: "Dashboard", href: base, icon: <IconDashboard /> },
    { label: "Package Management", href: `${base}/packages`, icon: <IconPackage /> },
    { label: "Input New Package", href: `${base}/packages/new`, icon: <IconPlus /> },
    { label: "Consolidation / Bagging", href: `${base}/bagging`, icon: <IconBag /> },
    { label: "Tracking Portal", href: "/tracking", icon: <IconTracking /> },
    ...(role === "superadmin"
      ? [
          { label: "User Management", href: `${base}/users`, icon: <IconUsers /> },
          { label: "Activity Logs", href: `${base}/activity-logs`, icon: <IconActivityLogs /> },
        ]
      : []),
  ];

  const roleLabel =
    role === "superadmin" ? "Admin Control" : "Warehouse Admin";

  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  function isActive(href: string) {
    return pathname === href;
  }

  return (
    <div className="flex h-screen bg-[#F5F7FA] overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-64 flex-shrink-0 flex-col bg-white border-r border-slate-200">
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-100">
          <span className="text-[#1A3CA8]">
            <IconTruck />
          </span>
          <div>
            <p className="text-sm font-bold text-[#1A3CA8] leading-tight">NekoLogistic</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Delivery Cat
            </p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#EEF2FF] text-[#1A3CA8] border-l-2 border-[#1A3CA8]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className={active ? "text-[#1A3CA8]" : "text-slate-400"}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div className="px-4 py-4 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <button
              onClick={openProfile}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#1A3CA8] text-xs font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{userName}</p>
                <p className="text-xs text-slate-400 uppercase tracking-wide">
                  {role === "superadmin" ? "System Admin" : "Warehouse Admin"}
                </p>
              </div>
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              title="Logout"
              className="text-slate-400 hover:text-red-500 transition-colors"
            >
              <IconLogout />
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  const base = role === "admin_gudang" ? "/admin-gudang" : "/superadmin";
                  router.push(`${base}/packages?q=${encodeURIComponent(searchQuery.trim())}`);
                }
              }}
              placeholder="Search tracking ID or packages…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-[#1A3CA8] focus:ring-1 focus:ring-[#1A3CA8]"
            />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <button
              onClick={openProfile}
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-50 transition-colors"
            >
              <span className="text-sm font-semibold text-[#1A3CA8]">{roleLabel}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1A3CA8] text-xs font-bold text-white">
                {initials}
              </div>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Profile slide-over */}
      {showProfile && (
        <>
          <button
            type="button"
            aria-label="Close profile panel"
            className="fixed inset-0 z-40 w-full bg-black/30 backdrop-blur-sm"
            onClick={() => setShowProfile(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-800">Profile Settings</h2>
              <button
                onClick={() => setShowProfile(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {profileData === null ? (
                <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
                  Loading…
                </div>
              ) : (
                <>
                  {/* Avatar + identity */}
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1A3CA8] text-xl font-bold text-white">
                      {(profileData.full_name ?? userName)
                        .split(" ")
                        .map((w: string) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{profileData.full_name ?? userName}</p>
                      <p className="mt-0.5 text-xs uppercase tracking-wide text-slate-400">
                        {role === "superadmin" ? "System Admin" : "Warehouse Admin"}
                      </p>
                      {profileData.employee_id && (
                        <p className="mt-0.5 text-xs text-slate-400">ID: {profileData.employee_id}</p>
                      )}
                    </div>
                  </div>

                  {/* Editable fields */}
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="profile-full-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Full Name
                      </label>
                      <input
                        id="profile-full-name"
                        type="text"
                        value={profileForm.fullName}
                        onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#1A3CA8] focus:ring-1 focus:ring-[#1A3CA8]"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label htmlFor="profile-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Email Address
                      </label>
                      <input
                        id="profile-email"
                        type="email"
                        value={profileData.email ?? ""}
                        readOnly
                        className="w-full cursor-not-allowed rounded-lg border border-slate-100 bg-slate-100 px-3 py-2 text-sm text-slate-500 outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="profile-phone" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Phone Number
                      </label>
                      <input
                        id="profile-phone"
                        type="tel"
                        value={profileForm.phoneNumber}
                        onChange={(e) => setProfileForm((f) => ({ ...f, phoneNumber: e.target.value.replace(/[^\d+\-() ]/g, "") }))}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#1A3CA8] focus:ring-1 focus:ring-[#1A3CA8]"
                        placeholder="e.g. +62 812 3456 7890"
                      />
                    </div>

                    <div>
                      <label htmlFor="profile-address" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Address
                      </label>
                      <textarea
                        id="profile-address"
                        value={profileForm.address}
                        onChange={(e) => setProfileForm((f) => ({ ...f, address: e.target.value }))}
                        rows={3}
                        className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#1A3CA8] focus:ring-1 focus:ring-[#1A3CA8]"
                        placeholder="Enter your address"
                      />
                    </div>
                  </div>

                  {/* Account info */}
                  {(profileData.last_login_at || profileData.created_at) && (
                    <div className="space-y-1 rounded-lg bg-slate-50 px-4 py-3">
                      {profileData.created_at && (
                        <p className="text-xs text-slate-500">
                          <span className="font-medium">Member since:</span>{" "}
                          {new Date(profileData.created_at).toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      )}
                      {profileData.last_login_at && (
                        <p className="text-xs text-slate-500">
                          <span className="font-medium">Last login:</span>{" "}
                          {new Date(profileData.last_login_at).toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Feedback */}
                  {profileMsg && (
                    <div
                      className={`rounded-lg px-4 py-2.5 text-sm ${
                        profileMsg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      }`}
                    >
                      {profileMsg.text}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => setShowProfile(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={profileSaving || profileData === null}
                className="flex-1 rounded-lg bg-[#1A3CA8] py-2 text-sm font-semibold text-white hover:bg-[#1530A0] disabled:opacity-50 transition-colors"
              >
                {profileSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
