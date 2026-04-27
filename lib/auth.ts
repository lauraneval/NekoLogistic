import { headers } from "next/headers";
import { fail } from "@/lib/api";
import type { AppRole } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AuthContext = {
  userId: string;
  role: AppRole;
};

export async function requireRole(allowedRoles: AppRole[]) {
  const supabase = await createSupabaseServerClient();
  const headerList = await headers();
  const authHeader = headerList.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return { error: fail("Unauthorized", 401) } as const;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: fail("Profile not found", 403) } as const;
  }

  // Skip suspended check if column might be missing
  if ((profile as any).is_suspended) {
    return { error: fail("Account suspended", 403) } as const;
  }

  if (!allowedRoles.includes(profile.role as AppRole)) {
    return { error: fail("Forbidden", 403) } as const;
  }

  return {
    data: {
      userId: user.id,
      role: profile.role as AppRole,
    } satisfies AuthContext,
  } as const;
}

export async function requireAnyAuthenticated() {
  const supabase = await createSupabaseServerClient();
  const headerList = await headers();
  const authHeader = headerList.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { error: fail("Unauthorized", 401) } as const;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile && (profile as any).is_suspended) {
    return { error: fail("Account suspended", 403) } as const;
  }

  return { data: { userId: user.id } } as const;
}
