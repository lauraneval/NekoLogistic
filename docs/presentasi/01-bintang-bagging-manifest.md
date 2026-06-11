# Panduan Presentasi: Bintang Yudhistira
## Sistem Konsolidasi (Bagging) & Manifesting

---

## 1. Poin Utama yang Harus Dibicarakan

### A. Konsep Bagging dalam Logistik
Jelaskan bahwa "Bagging" adalah proses mengelompokkan paket-paket ke dalam satu tas/kantung (bag) berdasarkan kota tujuan yang sama, sebelum dikirim ke kurir. Ini disebut **konsolidasi** — dari banyak paket, dikelompokkan menjadi satu unit pengiriman yang efisien.

**Alur Logika:**
1. Admin gudang menerima paket baru (status: `PACKAGE_CREATED`)
2. Paket di-scan/input ke sistem bagging berdasarkan kota tujuan
3. Sistem otomatis mencari bag yang sudah ada untuk kota tersebut, atau membuat bag baru
4. Paket masuk ke bag → status paket berubah menjadi `IN_WAREHOUSE`
5. Bag kemudian bisa di-assign ke kurir → status berubah ke `OUT_FOR_DELIVERY`

### B. Rule-Based Grouping Berdasarkan Kode Area (Kota Tujuan)
Sistem menggunakan logika **city-based grouping**: setiap bag hanya berisi paket dengan kota tujuan yang sama. Ini adalah "rule" utamanya.

Fungsi `ensureCityBag` di `app/api/admin/packages/route.ts` mendemonstrasikan ini:
- Cari bag yang sudah ada dengan kota yang sama (case-insensitive)
- Kalau tidak ada, buat bag baru dengan kode unik `BAG-YYYY-XXXX`

Fungsi `mergeAutoCityBaggings` di `app/api/admin/manifests/route.ts` menggabungkan paket-paket yang belum punya bag ke dalam tampilan dashboard secara otomatis berdasarkan kota.

### C. Struktur Tabel Database
Jelaskan relasi tabel yang kamu rancang:
- `bags`: satu baris = satu kantung pengiriman, punya `destination_city`, `bag_code`, `status`, dan `assigned_courier_id`
- `bag_items`: tabel junction (many-to-many) yang menghubungkan `bags` dan `packages`
- Setiap `package_id` hanya bisa ada di **satu** bag (constraint `UNIQUE` di kolom `package_id`)

---

## 2. Struktur Folder & File yang Dikerjakan

```
app/
├── admin-gudang/
│   ├── bagging/
│   │   └── page.tsx                  ← Halaman UI Bagging untuk admin gudang
│   └── packages/
│       └── page.tsx                  ← List paket dengan tombol bagging
├── superadmin/
│   └── bagging/
│       └── page.tsx                  ← Halaman bagging versi superadmin
└── api/
    └── admin/
        └── manifests/
            └── route.ts              ← API inti: GET, POST, PATCH, DELETE bagging

components/
└── portal-bagging.tsx                ← Komponen UI scanner barcode & list bag

supabase/
├── schema.sql                        ← Definisi tabel bags & bag_items
└── migrations/
    ├── 20260501_admin_gudang_bagging.sql
    └── 20260507_add_bag_assigned_courier.sql

lib/
└── resi.ts                           ← Fungsi makeBagCode() untuk generate kode bag
```

---

## 3. Potongan Kode Krusial

### A. Algoritma Generate Kode Bag (lib/resi.ts)

```typescript
// lib/resi.ts
import { randomBytes } from "node:crypto";

function randomCode(length = 4) {
  return randomBytes(length).toString("hex").slice(0, length).toUpperCase();
}

export function makeBagCode() {
  const year = new Date().getFullYear();
  return `BAG-${year}-${randomCode(4)}`;
  // Contoh output: BAG-2026-A3F7
}
```

Format kode bag: `BAG-YYYY-XXXX` (4 digit tahun + 4 karakter acak hexadecimal).

---

### B. Logic Cari atau Buat Bag Berdasarkan Kota (app/api/admin/packages/route.ts)

Ini adalah inti dari "rule-based grouping" — jika bag untuk kota itu sudah ada, gunakan yang lama. Jika belum, buat baru.

```typescript
// app/api/admin/packages/route.ts

async function ensureCityBag(supabase, city: string, userId: string) {
  const normalizedCity = city.trim() || "Belum ditentukan";

  // Cari bag yang sudah ada untuk kota ini (case-insensitive)
  const existing = await supabase
    .from("bags")
    .select("id, bag_code, destination_city")
    .ilike("destination_city", normalizedCity)   // ilike = case-insensitive LIKE
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!existing.error && existing.data) {
    return existing.data; // Bag sudah ada, kembalikan bag yang lama
  }

  // Bag belum ada, buat bag baru
  const created = await supabase
    .from("bags")
    .insert({ bag_code: makeBagCode(), destination_city: normalizedCity, created_by: userId })
    .select("id, bag_code, destination_city")
    .single();

  return created.data;
}
```

---

### C. Memindahkan Paket ke Bag (app/api/admin/packages/route.ts)

