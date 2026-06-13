import { mobileError, mobileOk } from "@/lib/mobile-api";
import { authenticateMobileRequest } from "@/lib/mobile-auth";
import { estimateRouteDistanceKm, normalizeCoordinate } from "@/lib/mobile-delivery";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type MobilePackageRow = {
  id: string;
  resi: string;
  receiver_name: string;
  receiver_phone?: string | null;
  receiver_address: string;
  status: string;
  package_name?: string | null;
  weight_kg?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  sender_name?: string | null;
  sender_phone?: string | null;
  sender_email?: string | null;
  target_latitude?: number | null;
  target_longitude?: number | null;
};

type MobileBagRow = {
  id: string;
  bag_code: string;
  destination_city?: string | null;
  status: string;
  assigned_courier_id?: string | null;
  created_at: string;
  bag_items?: Array<{
    package_id: string;
    packages?: MobilePackageRow | MobilePackageRow[] | null;
  }>;
};

function resolvePackages(bagItems: NonNullable<MobileBagRow["bag_items"]>) {
  const packages: MobilePackageRow[] = [];

  for (const item of bagItems) {
    const rawPackages = item.packages;

    if (Array.isArray(rawPackages)) {
      packages.push(...rawPackages);
      continue;
    }

    if (rawPackages) {
      packages.push(rawPackages);
    }
  }

  return packages;
}

function buildTaskItem(bag: MobileBagRow) {
  const packages = resolvePackages(Array.isArray(bag.bag_items) ? bag.bag_items : []);
  const representativePackage = packages[0] ?? null;

  return {
    id: String(bag.id),
    bag_code: String(bag.bag_code),
    destination_city: String(bag.destination_city ?? "Belum ditentukan"),
    status: String(bag.status),
    assigned_courier_id: bag.assigned_courier_id ? String(bag.assigned_courier_id) : null,
    created_at: bag.created_at,
    package_count: packages.length,
    receiver_name: representativePackage?.receiver_name ?? null,
    receiver_phone: representativePackage?.receiver_phone ?? null,
    receiver_address: representativePackage?.receiver_address ?? null,
    resi: representativePackage?.resi ?? null,
    package_name: representativePackage?.package_name ?? null,
    weight_kg: representativePackage?.weight_kg ?? null,
    length_cm: representativePackage?.length_cm ?? null,
    width_cm: representativePackage?.width_cm ?? null,
    height_cm: representativePackage?.height_cm ?? null,
    sender_name: representativePackage?.sender_name ?? null,
    sender_phone: representativePackage?.sender_phone ?? null,
    sender_email: representativePackage?.sender_email ?? null,
    latitude: normalizeCoordinate(representativePackage?.target_latitude),
    longitude: normalizeCoordinate(representativePackage?.target_longitude),
    packages: packages.map((pkg) => ({
      id: String(pkg.id),
      resi: String(pkg.resi),
      receiver_name: String(pkg.receiver_name),
      receiver_phone: pkg.receiver_phone ?? null,
      receiver_address: String(pkg.receiver_address),
      status: String(pkg.status),
      package_name: pkg.package_name ?? null,
      weight_kg: pkg.weight_kg ?? null,
      length_cm: pkg.length_cm ?? null,
      width_cm: pkg.width_cm ?? null,
      height_cm: pkg.height_cm ?? null,
      sender_name: pkg.sender_name ?? null,
      sender_phone: pkg.sender_phone ?? null,
      sender_email: pkg.sender_email ?? null,
      latitude: normalizeCoordinate(pkg.target_latitude),
      longitude: normalizeCoordinate(pkg.target_longitude),
    })),
  };
}

export async function GET(req: Request) {
  const auth = await authenticateMobileRequest(req, ["kurir", "superadmin", "admin_gudang"]);

  if ("error" in auth) {
    return auth.error;
  }

  const supabase = createSupabaseAdminClient();

  let { data, error } = await supabase
    .from("bags")
    .select(
      "id, bag_code, destination_city, status, assigned_courier_id, created_at, bag_items(package_id, packages(id, resi, receiver_name, receiver_phone, receiver_address, package_name, weight_kg, length_cm, width_cm, height_cm, sender_name, sender_phone, sender_email, status, target_latitude, target_longitude))",
    )
    .eq("assigned_courier_id", auth.data.userId)
    .in("status", ["OPEN", "IN_WAREHOUSE", "IN_TRANSIT", "OUT_FOR_DELIVERY"])
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    ({ data, error } = await supabase
      .from("bags")
      .select(
        "id, bag_code, destination_city, status, assigned_courier_id, created_at, bag_items(package_id, packages(id, resi, receiver_name, receiver_phone, receiver_address, package_name, weight_kg, length_cm, width_cm, height_cm, sender_name, sender_phone, sender_email, status))",
      )
      .eq("assigned_courier_id", auth.data.userId)
      .in("status", ["OPEN", "IN_WAREHOUSE", "IN_TRANSIT", "OUT_FOR_DELIVERY"])
      .order("created_at", { ascending: false })
      .limit(300));
  }

  if (error) {
    return mobileError("Internal server error", 500);
  }

  const bags = (data ?? []) as MobileBagRow[];
  const items = bags.map(buildTaskItem).filter((item) => item.package_count > 0);

  const activeTasks = items.filter((item) => item.status === "OUT_FOR_DELIVERY");
  const queueTasks = items.filter((item) => item.status !== "OUT_FOR_DELIVERY");
  const routeStops = items
    .map((item) => {
      const latitude = item.latitude;
      const longitude = item.longitude;

      if (latitude === null || longitude === null) {
        return null;
      }

      return {
        created_at: item.created_at,
        latitude,
        longitude,
      };
    })
    .filter((stop): stop is { created_at: string; latitude: number; longitude: number } => stop !== null);

  return mobileOk({
    summary: {
      total_distance_km: Number(estimateRouteDistanceKm(routeStops).toFixed(1)),
      remaining_drop: items.reduce((total, item) => total + item.package_count, 0),
      active_count: activeTasks.length,
      queue_count: queueTasks.length,
    },
    active_tasks: activeTasks,
    queue_tasks: queueTasks,
  });
}
