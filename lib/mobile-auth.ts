import type { AppRole } from "@/lib/types";
import { mobileError } from "@/lib/mobile-api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MOBILE_ALLOWED_ROLES: AppRole[] = ["kurir", "superadmin", "admin_gudang"];

type MobileAuthContext = {
  userId: string;
  role: AppRole;
};

export async function authenticateMobileRequest(
  request: Request,
  allowedRoles: AppRole[] = MOBILE_ALLOWED_ROLES,
) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ") 
    ? authHeader.slice(7).trim() 
    : undefined;

  if (!token) {
    // If no token, maybe it's using cookies (for web debugging mobile APIs)
    // but usually mobile apps MUST send token.
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return { error: mobileError("Unauthorized", 401) } as const;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: mobileError("Forbidden", 403) } as const;
  }

  const role = profile.role as AppRole;

  if (!allowedRoles.includes(role)) {
    return { error: mobileError("Forbidden", 403) } as const;
  }

  return {
    data: {
      userId: user.id,
      role,
    } satisfies MobileAuthContext,
  } as const;
}
