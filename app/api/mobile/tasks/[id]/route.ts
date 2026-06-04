import { z } from "zod";
import { mobileError, mobileOk } from "@/lib/mobile-api";
import { authenticateMobileRequest } from "@/lib/mobile-auth";
import { addHoursIso, normalizeCoordinate } from "@/lib/mobile-delivery";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const idSchema = z.uuid();

type MobilePackageRow = {
  id: string;
  resi: string;
  receiver_name: string;
  receiver_address: string;
  status: string;
  package_name?: string | null;
  weight_kg?: number | null;
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

export async function GET(req: Request, ctx: RouteContext<"/api/mobile/tasks/[id]">) {
  const auth = await authenticateMobileRequest(req, ["kurir", "superadmin", "admin_gudang"]);

  if ("error" in auth) {
    return auth.error;
  }

  const parsedId = idSchema.safeParse((await ctx.params).id);

  if (!parsedId.success) {
    return mobileError("Invalid task id", 400);
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("bags")
    .select(
      "id, bag_code, destination_city, status, assigned_courier_id, created_at, bag_items(package_id, packages(id, resi, receiver_name, receiver_address, package_name, weight_kg, status, target_latitude, target_longitude))",
    )
    .eq("id", parsedId.data)
    .maybeSingle();

  if (error) {
    return mobileError("Internal server error", 500);
  }

  if (!data) {
    return mobileError("Task not found", 404);
  }

  const bag = data as MobileBagRow;

  if (auth.data.role === "kurir" && bag.assigned_courier_id !== auth.data.userId) {
    return mobileError("Forbidden", 403);
  }

  const packages = resolvePackages(Array.isArray(bag.bag_items) ? bag.bag_items : []);

  if (packages.length === 0) {
    return mobileError("Task not found", 404);
  }

  const primaryPackage = packages[0];
  const expectedArrivalAt = addHoursIso(bag.created_at, 8);

  return mobileOk({
    id: String(bag.id),
    bag_code: String(bag.bag_code),
    destination_city: String(bag.destination_city ?? "Belum ditentukan"),
    status: String(bag.status),
    assigned_courier_id: bag.assigned_courier_id ? String(bag.assigned_courier_id) : null,
    created_at: bag.created_at,
    package_count: packages.length,
    receiver_name: primaryPackage?.receiver_name ?? null,
    receiver_address: primaryPackage?.receiver_address ?? null,
    resi: primaryPackage?.resi ?? null,
    package_name: primaryPackage?.package_name ?? null,
    weight_kg: primaryPackage?.weight_kg ?? null,
    handling_instruction: primaryPackage?.package_name ?? null,
    expected_arrival_at: expectedArrivalAt,
    latitude: normalizeCoordinate(primaryPackage?.target_latitude),
    longitude: normalizeCoordinate(primaryPackage?.target_longitude),
    packages: packages.map((pkg) => ({
      id: String(pkg.id),
      resi: String(pkg.resi),
      receiver_name: String(pkg.receiver_name),
      receiver_address: String(pkg.receiver_address),
      status: String(pkg.status),
      package_name: pkg.package_name ?? null,
      weight_kg: pkg.weight_kg ?? null,
      latitude: normalizeCoordinate(pkg.target_latitude),
      longitude: normalizeCoordinate(pkg.target_longitude),
    })),
  });
}
