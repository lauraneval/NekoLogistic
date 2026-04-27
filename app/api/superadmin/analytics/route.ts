import { ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireRole(["superadmin"]);
  if ("error" in auth) return auth.error;

  const supabase = await createSupabaseServerClient();

  try {
    // 1. Get package stats
    const { data: packages, error: pkgError } = await supabase
      .from("packages")
      .select("status, created_at, created_by");

    if (pkgError) throw pkgError;

    // 2. Get activity logs
    const { data: logs, error: logError } = await supabase
      .from("activity_logs")
      .select(`
        *,
        profiles!activity_logs_actor_id_fkey (
          full_name,
          role
        )
      `)
      .order("created_at", { ascending: false })
      .limit(20);

    if (logError) throw logError;

    // 3. Get Courier Productivity (Packages delivered by each courier)
    // We need to join packages with profiles for those who delivered them.
    // In our schema, created_by is the one who created the package. 
    // Usually, the one who updates status to DELIVERED is the courier.
    // Let's look at tracking_history to find who delivered what.
    const { data: deliveryLogs, error: deliveryError } = await supabase
      .from("tracking_history")
      .select("created_by, event_code")
      .eq("event_code", "DELIVERED");

    if (deliveryError) throw deliveryError;

    // 4. Get Profiles to map names
    const { data: allProfiles } = await supabase.from("profiles").select("user_id, full_name, role");

    const stats = {
      total: packages?.length || 0,
      delivered: packages?.filter((p: any) => p.status === "DELIVERED").length || 0,
      in_transit: packages?.filter((p: any) => ["IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(p.status)).length || 0,
      pending: packages?.filter((p: any) => p.status === "PACKAGE_CREATED").length || 0,
    };

    // Calculate courier productivity
    const courierStats = allProfiles?.filter(p => p.role === 'kurir').map(courier => {
      const deliveredCount = deliveryLogs?.filter(log => log.created_by === courier.user_id).length || 0;
      return {
        name: courier.full_name,
        delivered: deliveredCount
      };
    }).sort((a, b) => b.delivered - a.delivered).slice(0, 5) || [];

    // Calculate workload in last 24 hours (hourly)
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const hourlyWorkload = Array.from({ length: 24 }, (_, i) => {
      const hourDate = new Date(now.getTime() - i * 60 * 60 * 1000);
      hourDate.setMinutes(0, 0, 0);
      const count = packages?.filter(p => {
        const pDate = new Date(p.created_at);
        return pDate >= hourDate && pDate < new Date(hourDate.getTime() + 60 * 60 * 1000);
      }).length || 0;
      return {
        hour: hourDate.getHours() + ":00",
        count
      };
    }).reverse();

    const recentLogs = logs?.map((log: any) => ({
      ...log,
      actor_name: log.profiles?.full_name || "System",
      actor_role: log.profiles?.role || "system"
    })) || [];

    return ok({ stats, courierStats, hourlyWorkload, recentLogs });
  } catch (err: any) {
    console.error("Superadmin Analytics Error:", err);
    return fail(err.message || "Internal Database Error", 500);
  }
}
