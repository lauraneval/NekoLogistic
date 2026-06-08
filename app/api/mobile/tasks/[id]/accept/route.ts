import { z } from "zod";
import { mobileError } from "@/lib/mobile-api";
import { authenticateMobileRequest } from "@/lib/mobile-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const idSchema = z.uuid();

type BagTaskRow = {
  id: string;
  bag_code: string;
  status: string;
  assigned_courier_id: string | null;
  bag_items?: Array<{
    package_id: string;
    packages?:
      | { id: string; resi: string; status: string }
      | Array<{ id: string; resi: string; status: string }>
      | null;
  }>;
};

function resolvePackageIds(bag: BagTaskRow): string[] {
  const ids: string[] = [];
  for (const item of bag.bag_items ?? []) {
    const pkgs = item.packages;
    if (Array.isArray(pkgs)) {
      ids.push(...pkgs.map((p) => p.id));
    } else if (pkgs) {
      ids.push(pkgs.id);
    }
  }
  return ids;
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/mobile/tasks/[id]/accept">) {
  const auth = await authenticateMobileRequest(req, ["kurir", "superadmin", "admin_gudang"]);
  if ("error" in auth) return auth.error;

  const parsedId = idSchema.safeParse((await ctx.params).id);
  if (!parsedId.success) {
    return mobileError("Invalid task id", 400);
  }

  const supabase = createSupabaseAdminClient();

  const { data: task, error: taskError } = await supabase
    .from("bags")
    .select(
      "id, bag_code, status, assigned_courier_id, bag_items(package_id, packages(id, resi, status))",
    )
    .eq("id", parsedId.data)
    .maybeSingle();

  if (taskError) {
    return mobileError("Internal server error", 500);
  }

  if (!task) {
    return mobileError("Task not found", 404);
  }

  const bag = task as BagTaskRow;

  if (auth.data.role === "kurir" && bag.assigned_courier_id !== auth.data.userId) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const packageIds = resolvePackageIds(bag);

  if (packageIds.length === 0) {
    return mobileError("Task has no packages", 422);
  }

  const { error: bagUpdateError } = await supabase
    .from("bags")
    .update({ status: "IN_TRANSIT" })
    .eq("id", bag.id);

  if (bagUpdateError) {
    return mobileError("Internal server error", 500);
  }

  const { error: packageUpdateError } = await supabase
    .from("packages")
    .update({ status: "IN_TRANSIT" })
    .in("id", packageIds);

  if (packageUpdateError) {
    return mobileError("Internal server error", 500);
  }

  const { error: trackingError } = await supabase.from("tracking_history").insert(
    packageIds.map((packageId) => ({
      package_id: packageId,
      event_code: "IN_TRANSIT" as const,
      event_label: "Paket dalam perjalanan",
      description: "Kurir telah menerima tugas pengiriman dan paket sedang dalam perjalanan",
      created_by: auth.data.userId,
    })),
  );

  if (trackingError) {
    return mobileError("Internal server error", 500);
  }

  return NextResponse.json(
    {
      ok: true,
      message: "Task accepted",
      data: {
        id: bag.id,
        bag_code: bag.bag_code,
        status: "IN_TRANSIT",
        package_count: packageIds.length,
      },
    },
    { status: 200 },
  );
}
