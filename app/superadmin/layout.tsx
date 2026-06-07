import { PortalLayout } from "@/components/portal-layout";
import { ensureRoleOrRedirect } from "@/lib/session";

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const profile = await ensureRoleOrRedirect(["superadmin"]);

  return (
    <PortalLayout role="superadmin" userName={profile.fullName}>
      {children}
    </PortalLayout>
  );
}
