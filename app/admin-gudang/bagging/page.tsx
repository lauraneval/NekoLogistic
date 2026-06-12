import { PortalBagging } from "@/components/portal-bagging";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminGudangBaggingPage() {
  const supabase = createSupabaseAdminClient();

  const [{ data: packages }, { data: bags }, { data: courierProfiles }] = await Promise.all([
    supabase
      .from("packages")
      .select("id, resi, package_name, receiver_name, receiver_address, destination_city, weight_kg, status")
      .in("status", ["PACKAGE_CREATED", "IN_WAREHOUSE"])
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("bags")
      .select("id, bag_code, destination_city, status, created_at, assigned_courier_id, bag_items(package_id, packages(id, resi, package_name, receiver_name, receiver_address, destination_city))")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("profiles")
      .select("user_id, full_name")
      .eq("role", "kurir")
      .order("full_name"),
  ]);

  const availablePackages = (packages ?? []).map((pkg) => ({
    id: typeof pkg.id === "string" ? pkg.id : "",
    resi: typeof pkg.resi === "string" ? pkg.resi : "",
    package_name: typeof pkg.package_name === "string" ? pkg.package_name : null,
    receiver_name: typeof pkg.receiver_name === "string" ? pkg.receiver_name : "",
    receiver_address: typeof pkg.receiver_address === "string" ? pkg.receiver_address : "",
    destination_city: typeof pkg.destination_city === "string" ? pkg.destination_city : null,
    weight_kg: typeof pkg.weight_kg === "number" ? pkg.weight_kg : Number(pkg.weight_kg ?? 0),
    status: typeof pkg.status === "string" ? pkg.status : "",
  }));

  const existingBags = ((bags ?? []) as Record<string, unknown>[]).map((bag) => ({
    id: typeof bag.id === "string" ? bag.id : "",
    bag_code: typeof bag.bag_code === "string" ? bag.bag_code : "",
    destination_city: typeof bag.destination_city === "string" ? bag.destination_city : null,
    status: typeof bag.status === "string" ? bag.status : "",
    created_at: typeof bag.created_at === "string" ? bag.created_at : "",
    package_count: Array.isArray(bag.bag_items) ? bag.bag_items.length : 0,
    assigned_courier_id: typeof bag.assigned_courier_id === "string" ? bag.assigned_courier_id : null,
    bag_items: Array.isArray(bag.bag_items) ? bag.bag_items : [],
  }));

  const couriers = (courierProfiles ?? []).map((p) => ({
    id: String(p.user_id),
    full_name: String(p.full_name ?? ""),
  }));

  return <PortalBagging availablePackages={availablePackages} existingBags={existingBags} couriers={couriers} />;
}
