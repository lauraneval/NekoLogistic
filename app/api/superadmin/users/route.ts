import { fail, ok, parseJson } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { registerUserSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const auth = await requireRole(["superadmin"]);

  if ("error" in auth) {
    return auth.error;
  }

  const parsed = await parseJson(req, registerUserSchema);

  if (!parsed.success) {
    return fail("Invalid payload", 422, parsed.error.flatten());
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.fullName,
    },
  });

  if (createError || !authData.user) {
    return fail("Failed to create user", 500, createError?.message);
  }

  const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
    user_id: authData.user.id,
    full_name: parsed.data.fullName,
    role: parsed.data.role,
  });

  if (profileError) {
    return fail("User created but role assignment failed", 500, profileError.message);
  }

  await supabaseAdmin.from("activity_logs").insert({
    actor_id: auth.data.userId,
    action: "REGISTER_USER",
    entity: "profile",
    entity_id: authData.user.id,
    metadata: { role: parsed.data.role, email: parsed.data.email },
  });

  return ok(
    {
      user_id: authData.user.id,
      email: parsed.data.email,
      role: parsed.data.role,
    },
    201,
  );
}
