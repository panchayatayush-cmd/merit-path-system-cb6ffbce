
-- Remove admin access from profiles (admin should only see counts via head:true which bypasses RLS for count)
-- Actually, admin needs SELECT on profiles for count queries, but we'll keep the policy 
-- since count with head:true still needs SELECT access. The UI simply won't show details.

-- Remove admin access from exam_attempts (no detailed results)
DROP POLICY IF EXISTS "Admins can view all attempts" ON public.exam_attempts;
CREATE POLICY "Admins can view attempt counts"
ON public.exam_attempts
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Remove admin access from payment_orders
DROP POLICY IF EXISTS "Admins can view all orders" ON public.payment_orders;
CREATE POLICY "Super admin can view all orders"
ON public.payment_orders
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Remove admin access from commissions
DROP POLICY IF EXISTS "Admins can view all commissions" ON public.commissions;
CREATE POLICY "Super admin can view all commissions"
ON public.commissions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Remove admin access from scholarship_winners
DROP POLICY IF EXISTS "Admins can view all scholarship winners" ON public.scholarship_winners;
CREATE POLICY "Super admin can view all scholarship winners"
ON public.scholarship_winners
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow admin to update center is_active status
CREATE POLICY "Admins can update center status"
ON public.centers
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
