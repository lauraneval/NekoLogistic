import { LogoutButton } from "@/components/logout-button";
import { SuperadminDashboard } from "@/components/superadmin-dashboard";
import { ensureRoleOrRedirect } from "@/lib/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PackageStatus } from "@/lib/types";

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

export default async function SuperadminPage() {
  const profile = await ensureRoleOrRedirect(["superadmin"]);
  const supabase = createSupabaseAdminClient();

  const [
    { count: totalPackages },
    { count: deliveredPackages },
    logsResult,
    usersResult,
    packagesResult,
    baggingsResult,
    baggingPackageRows,
  ] = await Promise.all([
    supabase.from("packages").select("id", { count: "exact", head: true }),
    supabase.from("packages").select("id", { count: "exact", head: true }).eq("status", "DELIVERED"),
    supabase
      .from("activity_logs")
      .select("id, action, entity, entity_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("profiles")
      .select("user_id, full_name, role, created_at, updated_at")
      .in("role", ["admin_gudang", "kurir"])
      .order("created_at", { ascending: false }),
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
  ]);
  const { data: usersData } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const emailsById = new Map((usersData.users ?? []).map((user) => [user.id, user.email ?? ""]));

  const total = totalPackages ?? 0;
  const delivered = deliveredPackages ?? 0;

  const initialData = {
    metrics: {
      totalPackages: total,
      deliveredPackages: delivered,
      successRate: total > 0 ? Number(((delivered / total) * 100).toFixed(2)) : 0,
    },
    users: (usersResult.data ?? []).map((user) => ({
      user_id: String(user.user_id),
      full_name: String(user.full_name),
      role: String(user.role),
      email: emailsById.get(String(user.user_id)) ?? "",
      created_at: String(user.created_at),
      updated_at: String(user.updated_at),
    })),
    packages: ((packagesResult.data ?? []) as Record<string, unknown>[]).map((pkg) => ({
      id: String(pkg.id),
      resi: String(pkg.resi),
      package_name: pkg.package_name ? String(pkg.package_name) : null,
      receiver_name: String(pkg.receiver_name),
      receiver_address: String(pkg.receiver_address),
      destination_city: pkg.destination_city ? String(pkg.destination_city) : null,
      weight_kg: typeof pkg.weight_kg === "number" ? pkg.weight_kg : String(pkg.weight_kg ?? ""),
      status: String(pkg.status) as PackageStatus,
      created_at: String(pkg.created_at),
    })),
    baggings: mergeAutoCityBaggings(
      (baggingsResult.data ?? []) as BaggingRow[],
      (baggingPackageRows.data ?? []) as PackageRow[],
    ) as never[],
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
    <main className="mx-auto w-full max-w-7xl px-4 py-12 md:px-8">
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
