import type { AppRole } from "./types";

/**
 * Define which roles have access to which route segments.
 * This is used by the middleware for global "Lockdown Access".
 */
export const RBAC_CONFIG: Record<string, AppRole[]> = {
  "/superadmin": ["superadmin"],
  "/admin-gudang": ["superadmin", "admin_gudang"],
  "/kurir": ["superadmin", "kurir"],
  "/api/superadmin": ["superadmin"],
  "/api/admin": ["superadmin", "admin_gudang"],
  "/api/courier": ["superadmin", "kurir"],
};

export const PUBLIC_ROUTES = [
  "/login",
  "/tracking",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/public/tracking",
];

export function getRequiredRoles(pathname: string): AppRole[] | null {
  // Check exact matches first
  if (RBAC_CONFIG[pathname]) return RBAC_CONFIG[pathname];

  // Check prefix matches (e.g., /api/admin/packages -> /api/admin)
  const segments = Object.keys(RBAC_CONFIG).sort((a, b) => b.length - a.length);
  for (const segment of segments) {
    if (pathname.startsWith(segment)) {
      return RBAC_CONFIG[segment];
    }
  }

  return null;
}

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
