import { z } from "zod";
import { mobileError, mobileOk } from "@/lib/mobile-api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return mobileError("Invalid JSON body", 400);
  }

  const parsed = refreshSchema.safeParse(body);
  if (!parsed.success) {
    return mobileError("refresh_token is required", 400);
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: parsed.data.refresh_token,
  });

  if (error || !data.session) {
    return mobileError("Session expired. Please log in again.", 401);
  }

  return mobileOk({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in ?? 3600,
  });
}
