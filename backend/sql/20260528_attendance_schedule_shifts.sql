ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS schedule_mode TEXT,
  ADD COLUMN IF NOT EXISTS selected_shift_id UUID,
  ADD COLUMN IF NOT EXISTS schedule_status TEXT,
  ADD COLUMN IF NOT EXISTS late_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS checkout_reason TEXT,
  ADD COLUMN IF NOT EXISTS checkout_note TEXT;

CREATE TABLE IF NOT EXISTS public.work_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  check_in_start TIME NOT NULL,
  check_in_end TIME NOT NULL,
  late_after TIME NOT NULL,
  check_out_start TIME NOT NULL,
  check_out_end TIME NOT NULL,
  crosses_midnight BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_shifts_active
  ON public.work_shifts (is_active, name);

ALTER TABLE public.attendance_records
  DROP CONSTRAINT IF EXISTS attendance_records_selected_shift_id_fkey;

ALTER TABLE public.attendance_records
  ADD CONSTRAINT attendance_records_selected_shift_id_fkey
  FOREIGN KEY (selected_shift_id)
  REFERENCES public.work_shifts(id)
  ON DELETE SET NULL;

ALTER TABLE public.work_shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read active work shifts"
  ON public.work_shifts;

CREATE POLICY "Authenticated users can read active work shifts"
  ON public.work_shifts
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE OR REPLACE FUNCTION public.update_work_shifts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS work_shifts_updated_at
  ON public.work_shifts;

CREATE TRIGGER work_shifts_updated_at
  BEFORE UPDATE ON public.work_shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_work_shifts_updated_at();
