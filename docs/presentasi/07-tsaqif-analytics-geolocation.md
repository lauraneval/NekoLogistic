# Panduan Presentasi: Tsaqif Kanz Ahmad
## Dashboard Analytics, Geolocation Backend & Data Seeder

---

## 1. Poin Utama yang Harus Dibicarakan

### A. Dashboard Analytics — Aggregasi Data Real-Time
Dashboard superadmin menampilkan gambaran menyeluruh kondisi sistem logistik:
- **Metrics ringkas**: total paket, paket terkirim, success rate (persentase)
- **Tabel paket terbaru** dengan filter status
- **Visualisasi bagging** per kota tujuan
- **Log aktivitas terbaru** dari seluruh pengguna
- **Daftar users** (admin gudang dan kurir)

Semua data ini diambil dalam **satu request** menggunakan `Promise.all` — semua query berjalan **paralel** untuk meminimalkan latency.

### B. Formula Matematika Spasial — Validasi Geofencing
Sebelum kurir bisa menandai paket sebagai terkirim, backend memvalidasi:
> "Apakah posisi GPS kurir saat ini dalam radius 100 meter dari lokasi tujuan pengiriman?"

Ini menggunakan **formula Haversine** — rumus matematika yang menghitung jarak antara dua titik di permukaan bola (bumi) berdasarkan koordinat lintang dan bujur (latitude, longitude).

### C. Estimasi Jarak Rute Kurir
Selain geofencing, Haversine juga dipakai untuk menghitung **estimasi total jarak** yang harus ditempuh kurir hari ini — dijumlahkan dari semua stop pengiriman secara berurutan.

### D. Skrip Injeksi 200 Data Dummy
Untuk keperluan testing dan demo, dibuat skrip yang menginjeksi 200 paket dummy dengan variasi:
- Nama pengirim dan penerima acak
- Alamat tujuan di berbagai kota
- Berat dan dimensi acak
- Status paket yang bervariasi

---

## 2. Struktur Folder & File yang Dikerjakan

```
app/
├── superadmin/
│   └── page.tsx                          ← Halaman dashboard superadmin (charts & stats)
└── api/
    └── superadmin/
        └── analytics/
            └── route.ts                  ← GET /api/superadmin/analytics

components/
└── superadmin-dashboard.tsx              ← Komponen chart & statistik

lib/
└── mobile-geofence.ts                    ← haversineDistanceMeters(), resolveTargetCoordinate()

app/
└── api/
    └── mobile/
        └── tasks/
            └── [id]/
                └── deliver/
                    └── route.ts          ← Geofencing validation (PUT handler)

scripts/
└── seed-packages.ts                      ← (atau sejenisnya) Skrip inject 200 data dummy
    (atau) supabase/seeds/packages.sql    ← SQL seed file
```

---

## 3. Potongan Kode Krusial

### A. GET /api/superadmin/analytics — Semua Query Paralel

```typescript
// app/api/superadmin/analytics/route.ts

export async function GET() {
  const auth = await requireRole(["superadmin"]);
  if ("error" in auth) return auth.error;

  const supabase = createSupabaseAdminClient();

  // PENTING: Promise.all menjalankan SEMUA query secara paralel (bukan berurutan)
  // Tanpa Promise.all: 6 query × ~50ms = ~300ms
  // Dengan Promise.all: semua jalan bersamaan = ~50ms (waktu query terlama)
  const [
    { count: totalPackages },
    { count: deliveredPackages },
    packagesResult,      // 200 paket terbaru
    baggingsResult,      // 100 bag terbaru dengan items
    baggingPackageRows,  // Paket yang belum selesai (untuk merge ke bagging view)
    usersResult,         // Semua admin & kurir
  ] = await Promise.all([
    supabase.from("packages").select("id", { count: "exact", head: true }),
    supabase.from("packages").select("id", { count: "exact", head: true }).eq("status", "DELIVERED"),
    supabase.from("packages")
      .select("id, resi, package_name, receiver_name, receiver_address, destination_city, weight_kg, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("bags")
      .select("id, bag_code, destination_city, status, created_at, bag_items(created_at, packages(id, resi, package_name, receiver_name, receiver_address, destination_city, status))")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("packages")
      .select("id, resi, package_name, receiver_name, receiver_address, destination_city, status")
      .in("status", ["IN_WAREHOUSE", "OUT_FOR_DELIVERY", "IN_TRANSIT"])
      .limit(500),
    supabase.from("profiles")
      .select("user_id, full_name, role, created_at")
      .in("role", ["admin_gudang", "kurir"])
      .order("created_at", { ascending: false }),
  ]);

  // Hitung success rate
  const total = totalPackages ?? 0;
  const delivered = deliveredPackages ?? 0;
  const successRate = total > 0 ? Number(((delivered / total) * 100).toFixed(2)) : 0;
  // Contoh: 150 paket total, 120 delivered → successRate = 80.00

  // Ambil activity logs (sequential setelah parallel karena volume kecil)
  const { data: logs } = await supabase
    .from("activity_logs")
    .select("id, action, entity, entity_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  // Gabungkan email dari Supabase Auth (berbeda tabel dari profiles)
  const { data: usersData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailsById = new Map(
    (usersData.users ?? []).map((user) => [user.id, user.email ?? ""])
  );

  return ok({
    metrics: { totalPackages: total, deliveredPackages: delivered, successRate },
    users: (usersResult.data ?? []).map((profile) => ({
      ...profile,
      email: emailsById.get(String(profile.user_id)) ?? "",
    })),
    packages: packagesResult.data ?? [],
    baggings: mergeAutoCityBaggings(baggingsResult.data, baggingPackageRows.data),
    recentActivities: logs,
  });
}
```

