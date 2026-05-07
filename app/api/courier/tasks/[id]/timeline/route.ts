import { z } from "zod";
import { fail, ok } from "@/lib/api";
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

type TrackingHistoryItem = {
  event_code: string;
  event_label: string;
  location: string | null;
  description: string | null;
  created_at: string;
};

type BagTaskRow = {
  id: string;
  bag_code: string;
  destination_city?: string | null;
  status: string;
  assigned_courier_id?: string | null;
  bag_items?: Array<{
    package_id: string;
    packages?: BagPackageRow | BagPackageRow[] | null;
  }>;
};

function resolvePackages(bagItems: NonNullable<BagTaskRow["bag_items"]>) {
  return bagItems
    .map((item) => item.packages)
    .map((pkg) => (Array.isArray(pkg) ? pkg[0] : pkg))
    .filter((pkg): pkg is BagPackageRow => Boolean(pkg));
}

export async function GET(req: Request, ctx: RouteContext<"/api/courier/tasks/[id]/timeline">) {
  const auth = await authenticateMobileRequest(req, ["kurir", "superadmin", "admin_gudang"]);

  if ("error" in auth) {
    return auth.error;
  }

  const parsedId = idSchema.safeParse((await ctx.params).id);

  if (!parsedId.success) {
    return fail("Invalid bag id", 400);
  }

  const supabase = createSupabaseAdminClient();
  const { data: bagData, error: bagError } = await supabase
    .from("bags")
    .select(
      "id, bag_code, destination_city, status, assigned_courier_id, bag_items(package_id, packages(id, resi, receiver_name, receiver_address, status, target_latitude, target_longitude))",
    )
    .eq("id", parsedId.data)
    .maybeSingle();

  if (bagError) {
    return fail("Unable to fetch bag timeline", 500, bagError.message);
  }

  if (!bagData) {
    return fail("Bag not found", 404);
  }

  const bag = bagData as BagTaskRow;

  if (auth.data.role === "kurir" && bag.assigned_courier_id !== auth.data.userId) {
    return fail("Forbidden", 403);
  }

  const packages = resolvePackages(Array.isArray(bag.bag_items) ? bag.bag_items : []);
  const packageIds = packages.map((pkg) => pkg.id);

  if (packageIds.length === 0) {
    return fail("Bag not found", 404);
  }

  const { data: historyRows, error: historyError } = await supabase
    .from("tracking_history")
    .select("package_id, event_code, event_label, location, description, created_at")
    .in("package_id", packageIds)
    .order("created_at", { ascending: true });

  if (historyError) {
    return fail("Unable to fetch tracking timeline", 500, historyError.message);
  }

  const historyByPackageId = new Map<string, TrackingHistoryItem[]>();

  for (const row of (historyRows ?? []) as Array<TrackingHistoryItem & { package_id: string }>) {
    const current = historyByPackageId.get(row.package_id) ?? [];
    current.push({
      event_code: row.event_code,
      event_label: row.event_label,
      location: row.location,
      description: row.description,
      created_at: row.created_at,
    });
    historyByPackageId.set(row.package_id, current);
  }

  return ok({
    bag: {
      id: String(bag.id),
      bag_code: String(bag.bag_code),
      destination_city: String(bag.destination_city ?? "Belum ditentukan"),
      status: String(bag.status),
      assigned_courier_id: bag.assigned_courier_id ? String(bag.assigned_courier_id) : null,
    },
    packages: packages.map((pkg) => ({
      id: String(pkg.id),
      resi: String(pkg.resi),
      receiver_name: String(pkg.receiver_name),
      receiver_address: String(pkg.receiver_address),
      status: String(pkg.status),
      latitude: typeof pkg.target_latitude === "number" ? pkg.target_latitude : null,
      longitude: typeof pkg.target_longitude === "number" ? pkg.target_longitude : null,
      timeline: historyByPackageId.get(pkg.id) ?? [],
    })),
  });
}