# Panduan Presentasi: Muhammad Rifki Fadhilah
## Portal Tracking Publik — Vertical Timeline & Read-Only API

---

## 1. Poin Utama yang Harus Dibicarakan

### A. Konsep "Portal Publik" — Tanpa Login
Berbeda dengan semua halaman lain di sistem yang membutuhkan login, portal tracking adalah satu-satunya endpoint yang **boleh diakses oleh siapa saja** — termasuk pelanggan yang tidak punya akun di sistem. Seseorang cukup punya nomor resi untuk melacak paket mereka.

**Trade-off keamanan yang penting:**
Karena API ini publik (tanpa auth), dipasang mekanisme proteksi ringan:
- Jika paket punya nomor telepon penerima, pengguna **wajib memasukkan nomor HP penerima** untuk melihat detail
- Ini mencegah orang sembarangan melacak paket milik orang lain hanya dengan nomor resi

### B. Desain Tabel `tracking_history`
Tabel ini adalah **append-only log** — setiap perubahan status paket dicatat sebagai baris baru, tidak pernah di-update. Ini menghasilkan "timeline" lengkap riwayat perjalanan paket dari gudang sampai ke tangan penerima.

Setiap baris punya:
- `event_code`: status dari enum `package_status` (misal: `IN_WAREHOUSE`, `OUT_FOR_DELIVERY`, `DELIVERED`)
- `event_label`: teks deskripsi yang ditampilkan ke pengguna
- `location`: lokasi saat event ini terjadi
- `created_at`: timestamp event

### C. Vertical Timeline di UI
Di halaman `/tracking`, data dari `tracking_history` ditampilkan sebagai timeline vertikal — dari atas (event terlama) ke bawah (event terbaru), sehingga pengguna bisa melihat perjalanan paket secara kronologis.

### D. API Bersifat Read-Only
Endpoint ini **hanya GET** — tidak ada POST/PATCH/DELETE. Tidak ada data yang bisa diubah melalui portal tracking. Ini penting untuk disorot karena menunjukkan prinsip **principle of least privilege** dalam desain API.

---

## 2. Struktur Folder & File yang Dikerjakan

```
app/
├── page.tsx                          ← Landing page utama (berisi form input nomor resi)
└── tracking/
    └── page.tsx                      ← Halaman hasil tracking dengan vertical timeline

components/
└── tracking-portal.tsx               ← Komponen UI timeline tracking

app/
└── api/
    └── public/
        └── tracking/
            └── [resi]/
                └── route.ts          ← GET /api/public/tracking/:resi (read-only, no auth)

lib/
├── validation.ts                     ← resiSchema — validasi format NEKO-YYYY-XXXX
└── types.ts                          ← PackageStatus enum, tracking event types

supabase/
└── schema.sql                        ← Definisi tabel tracking_history
```

---

## 3. Potongan Kode Krusial

### A. Skema Tabel `tracking_history`

```sql
-- Tabel ini adalah log immutable perjalanan setiap paket
CREATE TABLE public.tracking_history (
  id bigint NOT NULL DEFAULT nextval('tracking_history_id_seq'),
  package_id uuid NOT NULL REFERENCES public.packages(id),
  event_code package_status NOT NULL,    -- Status saat event ini terjadi
  event_label text NOT NULL,             -- Label yang ditampilkan ke user
  location text,                          -- Lokasi fisik saat event
  description text,                       -- Keterangan tambahan
  created_by uuid REFERENCES public.profiles(user_id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tracking_history_pkey PRIMARY KEY (id)
);
```

**Kenapa `id` pakai `bigserial` (integer) bukan UUID?**
Karena tabel ini volume-nya tinggi (setiap perubahan status = satu baris baru), integer lebih efisien untuk storage dan index daripada UUID.

---

### B. GET /api/public/tracking/[resi] — Endpoint Tracking Publik

```typescript
// app/api/public/tracking/[resi]/route.ts

export async function GET(
  req: Request,
  ctx: RouteContext<"/api/public/tracking/[resi]">,
) {
  const { resi } = await ctx.params;

  // 1. Validasi format resi dengan Zod (NEKO-YYYY-XXXX)
  const parsedResi = resiSchema.safeParse(resi);
  if (!parsedResi.success) {
    return fail("Invalid tracking number", 400, parsedResi.error.flatten());
  }

  // Ambil opsional parameter phone dari query string
  const url = new URL(req.url);
  const phoneParam = url.searchParams.get("phone")?.trim() ?? "";

  const supabaseAdmin = createSupabaseAdminClient(); // Pakai admin client (bypass RLS)

  // 2. Cari paket berdasarkan nomor resi
  const { data: pkg } = await supabaseAdmin
    .from("packages")
    .select("id, resi, sender_name, receiver_name, receiver_address, receiver_phone, destination_city, status, created_at")
    .eq("resi", parsedResi.data)
    .maybeSingle();

  if (!pkg) {
    return fail("Tracking number not found.", 404);
  }

  // 3. PROTEKSI: Jika paket ada nomor HP penerima, wajib verifikasi
  if (pkg.receiver_phone) {
    if (!phoneParam) {
      return fail(
        "This package requires phone verification. Please enter the receiver's phone number.",
        403,
      );
    }
    if (!phonesMatch(pkg.receiver_phone, phoneParam)) {
      return fail("Phone number does not match our records.", 403);
    }
  }

  // 4. Ambil seluruh riwayat tracking, urut dari yang paling lama
  const { data: history } = await supabaseAdmin
    .from("tracking_history")
    .select("event_code, event_label, location, description, created_at")
    .eq("package_id", pkg.id)
    .order("created_at", { ascending: true }); // ascending = kronologis dari awal

  // 5. Cari event DELIVERED untuk menentukan tanggal pengiriman
  const deliveredEvent = (history ?? []).find((e) => e.event_code === "DELIVERED");

  return ok({
    resi: pkg.resi,
    status: pkg.status,
    receiver_name: pkg.receiver_name,
    receiver_address: pkg.receiver_address ?? "",
    destination_city: pkg.destination_city ?? null,
    created_at: pkg.created_at,
    delivered_at: deliveredEvent?.created_at ?? null, // null jika belum terkirim
    timeline: history ?? [], // Array event dari awal sampai sekarang
  });
}
```

