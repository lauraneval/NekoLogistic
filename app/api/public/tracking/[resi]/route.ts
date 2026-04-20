import { fail, ok } from "@/lib/api";
import { resiSchema } from "@/lib/validation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type TrackingPackage = {
  id: string;
  resi: string;
  sender_name: string;
  receiver_name: string;
  status: string;
  created_at: string;
};

type TrackingHistoryItem = {
  event_code: string;
  event_label: string;
  location: string | null;
  description: string | null;
  created_at: string;
};

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/public/tracking/[resi]">,
) {
  const { resi } = await ctx.params;
  const parsedResi = resiSchema.safeParse(resi);

  if (!parsedResi.success) {
    return fail("Invalid tracking number", 400, parsedResi.error.flatten());
  }

  const trackingNumber = parsedResi.data;
  const supabaseAdmin = createSupabaseAdminClient();

  const packageResult = await supabaseAdmin
    .from("packages")
    .select("id, resi, sender_name, receiver_name, status, created_at")
    .eq("resi", trackingNumber)
    .maybeSingle();

  const pkg = packageResult.data as TrackingPackage | null;
  const packageError = packageResult.error;

  if (packageError) {
    return fail("Unable to fetch package", 500);
  }

  if (!pkg) {
    return fail("Tracking number not found", 404);
  }

  const historyResult = await supabaseAdmin
    .from("tracking_history")
    .select("event_code, event_label, location, description, created_at")
    .eq("package_id", pkg.id)
    .order("created_at", { ascending: true });

  const history = (historyResult.data ?? []) as TrackingHistoryItem[];
  const historyError = historyResult.error;

  if (historyError) {
    return fail("Unable to fetch tracking timeline", 500);
  }

  return ok({ package: pkg, timeline: history });
}
