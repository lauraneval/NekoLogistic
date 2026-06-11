alter table public.packages
  add column if not exists package_name text not null default 'Paket',
  add column if not exists destination_city text not null default 'Belum ditentukan';

alter table public.bags
  add column if not exists destination_city text not null default 'Belum ditentukan';

drop function if exists public.create_bag_manifest(text, uuid, text[]);

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

grant execute on function public.create_bag_manifest(text, uuid, text, text[]) to authenticated;
