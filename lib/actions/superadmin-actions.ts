"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";

/**
 * Create a new staff account
 */
export async function createStaffAction(formData: any) {
  const auth = await requireRole(["superadmin"]);
  if ("error" in auth) throw new Error("Unauthorized");

  const adminClient = createSupabaseAdminClient();

  const { email, password, full_name, role, phone, employee_id, address, avatar_url } = formData;

  // Create user in Auth
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
    app_metadata: { role }
  });

  if (authError || !authData.user) throw new Error(authError?.message || "Gagal membuat akun auth");

  const userId = authData.user.id;

  // Update profile
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
    await adminClient.auth.admin.deleteUser(userId);
    throw new Error(profileError.message);
  }

  revalidatePath("/superadmin/staff");
  return { success: true };
}

/**
 * Update an existing staff profile
 */
export async function updateStaffAction(userId: string, body: any) {
  const auth = await requireRole(["superadmin"]);
  if ("error" in auth) throw new Error("Unauthorized");

  const adminClient = createSupabaseAdminClient();

  // Handle avatar cleanup if URL changed
  if (body.avatar_url) {
    const { data: currentProfile } = await adminClient
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", userId)
      .single() as any;

    if (currentProfile?.avatar_url && currentProfile.avatar_url !== body.avatar_url) {
      try {
        const url = new URL(currentProfile.avatar_url as string);
        const fileName = url.pathname.split('/').pop();
        if (fileName) {
          await adminClient.storage.from('avatars').remove([`avatars/${fileName}`]);
        }
      } catch (e) {
        console.error("Old avatar cleanup failed:", e);
      }
    }
  }

  // Update Profile
  const { error } = await adminClient
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
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  // Update Auth Metadata
  if (body.role) {
    await adminClient.auth.admin.updateUserById(userId, {
      app_metadata: { role: body.role }
    });
  }

  // Update Password if provided
  if (body.password) {
    const { error: pwdError } = await adminClient.auth.admin.updateUserById(userId, {
      password: body.password
    });
    if (pwdError) throw new Error(`Gagal update password: ${pwdError.message}`);
  }

  revalidatePath("/superadmin/staff");
  return { success: true };
}

/**
 * Delete a staff account
 */
export async function deleteStaffAction(userId: string) {
  const auth = await requireRole(["superadmin"]);
  if ("error" in auth) throw new Error("Unauthorized");

  if (userId === auth.data.userId) throw new Error("Self-deletion forbidden");

  const adminClient = createSupabaseAdminClient();

  // Get avatar URL before deletion
  const { data: profile } = await adminClient
    .from("profiles")
    .select("avatar_url")
    .eq("user_id", userId)
    .single() as any;

  // Delete from Auth
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);

  // Cleanup storage
  if (profile?.avatar_url) {
    try {
      const url = new URL(profile.avatar_url as string);
      const fileName = url.pathname.split('/').pop();
      if (fileName) {
        await adminClient.storage.from('avatars').remove([`avatars/${fileName}`]);
      }
    } catch (e) {
      console.error("Storage cleanup failed:", e);
    }
  }

  revalidatePath("/superadmin/staff");
  return { success: true };
}
