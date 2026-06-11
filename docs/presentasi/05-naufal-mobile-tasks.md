# Panduan Presentasi: Naufal Thoriq Muzhaffar
## Backend Mobile — Endpoint Data Tugas Kurir (GET /api/mobile/tasks)

---

## 1. Poin Utama yang Harus Dibicarakan

### A. Konteks: API Khusus Mobile
Endpoint ini dirancang bukan untuk browser, melainkan untuk **aplikasi Flutter yang digunakan kurir**. Perbedaan mendasar dari API web:
- Auth menggunakan **Bearer token** di header (bukan cookie)
- Format response menggunakan `{ data: ... }` bukan `{ ok: true, data: ... }`
- Data sudah dibentuk sedemikian rupa agar Flutter mudah di-render (tidak perlu transformasi lagi di sisi mobile)

### B. Query String Filtering — Paket Belum Selesai Milik Kurir
Endpoint ini menjawab pertanyaan: **"Kurir saya, hari ini, harus mengantarkan apa saja?"**

Filter yang diterapkan secara otomatis:
1. `assigned_courier_id = user_id_kurir` — hanya bag yang di-assign ke kurir yang request ini
2. `status IN ('OPEN', 'IN_WAREHOUSE', 'IN_TRANSIT', 'OUT_FOR_DELIVERY')` — hanya yang **belum selesai** (exclude `DELIVERED`)

Filter ini tidak perlu dikirim dari client — sistem menentukannya sendiri berdasarkan **siapa yang sedang login** (dari JWT token).

### C. Joined Query — Bags + Packages dalam Satu Request
Alih-alih Flutter harus melakukan dua request (pertama ambil bags, lalu ambil packages per bag), endpoint ini mengembalikan **data yang sudah di-join**: setiap task berisi daftar lengkap paket di dalamnya.

Ini adalah desain **BFF (Backend for Frontend)** — backend menyiapkan data persis sesuai kebutuhan tampilan mobile.

### D. Summary + Route Estimation
Selain data tugas, endpoint ini juga menghitung:
- `total_distance_km`: estimasi total jarak rute pengiriman hari ini (pakai Haversine)
- `remaining_drop`: total paket yang harus diantarkan
- `active_count` vs `queue_count`: berapa yang sudah aktif vs masih antri

---

## 2. Struktur Folder & File yang Dikerjakan

```
app/
└── api/
    └── mobile/
        └── tasks/
            ├── route.ts                  ← GET /api/mobile/tasks (daftar tugas kurir)
            └── [id]/
                ├── route.ts              ← GET /api/mobile/tasks/:id (detail satu task)
                └── accept/
                    └── route.ts          ← POST /api/mobile/tasks/:id/accept (terima tugas)

lib/
├── mobile-auth.ts                        ← authenticateMobileRequest() — Bearer token validator
├── mobile-api.ts                         ← mobileOk(), mobileError(), mobileMessage()
└── mobile-delivery.ts                    ← estimateRouteDistanceKm(), normalizeCoordinate()

docs/
└── MOBILE_COURIER_API_CONTRACT.md        ← Kontrak API lengkap untuk tim Flutter
```

---

## 3. Potongan Kode Krusial

### A. Flow Autentikasi Mobile (lib/mobile-auth.ts)

```typescript
// lib/mobile-auth.ts — Validator token untuk semua mobile endpoint

export async function authenticateMobileRequest(
  request: Request,
  allowedRoles: AppRole[] = ["kurir", "superadmin", "admin_gudang"],
) {
  // 1. Baca token dari header: "Authorization: Bearer <token>"
  const token = readBearerToken(request);
  if (!token) {
    return { error: mobileError("Unauthorized", 401) } as const;
  }

  // 2. Validasi JWT token ke Supabase Auth
  const supabase = createSupabaseAdminClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return { error: mobileError("Unauthorized", 401) } as const;
  }

  // 3. Ambil role dari tabel profiles
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

---

### B. GET /api/mobile/tasks — Query Utama dengan Join

```typescript
// app/api/mobile/tasks/route.ts

export async function GET(req: Request) {
  // 1. Autentikasi dengan Bearer token
  const auth = await authenticateMobileRequest(req, ["kurir", "superadmin", "admin_gudang"]);
  if ("error" in auth) return auth.error;

  const supabase = createSupabaseAdminClient();

  // 2. Query: ambil bags + semua packages di dalamnya dalam 1 query
  const { data, error } = await supabase
    .from("bags")
    .select(`
      id,
      bag_code,
      destination_city,
      status,
      assigned_courier_id,
      created_at,
      bag_items(
        package_id,
        packages(
          id, resi, receiver_name, receiver_phone, receiver_address,
          package_name, weight_kg, length_cm, width_cm, height_cm,
          sender_name, sender_phone, sender_email,
          status, target_latitude, target_longitude
        )
      )
    `)
    // FILTER 1: Hanya bag milik kurir yang sedang request
    .eq("assigned_courier_id", auth.data.userId)
    // FILTER 2: Hanya yang belum selesai
    .in("status", ["OPEN", "IN_WAREHOUSE", "IN_TRANSIT", "OUT_FOR_DELIVERY"])
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) return mobileError("Internal server error", 500);

  // 3. Transform data ke format yang diinginkan Flutter
  const bags = data ?? [];
  const items = bags.map(buildTaskItem).filter((item) => item.package_count > 0);

  // 4. Pisahkan tugas aktif vs yang masih antri
  const activeTasks = items.filter((item) => item.status === "OUT_FOR_DELIVERY");
  const queueTasks = items.filter((item) => item.status !== "OUT_FOR_DELIVERY");

  // 5. Hitung estimasi total jarak rute
  const routeStops = items
    .filter((item) => item.latitude !== null && item.longitude !== null)
    .map((item) => ({
      created_at: item.created_at,
      latitude: item.latitude!,
      longitude: item.longitude!,
    }));

  return mobileOk({
    summary: {
      total_distance_km: Number(estimateRouteDistanceKm(routeStops).toFixed(1)),
      remaining_drop: items.reduce((total, item) => total + item.package_count, 0),
      active_count: activeTasks.length,
      queue_count: queueTasks.length,
    },
    active_tasks: activeTasks,
    queue_tasks: queueTasks,
  });
}
```

---

### C. Transformasi Data: `buildTaskItem`

```typescript
// app/api/mobile/tasks/route.ts

