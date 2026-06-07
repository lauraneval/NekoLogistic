import { ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const auth = await requireRole(["superadmin", "admin_gudang", "kurir"]);
  if ("error" in auth) return auth.error;

  const supabase = createSupabaseAdminClient();
  await supabase
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("user_id", auth.data.userId);

  return ok({ ok: true });
}
