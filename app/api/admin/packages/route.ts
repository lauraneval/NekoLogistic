import { fail, ok, parseJson } from "@/lib/api";
import { makeResi } from "@/lib/resi";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createPackageSchema,
  updatePackageSchema,
  updatePackageStatusSchema,
} from "@/lib/validation";
import { packageStatusLabels, type PackageStatus } from "@/lib/types";
import { makeBagCode } from "@/lib/resi";

const fullPackageSelect =
  "id, resi, package_name, sender_name, receiver_name, receiver_address, destination_city, weight_kg, status, created_at, updated_at";
const legacyPackageSelect =
  "id, resi, sender_name, receiver_name, receiver_address, weight_kg, status, created_at, updated_at";

type PackageRecord = {
  id: string;
  resi: string;
  receiver_address?: string | null;
  destination_city?: string | null;
  status: PackageStatus;
};

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

function inferCityFromAddress(address: string | null | undefined) {
  const parts = (address ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.at(-1) ?? "Belum ditentukan";
}

async function ensureCityBag(
  supabase: SupabaseAdmin,
  city: string,
  userId: string,
) {
  const normalizedCity = city.trim() || "Belum ditentukan";

  const existing = await supabase
    .from("bags")
    .select("id, bag_code, destination_city")
    .ilike("destination_city", normalizedCity)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!existing.error && existing.data) {
    return existing.data;
  }

  const created = await supabase
    .from("bags")
    .insert({
      bag_code: makeBagCode(),
      destination_city: normalizedCity,
      created_by: userId,
    })
    .select("id, bag_code, destination_city")
    .single();

  if (!created.error) {
    return created.data;
  }

  const legacyCreated = await supabase
    .from("bags")
    .insert({
      bag_code: makeBagCode(),
      created_by: userId,
    })
    .select("id, bag_code")
    .single();

  if (legacyCreated.error || !legacyCreated.data) {
    throw legacyCreated.error ?? created.error ?? new Error("Failed to create bagging");
  }

  return {
    ...legacyCreated.data,
    destination_city: normalizedCity,
  };
}

async function movePackageToBag(
  supabase: SupabaseAdmin,
  packageId: string,
  bagId: string,
) {
  await supabase.from("bag_items").delete().eq("package_id", packageId);

  const { error } = await supabase.from("bag_items").insert({
    bag_id: bagId,
    package_id: packageId,
  });

  if (error) {
    throw error;
  }
}

