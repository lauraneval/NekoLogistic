import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { Package } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10"></div>
      <section className="relative z-10 w-full max-w-md overflow-hidden rounded-[2.5rem] glass p-8 sm:p-12 orange-shadow">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-600/20 text-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.3)]">
            <Package size={32} />
          </div>
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">
            Secure Access Portal
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tighter text-white">
            Neko<span className="text-orange-500">Logistic.</span>
          </h1>
          <p className="mt-3 text-sm font-medium text-slate-400">
            Sistem manajemen operasional internal. Untuk pelacakan resi publik, kunjungi portal{" "}
            <Link className="text-orange-400 hover:text-orange-300 hover:underline underline-offset-4 transition-colors" href="/tracking">
              tracking kami
            </Link>.
          </p>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
