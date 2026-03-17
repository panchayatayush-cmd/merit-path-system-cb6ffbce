
-- Create center_bank_details table
CREATE TABLE public.center_bank_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_holder_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  ifsc_code TEXT NOT NULL,
  branch_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.center_bank_details ENABLE ROW LEVEL SECURITY;

-- Centers can manage own bank details
CREATE POLICY "Centers can insert own bank details"
  ON public.center_bank_details FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Centers can update own bank details"
  ON public.center_bank_details FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Centers can view own bank details"
  ON public.center_bank_details FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Super admin can view all bank details
CREATE POLICY "Super admins can view all bank details"
  ON public.center_bank_details FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_center_bank_details_updated_at
  BEFORE UPDATE ON public.center_bank_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
