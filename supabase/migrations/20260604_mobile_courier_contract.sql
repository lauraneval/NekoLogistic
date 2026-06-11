-- Mobile courier contract hardening for NekoLogistic.
-- This migration adds read-side policies and indexes to support the Flutter courier API.

create index if not exists idx_bags_assigned_courier_status_created_at
  on public.bags (assigned_courier_id, status, created_at desc);

create index if not exists idx_packages_status_delivered_at
  on public.packages (status, delivered_at desc);

create index if not exists idx_tracking_history_package_created_at
  on public.tracking_history (package_id, created_at desc);

drop policy if exists "bags read by courier assignment" on public.bags;
create policy "bags read by courier assignment"
on public.bags
for select
to authenticated
using (
  public.current_role() in ('superadmin', 'admin_gudang')
  or (public.current_role() = 'kurir' and assigned_courier_id = auth.uid())
);

drop policy if exists "bag_items read by courier assignment" on public.bag_items;
create policy "bag_items read by courier assignment"
on public.bag_items
for select
to authenticated
using (
  public.current_role() in ('superadmin', 'admin_gudang')
  or exists (
    select 1
    from public.bags b
    where b.id = bag_items.bag_id
      and b.assigned_courier_id = auth.uid()
  )
);

drop policy if exists "packages read by courier assignment" on public.packages;
create policy "packages read by courier assignment"
on public.packages
for select
to authenticated
using (
  public.current_role() in ('superadmin', 'admin_gudang')
  or exists (
    select 1
    from public.bag_items bi
    join public.bags b on b.id = bi.bag_id
    where bi.package_id = packages.id
      and b.assigned_courier_id = auth.uid()
  )
);

drop policy if exists "tracking read by courier assignment" on public.tracking_history;
create policy "tracking read by courier assignment"
on public.tracking_history
for select
to authenticated
using (
  public.current_role() in ('superadmin', 'admin_gudang')
  or exists (
    select 1
    from public.packages p
    join public.bag_items bi on bi.package_id = p.id
    join public.bags b on b.id = bi.bag_id
    where p.id = tracking_history.package_id
      and b.assigned_courier_id = auth.uid()
  )
);
