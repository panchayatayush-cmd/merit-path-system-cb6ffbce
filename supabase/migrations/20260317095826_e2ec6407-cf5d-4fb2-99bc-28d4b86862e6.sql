ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_disabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS mobile text;