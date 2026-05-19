import { AdminGudangPanel } from "@/components/admin-gudang-panel";
import { ensureRoleOrRedirect } from "@/lib/session";

export default async function AdminGudangPage() {
  // Logika autentikasi Anda tetap tidak berubah
  const profile = await ensureRoleOrRedirect(["superadmin", "admin_gudang"]);

  return (
    // Dibuat full screen agar komponen Panel bisa mengatur Sidebar & Main Content
    <main className="h-screen w-full bg-[#F4F7FA] overflow-hidden">
      <AdminGudangPanel profile={profile} />
    </main>
  );
}