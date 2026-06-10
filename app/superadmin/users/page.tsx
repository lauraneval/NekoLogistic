import { PortalUsers } from "@/components/portal-users";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function SuperadminUsersPage() {
  const supabase = createSupabaseAdminClient();

  const [{ data: profiles }, { data: authUsers }, { data: activeBags }] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, full_name, role, created_at, last_login_at")
      .in("role", ["admin_gudang", "kurir"])
      .order("created_at", { ascending: false }),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    supabase
      .from("bags")
      .select("assigned_courier_id")
      .eq("status", "OUT_FOR_DELIVERY")
      .not("assigned_courier_id", "is", null),
  ]);

  const emailsById = new Map(
    (authUsers.users ?? []).map((u) => [u.id, u.email ?? ""]),
  );

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const users = (profiles ?? []).map((p) => {
    const lastLogin = p.last_login_at ? new Date(p.last_login_at as string) : null;
    const status: "active" | "offline" = (!lastLogin || lastLogin < sevenDaysAgo) ? "offline" : "active";
    return {
      user_id: String(p.user_id),
      full_name: String(p.full_name),
      email: emailsById.get(String(p.user_id)) ?? "",
      role: String(p.role),
      created_at: String(p.created_at),
      status,
    };
  });

  const adminCount = users.filter((u) => u.role === "admin_gudang").length;
  const courierCount = users.filter((u) => u.role === "kurir").length;
  const onDutyCount = new Set(
    (activeBags ?? []).map((b) => String(b.assigned_courier_id)),
  ).size;

  return (
    <PortalUsers
      users={users}
      stats={{
        activeOperators: users.length,
        systemAdmins: adminCount,
        courierFleet: courierCount,
        authExceptions: 0,
        onDutyCount,
      }}
    />
  );
}
