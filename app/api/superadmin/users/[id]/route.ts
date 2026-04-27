import { fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(["superadmin"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await req.json();

  const supabaseAdmin = createSupabaseAdminClient();

  // Prevent self-suspension
  if (id === auth.data.userId && body.is_suspended === true) {
    return fail("Anda tidak bisa menonaktifkan akun sendiri", 400);
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name: body.full_name,
      role: body.role,
      is_suspended: body.is_suspended,
      phone: body.phone,
      employee_id: body.employee_id,
      address: body.address,
      avatar_url: body.avatar_url
    })
    .eq("user_id", id)
    .select()
    .single();

  if (error) return fail(error.message, 500);

  // If role changed, also update auth app_metadata for consistency
  if (body.role) {
    await supabaseAdmin.auth.admin.updateUserById(id, {
      app_metadata: { role: body.role }
    });
  }

  return ok({ success: true, data });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(["superadmin"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;

  // Prevent self-deletion
  if (id === auth.data.userId) {
    return fail("You cannot delete your own account", 400);
  }

  const supabaseAdmin = createSupabaseAdminClient();

  // Delete from Auth (this will cascade delete the profile due to FK constraints)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

  if (error) {
    return fail(error.message, 500);
  }

  return ok({ success: true, message: "User deleted successfully" });
}
