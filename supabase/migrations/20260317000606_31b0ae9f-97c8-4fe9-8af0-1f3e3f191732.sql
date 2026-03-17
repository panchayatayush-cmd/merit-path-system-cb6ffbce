
-- Add admin_id to centers to track which admin registered the center
ALTER TABLE public.centers ADD COLUMN IF NOT EXISTS admin_id uuid;

-- Comment for clarity
COMMENT ON COLUMN public.centers.admin_id IS 'The admin user_id whose center code was used during center registration';
