import { z } from "zod";
import { mobileError, mobileOk } from "@/lib/mobile-api";
import { authenticateMobileRequest } from "@/lib/mobile-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const statusSchema = z.enum([
  "PACKAGE_CREATED",
  "IN_WAREHOUSE",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED_DELIVERY",
]);

function normalizeCoordinate(value: number | null | undefined) {
  return typeof value === "number" ? value : null;
}

export async function GET(req: Request) {
  const auth = await authenticateMobileRequest(req, ["kurir", "superadmin", "admin_gudang"]);

  if ("error" in auth) {
    return auth.error;
  }

  const url = new URL(req.url);
  const rawStatus = url.searchParams.get("status") ?? "OUT_FOR_DELIVERY";
  const parsedStatus = statusSchema.safeParse(rawStatus);

  if (!parsedStatus.success) {
    return mobileError("Invalid status query", 400);
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("bags")
    .select(
      "id, bag_code, destination_city, status, assigned_courier_id, bag_items(package_id, packages(id, resi, receiver_name, receiver_address, status, target_latitude, target_longitude))",
    )
    .eq("status", parsedStatus.data)
    .eq("assigned_courier_id", auth.data.userId)
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    return mobileError("Internal server error", 500);
  }

  const tasks = (data ?? []).map((bag) => {
    const bagItems = (Array.isArray(bag.bag_items) ? bag.bag_items : []) as Array<{
      package_id: string;
      packages?: {
        id: string;
        resi: string;
        receiver_name: string;
        receiver_address: string;
        status: string;
        target_latitude?: number | null;
        target_longitude?: number | null;
      } | null;
    }>;

    const packages = bagItems
      .map((item) => item.packages)
      .filter((pkg): pkg is NonNullable<typeof pkg> => Boolean(pkg));
    const representativePackage = packages[0] ?? null;

    return {
      id: String(bag.id),
      bag_code: String(bag.bag_code),
      destination_city: String(bag.destination_city ?? "Belum ditentukan"),
      package_count: packages.length,
      status: String(bag.status),
      assigned_courier_id: bag.assigned_courier_id ? String(bag.assigned_courier_id) : null,
      receiver_name: representativePackage?.receiver_name ?? null,
      receiver_address: representativePackage?.receiver_address ?? null,
      latitude: normalizeCoordinate(representativePackage?.target_latitude),
      longitude: normalizeCoordinate(representativePackage?.target_longitude),
      packages: packages.map((pkg) => ({
        id: String(pkg.id),
        resi: String(pkg.resi),
        receiver_name: String(pkg.receiver_name),
        receiver_address: String(pkg.receiver_address),
        status: String(pkg.status),
        latitude: normalizeCoordinate(pkg.target_latitude),
        longitude: normalizeCoordinate(pkg.target_longitude),
      })),
    };
  });

  return mobileOk(tasks.filter((task) => task.package_count > 0));
}
