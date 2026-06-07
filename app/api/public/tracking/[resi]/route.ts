import { fail, ok } from "@/lib/api";
import { resiSchema } from "@/lib/validation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? "62" + digits.slice(1) : digits;
}

function phonesMatch(a: string, b: string) {
  return normalizePhone(a) === normalizePhone(b);
}

type TrackingPackage = {
  id: string;
  resi: string;
  sender_name: string;
  receiver_name: string;
  receiver_address: string | null;
  receiver_phone: string | null;
  destination_city: string | null;
  status: string;
  created_at: string;
};

type TrackingHistoryItem = {
  event_code: string;
  event_label: string;
  location: string | null;
  description: string | null;
  created_at: string;
};

export async function GET(
  req: Request,
  ctx: RouteContext<"/api/public/tracking/[resi]">,
) {
  const { resi } = await ctx.params;
  const parsedResi = resiSchema.safeParse(resi);

  if (!parsedResi.success) {
    return fail("Invalid tracking number", 400, parsedResi.error.flatten());
  }

  const url = new URL(req.url);
  const phoneParam = url.searchParams.get("phone")?.trim() ?? "";

  const trackingNumber = parsedResi.data;
  const supabaseAdmin = createSupabaseAdminClient();

  const { data: pkg, error: packageError } = await supabaseAdmin
    .from("packages")
    .select(
      "id, resi, sender_name, receiver_name, receiver_address, receiver_phone, destination_city, status, created_at",
    )
    .eq("resi", trackingNumber)
    .maybeSingle();

  if (packageError) {
    return fail("Unable to fetch package", 500);
  }

  if (!pkg) {
    return fail("Tracking number not found. Please check your tracking number and try again.", 404);
  }

  const typedPkg = pkg as TrackingPackage;

  if (typedPkg.receiver_phone) {
    if (!phoneParam) {
      return fail(
        "This package requires phone verification. Please enter the receiver's phone number.",
        403,
      );
    }
    if (!phonesMatch(typedPkg.receiver_phone, phoneParam)) {
      return fail(
        "Phone number does not match our records. Please check and try again.",
        403,
      );
    }
  }

  const { data: history, error: historyError } = await supabaseAdmin
    .from("tracking_history")
    .select("event_code, event_label, location, description, created_at")
    .eq("package_id", typedPkg.id)
    .order("created_at", { ascending: true });

  if (historyError) {
    return fail("Unable to fetch tracking timeline", 500);
  }

  const deliveredEvent = (history ?? []).find((e) => e.event_code === "DELIVERED");

  return ok({
    resi: typedPkg.resi,
    status: typedPkg.status,
    receiver_name: typedPkg.receiver_name,
    receiver_address: typedPkg.receiver_address ?? "",
    destination_city: typedPkg.destination_city ?? null,
    created_at: typedPkg.created_at,
    delivered_at: deliveredEvent?.created_at ?? null,
    timeline: (history ?? []) as TrackingHistoryItem[],
  });
}