---

### B. Formula Haversine — Jarak GPS dalam Meter (lib/mobile-geofence.ts)

```typescript
// lib/mobile-geofence.ts

type Coordinate = { latitude: number; longitude: number };

export function haversineDistanceMeters(a: Coordinate, b: Coordinate) {
  const earthRadiusMeters = 6371000; // Radius rata-rata bumi = 6.371 km
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  // Δφ = selisih lintang dalam radian
  const deltaLatitude = toRadians(b.latitude - a.latitude);
  // Δλ = selisih bujur dalam radian
  const deltaLongitude = toRadians(b.longitude - a.longitude);

  const startLatitude = toRadians(a.latitude);
  const endLatitude = toRadians(b.latitude);

  // Haversine term: a = sin²(Δφ/2) + cos(φ1)·cos(φ2)·sin²(Δλ/2)
  const haversineTerm =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(startLatitude) * Math.cos(endLatitude) *
    Math.sin(deltaLongitude / 2) * Math.sin(deltaLongitude / 2);

  // c = 2·atan2(√a, √(1−a))
  // d = R·c
  return 2 * earthRadiusMeters * Math.atan2(
    Math.sqrt(haversineTerm),
    Math.sqrt(1 - haversineTerm)
  );
}
```

**Penjelasan matematis untuk presentasi:**
- Bumi bukan bidang datar, jadi jarak tidak bisa dihitung pakai Pythagoras
- Haversine adalah versi khusus dari "Spherical Law of Cosines" yang lebih akurat untuk jarak pendek
- Input: dua titik koordinat (latitude, longitude) dalam derajat
- Output: jarak dalam **meter**
- Digunakan untuk: validasi kurir dalam radius 100m saat konfirmasi pengiriman

---

### C. Validasi Geofencing saat Pengiriman

```typescript
// app/api/mobile/tasks/[id]/deliver/route.ts

// 1. Cari koordinat target dari paket dalam bag
const targetCoordinate = resolveTargetCoordinate(packages);
if (!targetCoordinate) {
  return mobileError("Delivery coordinates are missing", 422);
}

// 2. Hitung jarak kurir vs target
const distanceMeters = haversineDistanceMeters(
  { latitude: payload.latitude, longitude: payload.longitude }, // Koordinat kurir (dari HP)
  targetCoordinate,                                               // Koordinat tujuan paket
);

// 3. Tolak jika > 100 meter
if (distanceMeters > 100) {
  return mobileError("Outside delivery radius / Unauthorized Zone", 403);
}

// Jika lolos → proses delivery
```

**Mengapa 100 meter?**
- Cukup toleran untuk GPS drift (akurasi GPS rata-rata ±10-50m)
- Cukup ketat untuk memastikan kurir benar-benar di depan pintu, bukan dari warung seberang

---

### D. Estimasi Jarak Rute Harian (lib/mobile-delivery.ts)

```typescript
// lib/mobile-delivery.ts

function haversineDistanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  // Sama dengan haversineDistanceMeters tapi output dalam km
  return haversineDistanceMeters(a, b) / 1000;
}

export function estimateRouteDistanceKm(
  stops: Array<{ created_at: string; latitude: number; longitude: number }>
) {
  if (stops.length < 2) return 0;

  // Urutkan stop berdasarkan waktu dibuat (urutan kronologis bag)
  const sorted = [...stops].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Jumlahkan jarak antar setiap pasangan stop berurutan
  let totalKm = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalKm += haversineDistanceKm(sorted[i - 1], sorted[i]);
  }

  return totalKm;
}

// Contoh: 3 stop di [Depok, Jakarta Selatan, Bekasi]
// Jarak Depok→JakSel = ~15km, JakSel→Bekasi = ~20km
// Total estimasi = 35km
```

