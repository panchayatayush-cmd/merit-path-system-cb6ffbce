
-- Allow super admins to update any wallet (for revenue distribution)
CREATE POLICY "Super admins can update wallets" ON public.wallets
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
