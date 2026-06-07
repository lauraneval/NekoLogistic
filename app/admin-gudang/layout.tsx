import { PortalLayout } from "@/components/portal-layout";
import { ensureRoleOrRedirect } from "@/lib/session";

export default async function AdminGudangLayout({ children }: { children: React.ReactNode }) {
  const profile = await ensureRoleOrRedirect(["admin_gudang", "superadmin"]);

  return (
    <PortalLayout role="admin_gudang" userName={profile.fullName}>
      {children}
    </PortalLayout>
  );
}
