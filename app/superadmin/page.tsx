import { ensureRoleOrRedirect } from "@/lib/session";
import SuperadminPanel from "@/components/superadmin-panel";

export default async function SuperadminPage() {
  // Verifikasi role di sisi server
  await ensureRoleOrRedirect(["superadmin"]);

  return <SuperadminPanel />;
}
