# Panduan Presentasi: Galih Trisna
## Keamanan & Auth — RBAC, Middleware JWT, Supabase Auth

---

## 1. Poin Utama yang Harus Dibicarakan

### A. Arsitektur Autentikasi Dua Jalur
Sistem NekoLogistic memiliki **dua jalur autentikasi** yang berbeda karena ada dua jenis klien:

| Jalur | Klien | Mekanisme | Library |
|-------|-------|-----------|---------|
| **Web Portal** | Browser (Admin, Superadmin) | Session cookie Supabase | `lib/auth.ts` + `proxy.ts` |
| **Mobile API** | Flutter app (Kurir) | Bearer token (JWT) di header | `lib/mobile-auth.ts` |

Ini adalah keputusan arsitektur penting: **cookie tidak bisa dikirim dari Flutter**, sehingga mobile menggunakan Bearer token.

### B. RBAC (Role-Based Access Control)
Ada tiga peran dalam sistem, didefinisikan di database PostgreSQL:
- `superadmin` — akses penuh ke seluruh sistem
- `admin_gudang` — kelola paket, bagging, kurir
- `kurir` — hanya akses via mobile app untuk pengiriman

RBAC diterapkan di dua lapisan:
1. **Middleware** (`proxy.ts`) — gate pertama, blokir akses halaman web tanpa session
2. **Setiap API route** — gate kedua, verifikasi role lewat `requireRole()` sebelum eksekusi logika bisnis

### C. Kenapa Middleware Bernama `proxy.ts`, Bukan `middleware.ts`?
Ini adalah keputusan teknis: Next.js versi ini menggunakan nama file `proxy.ts` sebagai entry point middleware, bukan `middleware.ts` yang umum dikenal. Fungsi yang diekspor juga bernama `proxy`, bukan `middleware`.

---

## 2. Struktur Folder & File yang Dikerjakan

```
proxy.ts                              ← Middleware Next.js (BUKAN middleware.ts!)
├── Memproteksi rute: /superadmin, /admin-gudang, /kurir
└── Redirect ke /login jika tidak ada session cookie

lib/
├── auth.ts                           ← requireRole() & requireAnyAuthenticated()
├── mobile-auth.ts                    ← authenticateMobileRequest() untuk mobile
├── session.ts                        ← getSessionProfile(), ensureRoleOrRedirect()
└── supabase/
    ├── server.ts                     ← Supabase client berbasis cookie (untuk web)
    └── admin.ts                      ← Supabase client service-role (bypass RLS)

app/
├── login/
│   └── page.tsx                      ← Halaman login web
└── api/
    ├── auth/
    │   ├── login/route.ts            ← POST /api/auth/login (web)
    │   ├── logout/route.ts           ← POST /api/auth/logout
    │   ├── me/route.ts               ← GET /api/auth/me (cek sesi aktif)
    │   └── heartbeat/route.ts        ← GET /api/auth/heartbeat
    └── mobile/
        └── auth/
            ├── login/route.ts        ← POST /api/mobile/auth/login (mobile)
            ├── logout/route.ts       ← POST /api/mobile/auth/logout
            └── refresh/route.ts      ← POST /api/mobile/auth/refresh

supabase/
└── schema.sql                        ← Definisi: app_role enum, tabel profiles, RLS policies,
                                        trigger handle_new_user, protect_profile_role_change
```

---

## 3. Potongan Kode Krusial

### A. Middleware Proteksi Halaman Web (proxy.ts)

```typescript
// proxy.ts — file ini adalah Next.js Middleware

import { NextResponse, type NextRequest } from "next/server";

// Deteksi apakah request punya Supabase session cookie
function hasSupabaseSessionCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some((cookie) => 
      cookie.name.startsWith("sb-") && cookie.name.includes("auth-token")
    );
  // Cookie Supabase mengikuti pola: sb-[project-ref]-auth-token
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Daftar prefix rute yang butuh autentikasi
  const protectedPrefixes = ["/superadmin", "/admin-gudang", "/kurir"];
  const needsAuth = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!needsAuth) {
    return NextResponse.next(); // Rute publik, lewatkan saja
  }

  if (!hasSupabaseSessionCookie(request)) {
    // Tidak ada cookie → redirect ke /login?auth=required
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("auth", "required");
    return NextResponse.redirect(url);
  }

  return NextResponse.next(); // Ada cookie → izinkan akses
}

// Matcher: middleware hanya jalan untuk rute-rute ini
export const config = {
  matcher: ["/superadmin/:path*", "/admin-gudang/:path*", "/kurir/:path*"],
};
```

**Penting untuk dijelaskan**: Middleware ini hanya cek **keberadaan** cookie (bukan validitas JWT-nya). Validasi JWT yang sesungguhnya terjadi di dalam setiap API route lewat `requireRole()`.

---

