import { LogoutButton } from "@/components/logout-button";
import { ensureRoleOrRedirect } from "@/lib/session";

export default async function KurirPage() {
  const profile = await ensureRoleOrRedirect(["superadmin", "kurir"]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 md:px-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-mono text-3xl font-bold text-slate-900">Portal Kurir</h1>
        <LogoutButton />
      </div>
      <p className="text-sm text-slate-600">Halo, {profile.fullName}</p>
      <p className="mt-3 text-slate-600">
        Halaman ini disiapkan sebagai entry point web role kurir (update status pengantaran dan proof of delivery).
      </p>
    </main>
  );
}
