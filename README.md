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
