"use client";

import { useState } from "react";
import { LoginForm } from "@/components/login-form";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function LoginPage() {
  const [view, setView] = useState<"login" | "forgot-password">("login");

  return (
    <main className="min-h-screen bg-[#F4F7FA] flex flex-col items-center justify-center p-4">
      {/* Header Brand */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 bg-[#0047BB] rounded-lg flex items-center justify-center shadow-lg mb-4 text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">NEKO Logistic</h1>
        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 font-semibold mt-1">
          Kinetic Curator • Global Access
        </p>
      </div>

      {/* Auth Container */}
      <section className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden border-t-4 border-[#0047BB]">
        <div className="p-8 md:p-10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800">
              {view === "login" ? "Secure Login" : "Restore Password"}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {view === "login" 
                ? "Access your logistics control center" 
                : "Enter your email and a new password"}
            </p>
          </div>

          {view === "login" ? (
            <LoginForm onForgotPassword={() => setView("forgot-password")} />
          ) : (
            <ForgotPasswordForm onBackToLogin={() => setView("login")} />
          )}
        </div>
      </section>

      {/* Footer Navigation */}
      <footer className="mt-10 flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-gray-500">
          Don't have an account? <a href="#" className="text-[#0047BB] font-medium hover:underline">Contact your regional administrator</a>
        </p>
        <div className="flex gap-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
          <a href="#" className="hover:text-gray-600 transition-colors">Privacy Policy</a>
          <span>•</span>
          <a href="#" className="hover:text-gray-600 transition-colors">Security Standards</a>
          <span>•</span>
          <a href="#" className="hover:text-gray-600 transition-colors">Help Center</a>
        </div>
      </footer>
    </main>
  );
}