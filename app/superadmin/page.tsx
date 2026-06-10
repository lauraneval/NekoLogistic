import { PortalDashboard } from "@/components/portal-dashboard";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function buildDailyShipments(packages: Array<{ created_at: string }>) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const counts: Record<string, number> = {};
  days.forEach((d) => (counts[d] = 0));

  const now = new Date();
  for (const pkg of packages) {
    const d = new Date(pkg.created_at);
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays >= 0 && diffDays < 7) {
      const dayIdx = d.getDay();
      const label = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayIdx];
      counts[label] = (counts[label] ?? 0) + 1;
    }
  }

  return days.map((day) => ({ day, count: counts[day] ?? 0 }));
}

export default async function SuperadminPage() {
  const supabase = createSupabaseAdminClient();
  const sevenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString();

  const [
    { count: totalPackages },
    { count: inTransit },
    { count: delivered },
    { data: recentPackages },
    { data: last7DaysRaw },
  ] = await Promise.all([
    supabase.from("packages").select("id", { count: "exact", head: true }),
    supabase.from("packages").select("id", { count: "exact", head: true }).in("status", ["IN_TRANSIT", "OUT_FOR_DELIVERY"]),
    supabase.from("packages").select("id", { count: "exact", head: true }).eq("status", "DELIVERED"),
    supabase
      .from("packages")
      .select("id, resi, receiver_name, receiver_address, destination_city, status, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(10),
    supabase
      .from("packages")
      .select("created_at")
      .gte("created_at", sevenDaysAgo),
  ]);

  const total = totalPackages ?? 0;
  const del = delivered ?? 0;
  const successRate = total > 0 ? Number(((del / total) * 100).toFixed(1)) : 0;

  const last7Days = (last7DaysRaw ?? []).map((r) => ({
    created_at: typeof r.created_at === "string" ? r.created_at : "",
  }));

  const dailyShipments = buildDailyShipments(last7Days);

  const recentActivities = (recentPackages ?? []).map((pkg) => ({
    id: String(pkg.id),
    resi: typeof pkg.resi === "string" ? pkg.resi : "",
    receiver_name: typeof pkg.receiver_name === "string" ? pkg.receiver_name : "",
    origin: "Warehouse",
    destination: typeof pkg.destination_city === "string" ? pkg.destination_city : (typeof pkg.receiver_address === "string" ? pkg.receiver_address : ""),
    status: typeof pkg.status === "string" ? pkg.status : "",
    updated_at: typeof pkg.updated_at === "string" ? pkg.updated_at : (typeof pkg.created_at === "string" ? pkg.created_at : new Date().toISOString()),
  }));

  return (
    <PortalDashboard
      basePath="/superadmin"
      data={{
        totalPackages: total,
        inTransit: inTransit ?? 0,
        delivered: del,
        successRate,
        dailyShipments,
        recentActivities,
      }}
    />
  );
}
