import { fail, ok, parseJson } from "@/lib/api";
import { makeResi } from "@/lib/resi";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createPackageSchema } from "@/lib/validation";

async function generateUniqueResi() {
  const supabase = await createSupabaseServerClient();

  for (let index = 0; index < 8; index += 1) {
    const candidate = makeResi();
    const { data, error } = await supabase
      .from("packages")
      .select("id")
      .eq("resi", candidate)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return candidate;
    }
  }

  throw new Error("Unable to generate unique tracking number");
}

export async function POST(req: Request) {
  const auth = await requireRole(["admin_gudang", "superadmin"]);

  if ("error" in auth) {
    return auth.error;
  }

  const parsed = await parseJson(req, createPackageSchema);

  if (!parsed.success) {
    return fail("Invalid payload", 422, parsed.error.flatten());
  }

  const supabase = await createSupabaseServerClient();
  const resi = await generateUniqueResi();

  const { data: pkg, error: packageError } = await supabase
    .from("packages")
    .insert({
      resi,
      sender_name: parsed.data.senderName,
      receiver_name: parsed.data.receiverName,
      receiver_address: parsed.data.receiverAddress,
      weight_kg: parsed.data.weightKg,
      status: "PACKAGE_CREATED",
      created_by: auth.data.userId,
    })
    .select("id, resi, status, created_at")
    .single();

  if (packageError || !pkg) {
    return fail("Failed to create package", 500);
  }

  const { error: trackingError } = await supabase.from("tracking_history").insert({
    package_id: pkg.id,
    event_code: "PACKAGE_CREATED",
    event_label: "Paket dibuat di gudang",
    location: "Warehouse",
    description: "Label resi telah dibuat",
    created_by: auth.data.userId,
  });

  if (trackingError) {
    return fail("Package created but timeline insert failed", 500);
  }

  await supabase.from("activity_logs").insert({
    actor_id: auth.data.userId,
    action: "CREATE_PACKAGE",
    entity: "package",
    entity_id: pkg.id,
    metadata: { resi: pkg.resi },
  });

  return ok(pkg, 201);
}