### B. Guard Berbasis Role di API Route (lib/auth.ts)

```typescript
// lib/auth.ts

export async function requireRole(allowedRoles: AppRole[]) {
  const supabase = await createSupabaseServerClient(); // Client berbasis cookie

  // Langkah 1: Verifikasi token JWT dari cookie
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: fail("Unauthorized", 401) } as const;
  }

  // Langkah 2: Ambil role dari tabel profiles (bukan dari JWT, karena lebih aman)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: fail("Profile not found", 403) } as const;
  }

  // Langkah 3: Cek apakah role user ada di daftar yang diizinkan
  if (!allowedRoles.includes(profile.role as AppRole)) {
    return { error: fail("Forbidden", 403) } as const;
  }

  // Berhasil → kembalikan userId dan role untuk digunakan route handler
  return {
    data: { userId: user.id, role: profile.role as AppRole },
  } as const;
}
```

**Cara pemakaian di setiap route handler:**

```typescript
// Pola standar di setiap API route
export async function GET() {
  const auth = await requireRole(["admin_gudang", "superadmin"]);
  if ("error" in auth) return auth.error; // Langsung return 401/403 jika gagal

  // auth.data.userId dan auth.data.role tersedia di sini
  // ... logika bisnis
}
```

---

### C. Autentikasi Mobile via Bearer Token (lib/mobile-auth.ts)

```typescript
// lib/mobile-auth.ts

function readBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  // Header harus: "Authorization: Bearer <token>"
  if (!authHeader.toLowerCase().startsWith("bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function authenticateMobileRequest(request: Request, allowedRoles: AppRole[]) {
  const token = readBearerToken(request);
  if (!token) {
    return { error: mobileError("Unauthorized", 401) } as const;
  }

  const supabase = createSupabaseAdminClient(); // Gunakan admin client (bukan cookie client)

  // Verifikasi token JWT dengan Supabase Auth
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return { error: mobileError("Unauthorized", 401) } as const;
  }

  // Cek role dari tabel profiles (sama seperti web)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile || !allowedRoles.includes(profile.role as AppRole)) {
    return { error: mobileError("Forbidden", 403) } as const;
  }

  return { data: { userId: user.id, role: profile.role as AppRole } } as const;
}
```

**Perbedaan utama web vs mobile:**
- Web: `createSupabaseServerClient()` — membaca token dari HTTP cookie
- Mobile: `createSupabaseAdminClient()` + token dari header `Authorization: Bearer`

---

### D. Konfigurasi RBAC di Database (supabase/schema.sql)

```sql
-- Enum untuk role (didefinisikan di database, bukan di aplikasi)
CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin_gudang', 'kurir');

-- Tabel profiles menyimpan role user
CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  full_name text NOT NULL,
  role app_role NOT NULL DEFAULT 'kurir',
  is_suspended boolean DEFAULT false
  -- ...
);

-- Trigger: otomatis buat profil saat user baru register di Supabase Auth
CREATE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), 'kurir');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Proteksi: mencegah user mengubah role sendiri (hanya superadmin bisa ganti role)
CREATE FUNCTION protect_profile_role_change() RETURNS trigger AS $$
BEGIN
  IF OLD.role <> NEW.role AND current_setting('role') <> 'service_role' THEN
    RAISE EXCEPTION 'Only service role can change user role';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### E. Row Level Security (RLS) — Lapisan Keamanan di Database

RLS memastikan user hanya bisa mengakses data yang boleh mereka lihat, meskipun query-nya lolos dari layer aplikasi.

```sql
-- Contoh RLS di tabel packages:
-- User biasa hanya bisa READ
-- Hanya admin_gudang/superadmin yang bisa INSERT
-- Hanya admin/superadmin/kurir (yang ditugaskan) yang bisa UPDATE

-- Kurir hanya bisa update paket yang di-assign ke mereka
CREATE POLICY "kurir_update_assigned" ON public.packages
  FOR UPDATE USING (
    auth.uid() = assigned_courier_id
  );
```

---

## 4. Alur Presentasi yang Disarankan

1. **Mulai dari ancaman**: "Apa yang terjadi kalau API tidak diproteksi? Siapa saja bisa hapus semua paket."
2. **Jelaskan dua lapisan proteksi**: Middleware (halaman) + `requireRole()` (API)
3. **Tunjukkan `proxy.ts`**: Ini yang jaga semua halaman portal
4. **Tunjukkan `lib/auth.ts`**: Ini yang jaga setiap endpoint API
5. **Bedakan web vs mobile**: Cookie vs Bearer token — dan jelaskan kenapa berbeda
6. **Tunjukkan RBAC di database**: `app_role` enum, trigger `handle_new_user`, `protect_profile_role_change`
7. **Jelaskan RLS sebagai defense-in-depth**: Bahkan jika kode aplikasi ada bug, database tetap melindungi data
