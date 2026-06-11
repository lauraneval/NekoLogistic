import { z } from "zod";
import { mobileError, mobileMessage } from "@/lib/mobile-api";
import { authenticateMobileRequest } from "@/lib/mobile-auth";
import { haversineDistanceMeters, resolveTargetCoordinate } from "@/lib/mobile-geofence";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const POD_BUCKET = "proof-of-delivery";
const MAX_POD_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

function getExtension(file: File): string | null {
  return ALLOWED_MIME_TYPES[file.type] ?? null;
}

const idSchema = z.uuid();

const deliverSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  proof_url: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .refine((value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }, "Invalid proof_url"),
  delivered_at: z.iso.datetime().optional(),
});

type BagTaskRow = {
  id: string;
  bag_code: string;
  status: string;
  assigned_courier_id: string | null;
  bag_items?: Array<{
    package_id: string;
    packages?:
      | {
          id: string;
          resi: string;
          receiver_name: string;
          receiver_address: string;
          status: string;
          target_latitude?: number | null;
          target_longitude?: number | null;
        }
      | Array<{
          id: string;
          resi: string;
          receiver_name: string;
          receiver_address: string;
          status: string;
          target_latitude?: number | null;
          target_longitude?: number | null;
        }>
      | null;
  }>;
};

function resolvePackages(bagItems: NonNullable<BagTaskRow["bag_items"]>) {
  const packages: NonNullable<BagTaskRow["bag_items"]>[number]["packages"] extends infer P
    ? P extends Array<infer Item>
      ? Item[]
      : never
    : never = [];

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

async function loadBagTask(supabase: ReturnType<typeof createSupabaseAdminClient>, id: string) {
  return supabase
    .from("bags")
    .select(
      "id, bag_code, status, assigned_courier_id, bag_items(package_id, packages(id, resi, receiver_name, receiver_address, status, target_latitude, target_longitude))",
    )
    .eq("id", id)
    .maybeSingle();
}

function ensureCourierCanDeliver(bag: BagTaskRow, userId: string, role: string) {
  if (role !== "kurir") {
    return true;
  }

  return bag.assigned_courier_id === userId;
}

async function updatePackageProof(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  packageIds: string[],
  payload: z.infer<typeof deliverSchema>,
  deliveredAt: Date,
  targetCoordinate: { latitude: number; longitude: number },
) {
  return supabase
    .from("packages")
    .update({
      status: "DELIVERED",
      pod_image_url: payload.proof_url,
      delivered_at: deliveredAt.toISOString(),
      courier_latitude: payload.latitude,
      courier_longitude: payload.longitude,
      target_latitude: targetCoordinate.latitude,
      target_longitude: targetCoordinate.longitude,
    })
    .in("id", packageIds);
}

async function insertDeliveryHistory(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  packageIds: string[],
  payload: z.infer<typeof deliverSchema>,
  deliveredAt: Date,
  actorId: string,
) {
  return supabase.from("tracking_history").insert(
    packageIds.map((packageId) => ({
      package_id: packageId,
      event_code: "DELIVERED" as const,
      event_label: "Delivered",
      location: `${payload.latitude},${payload.longitude}`,
      description: `Proof of delivery recorded at ${deliveredAt.toISOString()}`,
      created_by: actorId,
    })),
  );
}

async function markBagDelivered(supabase: ReturnType<typeof createSupabaseAdminClient>, bagId: string) {
  return supabase.from("bags").update({ status: "DELIVERED" }).eq("id", bagId);
}

export async function POST(req: Request, ctx: RouteContext<"/api/mobile/tasks/[id]/deliver">) {
  const auth = await authenticateMobileRequest(req, ["kurir", "superadmin", "admin_gudang"]);
  if ("error" in auth) return auth.error;

  const parsedId = idSchema.safeParse((await ctx.params).id);
  if (!parsedId.success) return mobileError("Invalid task id", 400);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return mobileError("Invalid form data", 400);
  }

  const fileInput = formData.get("file");
  if (!(fileInput instanceof File)) return mobileError("file is required", 400);
  if (fileInput.size <= 0) return mobileError("file is empty", 400);
  if (fileInput.size > MAX_POD_IMAGE_SIZE_BYTES) return mobileError("file exceeds 2 MB limit", 400);

  const extension = getExtension(fileInput);
  if (!extension) return mobileError("file must be JPEG, PNG, WebP, or HEIC", 400);

  const supabase = createSupabaseAdminClient();

  const { data: bag, error: bagError } = await loadBagTask(supabase, parsedId.data);
  if (bagError) return mobileError("Internal server error", 500);
  if (!bag) return mobileError("Task not found", 404);

  if (!ensureCourierCanDeliver(bag, auth.data.userId, auth.data.role)) {
    return mobileError("Forbidden", 403);
  }
  const objectPath = `${parsedId.data}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const bytes = await fileInput.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(POD_BUCKET)
    .upload(objectPath, bytes, { contentType: fileInput.type, upsert: false });

  if (uploadError) return mobileError("Failed to upload image", 500);

  const { data: publicUrlData } = supabase.storage.from(POD_BUCKET).getPublicUrl(objectPath);

  return mobileMessage("Proof of delivery uploaded", 200, {
    bucket: POD_BUCKET,
    object_path: objectPath,
    pod_image_url: publicUrlData.publicUrl,
  });
}

export async function PUT(req: Request, ctx: RouteContext<"/api/mobile/tasks/[id]/deliver">) {
  const auth = await authenticateMobileRequest(req, ["kurir", "superadmin", "admin_gudang"]);

  if ("error" in auth) {
    return auth.error;
  }

  const parsedId = idSchema.safeParse((await ctx.params).id);

  if (!parsedId.success) {
    return mobileError("Invalid task id", 400);
  }

  let rawBody: unknown;

  try {
    rawBody = await req.json();
  } catch {
    return mobileError("Invalid request body", 400);
  }

  const parsedBody = deliverSchema.safeParse(rawBody);

  if (!parsedBody.success) {
    return mobileError("Invalid request body", 400);
  }

  const payload = parsedBody.data;
  const deliveredAtIso = payload.delivered_at ?? new Date().toISOString();
  const deliveredAt = new Date(deliveredAtIso);

  if (Number.isNaN(deliveredAt.getTime())) {
    return mobileError("Invalid delivered_at", 400);
  }

  const supabase = createSupabaseAdminClient();

  const { data: task, error: taskError } = await loadBagTask(supabase, parsedId.data);

  if (taskError) {
    return mobileError("Internal server error", 500);
  }

  if (!task) {
    return mobileError("Task not found", 404);
  }

  const bag = task as BagTaskRow;

  if (!ensureCourierCanDeliver(bag, auth.data.userId, auth.data.role)) {
    return mobileError("Forbidden", 403);
  }

  const packages = resolvePackages(Array.isArray(bag.bag_items) ? bag.bag_items : []);

  if (packages.length === 0) {
    return mobileError("Task not found", 404);
  }

  const targetCoordinate = resolveTargetCoordinate(packages);

  if (!targetCoordinate) {
    return mobileError("Delivery coordinates are missing", 422);
  }

  const distanceMeters = haversineDistanceMeters(
    {
      latitude: payload.latitude,
      longitude: payload.longitude,
    },
    targetCoordinate,
  );

  if (distanceMeters > 100) {
    return mobileError("Outside delivery radius / Unauthorized Zone", 403);
  }

  const packageIds = packages.map((item) => item.id);

  const { error: packageUpdateError } = await updatePackageProof(
    supabase,
    packageIds,
    payload,
    deliveredAt,
    targetCoordinate,
  );

  if (packageUpdateError) {
    return mobileError("Internal server error", 500);
  }

  const { error: trackingError } = await insertDeliveryHistory(
    supabase,
    packageIds,
    payload,
    deliveredAt,
    auth.data.userId,
  );

  if (trackingError) {
    return mobileError("Internal server error", 500);
  }

  const { error: bagUpdateError } = await markBagDelivered(supabase, bag.id);

  if (bagUpdateError) {
    return mobileError("Internal server error", 500);
  }

  return mobileMessage("Delivery updated", 200, {
    id: bag.id,
    bag_code: bag.bag_code,
    status: "DELIVERED",
    delivered_at: deliveredAt.toISOString(),
    distance_meters: Math.round(distanceMeters),
    proof_url: payload.proof_url,
  });
}
