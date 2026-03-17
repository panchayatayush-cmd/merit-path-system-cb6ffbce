
-- Rename table to be generic
ALTER TABLE public.center_bank_details RENAME TO bank_details;

-- Update RLS policies - drop old ones
DROP POLICY "Centers can insert own bank details" ON public.bank_details;
DROP POLICY "Centers can update own bank details" ON public.bank_details;
DROP POLICY "Centers can view own bank details" ON public.bank_details;
DROP POLICY "Super admins can view all bank details" ON public.bank_details;

-- Create new generic policies
CREATE POLICY "Users can insert own bank details"
  ON public.bank_details FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank details"
  ON public.bank_details FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own bank details"
  ON public.bank_details FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all bank details"
  ON public.bank_details FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));