---

### E. Algoritma Merge Auto-City Baggings (untuk Dashboard)

```typescript
// app/api/superadmin/analytics/route.ts

function mergeAutoCityBaggings(bags: BaggingRow[], packages: PackageRow[]) {
  // Buat map: kota → bag yang sudah ada
  const byCity = new Map<string, BaggingRow>();
  for (const bag of bags) {
    const city = String(bag.destination_city ?? "").trim();
    if (city) byCity.set(city.toLowerCase(), bag);
  }

  // Untuk paket yang belum punya bag, buat "virtual bag" berdasarkan kota
  for (const pkg of packages) {
    const city = packageCity(pkg);
    const key = city.toLowerCase();

    const bag = byCity.get(key) ?? {
      id: `auto-${key}`,         // ID virtual (bukan dari database)
      bag_code: `AUTO-${city.toUpperCase()}`,
      destination_city: city,
      status: "AUTO",            // Status khusus untuk tampilan dashboard
      created_at: new Date().toISOString(),
      bag_items: [],
    };

    // Tambahkan paket ke bag (hindari duplikat)
    const alreadyInBag = /* ... check duplikat ... */;
    if (!alreadyInBag) {
      bag.bag_items = [...(bag.bag_items ?? []), { packages: pkg }];
    }

    byCity.set(key, bag);
  }

  return Array.from(byCity.values());
}
```

---

### F. Skrip Seed 200 Data Dummy Paket

Skrip ini menghasilkan data paket yang realistis untuk testing dan demo:

```typescript
// scripts/seed-packages.ts (atau sejenisnya)

const CITIES = ["Jakarta Selatan", "Depok", "Bekasi", "Tangerang", "Bogor", "Bandung"];
const STATUSES = ["PACKAGE_CREATED", "IN_WAREHOUSE", "OUT_FOR_DELIVERY", "DELIVERED"];
const FIRST_NAMES = ["Budi", "Siti", "Ahmad", "Dewi", "Rizky", /* ... */];
const LAST_NAMES = ["Santoso", "Rahayu", "Hidayat", "Wijaya", /* ... */];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomName() {
  return `${randomFrom(FIRST_NAMES)} ${randomFrom(LAST_NAMES)}`;
}

async function seedPackages(count = 200) {
  const supabase = createSupabaseAdminClient();
  const packages = [];

  for (let i = 0; i < count; i++) {
    const city = randomFrom(CITIES);
    packages.push({
      resi: await generateUniqueResi(),
      package_name: `Paket ${i + 1}`,
      sender_name: randomName(),
      receiver_name: randomName(),
      receiver_address: `Jl. Contoh No. ${i + 1}, ${city}`,
      destination_city: city,
      weight_kg: Number((Math.random() * 10 + 0.1).toFixed(2)),
      status: randomFrom(STATUSES),
      // Koordinat acak di sekitar Jakarta
      target_latitude: -6.2 + (Math.random() - 0.5) * 0.5,
      target_longitude: 106.8 + (Math.random() - 0.5) * 0.5,
    });
  }

  await supabase.from("packages").insert(packages);
  console.log(`Seeded ${count} packages successfully`);
}
```

---

## 4. Alur Presentasi yang Disarankan

1. **Mulai dari dashboard**: Buka `/superadmin`, tunjukkan kartu statistik (total paket, success rate, grafik)
2. **Jelaskan `Promise.all`**: "Ini kenapa dashboard cepat — semua 6 query jalan bersamaan, bukan satu per satu"
3. **Hitung success rate secara manual**: Tunjukkan rumusnya: `delivered / total × 100`
4. **Beralih ke geofencing**: "Tapi sebelum paket bisa di-mark delivered, ada validasi lokasi"
5. **Tunjukkan formula Haversine**: Gambar diagram dua titik di peta, jelaskan input/output
6. **Demo radius 100m**: Ubah koordinat kurir dalam request, coba dari > 100m → lihat error 403
7. **Tunjukkan estimasi rute**: Kalau kurir punya 5 stop, total jarak yang diestimasi berapa?
8. **Tunjukkan data dummy**: Buka tabel packages — semua data ini diinjeksi pakai seed script untuk demo
