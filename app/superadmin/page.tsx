import { LogoutButton } from "@/components/logout-button";
import { SuperadminDashboard } from "@/components/superadmin-dashboard";
import { ensureRoleOrRedirect } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SuperadminPage() {
  const profile = await ensureRoleOrRedirect(["superadmin"]);
  const supabase = await createSupabaseServerClient();

  const [{ count: totalPackages }, { count: deliveredPackages }, logsResult] = await Promise.all([
    supabase.from("packages").select("id", { count: "exact", head: true }),
    supabase.from("packages").select("id", { count: "exact", head: true }).eq("status", "DELIVERED"),
    supabase
      .from("activity_logs")
      .select("id, action, entity, entity_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  const total = totalPackages ?? 0;
  const delivered = deliveredPackages ?? 0;

  const initialData = {
    metrics: {
      totalPackages: total,
      deliveredPackages: delivered,
      successRate: total > 0 ? Number(((delivered / total) * 100).toFixed(2)) : 0,
    },
    recentActivities: (logsResult.data ?? []).map((log) => ({
      id: Number(log.id),
      action: String(log.action),
      entity: String(log.entity),
      entity_id: log.entity_id ? String(log.entity_id) : null,
      metadata: (log.metadata as Record<string, unknown>) ?? {},
      created_at: String(log.created_at),
    })),
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 md:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-3xl font-bold text-slate-900">Superadmin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Halo, {profile.fullName}</p>
        </div>
        <LogoutButton />
      </div>

      <SuperadminDashboard initialData={initialData} />
    </main>
  );
}
