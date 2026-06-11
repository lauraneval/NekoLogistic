# Panduan Presentasi: Muhammad Rusdiyanto
## Backend Mobile — Proof of Delivery & Supabase Storage

---

## 1. Poin Utama yang Harus Dibicarakan

### A. Apa itu Proof of Delivery (POD)?
Proof of Delivery adalah **foto bukti** bahwa paket sudah diserahkan ke penerima. Kurir mengambil foto menggunakan kamera HP saat mengantar, lalu mengirimnya ke server.

Sistem POD di NekoLogistic terdiri dari dua operasi yang sengaja **dipisah menjadi dua endpoint**:
1. **POST** (upload foto) — kurir kirim file gambar → sistem simpan ke Supabase Storage → kembalikan URL
2. **PUT** (konfirmasi pengiriman) — kurir kirim URL foto + koordinat GPS → sistem update status paket ke `DELIVERED` + validasi geofencing

### B. Mengapa Dipisah Menjadi Dua Langkah?
Ini adalah keputusan arsitektur yang penting:
- Upload foto dan update database adalah dua operasi berbeda yang bisa gagal secara independen
- Jika upload foto gagal, status paket tidak ikut rusak
- Jika update database gagal, foto sudah tersimpan dengan aman dan bisa di-retry
- Flutter bisa menampilkan preview foto ke kurir sebelum konfirmasi pengiriman final

### C. Alur Upload ke Supabase Storage
Supabase Storage adalah layanan object storage (seperti AWS S3) bawaan Supabase. File gambar disimpan di bucket `proof-of-delivery` dengan path:
```
{bagId}/{timestamp}-{uuid}.{extension}
```

Setelah upload, Supabase menghasilkan **public URL** yang bisa diakses siapa saja (untuk ditampilkan di dashboard admin atau dibagikan ke pelanggan).

### D. Validasi Geofencing saat Konfirmasi
Pada step **PUT**, sebelum menandai paket sebagai `DELIVERED`, sistem memvalidasi:
> "Apakah kurir benar-benar berada di dekat lokasi pengiriman?"

Jika jarak kurir > 100 meter dari target koordinat → request ditolak dengan error "Outside delivery radius / Unauthorized Zone".

---

## 2. Struktur Folder & File yang Dikerjakan

```
app/
└── api/
    └── mobile/
        └── tasks/
            └── [id]/
                └── deliver/
                    └── route.ts          ← POST (upload foto) & PUT (konfirmasi)

lib/
├── mobile-auth.ts                        ← authenticateMobileRequest()
├── mobile-api.ts                         ← mobileError(), mobileMessage()
└── mobile-geofence.ts                    ← haversineDistanceMeters(), resolveTargetCoordinate()

supabase/
└── (Storage bucket: proof-of-delivery)   ← Dikonfigurasi di Supabase dashboard
```

---

## 3. Potongan Kode Krusial

### A. POST — Upload Foto Bukti Pengiriman

