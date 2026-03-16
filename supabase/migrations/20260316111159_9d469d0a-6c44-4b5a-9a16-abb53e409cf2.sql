
-- Create scholarship_winners table
CREATE TABLE public.scholarship_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  rank integer NOT NULL,
  category text NOT NULL,
  prize_amount numeric NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  exam_score integer DEFAULT 0,
  referral_bonus integer DEFAULT 0,
  final_score integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scholarship_winners ENABLE ROW LEVEL SECURITY;

-- Students can view own records
CREATE POLICY "Students can view own scholarship"
ON public.scholarship_winners FOR SELECT
USING (auth.uid() = student_id);

-- Admins and super admins can view all
CREATE POLICY "Admins can view all scholarship winners"
ON public.scholarship_winners FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Super admins can manage
CREATE POLICY "Super admins can manage scholarship winners"
ON public.scholarship_winners FOR ALL
USING (has_role(auth.uid(), 'super_admin'));
