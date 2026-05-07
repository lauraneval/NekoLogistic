delete from public.bags b
where not exists (
  select 1
  from public.bag_items bi
  where bi.bag_id = b.id
);