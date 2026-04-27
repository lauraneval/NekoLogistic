import { ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireRole(["superadmin"]);
  if ("error" in auth) return auth.error;

  const adminClient = createSupabaseAdminClient();
  
  // Fetch profiles and auth users to get emails
  const { data: profiles, error: profileError } = await adminClient
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (profileError) return fail(profileError.message, 500);

  const { data: { users: authUsers }, error: authError } = await adminClient.auth.admin.listUsers();
  
  if (authError) return fail(authError.message, 500);

  // Merge email into profile data
  const mergedUsers = (profiles as any[]).map(profile => {
    const authUser = authUsers.find(u => u.id === profile.user_id);
    return {
      ...profile,
      email: authUser?.email
    };
  });

  return ok(mergedUsers);
}

export async function POST(req: Request) {
  const auth = await requireRole(["superadmin"]);
  if ("error" in auth) return auth.error;

  try {
    const { email, password, full_name, role, phone, employee_id, address, avatar_url } = await req.json();
    const adminClient = createSupabaseAdminClient();

    // Create user in Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
      app_metadata: { role }
    });

    if (authError || !authData.user) throw authError || new Error("Gagal membuat akun auth");

    const userId = authData.user.id;

    // The trigger on_auth_user_created handles initial profile creation,
    // but we update it here to ensure all fields are set correctly.
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        full_name,
        role,
        phone,
        employee_id,
        address,
        avatar_url
      })
      .eq("user_id", userId);

    if (profileError) {
      // Cleanup auth user if profile creation failed
      await adminClient.auth.admin.deleteUser(userId);
      throw profileError;
    }

    return ok({ message: "Staff account created", userId });
  } catch (err: any) {
    return fail(err.message, 400);
  }
}
