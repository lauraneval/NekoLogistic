-- Add extended package fields to support the full Input New Package form
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS sender_phone     text,
  ADD COLUMN IF NOT EXISTS sender_email     text,
  ADD COLUMN IF NOT EXISTS receiver_phone   text,
  ADD COLUMN IF NOT EXISTS receiver_state   text,
  ADD COLUMN IF NOT EXISTS receiver_zip     text,
  ADD COLUMN IF NOT EXISTS length_cm        numeric,
  ADD COLUMN IF NOT EXISTS width_cm         numeric,
  ADD COLUMN IF NOT EXISTS height_cm        numeric;
