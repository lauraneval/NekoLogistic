# NekoLogistic (Web)

NekoLogistic adalah aplikasi manajemen logistik berbasis **Next.js App Router** dan **PostgreSQL (Supabase)** dengan fokus pada keamanan API, RBAC, dan pelacakan publik.

## Stack

- Next.js (App Router)
- React + Tailwind CSS
- Supabase (Auth + Postgres + RLS)
- Zod (validasi dan sanitasi input)

## Fitur Web yang Disiapkan

- Landing page modern (Hero, About, Contact)
- Portal tracking publik dengan vertical timeline
- Endpoint operasional admin gudang:
	- Input paket + generate resi `NEKO-YYYY-XXXX`
	- Manifesting bulk melalui Supabase RPC
- Endpoint superadmin:
	- Registrasi akun role `admin_gudang` dan `kurir`
	- Analytics metrik paket + activity logs

## Setup Local

1. Install dependencies

```bash
npm install
```

2. Buat `.env.local` dari `.env.example`

```bash
cp .env.example .env.local
```

3. Isi environment variable Supabase di `.env.local`

4. Jalankan SQL schema RLS dari `supabase/schema.sql` di Supabase SQL Editor

5. Jalankan project

```bash
npm run dev
```

## Security Notes

- Semua endpoint protected melakukan auth + role check di server (`lib/auth.ts`)
- Payload API divalidasi dengan Zod (`lib/validation.ts`)
- RLS aktif untuk tabel inti (`supabase/schema.sql`)
- Service role key hanya dipakai di server (`lib/supabase/admin.ts`)
- Route portal role (`/superadmin`, `/admin-gudang`, `/kurir`) diproteksi di `proxy.ts`

## Dokumentasi Arsitektur

Lihat `docs/ARCHITECTURE.md` untuk struktur folder, API map, dan alur setup.

---

## 📝 Log Perubahan (Changelog)

### [Terbaru] - 00.56 21 April 2026

#### 🚀 Fitur Baru
- **Sistem Autentikasi Hybrid**: Mendukung Login via Cookie (Web) dan JWT/Bearer Token (Mobile REST API).
- **Dashboard Superadmin Premium**: Panel kendali dengan tema *Glassmorphism "Ginger Cat"* (Orange) yang modern dan responsif.
- **Manajemen Akun Lengkap**:
  - Pembuatan akun personel (Kurir & Admin Gudang).
  - Fitur **Edit Akun** untuk mengubah nama dan jabatan.
  - Sistem **Blokir Akun** (Toggle Block) untuk menangguhkan akses tanpa menghapus data.
  - Proteksi akun Superadmin (mencegah penghapusan diri sendiri & pembatasan pembuatan admin baru via UI).
- **Sistem Filter Canggih**:
  - Filter terpusat dalam satu tombol modal yang elegan.
  - Pencarian nama *real-time*.
  - Penyaringan berdasarkan Jabatan (Role) dan Status Keaktifan.

#### 🔧 Perbaikan & Optimasi
- **Validasi Data (Zod)**: Memperketat aturan input nama, email, dan password (minimal 8 karakter).
- **Keamanan Database (RLS)**: Implementasi *Row Level Security* di Supabase agar data hanya bisa diakses oleh user yang memiliki token sah.
- **Fix Error 500**: Perbaikan penanganan variabel lingkungan (`SUPABASE_SERVICE_ROLE_KEY`) dan validasi *environment*.
- **API Stateless**: Mengoptimalkan `createSupabaseServerClient` untuk mendukung komunikasi stateless dari aplikasi mobile.

#### 🎨 Antarmuka (UI/UX)
- **Tema Orange Glassmorphism**: Estetika premium dengan efek blur transparan dan aksen warna orange kucing oren.
- **Readability Booster**: Peningkatan kontras teks pada modal dan form input untuk kenyamanan mata.
- **Format Tanggal Lokal**: Tampilan waktu terdaftar menggunakan format lengkap Bahasa Indonesia (Hari, Tanggal, Jam).
- **Feedback Interaktif**: Penambahan animasi *pulse*, *hover lift*, dan *active-scale* pada seluruh elemen tombol.
