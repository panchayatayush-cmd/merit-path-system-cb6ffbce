
-- Add admin_code column to user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS admin_code text UNIQUE;

-- Function to generate unique admin code
CREATE OR REPLACE FUNCTION public.generate_admin_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE code TEXT; exists_already BOOLEAN;
BEGIN
  LOOP
    code := 'ADM' || FLOOR(100000 + RANDOM() * 900000)::int;
    SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE admin_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;

-- Function to validate admin code and return admin info
CREATE OR REPLACE FUNCTION public.validate_admin_code(_code text)
RETURNS TABLE(is_valid boolean, admin_name text, admin_user_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    true as is_valid,
    ur.full_name as admin_name,
    ur.user_id as admin_user_id
  FROM public.user_roles ur
  WHERE ur.admin_code = UPPER(_code)
    AND ur.role = 'admin'
    AND ur.is_disabled = false
  LIMIT 1;
$$;
