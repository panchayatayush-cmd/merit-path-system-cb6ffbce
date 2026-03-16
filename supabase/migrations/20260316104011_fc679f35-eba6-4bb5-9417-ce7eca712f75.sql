
-- Create withdrawal_requests table
CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_id uuid NOT NULL REFERENCES public.wallets(id),
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  upi_id text,
  bank_details text,
  admin_note text,
  processed_by uuid,
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Users can view own requests
CREATE POLICY "Users can view own withdrawal requests" ON public.withdrawal_requests
FOR SELECT USING (auth.uid() = user_id);

-- Users can create own requests
CREATE POLICY "Users can create withdrawal requests" ON public.withdrawal_requests
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Super admins can view all
CREATE POLICY "Super admins can view all withdrawal requests" ON public.withdrawal_requests
FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can update (approve/reject)
CREATE POLICY "Super admins can update withdrawal requests" ON public.withdrawal_requests
FOR UPDATE USING (has_role(auth.uid(), 'super_admin'::app_role));
