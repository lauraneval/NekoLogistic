export type AppRole = "superadmin" | "admin_gudang" | "kurir";

export type PackageStatus =
  | "PACKAGE_CREATED"
  | "IN_WAREHOUSE"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED_DELIVERY";

export const packageStatusLabels: Record<PackageStatus, string> = {
  PACKAGE_CREATED: "Packaged",
  IN_WAREHOUSE: "In Bag",
  OUT_FOR_DELIVERY: "Ready for Delivery",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  FAILED_DELIVERY: "Failed Delivery",
};

export const adminPackageStatuses = [
  "PACKAGE_CREATED",
  "IN_WAREHOUSE",
  "OUT_FOR_DELIVERY",
  "IN_TRANSIT",
  "DELIVERED",
] as const satisfies PackageStatus[];

export type TrackingEvent = {
  event_code: PackageStatus;
  event_label: string;
  location: string | null;
  description: string | null;
  created_at: string;
};
