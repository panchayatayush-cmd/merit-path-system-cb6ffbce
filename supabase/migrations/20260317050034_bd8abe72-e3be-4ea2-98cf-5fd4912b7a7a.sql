DROP POLICY "Users can insert own role as student" ON public.user_roles;

CREATE POLICY "Users can insert own role as student or center"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND role IN ('student'::app_role, 'center'::app_role));