-- Device-scoped treatment course and dose confirmations for Sundus.
CREATE TABLE IF NOT EXISTS public."متابعه كورس سندس العلاج" (
  device_id UUID PRIMARY KEY REFERENCES public.sonds_device_sync(device_id) ON DELETE CASCADE,
  course_start_date DATE NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 90 CHECK (duration_days BETWEEN 1 AND 90),
  reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  doses JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(doses) = 'array'),
  taken_by_date JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(taken_by_date) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sundus_treatment_course_updated_at_idx
  ON public."متابعه كورس سندس العلاج" (updated_at DESC);

COMMENT ON TABLE public."متابعه كورس سندس العلاج" IS
  'Sundus three-month treatment course, dose schedule, reminders and daily confirmations.';
