
-- Create syllabus_lessons table with mandatory PDF
CREATE TABLE public.syllabus_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.syllabus_classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.syllabus_subjects(id) ON DELETE CASCADE,
  lesson_name text NOT NULL,
  pdf_file_path text NOT NULL,
  file_name text,
  extracted_text text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.syllabus_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can manage lessons"
  ON public.syllabus_lessons FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Students can view lessons"
  ON public.syllabus_lessons FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'student'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Add lesson_id to ai_generated_questions
ALTER TABLE public.ai_generated_questions ADD COLUMN lesson_id uuid REFERENCES public.syllabus_lessons(id) ON DELETE SET NULL;
