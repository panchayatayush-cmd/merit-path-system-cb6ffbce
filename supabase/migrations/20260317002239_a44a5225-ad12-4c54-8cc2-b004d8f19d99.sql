
-- Exam sessions table to store randomized question/option orders per student
CREATE TABLE public.exam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  attempt_id uuid REFERENCES public.exam_attempts(id) ON DELETE CASCADE NOT NULL,
  question_order jsonb NOT NULL DEFAULT '[]'::jsonb,
  option_orders jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, attempt_id)
);

ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

-- Students can view their own sessions
CREATE POLICY "Students can view own exam sessions"
  ON public.exam_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

-- Students can create their own sessions
CREATE POLICY "Students can insert own exam sessions"
  ON public.exam_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

-- Super admins can view all
CREATE POLICY "Super admins can view all exam sessions"
  ON public.exam_sessions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));
