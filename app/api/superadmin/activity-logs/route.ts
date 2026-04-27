import { ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const auth = await requireRole(["superadmin"]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 50;
  const offset = (page - 1) * limit;

  const supabase = await createSupabaseServerClient();

  try {
    let query = supabase
      .from("activity_logs")
      .select(`
        *,
        profiles!activity_logs_actor_id_fkey (
          full_name,
          role
        )
      `, { count: "exact" });

    if (search) {
      // In Supabase, searching across multiple columns often requires raw or complex filters
      // For simplicity, we filter by action or entity if search matches
      query = query.or(`action.ilike.%${search}%,entity.ilike.%${search}%,entity_id.ilike.%${search}%`);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const formattedLogs = data?.map((log: any) => ({
      ...log,
      actor_name: log.profiles?.full_name || "System",
      actor_role: log.profiles?.role || "system",
      employee_id: log.profiles?.employee_id
    })) || [];

    return ok({
      logs: formattedLogs,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (err: any) {
    return fail(err.message, 500);
  }
}
