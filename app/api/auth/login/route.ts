import { z } from "zod";
import { fail, ok, parseJson } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(64),
});

export async function POST(req: Request) {
  try {
    const parsed = await parseJson(req, loginSchema);

    if (!parsed.success) {
      return fail("Invalid credentials payload", 422, parsed.error.flatten());
    }

    const supabase = await createSupabaseServerClient();
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error || !authData.session) {
      return fail("Email or password is invalid", 401);
    }

    const user = authData.user;
    const token = authData.session.access_token;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const role = (profile?.role as string | undefined) ?? "kurir";
    const redirectTo = role === "admin_gudang" ? "/admin-gudang" : `/${role}`;

    return ok({ role, redirectTo, token });
  } catch (err: any) {
    console.error("Login Error:", err);
    return fail(err.message || "Internal Server Error", 500);
  }
}
