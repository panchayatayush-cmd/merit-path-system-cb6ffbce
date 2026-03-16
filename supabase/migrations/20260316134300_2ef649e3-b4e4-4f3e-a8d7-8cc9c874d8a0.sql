
-- Auto-generate top_rank certificate when a scholarship winner is inserted
CREATE OR REPLACE FUNCTION public.auto_generate_top_rank_certificate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _profile RECORD;
  _cert_id TEXT;
  _attempt RECORD;
  _existing_cert UUID;
BEGIN
  -- Check if top_rank certificate already exists for this student
  SELECT id INTO _existing_cert FROM certificates 
  WHERE student_id = NEW.student_id AND certificate_type = 'top_rank' LIMIT 1;
  
  IF _existing_cert IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get profile data
  SELECT full_name, father_name, class INTO _profile 
  FROM profiles WHERE user_id = NEW.student_id LIMIT 1;

  -- Get latest completed attempt
  SELECT id, score INTO _attempt
  FROM exam_attempts WHERE student_id = NEW.student_id AND is_completed = true
  ORDER BY created_at DESC LIMIT 1;

  -- Generate certificate ID
  _cert_id := 'RANK-' || UPPER(TO_HEX(EXTRACT(EPOCH FROM NOW())::bigint)) || '-' || UPPER(SUBSTR(MD5(RANDOM()::text), 1, 4));

  INSERT INTO certificates (
    student_id, attempt_id, certificate_id, student_name, father_name, 
    class, score, rank, certificate_type, qr_code_data, exam_name, year
  ) VALUES (
    NEW.student_id,
    COALESCE(_attempt.id, gen_random_uuid()),
    _cert_id,
    COALESCE(_profile.full_name, 'Student'),
    COALESCE(_profile.father_name, ''),
    _profile.class,
    COALESCE(NEW.exam_score, _attempt.score, 0),
    NEW.rank,
    'top_rank',
    _cert_id,
    'Scholarship Examination 2026',
    EXTRACT(YEAR FROM NOW())::int
  );

  RETURN NEW;
END;
$$;

-- Create trigger on scholarship_winners
DROP TRIGGER IF EXISTS trg_auto_top_rank_cert ON scholarship_winners;
CREATE TRIGGER trg_auto_top_rank_cert
  AFTER INSERT ON scholarship_winners
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_top_rank_certificate();
