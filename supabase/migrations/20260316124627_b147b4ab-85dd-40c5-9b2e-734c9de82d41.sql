
-- Classes table
CREATE TABLE public.syllabus_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_name TEXT NOT NULL UNIQUE,
  class_number INTEGER NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.syllabus_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can manage classes" ON public.syllabus_classes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Students can view active classes" ON public.syllabus_classes
  FOR SELECT TO authenticated
  USING (is_active = true AND (public.has_role(auth.uid(), 'student') OR public.has_role(auth.uid(), 'admin')));

-- Subjects table
CREATE TABLE public.syllabus_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.syllabus_classes(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_id, subject_name)
);

ALTER TABLE public.syllabus_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can manage subjects" ON public.syllabus_subjects
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Students can view active subjects" ON public.syllabus_subjects
  FOR SELECT TO authenticated
  USING (is_active = true AND (public.has_role(auth.uid(), 'student') OR public.has_role(auth.uid(), 'admin')));

-- Topics table
CREATE TABLE public.syllabus_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.syllabus_classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.syllabus_subjects(id) ON DELETE CASCADE,
  topic_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'disabled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(subject_id, topic_name)
);

ALTER TABLE public.syllabus_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can manage topics" ON public.syllabus_topics
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Students can view approved topics" ON public.syllabus_topics
  FOR SELECT TO authenticated
  USING (status = 'approved' AND (public.has_role(auth.uid(), 'student') OR public.has_role(auth.uid(), 'admin')));

-- AI Generated Questions table (linked to syllabus)
CREATE TABLE public.ai_generated_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.syllabus_classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.syllabus_subjects(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.syllabus_topics(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'mcq' CHECK (question_type IN ('mcq', 'true_false')),
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  options JSONB NOT NULL DEFAULT '[]',
  correct_option INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 1,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  generated_by TEXT NOT NULL DEFAULT 'ai',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_generated_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can manage AI questions" ON public.ai_generated_questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
