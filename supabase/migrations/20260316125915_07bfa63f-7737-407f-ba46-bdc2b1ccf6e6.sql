
-- Notification templates (Super Admin manages)
CREATE TABLE public.notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  days_before_exam INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can manage notification templates" ON public.notification_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Insert default templates
INSERT INTO public.notification_templates (template_name, title, message, days_before_exam) VALUES
  ('exam_announcement', '📢 Exam Announcement', 'Your monthly scholarship exam is scheduled on {{exam_date}}. Start preparing now!', 5),
  ('reminder_day3', '📝 Exam Reminder', 'Only 3 days left for your scholarship exam on {{exam_date}}. Keep revising!', 3),
  ('reminder_day2', '⏰ Exam Reminder', '2 days to go! Your scholarship exam is on {{exam_date}}. Stay focused!', 2),
  ('final_reminder', '🔔 Final Reminder', 'Tomorrow is your scholarship exam ({{exam_date}})! Get a good night''s sleep and be ready.', 1),
  ('exam_today', '🚀 Exam Today!', 'Your scholarship exam is TODAY ({{exam_date}})! Login now to start your exam. Best of luck!', 0);

-- Notifications (sent to students)
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_id UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL,
  scheduled_exam_id UUID REFERENCES public.scheduled_exams(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'whatsapp')),
  delivery_status TEXT NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can manage all notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Index for fast student notification queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id, is_read, sent_at DESC);
CREATE INDEX idx_notifications_exam ON public.notifications(scheduled_exam_id, template_id);
