import { mobileError, mobileOk } from "@/lib/mobile-api";
import { authenticateMobileRequest } from "@/lib/mobile-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type HistoryPackageRow = {
  id: string;
  resi: string;
  receiver_name: string;
  receiver_address: string;
  package_name?: string | null;
  status: string;
  delivered_at?: string | null;
  created_at: string;
};

type HistoryBagRow = {
  bag_code: string;
  status: string;
  assigned_courier_id?: string | null;
  created_at: string;
  bag_items?: Array<{
    package_id: string;
    packages?: HistoryPackageRow | HistoryPackageRow[] | null;
  }>;
};

function resolvePackages(bagItems: NonNullable<HistoryBagRow["bag_items"]>) {
  const packages: HistoryPackageRow[] = [];

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

function inRange(value: string | null | undefined, start: Date, end: Date) {
  if (!value) {
    return false;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed >= start && parsed < end;
}

export async function GET(req: Request) {
  const auth = await authenticateMobileRequest(req, ["kurir", "superadmin", "admin_gudang"]);

  if ("error" in auth) {
    return auth.error;
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const last7DaysStart = new Date(todayStart);
  last7DaysStart.setDate(last7DaysStart.getDate() - 6);

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("bags")
    .select(
      "bag_code, status, assigned_courier_id, created_at, bag_items(package_id, packages(id, resi, receiver_name, receiver_address, package_name, status, delivered_at, created_at))",
    )
    .eq("assigned_courier_id", auth.data.userId)
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    return mobileError("Internal server error", 500);
  }

  const bags = (data ?? []) as HistoryBagRow[];
  const deliveredPackages = bags
    .flatMap((bag) => {
      const packages = resolvePackages(Array.isArray(bag.bag_items) ? bag.bag_items : []);

      return packages.map((pkg) => ({
        bag_code: bag.bag_code,
        status: bag.status,
        delivered_at: pkg.delivered_at,
        created_at: pkg.created_at,
        id: pkg.id,
        resi: pkg.resi,
        receiver_name: pkg.receiver_name,
        receiver_address: pkg.receiver_address,
        package_name: pkg.package_name ?? null,
      }));
    })
    .filter((entry) => entry.status === "DELIVERED" || Boolean(entry.delivered_at));

  const today = deliveredPackages.filter((entry) => inRange(entry.delivered_at, todayStart, tomorrowStart));
  const yesterday = deliveredPackages.filter((entry) => inRange(entry.delivered_at, yesterdayStart, todayStart));
  const last7Days = deliveredPackages.filter((entry) => inRange(entry.delivered_at, last7DaysStart, tomorrowStart));

  return mobileOk({
    summary: {
      today_count: today.length,
      yesterday_count: yesterday.length,
      last_7_days_count: last7Days.length,
    },
    today: today.map((entry) => ({
      id: entry.id,
      resi: entry.resi,
      receiver_name: entry.receiver_name,
      receiver_address: entry.receiver_address,
      package_name: entry.package_name,
      bag_code: entry.bag_code,
      delivered_at: entry.delivered_at,
    })),
    yesterday: yesterday.map((entry) => ({
      id: entry.id,
      resi: entry.resi,
      receiver_name: entry.receiver_name,
      receiver_address: entry.receiver_address,
      package_name: entry.package_name,
      bag_code: entry.bag_code,
      delivered_at: entry.delivered_at,
    })),
    last_7_days: last7Days.map((entry) => ({
      id: entry.id,
      resi: entry.resi,
      receiver_name: entry.receiver_name,
      receiver_address: entry.receiver_address,
      package_name: entry.package_name,
      bag_code: entry.bag_code,
      delivered_at: entry.delivered_at,
    })),
  });
}
