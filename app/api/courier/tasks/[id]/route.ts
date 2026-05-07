import { z } from "zod";
import { mobileError, mobileOk } from "@/lib/mobile-api";
import { authenticateMobileRequest } from "@/lib/mobile-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const idSchema = z.uuid();

type BagPackageRow = {
  id: string;
  resi: string;
  receiver_name: string;
  receiver_address: string;
  status: string;
  target_latitude?: number | null;
  target_longitude?: number | null;
};

type BagDetailRow = {
  id: string;
  bag_code: string;
  destination_city?: string | null;
  status: string;
  assigned_courier_id?: string | null;
  created_at: string;
  bag_items?: Array<{
    package_id: string;
    packages?: BagPackageRow | BagPackageRow[] | null;
  }>;
};

function normalizeCoordinate(value: number | null | undefined) {
  return typeof value === "number" ? value : null;
}

function resolvePackages(bagItems: NonNullable<BagDetailRow["bag_items"]>) {
  return bagItems
    .map((item) => item.packages)
    .map((pkg) => (Array.isArray(pkg) ? pkg[0] : pkg))
    .filter((pkg): pkg is BagPackageRow => Boolean(pkg));
}

export async function GET(req: Request, ctx: RouteContext<"/api/courier/tasks/[id]">) {
  const auth = await authenticateMobileRequest(req, ["kurir", "superadmin", "admin_gudang"]);

  if ("error" in auth) {
    return auth.error;
  }

  const parsedId = idSchema.safeParse((await ctx.params).id);

  if (!parsedId.success) {
    return mobileError("Invalid bag id", 400);
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("bags")
    .select(
      "id, bag_code, destination_city, status, assigned_courier_id, created_at, bag_items(package_id, packages(id, resi, receiver_name, receiver_address, status, target_latitude, target_longitude))",
    )
    .eq("id", parsedId.data)
    .maybeSingle();

  if (error) {
    return mobileError("Internal server error", 500);
  }

  if (!data) {
    return mobileError("Bag not found", 404);
  }

  const bag = data as BagDetailRow;

  if (auth.data.role === "kurir" && bag.assigned_courier_id !== auth.data.userId) {
    return mobileError("Forbidden", 403);
  }

  const packages = resolvePackages(Array.isArray(bag.bag_items) ? bag.bag_items : []);

  if (packages.length === 0) {
    return mobileError("Bag not found", 404);
  }

  return mobileOk({
    id: String(bag.id),
    bag_code: String(bag.bag_code),
    destination_city: String(bag.destination_city ?? "Belum ditentukan"),
    status: String(bag.status),
    assigned_courier_id: bag.assigned_courier_id ? String(bag.assigned_courier_id) : null,
    created_at: bag.created_at,
    package_count: packages.length,
    receiver_name: packages[0]?.receiver_name ?? null,
    receiver_address: packages[0]?.receiver_address ?? null,
    latitude: normalizeCoordinate(packages[0]?.target_latitude),
    longitude: normalizeCoordinate(packages[0]?.target_longitude),
    packages: packages.map((pkg) => ({
      id: String(pkg.id),
      resi: String(pkg.resi),
      receiver_name: String(pkg.receiver_name),
      receiver_address: String(pkg.receiver_address),
      status: String(pkg.status),
      latitude: normalizeCoordinate(pkg.target_latitude),
      longitude: normalizeCoordinate(pkg.target_longitude),
    })),
  });
}