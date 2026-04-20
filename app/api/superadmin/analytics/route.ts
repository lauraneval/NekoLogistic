import { fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireRole(["superadmin"]);

  if ("error" in auth) {
    return auth.error;
  }

  const supabase = await createSupabaseServerClient();

  const [{ count: totalPackages, error: totalError }, { count: deliveredPackages, error: deliveredError }] =
    await Promise.all([
      supabase.from("packages").select("id", { count: "exact", head: true }),
      supabase
        .from("packages")
        .select("id", { count: "exact", head: true })
        .eq("status", "DELIVERED"),
    ]);

  if (totalError || deliveredError) {
    return fail("Failed to load package metrics", 500);
  }

  const { data: logs, error: logError } = await supabase
    .from("activity_logs")
    .select("id, action, entity, entity_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(25);

  if (logError) {
    return fail("Failed to load activity logs", 500);
  }

  const total = totalPackages ?? 0;
  const delivered = deliveredPackages ?? 0;
  const successRate = total > 0 ? Number(((delivered / total) * 100).toFixed(2)) : 0;

  return ok({
    metrics: {
      totalPackages: total,
      deliveredPackages: delivered,
      successRate,
    },
    recentActivities: logs,
  });
}
