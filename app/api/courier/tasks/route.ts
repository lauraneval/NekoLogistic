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

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("packages")
    .select(
      "id, resi, receiver_name, receiver_address, status, target_latitude, target_longitude",
    )
    .eq("status", parsedStatus.data)
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    return mobileError("Internal server error", 500);
  }

  const tasks = (data ?? []).map((item) => ({
    id: String(item.id),
    resi: String(item.resi),
    receiver_name: String(item.receiver_name),
    receiver_address: String(item.receiver_address),
    status: String(item.status),
    latitude:
      typeof item.target_latitude === "number"
        ? item.target_latitude
        : item.target_latitude === null
          ? null
          : undefined,
    longitude:
      typeof item.target_longitude === "number"
        ? item.target_longitude
        : item.target_longitude === null
          ? null
          : undefined,
  }));

  return mobileOk(tasks);
}
