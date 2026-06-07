import Link from "next/link";

export const metadata = {
  title: "404 – Page Not Found | NEKO Logistic",
};

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-linear-to-br from-[#EEF2FF] via-[#F0F4FF] to-[#E8EFFE]">
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-[#1A3CA8]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#1A3CA8]/8 blur-3xl" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A3CA8]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </div>
          <span className="text-base font-bold text-[#1A3CA8]">NEKO Logistic</span>
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-[#1A3CA8] px-4 py-1.5 text-sm font-semibold text-[#1A3CA8] hover:bg-[#1A3CA8] hover:text-white transition-colors"
        >
          Admin Login
        </Link>
      </nav>

      {/* Main content */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
        {/* Decorative large 404 behind everything */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute select-none text-[220px] font-black leading-none tracking-tight text-[#1A3CA8]/[0.06]"
        >
          404
        </span>

        {/* Icon card */}
        <div className="relative mb-6 flex h-[88px] w-[88px] items-center justify-center rounded-2xl bg-white shadow-xl shadow-slate-200/80">
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1A3CA8"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            <circle cx="12" cy="9" r="2.5" />
            <path d="M8.5 2.5L4 6M15.5 2.5L20 6" strokeOpacity="0.3" />
          </svg>
          {/* Badge */}
          <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            !
          </div>
        </div>

        {/* Status text */}
        <p className="relative mb-2 text-xs font-semibold uppercase tracking-widest text-[#1A3CA8]/60">
          Error 404
        </p>

        {/* Heading */}
        <h1 className="relative text-3xl font-bold text-slate-900">
          Page Not Found
        </h1>

        {/* Description */}
        <p className="relative mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
          The page you&apos;re looking for doesn&apos;t exist, may have been moved, or the
          URL is incorrect.
        </p>

        {/* Action buttons */}
        <div className="relative mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-[#1A3CA8] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#1A3CA8]/25 hover:bg-[#1530A0] transition-colors"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M3 12l9-9 9 9" />
              <path d="M9 21V9h6v12" />
            </svg>
            Back to Tracking Portal
          </Link>

          <Link
            href="/login"
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white/70 px-6 py-2.5 text-sm font-medium text-slate-600 backdrop-blur-sm hover:bg-white transition-colors"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
            </svg>
            Admin Login
          </Link>
        </div>

        {/* Helpful links */}
        <div className="relative mt-10 flex items-center gap-4 text-xs text-slate-400">
          <Link href="/" className="hover:text-[#1A3CA8] transition-colors">
            Tracking Portal
          </Link>
          <span className="h-3 w-px bg-slate-300" />
          <Link href="/login" className="hover:text-[#1A3CA8] transition-colors">
            Admin Login
          </Link>
          <span className="h-3 w-px bg-slate-300" />
          <a href="mailto:support@nekologistic.id" className="hover:text-[#1A3CA8] transition-colors">
            Contact Support
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative py-5 text-center text-xs text-slate-400">
        <span className="font-semibold text-[#1A3CA8]">NEKO Logistic</span>
        {" · "}
        © 2024 All rights reserved.
      </footer>
    </div>
  );
}
