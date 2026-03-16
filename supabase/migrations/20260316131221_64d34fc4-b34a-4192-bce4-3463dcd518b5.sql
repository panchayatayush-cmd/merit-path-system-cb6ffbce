
-- Create syllabus_pdfs table to store PDF uploads and extracted text per class
CREATE TABLE public.syllabus_pdfs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.syllabus_classes(id) ON DELETE CASCADE,
  pdf_file_path TEXT NOT NULL,
  extracted_text TEXT,
  file_name TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.syllabus_pdfs ENABLE ROW LEVEL SECURITY;

-- Only super admin can manage syllabus PDFs
CREATE POLICY "Super admin can manage syllabus pdfs"
  ON public.syllabus_pdfs
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Create storage bucket for syllabus PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('syllabus-pdfs', 'syllabus-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: only super admin can upload/manage
CREATE POLICY "Super admin can upload syllabus pdfs"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'syllabus-pdfs' AND has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (bucket_id = 'syllabus-pdfs' AND has_role(auth.uid(), 'super_admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_syllabus_pdfs_updated_at
  BEFORE UPDATE ON public.syllabus_pdfs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
