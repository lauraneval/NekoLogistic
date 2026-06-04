import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok, parseJson } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(64),
});

function wantsHtmlResponse(req: Request) {
  const accept = req.headers.get("accept") ?? "";
  const contentType = req.headers.get("content-type") ?? "";

  return accept.includes("text/html") || contentType.includes("application/x-www-form-urlencoded");
}

async function parseLoginRequest(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return parseJson(req, loginSchema);
  }

  const formData = await req.formData();

  return loginSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
}

export async function POST(req: Request) {
  const parsed = await parseLoginRequest(req);

  if (!parsed.success) {
    if (wantsHtmlResponse(req)) {
      return NextResponse.redirect(new URL("/login?auth=invalid", req.url), 303);
    }

    return fail("Invalid credentials payload", 422, parsed.error.flatten());
  }

  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    await supabaseAdmin.from("activity_logs").insert({
      actor_id: null,
      action: "LOGIN_FAILED",
      entity: "auth",
      entity_id: parsed.data.email,
      metadata: { email: parsed.data.email, error: error.message },
    });

    if (wantsHtmlResponse(req)) {
      return NextResponse.redirect(new URL("/login?auth=invalid", req.url), 303);
    }

    return fail("Email or password is invalid", 401);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (wantsHtmlResponse(req)) {
      return NextResponse.redirect(new URL("/login?auth=invalid", req.url), 303);
    }

    return fail("Session not established", 401);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = (profile?.role as string | undefined) ?? "kurir";
  const redirectTo = role === "admin_gudang" ? "/admin-gudang" : `/${role}`;

  await supabaseAdmin.from("activity_logs").insert({
    actor_id: user.id,
    action: "LOGIN_SUCCESS",
    entity: "auth",
    entity_id: user.id,
    metadata: { email: user.email, role },
  });

  if (wantsHtmlResponse(req)) {
    return NextResponse.redirect(new URL(redirectTo, req.url), 303);
  }

  return ok({ role, redirectTo });
}
