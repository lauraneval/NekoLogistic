import Link from "next/link";
import { TrackingPortal } from "@/components/tracking-portal";

export default function Home() {
  return (
    <div className="flex flex-col">
      <main className="mx-auto w-full max-w-6xl px-4 pb-14 pt-8 md:px-8 md:pt-12">
        <section className="relative overflow-hidden rounded-3xl border border-orange-300/40 bg-slate-950 px-6 py-12 text-white shadow-2xl md:px-10 md:py-16">
          <div className="absolute -top-28 right-0 h-72 w-72 rounded-full bg-orange-500/30 blur-3xl" />
          <div className="absolute -bottom-24 left-4 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" />

          <div className="relative z-10 max-w-3xl animate-[fadeIn_0.6s_ease-out]">
            <p className="font-mono text-sm uppercase tracking-[0.3em] text-orange-200">NekoLogistic Web Platform</p>
            <h1 className="mt-4 font-mono text-4xl font-bold leading-tight md:text-6xl">
              Manajemen Logistik Cepat, Aman, dan Transparan.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-slate-200 md:text-lg">
              Satu platform untuk operasional gudang, konsolidasi manifest, monitoring performa, dan pelacakan paket real-time untuk publik.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/tracking"
                className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-400"
              >
                Lacak Resi Paket
              </Link>
              <Link
                href="/admin-gudang"
                className="rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Portal Admin Gudang
              </Link>
            </div>
          </div>
        </section>

        <section id="about" className="mt-12 grid gap-6 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-mono text-xl font-semibold text-slate-900">Operasional Gudang</h2>
            <p className="mt-3 text-sm text-slate-600">Input paket, generate resi NEKO-YYYY-XXXX, dan update status awal secara terstandar.</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-mono text-xl font-semibold text-slate-900">Manifesting Massal</h2>
            <p className="mt-3 text-sm text-slate-600">Kelompokkan ratusan resi ke dalam karung menggunakan RPC Supabase untuk konsistensi data.</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-mono text-xl font-semibold text-slate-900">Tracking Publik</h2>
            <p className="mt-3 text-sm text-slate-600">Pelanggan melihat perjalanan paket dalam bentuk timeline vertikal yang mudah dipahami.</p>
          </article>
        </section>

        <div className="mt-12 animate-[riseIn_0.7s_ease-out]">
          <TrackingPortal />
        </div>

        <section id="contact" className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700 md:p-8">
          <h2 className="font-mono text-2xl font-semibold text-slate-900">Contact</h2>
          <p className="mt-2">Email: support@nekologistic.id</p>
          <p>Hotline: +62 21 5099 8888</p>
          <p className="mt-2">Alamat: Jakarta Logistic Belt, Indonesia</p>
        </section>
      </main>
    </div>
  );
}
