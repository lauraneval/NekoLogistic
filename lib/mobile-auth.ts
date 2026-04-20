import type { AppRole } from "@/lib/types";
import { mobileError } from "@/lib/mobile-api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MOBILE_ALLOWED_ROLES: AppRole[] = ["kurir", "superadmin", "admin_gudang"];

type MobileAuthContext = {
  userId: string;
  role: AppRole;
};

function readBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";

  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function authenticateMobileRequest(
  request: Request,
  allowedRoles: AppRole[] = MOBILE_ALLOWED_ROLES,
) {
  const token = readBearerToken(request);

  if (!token) {
    return { error: mobileError("Unauthorized", 401) } as const;
  }

  const supabase = createSupabaseAdminClient();
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
