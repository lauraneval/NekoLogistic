# Panduan Presentasi: Ahmad Titana Nanda P
## Master Data Paket & Auto-Generate Nomor Resi

---

## 1. Poin Utama yang Harus Dibicarakan

### A. Struktur Master Data Paket
Tabel `packages` adalah jantung dari seluruh sistem NekoLogistic. Hampir semua fitur lain (bagging, tracking, pengiriman) bergantung pada data di tabel ini.

**Field-field penting yang harus dijelaskan:**
- `resi` — nomor unik dengan format `NEKO-YYYY-XXXX` (contoh: `NEKO-2026-A3F7`)
- `status` — enum `PackageStatus` yang merepresentasikan posisi paket dalam siklus hidupnya
- `assigned_courier_id` — FK ke tabel `profiles` untuk mencatat kurir yang bertanggung jawab
- `pod_image_url`, `courier_latitude/longitude` — diisi saat paket terkirim
- `target_latitude/longitude` — koordinat tujuan pengiriman (untuk validasi geofencing)

### B. Algoritma Auto-Generate Resi
Nomor resi tidak di-input manual — sistem **menghasilkannya secara otomatis** setiap kali paket baru dibuat. Algoritma terdiri dari dua bagian:
1. **Generate kandidat**: format `NEKO-TAHUN-RANDOM4CHAR`
2. **Uniqueness check**: cek ke database, kalau sudah dipakai, generate ulang (maksimal 8 kali percobaan)

### C. Alur CRUD Paket + Side Effects
Setiap operasi pada paket tidak hanya mengubah tabel `packages` — ada side effects penting:
- **POST (Create)**: → otomatis insert baris ke `tracking_history` event `PACKAGE_CREATED`
- **PATCH (Update Status)**: → otomatis insert ke `tracking_history` + auto-assign ke bag jika status `IN_WAREHOUSE`
- **Semua operasi**: → catat ke `activity_logs` untuk audit trail

### D. UI Dashboard Admin Web
Dashboard admin menampilkan tabel semua paket dengan kemampuan:
- Filter dan pencarian
- Form input paket baru (dengan MapPicker untuk pilih koordinat tujuan)
- Aksi cepat: update status, edit detail, hapus paket

---

## 2. Struktur Folder & File yang Dikerjakan

```
app/
├── admin-gudang/
│   ├── packages/
│   │   ├── page.tsx                  ← Halaman daftar paket (admin gudang)
│   │   └── new/
│   │       └── page.tsx              ← Halaman form input paket baru
│   └── page.tsx                      ← Dashboard utama admin gudang
├── superadmin/
│   ├── packages/
│   │   ├── page.tsx                  ← Halaman daftar paket (superadmin)
│   │   └── new/
│   │       └── page.tsx              ← Form input paket (superadmin)
│   └── page.tsx                      ← Dashboard superadmin
└── api/
    └── admin/
        └── packages/
            └── route.ts              ← API: GET, POST, PATCH, PUT, DELETE paket

components/
├── portal-input-package.tsx          ← Form komponen input paket baru
├── portal-packages.tsx               ← Komponen tabel daftar paket
├── portal-dashboard.tsx              ← Komponen kartu statistik dashboard
└── map-picker.tsx                    ← Komponen pilih koordinat di peta

lib/
├── resi.ts                           ← makeResi() — algoritma generate nomor resi
├── validation.ts                     ← createPackageSchema, updatePackageSchema (Zod)
└── types.ts                          ← PackageStatus enum & packageStatusLabels

supabase/
├── schema.sql                        ← Definisi tabel packages, package_status enum
└── migrations/
    └── 20260606_add_extended_package_fields.sql  ← Tambah field dimensi, koordinat, dll.
```

---

## 3. Potongan Kode Krusial

### A. Algoritma Auto-Generate Nomor Resi (lib/resi.ts)

```typescript
// lib/resi.ts
import { randomBytes } from "node:crypto";

// Menghasilkan 4 karakter acak dari crypto-secure random bytes
function randomCode(length = 4) {
  return randomBytes(length).toString("hex").slice(0, length).toUpperCase();
  // randomBytes(4) → misal: buffer [0xAB, 0x3F, 0x7C, 0x11]
  // .toString("hex") → "ab3f7c11"
  // .slice(0, 4)     → "ab3f"
  // .toUpperCase()   → "AB3F"
}

export function makeResi() {
  const year = new Date().getFullYear();
  return `NEKO-${year}-${randomCode(4)}`;
  // Contoh: NEKO-2026-AB3F
}
```

