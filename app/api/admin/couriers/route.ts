import { fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireRole(["admin_gudang", "superadmin"]);

  if ("error" in auth) {
    return auth.error;
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("user_id, full_name, role, created_at, updated_at")
    .eq("role", "kurir")
    .order("created_at", { ascending: false });

  if (error) {
    return fail("Failed to load couriers", 500, error.message);
  }

  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  const emailsById = new Map(
    (usersData.users ?? []).map((user) => [user.id, user.email ?? ""]),
  );

  return ok(
    (data ?? []).map((profile) => ({
      user_id: profile.user_id,
      full_name: profile.full_name,
      role: profile.role,
      email: emailsById.get(String(profile.user_id)) ?? "",
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    })),
  );
}