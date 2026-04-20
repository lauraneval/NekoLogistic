import { fail, ok } from "@/lib/api";
import { getSessionProfile } from "@/lib/session";

export async function GET() {
  const profile = await getSessionProfile();

  if (!profile) {
    return fail("Unauthorized", 401);
  }

  return ok(profile);
}
