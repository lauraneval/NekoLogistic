alter table public.packages
  add column if not exists pod_image_url text,
  add column if not exists delivered_at timestamptz,
  add column if not exists courier_latitude double precision,
  add column if not exists courier_longitude double precision,
  add column if not exists target_latitude double precision,
  add column if not exists target_longitude double precision;

create index if not exists idx_packages_status on public.packages (status);
