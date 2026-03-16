-- Add certificate_type to certificates table
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS certificate_type text NOT NULL DEFAULT 'participation';

-- Create function to auto-generate participation certificate on exam completion
CREATE OR REPLACE FUNCTION public.auto_generate_participation_certificate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _profile RECORD;
  _cert_id TEXT;
  _existing_cert UUID;
BEGIN
  -- Only trigger when is_completed changes to true
  IF NEW.is_completed = true AND (OLD.is_completed IS NULL OR OLD.is_completed = false) THEN
    -- Check if participation certificate already exists
    SELECT id INTO _existing_cert FROM certificates 
    WHERE student_id = NEW.student_id AND certificate_type = 'participation' LIMIT 1;
    
    IF _existing_cert IS NOT NULL THEN
      RETURN NEW;
    END IF;

    -- Get profile data
    SELECT full_name, father_name, class INTO _profile 
    FROM profiles WHERE user_id = NEW.student_id LIMIT 1;

    -- Generate certificate ID
    _cert_id := 'PART-' || UPPER(TO_HEX(EXTRACT(EPOCH FROM NOW())::bigint)) || '-' || UPPER(SUBSTR(MD5(RANDOM()::text), 1, 4));

    INSERT INTO certificates (
      student_id, attempt_id, certificate_id, student_name, father_name, 
      class, score, rank, certificate_type, qr_code_data, exam_name
    ) VALUES (
      NEW.student_id, NEW.id, _cert_id,
      COALESCE(_profile.full_name, 'Student'),
      COALESCE(_profile.father_name, ''),
      _profile.class,
      COALESCE(NEW.score, 0),
      0,
      'participation',
      _cert_id,
      'Scholarship Examination 2026'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on exam_attempts
DROP TRIGGER IF EXISTS trg_auto_participation_cert ON exam_attempts;
CREATE TRIGGER trg_auto_participation_cert
  AFTER UPDATE ON exam_attempts
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_participation_certificate();

-- Also handle insert with is_completed = true (edge case)
DROP TRIGGER IF EXISTS trg_auto_participation_cert_insert ON exam_attempts;
CREATE TRIGGER trg_auto_participation_cert_insert
  AFTER INSERT ON exam_attempts
  FOR EACH ROW
  WHEN (NEW.is_completed = true)
  EXECUTE FUNCTION auto_generate_participation_certificate();