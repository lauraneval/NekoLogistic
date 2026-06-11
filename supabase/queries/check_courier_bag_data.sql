-- Courier assignment verification for kurir@gmail.com.
-- Run this in Supabase SQL Editor to confirm whether courier 1 has real bags/packages.

with target_courier as (
  select
    p.user_id,
    p.full_name,
    p.role,
    a.email
  from public.profiles p
  join auth.users a on a.id = p.user_id
  where a.email = 'kurir@gmail.com'
), assigned_bags as (
  select
    b.id as bag_id,
    b.bag_code,
    b.destination_city,
    b.status as bag_status,
    b.assigned_courier_id,
    count(bi.package_id) as package_count
  from public.bags b
  left join public.bag_items bi on bi.bag_id = b.id
  where b.assigned_courier_id = (select user_id from target_courier)
  group by b.id, b.bag_code, b.destination_city, b.status, b.assigned_courier_id
), bag_packages as (
  select
    b.id as bag_id,
    b.bag_code,
    p.id as package_id,
    p.resi,
    p.receiver_name,
    p.status as package_status
  from public.bags b
  join public.bag_items bi on bi.bag_id = b.id
  join public.packages p on p.id = bi.package_id
  where b.assigned_courier_id = (select user_id from target_courier)
)
select
  tc.user_id as courier_id,
  tc.full_name,
  tc.email,
  tc.role,
  ab.bag_id,
  ab.bag_code,
  ab.destination_city,
  ab.bag_status,
  ab.package_count,
  bp.package_id,
  bp.resi,
  bp.receiver_name,
  bp.package_status
from target_courier tc
left join assigned_bags ab on true
left join bag_packages bp on bp.bag_id = ab.bag_id
order by ab.bag_code nulls last, bp.resi nulls last;

-- Bag rows assigned to the courier but still empty. These are stale and should be cleaned up.
with target_courier as (
  select p.user_id
  from public.profiles p
  join auth.users a on a.id = p.user_id
  where a.email = 'kurir@gmail.com'
)
select
  b.id,
  b.bag_code,
  b.destination_city,
  b.status,
  b.assigned_courier_id,
  b.created_at
from public.bags b
where b.assigned_courier_id = (select user_id from target_courier)
  and not exists (
    select 1
    from public.bag_items bi
    where bi.bag_id = b.id
  )
order by b.created_at desc;

-- Direct package ownership check for the courier's assigned bags.
with target_courier as (
  select p.user_id
  from public.profiles p
  join auth.users a on a.id = p.user_id
  where a.email = 'kurir@gmail.com'
)
select
  p.id,
  p.resi,
  p.receiver_name,
  p.status,
  b.bag_code,
  b.destination_city,
  b.status as bag_status
from public.packages p
join public.bag_items bi on bi.package_id = p.id
join public.bags b on b.id = bi.bag_id
where b.assigned_courier_id = (select user_id from target_courier)
order by b.bag_code, p.resi;