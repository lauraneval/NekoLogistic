export type AppRole = "superadmin" | "admin_gudang" | "kurir";

export type PackageStatus =
  | "PACKAGE_CREATED"
  | "IN_WAREHOUSE"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED_DELIVERY";

export type Profile = {
  user_id: string;
  full_name: string;
  role: AppRole;
  is_suspended: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  email?: string; // Optional email from auth join
};

export type TrackingEvent = {
  event_code: PackageStatus;
  event_label: string;
  location: string | null;
  description: string | null;
  created_at: string;
};
