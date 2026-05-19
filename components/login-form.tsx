"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface LoginFormProps {
  onForgotPassword: () => void;
}

export function LoginForm({ onForgotPassword }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        setError(json?.error?.message ?? "Gagal login.");
        return;
      }
      router.replace(json.data.redirectTo as string);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 animate-in fade-in duration-500">
      {/* Email Address */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
        <div className="relative group">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 group-focus-within:text-blue-600 transition-colors">
            {/* IKON PESAN / ENVELOPE */}
            <svg 
              className="h-5 w-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
              />
            </svg>
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#EBF1FA] border border-transparent rounded-xl pl-11 pr-4 py-3.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all text-gray-700 placeholder:text-gray-400"
            placeholder="gudang@nekologistic.id"
            required
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Password</label>
          <button 
            type="button" 
            onClick={onForgotPassword} 
            className="text-[10px] font-bold text-blue-700 uppercase hover:underline tracking-tight"
          >
            Forgot Password?
          </button>
        </div>
        <div className="relative group">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 group-focus-within:text-blue-600 transition-colors">
            {/* IKON GEMBOK / LOCK */}
            <svg 
              className="h-5 w-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            </svg>
          </span>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#EBF1FA] border border-transparent rounded-xl pl-11 pr-11 py-3.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all text-gray-700 placeholder:text-gray-400"
            placeholder="••••••••"
            required
          />
          <button 
            type="button" 
            onClick={() => setShowPassword(!showPassword)} 
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
          >
             <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
             </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs font-semibold text-red-500 bg-red-50 p-3 rounded-lg border border-red-100 animate-shake">
          {error}
        </div>
      )}

      {/* Button Login */}
      <button 
        type="submit" 
        disabled={loading} 
        className="w-full bg-[#0047BB] hover:bg-blue-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? (
          "Processing..."
        ) : (
          <>
            Enter Workspace 
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </>
        )}
      </button>
    </form>
  );
}