```typescript
// app/api/mobile/tasks/[id]/deliver/route.ts

const POD_BUCKET = "proof-of-delivery";
const MAX_POD_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",  // Format foto iPhone
};

export async function POST(req: Request, ctx: RouteContext<"...">) {
  // 1. Autentikasi Bearer token
  const auth = await authenticateMobileRequest(req, ["kurir", "superadmin", "admin_gudang"]);
  if ("error" in auth) return auth.error;

  const parsedId = idSchema.safeParse((await ctx.params).id);
  if (!parsedId.success) return mobileError("Invalid task id", 400);

  // 2. Parse multipart/form-data (file upload dari Flutter)
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return mobileError("Invalid form data", 400);
  }

  // 3. Validasi file
  const fileInput = formData.get("file");
  if (!(fileInput instanceof File)) return mobileError("file is required", 400);
  if (fileInput.size <= 0) return mobileError("file is empty", 400);
  if (fileInput.size > MAX_POD_IMAGE_SIZE_BYTES) return mobileError("file exceeds 2 MB limit", 400);

  const extension = ALLOWED_MIME_TYPES[fileInput.type];
  if (!extension) return mobileError("file must be JPEG, PNG, WebP, or HEIC", 400);

  const supabase = createSupabaseAdminClient();

  // 4. Cek task ada dan kurir berhak mengaksesnya
  const { data: bag } = await loadBagTask(supabase, parsedId.data);
  if (!bag) return mobileError("Task not found", 404);
  if (!ensureCourierCanDeliver(bag, auth.data.userId, auth.data.role)) {
    return mobileError("Forbidden", 403);
  }

  // 5. Upload ke Supabase Storage
  // Path format: {bagId}/{timestamp}-{uuid}.{ext}
  const objectPath = `${parsedId.data}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const bytes = await fileInput.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(POD_BUCKET)
    .upload(objectPath, bytes, {
      contentType: fileInput.type,
      upsert: false, // Tidak boleh overwrite file yang sudah ada
    });

  if (uploadError) return mobileError("Failed to upload image", 500);

  // 6. Dapatkan public URL untuk file yang baru diupload
  const { data: publicUrlData } = supabase.storage
    .from(POD_BUCKET)
    .getPublicUrl(objectPath);

  // 7. Kembalikan URL ke Flutter (belum update database!)
  return mobileMessage("Proof of delivery uploaded", 200, {
    bucket: POD_BUCKET,
    object_path: objectPath,
    pod_image_url: publicUrlData.publicUrl,
    // Contoh URL: https://xyz.supabase.co/storage/v1/object/public/proof-of-delivery/bag-uuid/timestamp-uuid.jpg
  });
}
```

---

### B. PUT — Konfirmasi Pengiriman + Validasi Geofencing

```typescript
// app/api/mobile/tasks/[id]/deliver/route.ts

// Schema validasi request body dari Flutter
const deliverSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),    // Koordinat GPS kurir saat ini
  longitude: z.coerce.number().min(-180).max(180),
  proof_url: z.string().url(),                       // URL dari step POST sebelumnya
  delivered_at: z.iso.datetime().optional(),          // Waktu pengiriman (dari HP kurir)
});

export async function PUT(req: Request, ctx: RouteContext<"...">) {
  const auth = await authenticateMobileRequest(req, ["kurir", "superadmin", "admin_gudang"]);
  if ("error" in auth) return auth.error;

  // ...parse id, body...

  const supabase = createSupabaseAdminClient();
  const { data: task } = await loadBagTask(supabase, parsedId.data);
  if (!task) return mobileError("Task not found", 404);

  const packages = resolvePackages(task.bag_items ?? []);
  if (packages.length === 0) return mobileError("Task not found", 404);

  // 1. VALIDASI GEOFENCING
  // Cari koordinat target dari paket dalam bag
  const targetCoordinate = resolveTargetCoordinate(packages);
  if (!targetCoordinate) return mobileError("Delivery coordinates are missing", 422);

  // Hitung jarak kurir vs target (meter)
  const distanceMeters = haversineDistanceMeters(
    { latitude: payload.latitude, longitude: payload.longitude },
    targetCoordinate,
  );

  // Tolak jika di luar radius 100 meter
  if (distanceMeters > 100) {
    return mobileError("Outside delivery radius / Unauthorized Zone", 403);
    // Response ini memberi tahu Flutter bahwa kurir perlu bergerak lebih dekat
  }

  // 2. UPDATE packages: status, POD URL, koordinat, waktu delivery
  await supabase
    .from("packages")
    .update({
      status: "DELIVERED",
      pod_image_url: payload.proof_url,
      delivered_at: deliveredAt.toISOString(),
      courier_latitude: payload.latitude,   // Koordinat kurir saat ini
      courier_longitude: payload.longitude,
      target_latitude: targetCoordinate.latitude,
      target_longitude: targetCoordinate.longitude,
    })
    .in("id", packageIds); // Update semua paket dalam bag sekaligus

  // 3. INSERT ke tracking_history untuk setiap paket
  await supabase.from("tracking_history").insert(
    packageIds.map((packageId) => ({
      package_id: packageId,
      event_code: "DELIVERED",
      event_label: "Delivered",
      location: `${payload.latitude},${payload.longitude}`, // Koordinat GPS aktual
      description: `Proof of delivery recorded at ${deliveredAt.toISOString()}`,
      created_by: auth.data.userId,
    })),
  );

  // 4. UPDATE bag: status DELIVERED
  await supabase.from("bags").update({ status: "DELIVERED" }).eq("id", bag.id);

  return mobileMessage("Delivery updated", 200, {
    id: bag.id,
    bag_code: bag.bag_code,
    status: "DELIVERED",
    delivered_at: deliveredAt.toISOString(),
    distance_meters: Math.round(distanceMeters), // Berapa meter jarak kurir dari target
    proof_url: payload.proof_url,
  });
}
```

---

### C. Formula Haversine — Jarak Dua Koordinat GPS (lib/mobile-geofence.ts)

```typescript
// lib/mobile-geofence.ts