**Kenapa `randomBytes` dari Node.js crypto, bukan `Math.random()`?**
Karena `crypto.randomBytes` menghasilkan nilai yang **cryptographically secure** — tidak bisa diprediksi urutannya, sehingga nomor resi tidak bisa ditebak orang lain.

---

### B. Uniqueness Check saat Generate Resi (app/api/admin/packages/route.ts)

```typescript
// app/api/admin/packages/route.ts

async function generateUniqueResi() {
  const supabase = createSupabaseAdminClient();

  for (let index = 0; index < 8; index += 1) {
    const candidate = makeResi(); // Generate kandidat baru

    // Cek ke database: apakah resi ini sudah dipakai?
    const { data, error } = await supabase
      .from("packages")
      .select("id")
      .eq("resi", candidate)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return candidate; // Resi belum dipakai → gunakan ini
    }
    // Kalau sudah dipakai, looping ke percobaan berikutnya
  }

  // Jika 8 percobaan gagal semua (probabilitasnya sangat sangat kecil)
  throw new Error("Unable to generate unique tracking number");
}
```

**Analisis probabilitas**: Dengan format `NEKO-YYYY-XXXX` (4 karakter hex), ada 16^4 = 65.536 kemungkinan per tahun. Collision baru menjadi masalah setelah puluhan ribu paket dalam setahun.

---

### C. POST /api/admin/packages — Buat Paket Baru

```typescript
// app/api/admin/packages/route.ts

export async function POST(req: Request) {
  // 1. Verifikasi role: hanya admin_gudang atau superadmin
  const auth = await requireRole(["admin_gudang", "superadmin"]);
  if ("error" in auth) return auth.error;

  // 2. Validasi payload dengan Zod schema
  const parsed = await parseJson(req, createPackageSchema);
  if (!parsed.success) return fail("Invalid payload", 422, parsed.error.flatten());

  const supabase = createSupabaseAdminClient();

  // 3. Generate nomor resi unik
  const resi = await generateUniqueResi();

  // 4. Insert paket ke database
  const { data: pkg, error: packageError } = await supabase
    .from("packages")
    .insert({
      resi,
      package_name: parsed.data.packageName,
      sender_name: parsed.data.senderName,
      receiver_name: parsed.data.receiverName,
      receiver_address: parsed.data.receiverAddress,
      destination_city: parsed.data.destinationCity,
      weight_kg: parsed.data.weightKg,
      target_latitude: parsed.data.targetLatitude ?? null,
      target_longitude: parsed.data.targetLongitude ?? null,
      status: "PACKAGE_CREATED",
      created_by: auth.data.userId,
    })
    .select("id, resi, status, created_at")
    .single();

  if (packageError || !pkg) return fail("Failed to create package", 500);

  // 5. SIDE EFFECT: Catat event pertama ke tracking_history
  await supabase.from("tracking_history").insert({
    package_id: pkg.id,
    event_code: "PACKAGE_CREATED",
    event_label: "Package created at warehouse",
    location: "Warehouse",
    description: "Shipping label created",
    created_by: auth.data.userId,
  });

  // 6. SIDE EFFECT: Catat ke audit log
  await supabase.from("activity_logs").insert({
    actor_id: auth.data.userId,
    action: "CREATE_PACKAGE",
    entity: "package",
    entity_id: pkg.id,
    metadata: { resi: pkg.resi },
  });

  return ok({ ...pkg }, 201);
}
```

---

### D. PATCH — Update Status + Auto-Bagging

