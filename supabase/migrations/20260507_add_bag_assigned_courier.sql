alter table public.bags
  add column if not exists assigned_courier_id uuid references public.profiles(user_id);