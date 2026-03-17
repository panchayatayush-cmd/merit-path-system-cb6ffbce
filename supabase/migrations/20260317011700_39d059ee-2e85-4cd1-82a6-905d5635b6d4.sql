-- Remove admin access from questions table
DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;

-- Only super_admin can manage questions
CREATE POLICY "Super admin can manage questions"
ON public.questions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));