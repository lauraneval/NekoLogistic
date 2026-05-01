import { fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type PackageRow = Record<string, unknown> & {
  id?: string;
  receiver_address?: string | null;
  destination_city?: string | null;
};

type BaggingRow = Record<string, unknown> & {
  id?: string;
  bag_code?: string;
  destination_city?: string | null;
  bag_items?: unknown[];
};

function inferCityFromAddress(address: string | null | undefined) {
  const parts = (address ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.at(-1) ?? "Belum ditentukan";
}

function packageCity(pkg: PackageRow) {
  return (pkg.destination_city ?? "").trim() || inferCityFromAddress(pkg.receiver_address);
}

function mergeAutoCityBaggings(bags: BaggingRow[], packages: PackageRow[]) {
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
          String(packageRow.id) === String(pkg.id),
      );
    });

    if (!alreadyInBag) {
      items.push({
        packages: {
          ...pkg,
          package_name: String(pkg.package_name ?? `Paket ${pkg.resi}`),
          destination_city: city,
        },
      });
    }

    bag.bag_items = items;
    byCity.set(key, bag);
  }

  return Array.from(byCity.values());
}

export async function GET() {
  const auth = await requireRole(["superadmin"]);

  if ("error" in auth) {
    return auth.error;
  }

  const supabase = createSupabaseAdminClient();

  const [
    { count: totalPackages, error: totalError },
    { count: deliveredPackages, error: deliveredError },
    packagesResult,
    baggingsResult,
    baggingPackageRows,
    usersResult,
  ] =
    await Promise.all([
      supabase.from("packages").select("id", { count: "exact", head: true }),
      supabase
        .from("packages")
        .select("id", { count: "exact", head: true })
        .eq("status", "DELIVERED"),
      supabase
        .from("packages")
        .select(
          "id, resi, package_name, receiver_name, receiver_address, destination_city, weight_kg, status, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("bags")
        .select(
          "id, bag_code, destination_city, status, created_at, bag_items(created_at, packages(id, resi, package_name, receiver_name, receiver_address, destination_city, status))",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("packages")
        .select("id, resi, package_name, receiver_name, receiver_address, destination_city, status")
        .in("status", ["IN_WAREHOUSE", "OUT_FOR_DELIVERY", "IN_TRANSIT"])
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("profiles")
        .select("user_id, full_name, role, created_at, updated_at")
        .in("role", ["admin_gudang", "kurir"])
        .order("created_at", { ascending: false }),
    ]);

  if (totalError || deliveredError) {
    return fail("Failed to load package metrics", 500);
  }

  const { data: logs, error: logError } = await supabase
    .from("activity_logs")
    .select("id, action, entity, entity_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (logError) {
    return fail("Failed to load activity logs", 500);
  }

  const { data: usersData } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const emailsById = new Map(
    (usersData.users ?? []).map((user) => [user.id, user.email ?? ""]),
  );

  const total = totalPackages ?? 0;
  const delivered = deliveredPackages ?? 0;
  const successRate = total > 0 ? Number(((delivered / total) * 100).toFixed(2)) : 0;

  return ok({
    metrics: {
      totalPackages: total,
      deliveredPackages: delivered,
      successRate,
    },
    users: (usersResult.data ?? []).map((profile) => ({
      ...profile,
      email: emailsById.get(String(profile.user_id)) ?? "",
    })),
    packages: packagesResult.data ?? [],
    baggings: mergeAutoCityBaggings(
      (baggingsResult.data ?? []) as BaggingRow[],
      (baggingPackageRows.data ?? []) as PackageRow[],
    ),
    recentActivities: logs,
  });
}
