import { fail, ok, parseJson } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { makeBagCode } from "@/lib/resi";
import { createBaggingSchema } from "@/lib/validation";

type ManifestResult = {
  bag_id: string;
  bag_code: string;
  destination_city: string;
  package_count: number;
};

type PackageForBagging = {
  id: string;
  resi: string;
  receiver_address?: string | null;
  destination_city?: string | null;
  status?: string | null;
};

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

const fullBaggingSelect =
  "id, bag_code, destination_city, status, created_at, bag_items(created_at, packages(id, resi, package_name, receiver_name, receiver_address, destination_city, status))";
const legacyBaggingSelect =
  "id, bag_code, status, created_at, bag_items(created_at, packages(id, resi, receiver_name, receiver_address, status))";

type BaggingRow = Record<string, unknown> & {
  id?: string;
  bag_code?: string;
  destination_city?: string | null;
  bag_items?: unknown[];
};

function normalizeBagCode(input: string | undefined) {
  if (!input) {
    return makeBagCode();
  }

  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (/^BAG\d{4}[A-Z0-9]{4}$/.test(cleaned)) {
    return `BAG-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
  }

  if (/^BAG-\d{4}-[A-Z0-9]{4}$/.test(input.toUpperCase())) {
    return input.toUpperCase();
  }

  const suffix = cleaned.replace(/^BAG/, "").slice(-4).padStart(4, "0");
  return `BAG-${new Date().getFullYear()}-${suffix}`;
}

function inferCityFromAddress(address: string | null | undefined) {
  const parts = (address ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.at(-1) ?? "Belum ditentukan";
}

function packageCity(pkg: PackageForBagging) {
  return (pkg.destination_city ?? "").trim() || inferCityFromAddress(pkg.receiver_address);
}

async function getPackageRows(supabase: SupabaseAdmin) {
  const full = await supabase
    .from("packages")
    .select("id, resi, package_name, receiver_name, receiver_address, destination_city, status")
    .in("status", ["IN_WAREHOUSE", "OUT_FOR_DELIVERY", "IN_TRANSIT"])
    .order("created_at", { ascending: false })
    .limit(500);

  if (!full.error) {
    return (full.data ?? []) as Array<PackageForBagging & Record<string, unknown>>;
  }

  const legacy = await supabase
    .from("packages")
    .select("id, resi, receiver_name, receiver_address, status")
    .in("status", ["IN_WAREHOUSE", "OUT_FOR_DELIVERY", "IN_TRANSIT"])
    .order("created_at", { ascending: false })
    .limit(500);

  return (legacy.data ?? []) as Array<PackageForBagging & Record<string, unknown>>;
}

function mergeAutoCityBaggings(
  bags: BaggingRow[],
  packages: Array<PackageForBagging & Record<string, unknown>>,
) {
  const byCity = new Map<string, BaggingRow>();

  for (const bag of bags) {
    const city = String(bag.destination_city ?? "").trim();

    if (city) {
      byCity.set(city.toLowerCase(), bag);
    }
  }

  for (const pkg of packages) {
    const city = packageCity(pkg);
    const key = city.toLowerCase();
    const bag =
      byCity.get(key) ??
      ({
        id: `auto-${key}`,
        bag_code: `AUTO-${city.toUpperCase()}`,
        destination_city: city,
        status: "AUTO",
        created_at: new Date().toISOString(),
        bag_items: [],
      } satisfies BaggingRow);

    const items = Array.isArray(bag.bag_items) ? bag.bag_items : [];
    const alreadyInBag = items.some((item) => {
      const packageValue = (item as { packages?: unknown }).packages;
      const packageRow = Array.isArray(packageValue) ? packageValue[0] : packageValue;

      return Boolean(
        packageRow &&
          typeof packageRow === "object" &&
          "id" in packageRow &&
          String(packageRow.id) === pkg.id,
      );
    });

    if (alreadyInBag) {
      byCity.set(key, bag);
      continue;
    }

    items.push({
      packages: {
        ...pkg,
        package_name: String(pkg.package_name ?? `Paket ${pkg.resi}`),
        destination_city: city,
      },
    });
    bag.bag_items = items;
    byCity.set(key, bag);
  }

  return Array.from(byCity.values());
}

async function findOrCreateBag(
  supabase: SupabaseAdmin,
  bagCode: string,
  destinationCity: string,
  userId: string,
) {
  const existingByCode = await supabase
    .from("bags")
    .select("id, bag_code, destination_city")
    .eq("bag_code", bagCode)
    .maybeSingle();

  if (!existingByCode.error && existingByCode.data) {
    const existingBag = existingByCode.data as Record<string, unknown>;

    return {
      id: String(existingBag.id),
      bag_code: String(existingBag.bag_code),
      destination_city:
        typeof existingBag.destination_city === "string"
          ? existingBag.destination_city
          : destinationCity,
    };
  }

  const created = await supabase
    .from("bags")
    .insert({
      bag_code: bagCode,
      destination_city: destinationCity,
      created_by: userId,
    })
    .select("id, bag_code, destination_city")
    .single();

  if (!created.error) {
    const createdBag = created.data as Record<string, unknown>;

    return {
      id: String(createdBag.id),
      bag_code: String(createdBag.bag_code),
      destination_city:
        typeof createdBag.destination_city === "string"
          ? createdBag.destination_city
          : destinationCity,
    };
  }

  const legacyCreated = await supabase
    .from("bags")
    .insert({
      bag_code: bagCode,
      created_by: userId,
    })
    .select("id, bag_code")
    .single();

  if (legacyCreated.error || !legacyCreated.data) {
    throw legacyCreated.error ?? created.error ?? new Error("Failed to create bagging");
  }

  const legacyBag = legacyCreated.data as Record<string, unknown>;

  return {
    id: String(legacyBag.id),
    bag_code: String(legacyBag.bag_code),
    destination_city: destinationCity,
  };
}

async function resolvePackages(
  supabase: SupabaseAdmin,
  packageIds: string[],
  resiNumbers: string[],
) {
  const resolved = new Map<string, PackageForBagging>();

  if (packageIds.length > 0) {
    const fullById = await supabase
      .from("packages")
      .select("id, resi, receiver_address, destination_city, status")
      .in("id", packageIds);
    const byId = fullById.error
      ? await supabase
          .from("packages")
          .select("id, resi, receiver_address, status")
          .in("id", packageIds)
      : fullById;

    for (const pkg of (byId.data ?? []) as PackageForBagging[]) {
      resolved.set(pkg.id, pkg);
    }
  }

  if (resiNumbers.length > 0) {
    const normalizedResi = resiNumbers.map((resi) => resi.trim().toUpperCase());
    const fullByResi = await supabase
      .from("packages")
      .select("id, resi, receiver_address, destination_city, status")
      .in("resi", normalizedResi);
    const byResi = fullByResi.error
      ? await supabase
          .from("packages")
          .select("id, resi, receiver_address, status")
          .in("resi", normalizedResi)
      : fullByResi;

    for (const pkg of (byResi.data ?? []) as PackageForBagging[]) {
      resolved.set(pkg.id, pkg);
    }
  }

  return Array.from(resolved.values()).filter((pkg) => pkg.status !== "DELIVERED");
}

export async function GET() {
  const auth = await requireRole(["admin_gudang", "superadmin"]);

  if ("error" in auth) {
    return auth.error;
  }

  const supabase = createSupabaseAdminClient();
  const packageRows = await getPackageRows(supabase);
  const fullResult = await supabase
    .from("bags")
    .select(fullBaggingSelect)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!fullResult.error) {
    return ok(mergeAutoCityBaggings((fullResult.data ?? []) as BaggingRow[], packageRows));
  }

  const legacyResult = await supabase
    .from("bags")
    .select(legacyBaggingSelect)
    .order("created_at", { ascending: false })
    .limit(200);

  if (legacyResult.error) {
    return fail("Failed to fetch bagging data", 500, legacyResult.error.message);
  }

  const legacyBags = ((legacyResult.data ?? []) as BaggingRow[]).map((bag) => ({
      ...bag,
      destination_city: null,
    }));

  return ok(mergeAutoCityBaggings(legacyBags, packageRows));
}

export async function POST(req: Request) {
  const auth = await requireRole(["admin_gudang", "superadmin"]);

  if ("error" in auth) {
    return auth.error;
  }

  const parsed = await parseJson(req, createBaggingSchema);

  if (!parsed.success) {
    return fail("Invalid payload", 422, parsed.error.flatten());
  }

  const supabase = createSupabaseAdminClient();
  const packages = await resolvePackages(
    supabase,
    parsed.data.packageIds,
    parsed.data.resiNumbers,
  );

  if (!packages.length) {
    return fail("Paket tidak ditemukan atau sudah terkirim", 422);
  }

  const destinationCity = parsed.data.destinationCity ?? packageCity(packages[0]);
  const bagCode = normalizeBagCode(parsed.data.bagCode);

  let bag: { id: string; bag_code: string; destination_city?: string | null };

  try {
    bag = await findOrCreateBag(supabase, bagCode, destinationCity, auth.data.userId);

    for (const pkg of packages) {
      await supabase.from("bag_items").delete().eq("package_id", pkg.id);

      const { error: itemError } = await supabase.from("bag_items").insert({
        bag_id: bag.id,
        package_id: pkg.id,
      });

      if (itemError) {
        throw itemError;
      }

      if (pkg.status === "PACKAGE_CREATED") {
        const { error: updateError } = await supabase
          .from("packages")
          .update({ status: "IN_WAREHOUSE" })
          .eq("id", pkg.id);

        if (updateError) {
          throw updateError;
        }

        await supabase.from("tracking_history").insert({
          package_id: pkg.id,
          event_code: "IN_WAREHOUSE",
          event_label: "Di bagging",
          location: destinationCity,
          description: `Masuk ke bagging ${bag.bag_code}`,
          created_by: auth.data.userId,
        });
      }
    }
  } catch (error) {
    return fail(
      "Failed to create bagging",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }

  const manifest: ManifestResult = {
    bag_id: String(bag.id),
    bag_code: String(bag.bag_code),
    destination_city: String(bag.destination_city ?? destinationCity),
    package_count: packages.length,
  };

  await supabase.from("activity_logs").insert({
    actor_id: auth.data.userId,
    action: "CREATE_BAGGING",
    entity: "bag",
    entity_id: manifest.bag_id,
    metadata: {
      count: packages.length,
      destination_city: destinationCity,
    },
  });

  return ok(manifest, 201);
}

export async function DELETE(req: Request) {
  const auth = await requireRole(["admin_gudang", "superadmin"]);

  if ("error" in auth) {
    return auth.error;
  }

  const packageId = new URL(req.url).searchParams.get("packageId");

  if (!packageId) {
    return fail("Package id is required", 422);
  }

  const supabase = createSupabaseAdminClient();
  const { error: deleteError } = await supabase
    .from("bag_items")
    .delete()
    .eq("package_id", packageId);

  if (deleteError) {
    return fail("Failed to remove package from bagging", 500, deleteError.message);
  }

  const { error: updateError } = await supabase
    .from("packages")
    .update({ status: "PACKAGE_CREATED" })
    .eq("id", packageId);

  if (updateError) {
    return fail("Package removed from bagging but status update failed", 500, updateError.message);
  }

  await supabase.from("activity_logs").insert({
    actor_id: auth.data.userId,
    action: "REMOVE_PACKAGE_FROM_BAGGING",
    entity: "package",
    entity_id: packageId,
  });

  return ok({ packageId });
}
