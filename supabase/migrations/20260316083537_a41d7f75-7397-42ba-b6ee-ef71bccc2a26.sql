
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS school_village text,
  ADD COLUMN IF NOT EXISTS school_block text,
  ADD COLUMN IF NOT EXISTS school_tahsil text,
  ADD COLUMN IF NOT EXISTS school_district text,
  ADD COLUMN IF NOT EXISTS school_state text,
  ADD COLUMN IF NOT EXISTS school_pin_code text;

ALTER TABLE public.centers
  ADD COLUMN IF NOT EXISTS owner_village text,
  ADD COLUMN IF NOT EXISTS owner_block text,
  ADD COLUMN IF NOT EXISTS owner_tahsil text,
  ADD COLUMN IF NOT EXISTS owner_district text,
  ADD COLUMN IF NOT EXISTS owner_state text,
  ADD COLUMN IF NOT EXISTS owner_pin_code text;
