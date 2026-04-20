# NekoLogistic Web Architecture (Next.js + Supabase)

## 1. Folder Structure (Web Only)

- `app/`
- `app/api/public/tracking/[resi]/route.ts` - public tracking endpoint.
- `app/api/admin/packages/route.ts` - create package + generate resi.
- `app/api/admin/manifests/route.ts` - bulk manifesting via RPC.
- `app/api/superadmin/users/route.ts` - register admin gudang or kurir.
- `app/api/superadmin/analytics/route.ts` - dashboard analytics and activity logs.
- `app/page.tsx` - landing page.
- `app/tracking/page.tsx` - public tracking portal.
- `app/admin-gudang/page.tsx` - warehouse operations entry.
- `app/superadmin/page.tsx` - superadmin entry.
- `components/tracking-portal.tsx` - timeline UI for tracking.
- `lib/env.ts` - environment schema validation.
- `lib/validation.ts` - zod schemas for payload sanitization.
- `lib/auth.ts` - role checks for protected APIs.
- `lib/supabase/server.ts` - cookie-based user client.
- `lib/supabase/admin.ts` - service-role client (server only).
- `proxy.ts` - route-level auth gate for role portals.
- `supabase/schema.sql` - database schema + RLS + RPC.

## 2. Security Strategy

- Route Handler payloads are validated using `zod`.
- Every protected endpoint enforces server-side auth and RBAC (`requireRole`).
- Public tracking endpoint uses strict resi format validation before querying.
- RLS is enabled on all operational tables in `supabase/schema.sql`.
- Service role key is only used server-side (`lib/supabase/admin.ts`).
- Portal routes (`/superadmin`, `/admin-gudang`, `/kurir`) are guarded by `proxy.ts`.

## 3. Supabase Setup Steps

1. Copy `.env.example` to `.env.local` and fill credentials.
2. Run SQL from `supabase/schema.sql` in Supabase SQL Editor.
3. Create first `superadmin` user manually in Supabase auth.
4. Update that user's row in `profiles` to role `superadmin`.
5. Run app with `npm run dev`.

## 4. API Summary

- `GET /api/public/tracking/:resi`
- `POST /api/admin/packages`
- `POST /api/admin/manifests`
- `POST /api/superadmin/users`
- `GET /api/superadmin/analytics`

All write endpoints require authenticated Supabase session cookie and role checks.