---

### C. Normalisasi Nomor Telepon untuk Verifikasi

```typescript
// app/api/public/tracking/[resi]/route.ts

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, ""); // Hapus semua non-digit
  // Konversi format lokal (08xx) ke format internasional (628xx)
  return digits.startsWith("0") ? "62" + digits.slice(1) : digits;
}

function phonesMatch(a: string, b: string) {
  return normalizePhone(a) === normalizePhone(b);
}

// Contoh:
// normalizePhone("0812-3456-7890") → "6281234567890"
// normalizePhone("6281234567890") → "6281234567890"
// normalizePhone("+62 812 3456 7890") → "6281234567890"
// Ketiga format di atas akan cocok satu sama lain
```

Fungsi ini penting karena pengguna mungkin mengetik nomor dengan berbagai format (0812, +62812, 62812) — semuanya harus dianggap sama.

---

### D. Validasi Format Resi (lib/validation.ts)

```typescript
// lib/validation.ts

export const resiSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^NEKO-\d{4}-[A-Z0-9]{4}$/,
    "Tracking number must follow format NEKO-YYYY-XXXX"
  );

// Validasi ini jalan sebelum query ke database:
// - NEKO-2026-A3F7 ✅
// - neko-2026-a3f7 ✅ (auto uppercase)
// - NEKO-26-A3F7   ❌ (tahun harus 4 digit)
// - NEKO2026A3F7   ❌ (tanpa tanda hubung)
```

---

### E. Response Shape — Contoh Data yang Dikembalikan API

```json
{
  "ok": true,
  "data": {
    "resi": "NEKO-2026-A3F7",
    "status": "DELIVERED",
    "receiver_name": "Budi Santoso",
    "receiver_address": "Jl. Merdeka No. 10, Jakarta Selatan",
    "destination_city": "Jakarta Selatan",
    "created_at": "2026-06-01T08:00:00Z",
    "delivered_at": "2026-06-03T14:30:00Z",
    "timeline": [
      {
        "event_code": "PACKAGE_CREATED",
        "event_label": "Package created at warehouse",
        "location": "Warehouse",
        "description": "Shipping label created",
        "created_at": "2026-06-01T08:00:00Z"
      },
      {
        "event_code": "IN_WAREHOUSE",
        "event_label": "Di bagging",
        "location": "Jakarta Selatan",
        "description": "Masuk ke bagging BAG-2026-C1D2",
        "created_at": "2026-06-01T10:00:00Z"
      },
      {
        "event_code": "OUT_FOR_DELIVERY",
        "event_label": "Assigned to courier",
        "location": "Jakarta Selatan",
        "description": "Bag BAG-2026-C1D2 assigned to courier",
        "created_at": "2026-06-02T07:00:00Z"
      },
      {
        "event_code": "DELIVERED",
        "event_label": "Delivered",
        "location": "-6.2146,106.8451",
        "description": "Proof of delivery recorded",
        "created_at": "2026-06-03T14:30:00Z"
      }
    ]
  }
}
```

Data `timeline` inilah yang divisualisasikan sebagai **Vertical Timeline** di frontend.

---

## 4. Alur Presentasi yang Disarankan

1. **Demo dari sudut pandang pelanggan**: Buka halaman utama (`/`), masukkan nomor resi di form tracking, lihat hasilnya
2. **Tunjukkan Vertical Timeline di UI**: Jelaskan setiap baris timeline = satu event dari tabel `tracking_history`
3. **Jelaskan mengapa API ini tidak butuh login**: Prinsip desain — pelanggan tidak punya akun, tapi berhak tahu paket mereka di mana
4. **Tunjukkan proteksi nomor HP**: Coba akses resi yang punya nomor HP tanpa memasukkan phone — lihat error 403
5. **Tunjukkan kode normalisasi HP**: Jelaskan kenapa diperlukan (format berbeda-beda)
6. **Buka kode route handler**: Tunjukkan bahwa API ini hanya GET, tidak ada kemampuan modifikasi data
7. **Tunjukkan skema `tracking_history`**: Jelaskan desain append-only log
