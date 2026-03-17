
ALTER TABLE public.centers
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS pincode text,
  ADD COLUMN IF NOT EXISTS full_address text,
  ADD COLUMN IF NOT EXISTS center_type text DEFAULT 'school',
  ADD COLUMN IF NOT EXISTS institute_name text,
  ADD COLUMN IF NOT EXISTS established_year integer,
  ADD COLUMN IF NOT EXISTS capacity integer;