function buildTaskItem(bag: MobileBagRow) {
  // Flatten array bag_items → array of packages
  const packages = resolvePackages(Array.isArray(bag.bag_items) ? bag.bag_items : []);
  const representativePackage = packages[0] ?? null; // Paket pertama jadi "wajah" task

  return {
    id: String(bag.id),
    bag_code: String(bag.bag_code),
    destination_city: String(bag.destination_city ?? "Belum ditentukan"),
    status: String(bag.status),
    package_count: packages.length, // Total paket dalam bag ini

    // Info dari paket pertama (untuk tampilan ringkas di list)
    receiver_name: representativePackage?.receiver_name ?? null,
    receiver_address: representativePackage?.receiver_address ?? null,
    resi: representativePackage?.resi ?? null,
    latitude: normalizeCoordinate(representativePackage?.target_latitude),
    longitude: normalizeCoordinate(representativePackage?.target_longitude),

    // Daftar lengkap semua paket (untuk tampilan detail)
    packages: packages.map((pkg) => ({
      id: String(pkg.id),
      resi: String(pkg.resi),
      receiver_name: String(pkg.receiver_name),
      receiver_address: String(pkg.receiver_address),
      status: String(pkg.status),
      // ... semua field lainnya
      latitude: normalizeCoordinate(pkg.target_latitude),
      longitude: normalizeCoordinate(pkg.target_longitude),
    })),
  };
}
```

---

### D. Estimasi Jarak Rute (lib/mobile-delivery.ts)

Fungsi ini menghitung estimasi total jarak perjalanan kurir hari ini dengan cara menjumlahkan jarak antar titik stop secara berurutan:

```typescript
// lib/mobile-delivery.ts

export function estimateRouteDistanceKm(
  stops: Array<{ created_at: string; latitude: number; longitude: number }>
) {
  if (stops.length < 2) return 0;

  // Urutkan berdasarkan waktu pembuatan (urutan stop yang disarankan)
  const sorted = [...stops].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let totalKm = 0;
  for (let i = 1; i < sorted.length; i++) {
    // Hitung jarak antara stop i-1 dan stop i pakai Haversine
    totalKm += haversineDistanceKm(sorted[i - 1], sorted[i]);
  }

  return totalKm;
}
```

---

### E. Format Response Mobile (lib/mobile-api.ts)

```typescript
// lib/mobile-api.ts — Format response khusus mobile (berbeda dari web)

export function mobileOk(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function mobileError(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

// Bandingkan dengan format web (lib/api.ts):
// Web OK  → { ok: true,  data: {...} }
// Mobile  → { data: {...} }          ← lebih simple, sesuai konvensi REST mobile
```

---

### F. Contoh Response JSON dari GET /api/mobile/tasks

```json
{
  "data": {
    "summary": {
      "total_distance_km": 12.3,
      "remaining_drop": 7,
      "active_count": 2,
      "queue_count": 1
    },
    "active_tasks": [
      {
        "id": "uuid-bag-1",
        "bag_code": "BAG-2026-A1B2",
        "destination_city": "Depok",
        "status": "OUT_FOR_DELIVERY",
        "package_count": 3,
        "receiver_name": "Siti Rahayu",
        "receiver_address": "Jl. Anggrek No. 5, Depok",
        "resi": "NEKO-2026-C3D4",
        "latitude": -6.3728,
        "longitude": 106.8227,
        "packages": [ /* detail per paket */ ]
      }
    ],
    "queue_tasks": [ /* tugas yang belum aktif */ ]
  }
}
```

---

## 4. Alur Presentasi yang Disarankan

1. **Mulai dari cerita pengguna**: "Bayangkan seorang kurir pagi hari membuka aplikasinya — dia perlu tahu hari ini harus ke mana saja."
2. **Tunjukkan mengapa API ini berbeda**: Bearer token, bukan cookie — karena mobile client
3. **Jelaskan filter otomatis**: Tidak ada query parameter dari Flutter — filter ditentukan dari JWT (user ID kurir)
4. **Tunjukkan query Supabase dengan join**: Satu query untuk bags + semua packages di dalamnya — efisien
5. **Tunjukkan `buildTaskItem`**: Transformasi dari struktur database ke format yang Flutter-friendly
6. **Tunjukkan `summary`**: Fitur estimasi jarak total dengan Haversine — nilai tambah untuk kurir
7. **Bedakan `active_tasks` vs `queue_tasks`**: Pengelompokan otomatis berdasarkan status
