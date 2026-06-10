import { mobileError, mobileMessage } from "@/lib/mobile-api";
import { authenticateMobileRequest } from "@/lib/mobile-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function readBearerToken(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  const token = auth.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function POST(req: Request) {
  const auth = await authenticateMobileRequest(req, ["kurir"]);
  if (auth.error) return auth.error;

  const token = readBearerToken(req);
  if (!token) return mobileError("Missing token", 400);

  const supabase = createSupabaseAdminClient();
  await supabase.auth.admin.signOut(token);

  return mobileMessage("Logged out successfully", 200);
}
