
-- Allow authenticated users to insert their own role during registration
CREATE POLICY "Users can insert own role" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to create their own wallet during registration
CREATE POLICY "Users can insert own wallet" ON public.wallets
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
