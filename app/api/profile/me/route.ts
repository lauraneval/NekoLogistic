import { fail, ok, parseJson } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phoneNumber: z.string().trim().max(30).optional().nullable(),
  address: z.string().trim().max(240).optional().nullable(),
});

export async function GET() {
  const auth = await requireRole(["superadmin", "admin_gudang", "kurir"]);
  if ("error" in auth) return auth.error;

  const supabase = createSupabaseAdminClient();

  const [{ data: profile, error: profileError }, { data: authUser, error: authError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, full_name, role, phone_number, address, last_login_at, created_at")
        .eq("user_id", auth.data.userId)
        .maybeSingle(),
      supabase.auth.admin.getUserById(auth.data.userId),
    ]);

  if (profileError || !profile) {
    return fail("Profile not found", 404);
  }

  return ok({
    ...profile,
    email: authError ? null : (authUser.user?.email ?? null),
  });
}

export async function PATCH(req: Request) {
  const auth = await requireRole(["superadmin", "admin_gudang", "kurir"]);
  if ("error" in auth) return auth.error;

  const parsed = await parseJson(req, updateProfileSchema);
  if (!parsed.success) {
    return fail("Invalid payload", 422, parsed.error.flatten());
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone_number: parsed.data.phoneNumber ?? null,
      address: parsed.data.address ?? null,
    })
    .eq("user_id", auth.data.userId)
    .select("user_id, full_name, email, role, phone_number, address")
    .single();

  if (error || !data) {
    return fail("Failed to update profile", 500);
  }

  return ok(data);
}
