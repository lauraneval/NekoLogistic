import { PortalActivityLogs, type ActivityLogEntry } from "@/components/portal-activity-logs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ActivityLogsPage() {
  const supabase = createSupabaseAdminClient();

  const [{ data: logs }, { data: profiles }] = await Promise.all([
    supabase
      .from("activity_logs")
      .select("id, actor_id, action, entity, entity_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("profiles").select("user_id, full_name, role"),
  ]);

  const actorMap = new Map(
    (profiles ?? []).map((p) => [String(p.user_id), p]),
  );

  const entries: ActivityLogEntry[] = (logs ?? []).map((log) => {
    const actor = log.actor_id ? actorMap.get(String(log.actor_id)) : null;
    return {
      id: log.id as number,
      actor_id: log.actor_id as string | null,
      actor_name: actor?.full_name ? String(actor.full_name) : (log.actor_id ? "Deleted User" : "System"),
      actor_role: actor?.role ? String(actor.role) : null,
      action: String(log.action),
      entity: String(log.entity),
      entity_id: log.entity_id ? String(log.entity_id) : null,
      metadata: (log.metadata as Record<string, unknown>) ?? {},
      created_at: String(log.created_at),
    };
  });

  return <PortalActivityLogs logs={entries} />;
}
