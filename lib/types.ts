export type AppRole = "superadmin" | "admin_gudang" | "kurir";

export type PackageStatus =
  | "PACKAGE_CREATED"
  | "IN_WAREHOUSE"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED_DELIVERY";

export type TrackingEvent = {
  event_code: PackageStatus;
  event_label: string;
  location: string | null;
  description: string | null;
  created_at: string;
};
