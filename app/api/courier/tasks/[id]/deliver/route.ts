import { z } from "zod";
import { mobileError, mobileMessage } from "@/lib/mobile-api";
import { authenticateMobileRequest } from "@/lib/mobile-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const deliverSchema = z.object({
  status: z.literal("DELIVERED"),
  pod_image_url: z.string().trim().min(1).max(2048),
  courier_latitude: z.coerce.number().min(-90).max(90),
  courier_longitude: z.coerce.number().min(-180).max(180),
  target_latitude: z.coerce.number().min(-90).max(90).optional(),
  target_longitude: z.coerce.number().min(-180).max(180).optional(),
  delivered_at: z.iso.datetime().optional(),
});

type BagSummary = {
  id: string;
  assigned_courier_id: string | null;
};

async function getTaskWithBag(supabase: ReturnType<typeof createSupabaseAdminClient>, id: string) {
  return supabase
    .from("packages")
    .select("id, resi, status, bag_items(bag_id, bags(id, bag_code, assigned_courier_id, status))")
    .eq("id", id)
    .maybeSingle();
}

function resolveBag(task: {
  bag_items?: Array<{ bags?: BagSummary[] | BagSummary | null }> | null;
}) {
  const bagItem = Array.isArray(task.bag_items) ? task.bag_items[0] : null;
  const rawBag = bagItem && typeof bagItem === "object" ? bagItem.bags : null;
  return Array.isArray(rawBag) ? rawBag[0] ?? null : rawBag;
}

function canCourierDeliverBag(role: string, userId: string, bag: BagSummary | null) {
  if (role !== "kurir") {
    return true;
  }

  if (!bag?.assigned_courier_id) {
    return true;
  }

  return bag.assigned_courier_id === userId;
}

async function markBagDeliveredIfComplete(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  bagId: string,
) {
  const { data: remainingPackages, error } = await supabase
    .from("bag_items")
    .select("package_id, packages(status)")
    .eq("bag_id", bagId);

  if (error) {
    return;
  }

  const hasPendingPackages = (remainingPackages ?? []).some((item) => {
    const packageRow = (item as { packages?: { status?: string | null } | null }).packages;
    return packageRow?.status !== "DELIVERED";
  });

  if (!hasPendingPackages) {
    await supabase.from("bags").update({ status: "DELIVERED" }).eq("id", bagId);
  }
}

export async function PUT(req: Request, ctx: RouteContext<"/api/courier/tasks/[id]/deliver">) {
  const auth = await authenticateMobileRequest(req, ["kurir", "superadmin", "admin_gudang"]);

  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await ctx.params;

  let rawBody: unknown;

  try {
    rawBody = await req.json();
  } catch {
    return mobileError("Invalid request body", 400);
  }

  const parsed = deliverSchema.safeParse(rawBody);

  if (!parsed.success) {
    return mobileError("Invalid request body", 400);
  }

  const payload = parsed.data;
  const deliveredAtIso = payload.delivered_at ?? new Date().toISOString();
  const deliveredAt = new Date(deliveredAtIso);

  if (Number.isNaN(deliveredAt.getTime())) {
    return mobileError("Invalid delivered_at", 400);
  }

  const supabase = createSupabaseAdminClient();

  const { data: existingTask, error: taskError } = await getTaskWithBag(supabase, id);

  if (taskError) {
    return mobileError("Internal server error", 500);
  }

  if (!existingTask) {
    return mobileError("Task not found", 404);
  }

  const currentBag = resolveBag(existingTask as { bag_items?: unknown[] | null });

  if (!canCourierDeliverBag(auth.data.role, auth.data.userId, currentBag)) {
    return mobileError("Forbidden", 403);
  }

  const { error: updateError } = await supabase
    .from("packages")
    .update({
      status: "DELIVERED",
      pod_image_url: payload.pod_image_url,
      delivered_at: deliveredAt.toISOString(),
      courier_latitude: payload.courier_latitude,
      courier_longitude: payload.courier_longitude,
      target_latitude: payload.target_latitude,
      target_longitude: payload.target_longitude,
    })
    .eq("id", id);

  if (updateError) {
    return mobileError("Internal server error", 500);
  }

  const location = `${payload.courier_latitude},${payload.courier_longitude}`;
  const description = `Proof of delivery tercatat pada ${deliveredAt.toISOString()}`;

  const { error: trackingError } = await supabase.from("tracking_history").insert({
    package_id: id,
    event_code: "DELIVERED",
    event_label: "Paket berhasil diterima",
    location,
    description,
    created_by: auth.data.userId,
  });

  if (trackingError) {
    return mobileError("Internal server error", 500);
  }

  const bagId = currentBag ? String(currentBag.id) : null;

  if (bagId) {
    await markBagDeliveredIfComplete(supabase, bagId);
  }

  return mobileMessage("Delivery updated", 200, {
    id: String(id),
    resi: String(existingTask.resi),
    status: "DELIVERED",
    delivered_at: deliveredAt.toISOString(),
  });
}
