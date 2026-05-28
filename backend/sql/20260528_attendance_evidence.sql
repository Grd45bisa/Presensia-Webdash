ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS evidence_photo_path TEXT,
  ADD COLUMN IF NOT EXISTS evidence_photo_in_path TEXT,
  ADD COLUMN IF NOT EXISTS evidence_photo_out_path TEXT,
  ADD COLUMN IF NOT EXISTS face_similarity NUMERIC,
  ADD COLUMN IF NOT EXISTS face_threshold NUMERIC;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'attendance-evidence',
  'attendance-evidence',
  false,
  1048576,
  ARRAY['image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Employees can upload own attendance evidence"
  ON storage.objects;

CREATE POLICY "Employees can upload own attendance evidence"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'attendance-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Employees can read own attendance evidence"
  ON storage.objects;

CREATE POLICY "Employees can read own attendance evidence"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'attendance-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
