
-- Exam schedule configuration (super admin controls)
CREATE TABLE public.exam_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.syllabus_classes(id) ON DELETE CASCADE,
  exam_day INTEGER NOT NULL DEFAULT 5,
  exam_duration_minutes INTEGER NOT NULL DEFAULT 60,
  num_questions INTEGER NOT NULL DEFAULT 30,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'mixed')),
  question_type TEXT NOT NULL DEFAULT 'mcq' CHECK (question_type IN ('mcq', 'true_false', 'mixed')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_id)
);

ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can manage exam schedules" ON public.exam_schedules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Scheduled exams (auto-generated monthly)
CREATE TABLE public.scheduled_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.exam_schedules(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.syllabus_classes(id) ON DELETE CASCADE,
  exam_date DATE NOT NULL,
  exam_duration_minutes INTEGER NOT NULL DEFAULT 60,
  total_questions INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_id, exam_date)
);

ALTER TABLE public.scheduled_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can manage scheduled exams" ON public.scheduled_exams
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Students can view own class scheduled exams" ON public.scheduled_exams
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'student') AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.syllabus_classes sc ON sc.class_number = p.class
      WHERE p.user_id = auth.uid() AND sc.id = scheduled_exams.class_id
    )
  );

-- Scheduled exam questions (linking approved AI questions to scheduled exams)
CREATE TABLE public.scheduled_exam_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_exam_id UUID NOT NULL REFERENCES public.scheduled_exams(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.ai_generated_questions(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(scheduled_exam_id, question_id)
);

ALTER TABLE public.scheduled_exam_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can manage scheduled exam questions" ON public.scheduled_exam_questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Students can view own exam questions" ON public.scheduled_exam_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.scheduled_exams se
      JOIN public.profiles p ON p.user_id = auth.uid()
      JOIN public.syllabus_classes sc ON sc.class_number = p.class
      WHERE se.id = scheduled_exam_questions.scheduled_exam_id
      AND sc.id = se.class_id
      AND se.status = 'active'
    )
  );
