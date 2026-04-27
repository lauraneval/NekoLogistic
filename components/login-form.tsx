"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        const details = json?.error?.details?.fieldErrors as
          | Record<string, string[]>
          | undefined;

        if (details) {
          const detailText = Object.entries(details)
            .flatMap(([field, messages]) => messages.map((message) => `${field}: ${message}`))
            .join(" | ");

          setError(`${json?.error?.message ?? "Gagal login"}${detailText ? ` (${detailText})` : ""}`);
        } else {
          setError(json?.error?.message ?? "Gagal login");
        }

        return;
      }

      router.replace(json.data.redirectTo as string);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400" htmlFor="email">
            Alamat Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-bold text-white outline-none transition-all focus:border-orange-500/50 focus:bg-white/10 focus:ring-4 focus:ring-orange-500/20"
            placeholder="admin@nekologistic.id"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400" htmlFor="password">
            Kata Sandi
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-bold text-white outline-none transition-all focus:border-orange-500/50 focus:bg-white/10 focus:ring-4 focus:ring-orange-500/20"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-xs font-bold text-red-400">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="group relative w-full overflow-hidden rounded-2xl bg-orange-600 px-5 py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-orange-500 hover:shadow-[0_0_40px_rgba(249,115,22,0.4)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {loading ? (
            <>
              <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span>Mengotentikasi...</span>
            </>
          ) : (
            "Otorisasi Akses"
          )}
        </span>
      </button>
    </form>
  );
}
