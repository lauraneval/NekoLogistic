import { PortalPackages } from "@/components/portal-packages";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PackageStatus } from "@/lib/types";

export default async function AdminGudangPackagesPage() {
  const supabase = createSupabaseAdminClient();

  const { data } = await supabase
    .from("packages")
    .select("id, resi, package_name, sender_name, receiver_name, receiver_address, destination_city, weight_kg, status, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const packages = (data ?? []).map((pkg) => ({
    id: typeof pkg.id === "string" ? pkg.id : "",
    resi: typeof pkg.resi === "string" ? pkg.resi : "",
    package_name: typeof pkg.package_name === "string" ? pkg.package_name : null,
    sender_name: typeof pkg.sender_name === "string" ? pkg.sender_name : "",
    receiver_name: typeof pkg.receiver_name === "string" ? pkg.receiver_name : "",
    receiver_address: typeof pkg.receiver_address === "string" ? pkg.receiver_address : "",
    destination_city: typeof pkg.destination_city === "string" ? pkg.destination_city : null,
    weight_kg: typeof pkg.weight_kg === "number" ? pkg.weight_kg : Number(pkg.weight_kg ?? 0),
    status: (typeof pkg.status === "string" ? pkg.status : "") as PackageStatus,
    created_at: typeof pkg.created_at === "string" ? pkg.created_at : "",
  }));

  return <PortalPackages packages={packages} basePath="/admin-gudang" />;
}
