import { mobileError, mobileOk } from "@/lib/mobile-api";
import { authenticateMobileRequest } from "@/lib/mobile-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ProfileRow = {
  user_id: string;
  full_name: string;
  role: string;
  created_at: string;
};

type BagSummaryRow = {
  status: string;
  bag_items?: Array<{
    package_id: string;
    packages?: { id: string; status: string; delivered_at?: string | null } | null;
  }>;
};

function resolvePackages(bagItems: NonNullable<BagSummaryRow["bag_items"]>) {
  const packages: Array<{ id: string; status: string; delivered_at?: string | null }> = [];

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

function getCourierMetrics(bagRows: BagSummaryRow[]) {
  let totalPackages = 0;
  let deliveredPackages = 0;
  let activeTasks = 0;

  for (const bag of bagRows) {
    if (bag.status === "OUT_FOR_DELIVERY") {
      activeTasks += 1;
    }

    const packages = resolvePackages(Array.isArray(bag.bag_items) ? bag.bag_items : []);

    for (const pkg of packages) {
      totalPackages += 1;

      if (pkg.status === "DELIVERED" || Boolean(pkg.delivered_at)) {
        deliveredPackages += 1;
      }
    }
  }

  const efficiencyScore = totalPackages > 0 ? Number(((deliveredPackages / totalPackages) * 100).toFixed(1)) : 0;

  return {
    efficiencyScore,
    totalPackages,
    deliveredPackages,
    activeTasks,
  };
}

export async function GET(req: Request) {
  const auth = await authenticateMobileRequest(req, ["kurir", "superadmin", "admin_gudang"]);

  if ("error" in auth) {
    return auth.error;
  }

  const supabase = createSupabaseAdminClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, full_name, role, created_at")
    .eq("user_id", auth.data.userId)
    .maybeSingle();

  if (profileError || !profile) {
    return mobileError("Profile not found", 404);
  }

  const { data: bags, error: bagsError } = await supabase
    .from("bags")
    .select("status, bag_items(package_id, packages(id, status, delivered_at))")
    .eq("assigned_courier_id", auth.data.userId)
    .limit(300);

  if (bagsError) {
    return mobileError("Internal server error", 500);
  }

  const bagRows = (bags ?? []) as BagSummaryRow[];
  const metrics = getCourierMetrics(bagRows);

  return mobileOk({
    id: profile.user_id,
    full_name: profile.full_name,
    role: profile.role,
    created_at: profile.created_at,
    summary: {
      efficiency_score: metrics.efficiencyScore,
      total_packages: metrics.totalPackages,
      delivered_packages: metrics.deliveredPackages,
      active_tasks: metrics.activeTasks,
      completion_rate: metrics.efficiencyScore,
    },
  });
}
