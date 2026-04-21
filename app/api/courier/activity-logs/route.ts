import { z } from "zod";
import { mobileError, mobileMessage } from "@/lib/mobile-api";
import { authenticateMobileRequest } from "@/lib/mobile-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const activityLogSchema = z.object({
  actor_id: z.uuid(),
  action: z.string().trim().min(1).max(120),
  entity: z.string().trim().min(1).max(120),
  entity_id: z.string().trim().max(120).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(req: Request) {
  const auth = await authenticateMobileRequest(req, ["kurir", "superadmin", "admin_gudang"]);

  if ("error" in auth) {
    return auth.error;
  }

  let rawBody: unknown;

  try {
    rawBody = await req.json();
  } catch {
    return mobileError("Invalid request body", 400);
  }

  const parsed = activityLogSchema.safeParse(rawBody);

  if (!parsed.success) {
    return mobileError("Invalid request body", 400);
  }

  if (parsed.data.actor_id !== auth.data.userId) {
    return mobileError("Forbidden", 403);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("activity_logs")
    .insert({
      actor_id: parsed.data.actor_id,
      action: parsed.data.action,
      entity: parsed.data.entity,
      entity_id: parsed.data.entity_id ?? null,
      metadata: parsed.data.metadata,
    })
    .select("id")
    .single();

  if (error) {
    return mobileError("Internal server error", 500);
  }

  return mobileMessage("Activity log saved", 201, { id: data.id });
}
