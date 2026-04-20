import { fail, ok, parseJson } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { makeBagCode } from "@/lib/resi";
import { createManifestSchema } from "@/lib/validation";

type ManifestResult = {
  bag_id: string;
  bag_code: string;
  package_count: number;
};

export async function POST(req: Request) {
  const auth = await requireRole(["admin_gudang", "superadmin"]);

  if ("error" in auth) {
    return auth.error;
  }

  const parsed = await parseJson(req, createManifestSchema);

  if (!parsed.success) {
    return fail("Invalid payload", 422, parsed.error.flatten());
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("create_bag_manifest", {
    p_bag_code: parsed.data.bagCode ?? makeBagCode(),
    p_created_by: auth.data.userId,
    p_resi_numbers: parsed.data.resiNumbers,
  });

  if (error) {
    return fail("Failed to create manifest", 500, error.message);
  }

  const manifest = data as ManifestResult | null;

  await supabase.from("activity_logs").insert({
    actor_id: auth.data.userId,
    action: "CREATE_MANIFEST",
    entity: "bag",
    entity_id: manifest?.bag_id,
    metadata: { count: parsed.data.resiNumbers.length },
  });

  return ok(manifest, 201);
}
