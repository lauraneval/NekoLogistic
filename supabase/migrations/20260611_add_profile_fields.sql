-- Add extended profile fields to profiles table
alter table public.profiles
  add column if not exists phone_number text,
  add column if not exists address      text,
  add column if not exists employee_id  text,
  add column if not exists avatar_url   text,
  add column if not exists last_login_at timestamptz;
