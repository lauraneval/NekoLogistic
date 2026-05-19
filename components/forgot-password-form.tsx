"use client";

import { useState } from "react";

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

export function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleRestore(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert("Password has been restored successfully!");
      onBackToLogin();
    }, 1500);
  }

  return (
    <form onSubmit={handleRestore} className="space-y-5 animate-in slide-in-from-right-4 duration-500">
      {/* Email Address */}
      <div className="space-y-1.5">
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
            className="w-full bg-[#EBF1FA] border border-transparent rounded-xl pl-11 pr-4 py-3.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all text-gray-700"
            placeholder="name@company.com"
            required
          />
        </div>
      </div>

      {/* New Password */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">New Password</label>
        <div className="relative group">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 group-focus-within:text-blue-600 transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </span>
          <input
            type={showPass ? "text" : "password"}
            className="w-full bg-[#EBF1FA] border border-transparent rounded-xl pl-11 pr-11 py-3.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all text-gray-700"
            placeholder="••••••••"
            required
          />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-blue-600 transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Confirm New Password</label>
        <div className="relative group">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 group-focus-within:text-blue-600 transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </span>
          <input
            type={showPass ? "text" : "password"}
            className="w-full bg-[#EBF1FA] border border-transparent rounded-xl pl-11 pr-11 py-3.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all text-gray-700"
            placeholder="••••••••"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#0047BB] hover:bg-blue-800 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-70"
      >
        {loading ? "Restoring..." : <>Save and Login <span className="ml-1">→</span></>}
      </button>

      <button type="button" onClick={onBackToLogin} className="w-full text-center text-xs font-bold text-gray-400 uppercase tracking-wider hover:text-blue-700 transition-colors">
        Back to Login
      </button>
    </form>
  );
}