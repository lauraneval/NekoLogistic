import { fail, ok, parseJson } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { registerUserSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireRole(["superadmin"]);
  if ("error" in auth) return auth.error;

  const supabaseAdmin = createSupabaseAdminClient();
  
  // Join with profiles to get roles and names
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("user_id, full_name, role, created_at, is_blocked")
    .order("created_at", { ascending: false });

  if (error) return fail("Failed to fetch users", 500);

  return ok(data);
}

export async function POST(req: Request) {
  const auth = await requireRole(["superadmin"]);
  if ("error" in auth) return auth.error;

  const parsed = await parseJson(req, registerUserSchema);
  if (!parsed.success) return fail("Invalid payload", 422, parsed.error.flatten());

  const supabaseAdmin = createSupabaseAdminClient();

  // 1. Create User in Auth
  const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
  });

  if (createError || !authData.user) {
    return fail(createError?.message || "Failed to create user", 500);
  }

  // 2. Profile is automatically created by DB Trigger, but we update the role and name just in case
  const { error: profileError } = await supabaseAdmin.from("profiles").update({
    full_name: parsed.data.fullName,
    role: parsed.data.role,
  }).eq("user_id", authData.user.id);

  if (profileError) return fail("User created but profile update failed", 500);

  return ok({ user_id: authData.user.id, email: parsed.data.email }, 201);
}