export function haversineDistanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const earthRadiusMeters = 6371000; // Radius bumi dalam meter
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLon = toRadians(b.longitude - a.longitude);

  // Formula Haversine
  const haversineTerm =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) *
    Math.cos(toRadians(b.latitude)) *
    Math.sin(deltaLon / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(
    Math.sqrt(haversineTerm),
    Math.sqrt(1 - haversineTerm)
  );
  // Return value: jarak dalam METER (bukan km)
}

// Contoh penggunaan:
// Kurir di  : -6.2146, 106.8451
// Target di : -6.2150, 106.8455
// Jarak     : ± 58 meter → DIIZINKAN (< 100m)
```

---

### D. Resolve Target Koordinat dari Paket dalam Bag

```typescript
// lib/mobile-geofence.ts

export function resolveTargetCoordinate(
  points: Array<{ target_latitude?: number | null; target_longitude?: number | null }>
) {
  // Ambil koordinat valid pertama yang ditemukan dari array paket
  for (const point of points) {
    const latitude = normalizeCoordinate(point.target_latitude);
    const longitude = normalizeCoordinate(point.target_longitude);

    if (latitude !== null && longitude !== null) {
      return { latitude, longitude };
    }
  }

  return null; // Tidak ada paket yang punya koordinat valid
}
```

---

### E. Validasi Geofencing — Radius 100 Meter

Gambar konseptual:
```
        [ Target Koordinat Tujuan ]
               ___
              /   \
             |  ✅  |  ← Kurir di dalam radius 100m → ALLOWED
              \___/
                |
         ______↕______
        |              |
        |  ❌ Di luar  |  ← Kurir > 100m dari target → FORBIDDEN (403)
        |    radius   |
        |_____________|
```

---

## 4. Alur Presentasi yang Disarankan

1. **Mulai dari cerita**: "Seorang kurir tiba di depan rumah pelanggan — apa yang terjadi di backend?"
2. **Jelaskan 2 langkah terpisah**: Upload foto dulu (POST), baru konfirmasi (PUT) — dan jelaskan mengapa dipisah
3. **Demo alur upload**: Tunjukkan Supabase Storage dashboard, jelaskan struktur path penyimpanan
4. **Tunjukkan validasi file**: 2MB limit, hanya JPEG/PNG/WebP/HEIC — keamanan input
5. **Tunjukkan formula Haversine**: Jelaskan bahwa GPS koordinat kurir vs target dibandingkan secara matematis
6. **Tunjukkan error 403**: Apa yang terjadi kalau kurir coba konfirmasi dari tempat yang salah?
7. **Tunjukkan cascade update**: Satu PUT mengupdate packages, tracking_history, dan bags sekaligus
