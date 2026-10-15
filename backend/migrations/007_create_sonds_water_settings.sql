-- Complete structured water-page settings, alongside daily cup and weight logs.
CREATE TABLE IF NOT EXISTS public.sonds_water_settings (
  device_id UUID PRIMARY KEY REFERENCES public.sonds_device_sync(device_id) ON DELETE CASCADE,
  daily_goal SMALLINT NOT NULL DEFAULT 8 CHECK (daily_goal BETWEEN 4 AND 16),
  reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_times JSONB NOT NULL DEFAULT '["10:00", "13:00", "16:00", "19:00"]'::jsonb
    CHECK (jsonb_typeof(reminder_times) = 'array'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.sonds_water_settings IS 'Complete water-page settings per installation, including goal and daily reminder times.';
COMMENT ON TABLE public.sonds_water_daily IS 'Daily water cup log keyed by local calendar date.';
COMMENT ON TABLE public.sonds_water_weights IS 'Daily weight log keyed by local calendar date.';
CREATE INDEX IF NOT EXISTS sonds_water_daily_device_date_idx
  ON public.sonds_water_daily (device_id, day_date DESC);
CREATE INDEX IF NOT EXISTS sonds_water_weights_device_date_idx
  ON public.sonds_water_weights (device_id, day_date DESC);