```typescript
async function movePackageToBag(supabase, packageId: string, bagId: string) {
  // Hapus dulu kalau paket ini sudah ada di bag lain
  await supabase.from("bag_items").delete().eq("package_id", packageId);

  // Masukkan ke bag yang baru
  const { error } = await supabase
    .from("bag_items")
    .insert({ bag_id: bagId, package_id: packageId });

  if (error) throw error;
}
```

Pola "delete then insert" ini memastikan satu paket tidak bisa ada di dua bag secara bersamaan.

---

### D. Manifest POST: Konsolidasi Manual via Barcode (app/api/admin/manifests/route.ts)

Ini adalah endpoint yang dipanggil ketika admin scan barcode paket untuk di-bagging:

```typescript
// app/api/admin/manifests/route.ts - POST handler

export async function POST(req: Request) {
  const auth = await requireRole(["admin_gudang", "superadmin"]);
  if ("error" in auth) return auth.error;

  const parsed = await parseJson(req, createBaggingSchema);
  if (!parsed.success) return fail("Invalid payload", 422, parsed.error.issues);

  const supabase = createSupabaseAdminClient();

  // 1. Resolve paket berdasarkan packageIds ATAU resiNumbers (dari scan barcode)
  const packages = await resolvePackages(supabase, parsed.data.packageIds, parsed.data.resiNumbers);
  if (!packages.length) return fail("Paket tidak ditemukan atau sudah terkirim", 422);

  // 2. Tentukan kota tujuan (dari input atau auto-infer dari alamat)
  const destinationCity = parsed.data.destinationCity ?? packageCity(packages[0]);
  const bagCode = normalizeBagCode(parsed.data.bagCode);

  // 3. Cari atau buat bag untuk kota ini
  const bag = await findOrCreateBag(supabase, bagCode, destinationCity, auth.data.userId);

  // 4. Masukkan setiap paket ke dalam bag + update status + catat ke tracking_history
  for (const pkg of packages) {
    await supabase.from("bag_items").delete().eq("package_id", pkg.id);
    await supabase.from("bag_items").insert({ bag_id: bag.id, package_id: pkg.id });

    if (pkg.status === "PACKAGE_CREATED") {
      await supabase.from("packages").update({ status: "IN_WAREHOUSE" }).eq("id", pkg.id);
      await supabase.from("tracking_history").insert({
        package_id: pkg.id,
        event_code: "IN_WAREHOUSE",
        event_label: "Di bagging",
        location: destinationCity,
        description: `Masuk ke bagging ${bag.bag_code}`,
        created_by: auth.data.userId,
      });
    }
  }

  return ok(manifest, 201);
}
```

---

### E. Assign Bag ke Kurir (PATCH /api/admin/manifests)

Saat bag di-assign ke kurir, status bag dan semua paket di dalamnya berubah:

```typescript
// Saat bag di-assign ke kurir:
// bags.status       → "OUT_FOR_DELIVERY"
// packages.status   → "OUT_FOR_DELIVERY"  (untuk semua paket dalam bag)
// tracking_history  → event baru "OUT_FOR_DELIVERY" dicatat

const nextBagStatus = assignedCourierId ? "OUT_FOR_DELIVERY" : "OPEN";
const nextPackageStatus = assignedCourierId ? "OUT_FOR_DELIVERY" : "IN_WAREHOUSE";
```

---

### F. Skema Tabel Database

```sql
-- Tabel bags: satu baris = satu kantung pengiriman
CREATE TABLE public.bags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bag_code text NOT NULL UNIQUE CHECK (bag_code ~ '^BAG-[0-9]{4}-[A-Z0-9]{4}$'),
  status text NOT NULL DEFAULT 'OPEN',
  destination_city text NOT NULL DEFAULT 'Belum ditentukan',
  assigned_courier_id uuid REFERENCES public.profiles(user_id),
  created_by uuid REFERENCES public.profiles(user_id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabel bag_items: relasi many-to-many antara bags dan packages
-- package_id UNIQUE memastikan 1 paket hanya bisa ada di 1 bag
CREATE TABLE public.bag_items (
  bag_id uuid NOT NULL REFERENCES public.bags(id),
  package_id uuid NOT NULL UNIQUE REFERENCES public.packages(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT bag_items_pkey PRIMARY KEY (bag_id, package_id)
);
```

---

## 4. Alur Presentasi yang Disarankan

1. **Mulai dari masalah**: "Bagaimana cara mengelompokkan ratusan paket secara efisien agar kurir tahu mana yang harus diantarkan ke kota mana?"
2. **Tunjukkan skema database**: Jelaskan relasi `bags → bag_items → packages`
3. **Demo live** (jika ada): Buka halaman `/admin-gudang/bagging`, scan atau input nomor resi, lihat paket masuk ke bag
4. **Tunjukkan kode `ensureCityBag`**: Ini adalah otak dari "rule-based grouping"
5. **Tunjukkan efek cascade**: Ketika bag di-assign ke kurir, semua paket di dalamnya langsung berubah status
6. **Tunjukkan di `tracking_history`**: Setiap perpindahan status terekam otomatis
