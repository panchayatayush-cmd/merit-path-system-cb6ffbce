
-- Add referral_code column to profiles (unique code each student gets for referring others)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
-- Add referred_by column to profiles (referral_code of the student who referred them)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by text;

-- Generate unique referral codes for existing students
UPDATE public.profiles SET referral_code = 'REF' || SUBSTRING(id::text, 1, 6) || FLOOR(RANDOM() * 1000)::int WHERE referral_code IS NULL;

-- Create commissions table
CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  referral_code text,
  center_code text,
  payment_id uuid REFERENCES public.payment_orders(id),
  role text NOT NULL,
  commission_amount numeric NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for commissions
CREATE POLICY "Users can view own commissions" ON public.commissions FOR SELECT USING (
  student_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.centers WHERE centers.user_id = auth.uid() AND centers.center_code = commissions.center_code)
);

CREATE POLICY "Admins can view all commissions" ON public.commissions FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Function to generate unique referral code for new students
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE code TEXT; exists_already BOOLEAN;
BEGIN
  LOOP
    code := 'REF' || FLOOR(100000 + RANDOM() * 900000)::int;
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;
