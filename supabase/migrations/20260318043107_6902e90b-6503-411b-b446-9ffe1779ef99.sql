
-- Job applications table
CREATE TABLE public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  father_name text NOT NULL,
  contact_number text NOT NULL,
  alternate_number text,
  email text NOT NULL,
  state text NOT NULL,
  district text NOT NULL,
  block text NOT NULL,
  village text NOT NULL,
  full_address text NOT NULL,
  pin_code text NOT NULL,
  designation text NOT NULL,
  work_experience text,
  date_of_birth date NOT NULL,
  photo_url text,
  payment_status text NOT NULL DEFAULT 'pending',
  razorpay_order_id text,
  razorpay_payment_id text,
  amount numeric NOT NULL DEFAULT 250,
  terms_accepted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can manage job applications"
  ON public.job_applications FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Anyone can insert job applications"
  ON public.job_applications FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Leaderboard table for manual top 20
CREATE TABLE public.leaderboard_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  rank integer NOT NULL,
  class integer,
  state text,
  district text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view leaderboard"
  ON public.leaderboard_entries FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Super admin can manage leaderboard"
  ON public.leaderboard_entries FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
