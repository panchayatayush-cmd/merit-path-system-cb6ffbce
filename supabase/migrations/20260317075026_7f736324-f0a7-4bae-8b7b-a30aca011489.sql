
-- Add status column to centers table for approval workflow
ALTER TABLE public.centers ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';

-- Add owner_name column for admin-created centers
ALTER TABLE public.centers ADD COLUMN IF NOT EXISTS owner_name text;

-- Update existing centers to 'approved' status
UPDATE public.centers SET status = 'approved' WHERE status IS NULL OR status = 'approved';

-- Add RLS policy: Admins can insert centers (create center requests)
CREATE POLICY "Admins can insert centers" ON public.centers
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Add RLS policy: Super admins can update any center (for approval)
CREATE POLICY "Super admins can manage centers" ON public.centers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