```typescript
// app/api/admin/packages/route.ts — PATCH handler

export async function PATCH(req: Request) {
  // ...auth check & parse...

  // Update status paket
  const { data: pkg } = await supabase
    .from("packages")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .select("id, resi, receiver_address, status, destination_city")
    .single();

  // Jika status baru adalah IN_WAREHOUSE → auto-assign ke bag berdasarkan kota
  if (status === "IN_WAREHOUSE") {
    const bag = await ensureCityBag(supabase, city, auth.data.userId);
    await movePackageToBag(supabase, parsed.data.id, String(bag.id));
  }

  // Catat ke tracking_history
  await supabase.from("tracking_history").insert({
    package_id: parsed.data.id,
    event_code: status,
    event_label: packageStatusLabels[status], // Label manusiawi dari types.ts
    location: city,
    description: `Status paket diperbarui menjadi ${packageStatusLabels[status].toLowerCase()}`,
    created_by: auth.data.userId,
  });

  return ok(pkg);
}
```

---

### E. Skema Tabel packages (supabase/schema.sql)

```sql
-- Siklus hidup paket didefinisikan sebagai enum di PostgreSQL
CREATE TYPE public.package_status AS ENUM (
  'PACKAGE_CREATED',    -- Baru dibuat, label dicetak
  'IN_WAREHOUSE',       -- Sudah ada di gudang/bag
  'OUT_FOR_DELIVERY',   -- Sudah di-assign ke kurir, siap antar
  'IN_TRANSIT',         -- Kurir sedang dalam perjalanan
  'DELIVERED',          -- Sudah terkirim ke penerima
  'FAILED_DELIVERY',    -- Gagal terkirim
  'RETURNED'            -- Dikembalikan ke gudang
);

CREATE TABLE public.packages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  resi text NOT NULL UNIQUE
    CHECK (resi ~ '^NEKO-[0-9]{4}-[A-Z0-9]{4}$'),  -- Format wajib NEKO-YYYY-XXXX
  package_name text NOT NULL DEFAULT 'Paket',
  sender_name text NOT NULL,
  receiver_name text NOT NULL,
  receiver_address text NOT NULL,
  destination_city text NOT NULL DEFAULT 'Belum ditentukan',
  weight_kg numeric NOT NULL CHECK (weight_kg > 0),
  length_cm numeric, width_cm numeric, height_cm numeric,
  status package_status NOT NULL DEFAULT 'PACKAGE_CREATED',
  -- Koordinat tujuan (untuk geofencing saat pengiriman)
  target_latitude double precision,
  target_longitude double precision,
  -- Bukti pengiriman (diisi kurir)
  pod_image_url text,
  delivered_at timestamp with time zone,
  courier_latitude double precision,
  courier_longitude double precision,
  assigned_courier_id uuid REFERENCES public.profiles(user_id),
  created_by uuid REFERENCES public.profiles(user_id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
```

---

### F. Zod Validation Schema (lib/validation.ts)

```typescript
// lib/validation.ts — Validasi payload POST /api/admin/packages

export const createPackageSchema = z.object({
  packageName: z.string().trim().min(1).max(200),
  senderName: z.string().trim().min(2).max(200),
  senderPhone: z.string().trim().optional(),
  senderEmail: z.string().email().optional(),
  receiverName: z.string().trim().min(2).max(200),
  receiverPhone: z.string().trim().optional(),
  receiverAddress: z.string().trim().min(5).max(500),
  destinationCity: z.string().trim().min(2).max(120),
  weightKg: z.number().positive(),
  lengthCm: z.number().positive().optional(),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  targetLatitude: z.number().min(-90).max(90).optional(),
  targetLongitude: z.number().min(-180).max(180).optional(),
});
```

---

## 4. Alur Presentasi yang Disarankan

1. **Mulai dari tabel `packages`**: "Ini adalah tabel utama sistem — semua fitur bergantung di sini."
2. **Tunjukkan enum `package_status`**: Jelaskan siklus hidup paket dari `PACKAGE_CREATED` sampai `DELIVERED`
3. **Demo generate resi**: Buka DevTools atau Postman, POST ke `/api/admin/packages`, lihat resi ter-generate otomatis
4. **Tunjukkan kode `generateUniqueResi()`**: Jelaskan loop uniqueness check dan kenapa pakai `crypto.randomBytes`
5. **Tunjukkan side effects**: Setelah create paket, cek `tracking_history` — sudah ada baris pertama otomatis
6. **Tunjukkan validation Zod**: "Semua input divalidasi sebelum sampai ke database — tidak ada data kotor masuk"
7. **Tunjukkan UI**: Buka `/admin-gudang/packages/new`, isi form, submit, lihat hasilnya
