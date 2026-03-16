
-- Create storage bucket for student photos
INSERT INTO storage.buckets (id, name, public) VALUES ('student-photos', 'student-photos', true);

-- Allow authenticated users to upload their own photos
CREATE POLICY "Users can upload own photo" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'student-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own photos
CREATE POLICY "Users can update own photo" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'student-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access to photos
CREATE POLICY "Public can view photos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'student-photos');

-- Allow users to delete own photos
CREATE POLICY "Users can delete own photo" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'student-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
