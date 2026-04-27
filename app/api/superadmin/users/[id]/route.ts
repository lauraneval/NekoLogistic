import { fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
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

  // Handle avatar cleanup if URL changed
  if (body.avatar_url) {
    const { data: currentProfile } = await supabaseAdmin
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", id)
      .single() as any;

    if (currentProfile?.avatar_url && currentProfile.avatar_url !== body.avatar_url) {
      try {
        const url = new URL(currentProfile.avatar_url as string);
        const fileName = url.pathname.split('/').pop();
        if (fileName) {
          await supabaseAdmin.storage.from('avatars').remove([`avatars/${fileName}`]);
        }
      } catch (e) {
        console.error("Old avatar cleanup failed:", e);
      }
    }
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

  // Update password if provided
  if (body.password) {
    const { error: pwdError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: body.password
    });
    if (pwdError) return fail(`Gagal mengupdate password: ${pwdError.message}`, 400);
  }

  return ok({ success: true, data });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["superadmin"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;

  // Prevent self-deletion
  if (id === auth.data.userId) {
    return fail("You cannot delete your own account", 400);
  }

  const supabaseAdmin = createSupabaseAdminClient();

  // Fetch profile to get avatar_url before deletion
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("avatar_url")
    .eq("user_id", id)
    .single() as any;

  // Delete from Auth (this will cascade delete the profile due to FK constraints)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

  if (error) {
    return fail(error.message, 500);
  }

  // Cleanup avatar from storage if exists
  if (profile?.avatar_url) {
    try {
      const url = new URL(profile.avatar_url as string);
      const fileName = url.pathname.split('/').pop();
      if (fileName) {
        await supabaseAdmin.storage.from('avatars').remove([`avatars/${fileName}`]);
      }
    } catch (e) {
      console.error("Avatar cleanup on deletion failed:", e);
    }
  }

  return ok({ success: true, message: "User deleted successfully" });
}
