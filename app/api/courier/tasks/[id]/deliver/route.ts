import { z } from "zod";
import { mobileError, mobileMessage } from "@/lib/mobile-api";
import { authenticateMobileRequest } from "@/lib/mobile-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const POD_BUCKET = "proof-of-delivery";
const MAX_POD_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

const deliverSchema = z.object({
  status: z.literal("DELIVERED"),
  pod_image_url: z.string().trim().min(1).max(2048),
  courier_latitude: z.coerce.number().min(-90).max(90),
  courier_longitude: z.coerce.number().min(-180).max(180),
  target_latitude: z.coerce.number().min(-90).max(90).optional(),
  target_longitude: z.coerce.number().min(-180).max(180).optional(),
  delivered_at: z.string().datetime().optional(),
});

function getExtension(file: File) {
  const mimeExt = file.type.startsWith("image/") ? file.type.replace("image/", "") : "";
  if (mimeExt) {
    return mimeExt;
  }

  const nameParts = file.name.split(".");
  return nameParts.length > 1 ? nameParts[nameParts.length - 1].toLowerCase() : "jpg";
}

export async function POST(req: Request, ctx: RouteContext<"/api/courier/tasks/[id]/deliver">) {
  const auth = await authenticateMobileRequest(req, ["kurir", "superadmin", "admin_gudang"]);

  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await ctx.params;

  let formData: FormData;

  try {
    formData = await req.formData();
  } catch {
    return mobileError("Invalid form data", 400);
  }

  const fileInput = formData.get("file");

  if (!(fileInput instanceof File)) {
    return mobileError("file is required", 400);
  }

  if (!fileInput.type.startsWith("image/")) {
    return mobileError("file must be an image", 400);
  }

  if (fileInput.size <= 0) {
    return mobileError("file is empty", 400);
  }

  if (fileInput.size > MAX_POD_IMAGE_SIZE_BYTES) {
    return mobileError("file is too large", 400);
  }

  const supabase = createSupabaseAdminClient();
  const { data: existingTask, error: taskError } = await supabase
    .from("packages")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (taskError) {
    return mobileError("Internal server error", 500);
  }

  if (!existingTask) {
    return mobileError("Task not found", 404);
  }

  const extension = getExtension(fileInput);
  const objectPath = `${id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const bytes = await fileInput.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(POD_BUCKET)
    .upload(objectPath, bytes, {
      contentType: fileInput.type,
      upsert: false,
    });

  if (uploadError) {
    return mobileError("Failed to upload image", 500);
  }

  const { data: publicUrlData } = supabase.storage.from(POD_BUCKET).getPublicUrl(objectPath);

  return mobileMessage("Proof of delivery uploaded", 200, {
    bucket: POD_BUCKET,
    object_path: objectPath,
    pod_image_url: publicUrlData.publicUrl,
  });
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

  const { data: existingTask, error: taskError } = await supabase
    .from("packages")
    .select("id, resi, status")
    .eq("id", id)
    .maybeSingle();

  if (taskError) {
    return mobileError("Internal server error", 500);
  }

  if (!existingTask) {
    return mobileError("Task not found", 404);
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

  return mobileMessage("Delivery updated", 200, {
    id: String(id),
    resi: String(existingTask.resi),
    status: "DELIVERED",
    delivered_at: deliveredAt.toISOString(),
  });
}
