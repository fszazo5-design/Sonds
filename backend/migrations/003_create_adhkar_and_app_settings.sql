-- Structured cloud copies for adhkar and app settings.
-- The complete state remains in sonds_device_sync.state and sonds_state_snapshots.
CREATE TABLE IF NOT EXISTS public.sonds_adhkar_settings (
  device_id UUID PRIMARY KEY REFERENCES public.sonds_device_sync(device_id) ON DELETE CASCADE,
  morning_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  morning_time TEXT NOT NULL DEFAULT '07:00',
  evening_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  evening_time TEXT NOT NULL DEFAULT '19:00',
  morning_progress JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(morning_progress) = 'array'),
  evening_progress JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(evening_progress) = 'array'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sonds_app_settings (
  device_id UUID PRIMARY KEY REFERENCES public.sonds_device_sync(device_id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(settings) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.sonds_adhkar_settings IS 'Cloud copy of morning/evening adhkar reminders and completion state.';
COMMENT ON TABLE public.sonds_app_settings IS 'Cloud copy of all small app preferences; full backup remains in sonds_device_sync.state.';
