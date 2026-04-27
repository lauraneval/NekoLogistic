import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { AppRole } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SessionProfile = {
  userId: string;
  role: AppRole;
  fullName: string;
  avatarUrl?: string | null;
  phone?: string | null;
  employeeId?: string | null;
  address?: string | null;
  isSuspended: boolean;
};

export async function getSessionProfile() {
  const supabase = await createSupabaseServerClient();
  const headerList = await headers();
  const authHeader = headerList.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return null;
  }

  // We select only known columns to prevent crash if migrations haven't run
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return null;
  }

  // Default values for new columns
  return {
    userId: user.id,
    role: profile.role as AppRole,
    fullName: String(profile.full_name),
    avatarUrl: (profile as any).avatar_url ?? null,
    phone: (profile as any).phone ?? null,
    employeeId: (profile as any).employee_id ?? null,
    address: (profile as any).address ?? null,
    isSuspended: (profile as any).is_suspended ?? false,
  } satisfies SessionProfile;
}

export async function ensureRoleOrRedirect(allowedRoles: AppRole[]) {
  const profile = await getSessionProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!allowedRoles.includes(profile.role)) {
    redirect(`/${profile.role === "admin_gudang" ? "admin-gudang" : profile.role}`);
  }

  return profile;
}
