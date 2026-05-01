export type AppRole = "superadmin" | "admin_gudang" | "kurir";

export type PackageStatus =
  | "PACKAGE_CREATED"
  | "IN_WAREHOUSE"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED_DELIVERY";

export const packageStatusLabels: Record<PackageStatus, string> = {
  PACKAGE_CREATED: "Dikemas",
  IN_WAREHOUSE: "Di bagging",
  OUT_FOR_DELIVERY: "Siap dikirim",
  IN_TRANSIT: "Proses pengiriman",
  DELIVERED: "Sudah terkirim",
  FAILED_DELIVERY: "Gagal dikirim",
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
