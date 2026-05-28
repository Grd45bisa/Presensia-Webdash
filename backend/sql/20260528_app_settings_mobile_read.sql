CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read global app settings"
  ON public.app_settings;

CREATE POLICY "Authenticated users can read global app settings"
  ON public.app_settings
  FOR SELECT
  TO anon, authenticated
  USING (key = 'global');