async function generateUniqueResi() {
  const supabase = createSupabaseAdminClient();

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

export async function GET() {
  const auth = await requireRole(["admin_gudang", "superadmin"]);

  if ("error" in auth) {
    return auth.error;
  }

  const supabase = createSupabaseAdminClient();
  const fullResult = await supabase
    .from("packages")
    .select(fullPackageSelect)
    .order("created_at", { ascending: false })
    .limit(500);

  if (!fullResult.error) {
    return ok(fullResult.data ?? []);
  }

  const legacyResult = await supabase
    .from("packages")
    .select(legacyPackageSelect)
    .order("created_at", { ascending: false })
    .limit(500);

  if (legacyResult.error) {
    return fail("Failed to fetch packages", 500, legacyResult.error.message);
  }

  return ok(
    (legacyResult.data ?? []).map((pkg) => ({
      ...pkg,
      package_name: null,
      destination_city: null,
    })),
  );
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

  const supabase = createSupabaseAdminClient();
  const resi = await generateUniqueResi();

  const insertPayload = {
    resi,
    package_name: parsed.data.packageName,
    sender_name: parsed.data.senderName,
    receiver_name: parsed.data.receiverName,
    receiver_address: parsed.data.receiverAddress,
    destination_city: parsed.data.destinationCity,
    weight_kg: parsed.data.weightKg,
    status: "PACKAGE_CREATED",
    created_by: auth.data.userId,
  };

  const packageResult = await supabase
    .from("packages")
    .insert(insertPayload)
    .select("id, resi, status, created_at")
    .single();

  const legacyPackageResult = packageResult.error
    ? await supabase
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
        .single()
    : packageResult;

  const { data: pkg, error: packageError } = legacyPackageResult;

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

  const timelineWarning = trackingError?.message;

  await supabase.from("activity_logs").insert({
    actor_id: auth.data.userId,
    action: "CREATE_PACKAGE",
    entity: "package",
    entity_id: pkg.id,
    metadata: { resi: pkg.resi },
  });

  return ok({ ...pkg, warning: timelineWarning }, 201);
}

export async function PATCH(req: Request) {
  const auth = await requireRole(["admin_gudang", "superadmin"]);

  if ("error" in auth) {
    return auth.error;
  }

  const parsed = await parseJson(req, updatePackageStatusSchema);

  if (!parsed.success) {
    return fail("Invalid payload", 422, parsed.error.flatten());
  }

  const supabase = createSupabaseAdminClient();
  const fullUpdate = await supabase
    .from("packages")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .select("id, resi, receiver_address, status, destination_city")
    .single();

  const legacyUpdate = fullUpdate.error
    ? await supabase
        .from("packages")
        .update({ status: parsed.data.status })
        .eq("id", parsed.data.id)
        .select("id, resi, receiver_address, status")
        .single()
    : fullUpdate;

  const { data: pkg, error: updateError } = legacyUpdate;

  if (updateError || !pkg) {
    return fail("Failed to update package status", 500, updateError?.message);
  }

  const status = parsed.data.status as PackageStatus;
  const updatedPackage = pkg as PackageRecord;
  const city =
    String(updatedPackage.destination_city ?? "").trim() ||
    inferCityFromAddress(updatedPackage.receiver_address);

  if (status === "IN_WAREHOUSE") {
    try {
      const bag = await ensureCityBag(supabase, city, auth.data.userId);
      await movePackageToBag(supabase, parsed.data.id, String(bag.id));
    } catch (error) {
      return fail(
        "Package status updated but failed to assign bagging",
        500,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  const { error: trackingError } = await supabase.from("tracking_history").insert({
    package_id: parsed.data.id,
    event_code: status,
    event_label: packageStatusLabels[status],
    location: city,
    description: `Status paket diperbarui menjadi ${packageStatusLabels[status].toLowerCase()}`,
    created_by: auth.data.userId,
  });

  const timelineWarning = trackingError?.message;

  await supabase.from("activity_logs").insert({
    actor_id: auth.data.userId,
    action: "UPDATE_PACKAGE_STATUS",
    entity: "package",
    entity_id: parsed.data.id,
    metadata: { resi: pkg.resi, status },
  });

  return ok({ ...pkg, warning: timelineWarning });
}

export async function PUT(req: Request) {
  const auth = await requireRole(["admin_gudang", "superadmin"]);

  if ("error" in auth) {
    return auth.error;
  }

  const parsed = await parseJson(req, updatePackageSchema);

  if (!parsed.success) {
    return fail("Invalid payload", 422, parsed.error.flatten());
  }

  const supabase = createSupabaseAdminClient();
  const updatePayload = {
    package_name: parsed.data.packageName,
    receiver_name: parsed.data.receiverName,
    receiver_address: parsed.data.receiverAddress,
    destination_city: parsed.data.destinationCity,
    weight_kg: parsed.data.weightKg,
  };

  const fullUpdate = await supabase
    .from("packages")
    .update(updatePayload)
    .eq("id", parsed.data.id)
    .select(fullPackageSelect)
    .single();

  const legacyUpdate = fullUpdate.error
    ? await supabase
        .from("packages")
        .update({
          receiver_name: parsed.data.receiverName,
          receiver_address: parsed.data.receiverAddress,
          weight_kg: parsed.data.weightKg,
        })
        .eq("id", parsed.data.id)
        .select(legacyPackageSelect)
        .single()
    : fullUpdate;

  if (legacyUpdate.error || !legacyUpdate.data) {
    return fail("Failed to update package", 500, legacyUpdate.error?.message);
  }

  await supabase.from("activity_logs").insert({
    actor_id: auth.data.userId,
    action: "UPDATE_PACKAGE",
    entity: "package",
    entity_id: parsed.data.id,
    metadata: { resi: legacyUpdate.data.resi },
  });

  return ok({
    ...legacyUpdate.data,
    package_name:
      "package_name" in legacyUpdate.data ? legacyUpdate.data.package_name : parsed.data.packageName,
    destination_city:
      "destination_city" in legacyUpdate.data
        ? legacyUpdate.data.destination_city
        : parsed.data.destinationCity,
  });
}

export async function DELETE(req: Request) {
  const auth = await requireRole(["admin_gudang", "superadmin"]);

  if ("error" in auth) {
    return auth.error;
  }

  const id = new URL(req.url).searchParams.get("id");

  if (!id) {
    return fail("Package id is required", 422);
  }

  const supabase = createSupabaseAdminClient();
  const { data: pkg } = await supabase
    .from("packages")
    .select("id, resi")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("packages").delete().eq("id", id);

  if (error) {
    return fail("Failed to delete package", 500, error.message);
  }

  await supabase.from("activity_logs").insert({
    actor_id: auth.data.userId,
    action: "DELETE_PACKAGE",
    entity: "package",
    entity_id: id,
    metadata: { resi: pkg?.resi },
  });

  return ok({ id });
}
