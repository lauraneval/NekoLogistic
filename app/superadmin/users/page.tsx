import { PortalUsers } from "@/components/portal-users";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function SuperadminUsersPage() {
  const supabase = createSupabaseAdminClient();

  const [{ data: profiles }, { data: authUsers }] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, full_name, role, created_at")
      .in("role", ["admin_gudang", "kurir"])
      .order("created_at", { ascending: false }),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const emailsById = new Map(
    (authUsers.users ?? []).map((u) => [u.id, u.email ?? ""]),
  );

  const users = (profiles ?? []).map((p) => ({
    user_id: String(p.user_id),
    full_name: String(p.full_name),
    email: emailsById.get(String(p.user_id)) ?? "",
    role: String(p.role),
    created_at: String(p.created_at),
    status: "active" as const,
  }));

  const adminCount = users.filter((u) => u.role === "admin_gudang").length;
  const courierCount = users.filter((u) => u.role === "kurir").length;

  return (
    <PortalUsers
      users={users}
      stats={{
        activeOperators: users.length,
        systemAdmins: adminCount,
        courierFleet: courierCount,
        authExceptions: 0,
      }}
    />
  );
}
