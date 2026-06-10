import { z } from "zod";
import { mobileError, mobileOk } from "@/lib/mobile-api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return mobileError("Invalid JSON body", 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return mobileError("Email and password are required", 400);
  }

  const supabase = createSupabaseAdminClient();

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (authError || !authData.session || !authData.user) {
    return mobileError("Invalid email or password", 401);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, phone_number")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (!profile || profile.role !== "kurir") {
    await supabase.auth.admin.signOut(authData.session.access_token);
    return mobileError("Access denied. This app is for courier accounts only.", 403);
  }

  await supabase
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("user_id", authData.user.id);

  return mobileOk({
    user: {
      id: authData.user.id,
      name: profile.full_name ?? "",
      email: authData.user.email ?? "",
      phone: profile.phone_number ?? null,
      role: profile.role,
    },
    access_token: authData.session.access_token,
    refresh_token: authData.session.refresh_token,
    expires_in: authData.session.expires_in ?? 3600,
  });
}
