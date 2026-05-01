-- NekoLogistic Web Schema
-- Run this SQL in Supabase SQL Editor.

create extension if not exists pgcrypto;

create type app_role as enum ('superadmin', 'admin_gudang', 'kurir');
create type package_status as enum (
  'PACKAGE_CREATED',
  'IN_WAREHOUSE',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FAILED_DELIVERY'
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(full_name) >= 2),
  role app_role not null default 'kurir',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  resi text not null unique check (resi ~ '^NEKO-[0-9]{4}-[A-Z0-9]{4}$'),
  package_name text not null default 'Paket',
  sender_name text not null,
  receiver_name text not null,
  receiver_address text not null,
  destination_city text not null default 'Belum ditentukan',
  weight_kg numeric(10,2) not null check (weight_kg > 0),
  status package_status not null default 'PACKAGE_CREATED',
  pod_image_url text,
  delivered_at timestamptz,
  courier_latitude double precision,
  courier_longitude double precision,
  target_latitude double precision,
  target_longitude double precision,
  created_by uuid not null references public.profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tracking_history (
  id bigserial primary key,
  package_id uuid not null references public.packages(id) on delete cascade,
  event_code package_status not null,
  event_label text not null,
  location text,
  description text,
  created_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now()
);

create table if not exists public.bags (
  id uuid primary key default gen_random_uuid(),
  bag_code text not null unique check (bag_code ~ '^BAG-[0-9]{4}-[A-Z0-9]{4}$'),
  destination_city text not null default 'Belum ditentukan',
  status text not null default 'OPEN',
  created_by uuid not null references public.profiles(user_id),
  created_at timestamptz not null default now()
);

create table if not exists public.bag_items (
  bag_id uuid not null references public.bags(id) on delete cascade,
  package_id uuid not null unique references public.packages(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (bag_id, package_id)
);

create table if not exists public.activity_logs (
  id bigserial primary key,
  actor_id uuid references public.profiles(user_id),
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace trigger trg_packages_updated_at
before update on public.packages
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'kurir'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.current_role()
returns app_role
language sql
stable
as $$
  select role from public.profiles where user_id = auth.uid();
$$;

create or replace function public.protect_profile_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and public.current_role() <> 'superadmin' then
    raise exception 'forbidden role escalation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_role on public.profiles;
create trigger trg_profiles_protect_role
before update on public.profiles
for each row execute function public.protect_profile_role_change();

create or replace function public.create_bag_manifest(
  p_bag_code text,
  p_created_by uuid,
  p_destination_city text,
  p_resi_numbers text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role app_role;
  v_bag_id uuid;
  v_inserted integer := 0;
begin
  select role into v_role from public.profiles where user_id = auth.uid();

  if v_role not in ('superadmin', 'admin_gudang') then
    raise exception 'forbidden';
  end if;

  if p_created_by is distinct from auth.uid() then
    raise exception 'forbidden actor mismatch';
  end if;

  insert into public.bags (bag_code, destination_city, created_by)
  values (p_bag_code, p_destination_city, p_created_by)
  returning id into v_bag_id;

  with selected_packages as (
    select id
    from public.packages
    where resi = any(p_resi_numbers)
      and lower(destination_city) = lower(p_destination_city)
      and status = 'PACKAGE_CREATED'
  ), updated_packages as (
    update public.packages p
    set status = 'IN_WAREHOUSE'
    from selected_packages sp
    where p.id = sp.id
    returning p.id
  ), inserted_items as (
    insert into public.bag_items (bag_id, package_id)
    select v_bag_id, id from updated_packages
    on conflict do nothing
    returning package_id
  )
  select count(*) into v_inserted from inserted_items;

  if v_inserted = 0 then
    raise exception 'no eligible packages for selected destination city';
  end if;

  insert into public.tracking_history (
    package_id,
    event_code,
    event_label,
    location,
    description,
    created_by
  )
  select
    package_id,
    'IN_WAREHOUSE',
    'Di bagging',
    p_destination_city,
    concat('Masuk ke bagging ', p_bag_code),
    p_created_by
  from public.bag_items
  where bag_id = v_bag_id;

  return jsonb_build_object(
    'bag_id', v_bag_id,
    'bag_code', p_bag_code,
    'destination_city', p_destination_city,
    'package_count', v_inserted
  );
end;
$$;

alter table public.profiles enable row level security;
alter table public.packages enable row level security;
alter table public.tracking_history enable row level security;
alter table public.bags enable row level security;
alter table public.bag_items enable row level security;
alter table public.activity_logs enable row level security;

create policy "profiles self select"
on public.profiles
for select
using (auth.uid() = user_id or public.current_role() = 'superadmin');

create policy "profiles self update"
on public.profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "packages read by authenticated"
on public.packages
for select
to authenticated
using (true);

create policy "packages insert by admin gudang"
on public.packages
for insert
to authenticated
with check (public.current_role() in ('superadmin', 'admin_gudang'));

create policy "packages update by admin/kurir"
on public.packages
for update
to authenticated
using (public.current_role() in ('superadmin', 'admin_gudang', 'kurir'))
with check (public.current_role() in ('superadmin', 'admin_gudang', 'kurir'));

create policy "tracking read by authenticated"
on public.tracking_history
for select
to authenticated
using (true);

create policy "tracking insert by admin/kurir"
on public.tracking_history
for insert
to authenticated
with check (public.current_role() in ('superadmin', 'admin_gudang', 'kurir'));

create policy "bags manage by admin gudang"
on public.bags
for all
to authenticated
using (public.current_role() in ('superadmin', 'admin_gudang'))
with check (public.current_role() in ('superadmin', 'admin_gudang'));

create policy "bag_items manage by admin gudang"
on public.bag_items
for all
to authenticated
using (public.current_role() in ('superadmin', 'admin_gudang'))
with check (public.current_role() in ('superadmin', 'admin_gudang'));

create policy "activity logs insert by authenticated"
on public.activity_logs
for insert
to authenticated
with check (auth.uid() is not null);

create policy "activity logs read by superadmin"
on public.activity_logs
for select
to authenticated
using (public.current_role() = 'superadmin');

grant execute on function public.create_bag_manifest(text, uuid, text, text[]) to authenticated;
