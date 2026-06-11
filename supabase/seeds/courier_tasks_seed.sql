-- Seed data untuk task kurir (OUT_FOR_DELIVERY)
-- Jalankan di Supabase SQL Editor setelah schema utama sudah terpasang.

begin;

-- Ambil actor pembuat paket (prioritas superadmin/admin_gudang)
with actor as (
  select p.user_id
  from public.profiles p
  where p.role in ('superadmin', 'admin_gudang', 'kurir')
  order by case p.role
    when 'superadmin' then 1
    when 'admin_gudang' then 2
    else 3
  end
  limit 1
),
seed_rows as (
  select
    format('NEKO-%s-%s', to_char(now(), 'YYYY'), upper(substr(md5((gs)::text || clock_timestamp()::text), 1, 4))) as resi,
    format('Receiver %s', gs) as receiver_name,
    format('Jl. Kurir No. %s, Jakarta', gs) as receiver_address,
    format('Sender %s', gs) as sender_name,
    (0.5 + (gs % 5) * 0.25)::numeric(10,2) as weight_kg,
    (-6.20 + (gs * 0.005))::double precision as target_latitude,
    (106.80 + (gs * 0.005))::double precision as target_longitude,
    gs
  from generate_series(1, 12) as gs
),
inserted_packages as (
  insert into public.packages (
    resi,
    sender_name,
    receiver_name,
    receiver_address,
    weight_kg,
    status,
    target_latitude,
    target_longitude,
    created_by
  )
  select
    s.resi,
    s.sender_name,
    s.receiver_name,
    s.receiver_address,
    s.weight_kg,
    'OUT_FOR_DELIVERY'::public.package_status,
    s.target_latitude,
    s.target_longitude,
    a.user_id
  from seed_rows s
  cross join actor a
  where a.user_id is not null
  returning id, resi, created_by
)
insert into public.tracking_history (
  package_id,
  event_code,
  event_label,
  location,
  description,
  created_by
)
select
  p.id,
  'OUT_FOR_DELIVERY'::public.package_status,
  'Paket dibawa kurir',
  'Warehouse Hub',
  'Paket keluar dari hub untuk pengantaran',
  p.created_by
from inserted_packages p;

-- Log aktivitas seed (opsional)
insert into public.activity_logs (actor_id, action, entity, entity_id, metadata)
select
  p.created_by,
  'SEED_COURIER_TASKS',
  'package',
  p.id::text,
  jsonb_build_object('resi', p.resi, 'source', 'courier_tasks_seed.sql')
from public.packages p
where p.created_at >= now() - interval '2 minutes'
  and p.status = 'OUT_FOR_DELIVERY';

commit;
