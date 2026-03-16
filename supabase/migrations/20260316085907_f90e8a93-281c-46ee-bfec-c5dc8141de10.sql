
-- Allow centers to view profiles of students registered under their center_code
CREATE POLICY "Centers can view own students profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.centers
    WHERE centers.user_id = auth.uid()
      AND centers.center_code = profiles.center_code
  )
);
