import { AdminGudangPanel } from "@/components/admin-gudang-panel";
import { LogoutButton } from "@/components/logout-button";
import { ensureRoleOrRedirect } from "@/lib/session";

export default async function AdminGudangPage() {
  const profile = await ensureRoleOrRedirect(["superadmin", "admin_gudang"]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-12 md:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-3xl font-bold text-slate-900">Operasional Gudang</h1>
          <p className="mt-1 text-sm text-slate-600">Halo, {profile.fullName}</p>
        </div>
        <LogoutButton />
      </div>

      <AdminGudangPanel />
    </main>
  );
}
