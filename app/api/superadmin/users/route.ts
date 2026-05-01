import { fail, ok, parseJson } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { registerUserSchema, updateUserSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireRole(["superadmin"]);

  if ("error" in auth) {
    return auth.error;
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("user_id, full_name, role, created_at, updated_at")
    .in("role", ["admin_gudang", "kurir"])
    .order("created_at", { ascending: false });

  if (error) {
    return fail("Failed to load users", 500, error.message);
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

export async function PUT(req: Request) {
  const auth = await requireRole(["superadmin"]);

  if ("error" in auth) {
    return auth.error;
  }

  const parsed = await parseJson(req, updateUserSchema);

  if (!parsed.success) {
    return fail("Invalid payload", 422, parsed.error.flatten());
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("user_id", parsed.data.userId)
    .maybeSingle();

  if (!existing || existing.role === "superadmin") {
    return fail("User cannot be edited", 403);
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      role: parsed.data.role,
    })
    .eq("user_id", parsed.data.userId);

  if (error) {
    return fail("Failed to update user", 500, error.message);
  }

  await supabaseAdmin.auth.admin.updateUserById(parsed.data.userId, {
    user_metadata: { full_name: parsed.data.fullName },
  });

  await supabaseAdmin.from("activity_logs").insert({
    actor_id: auth.data.userId,
    action: "UPDATE_USER",
    entity: "profile",
    entity_id: parsed.data.userId,
    metadata: { full_name: parsed.data.fullName, role: parsed.data.role },
  });

  return ok({
    user_id: parsed.data.userId,
    full_name: parsed.data.fullName,
    role: parsed.data.role,
  });
}

export async function DELETE(req: Request) {
  const auth = await requireRole(["superadmin"]);

  if ("error" in auth) {
    return auth.error;
  }

  const userId = new URL(req.url).searchParams.get("userId");

  if (!userId) {
    return fail("User id is required", 422);
  }

  if (userId === auth.data.userId) {
    return fail("Cannot delete your own account", 403);
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("role, full_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing || existing.role === "superadmin") {
    return fail("User cannot be deleted", 403);
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    return fail("Failed to delete user", 500, error.message);
  }

  await supabaseAdmin.from("activity_logs").insert({
    actor_id: auth.data.userId,
    action: "DELETE_USER",
    entity: "profile",
    entity_id: userId,
    metadata: { full_name: existing.full_name, role: existing.role },
  });

  return ok({ userId });
}
