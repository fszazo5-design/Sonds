-- Normalized Sonds data tables plus an append-only event journal.
-- The original sonds_device_sync JSON snapshot remains the source-compatible backup.
CREATE TABLE IF NOT EXISTS public.sonds_state_snapshots (
  id BIGSERIAL PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES public.sonds_device_sync(device_id) ON DELETE CASCADE,
  state JSONB NOT NULL CHECK (jsonb_typeof(state) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sonds_state_snapshots_device_created_idx
  ON public.sonds_state_snapshots (device_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.sonds_app_events (
  id BIGSERIAL PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES public.sonds_device_sync(device_id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  event_name TEXT NOT NULL CHECK (char_length(event_name) BETWEEN 1 AND 120),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (device_id, event_id)
);
CREATE INDEX IF NOT EXISTS sonds_app_events_device_occurred_idx
  ON public.sonds_app_events (device_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.sonds_meals (
  device_id UUID NOT NULL REFERENCES public.sonds_device_sync(device_id) ON DELETE CASCADE,
  meal_id TEXT NOT NULL,
  title TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  time TEXT NOT NULL DEFAULT '',
  calories INTEGER NOT NULL DEFAULT 0,
  accent TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (device_id, meal_id)
);
CREATE TABLE IF NOT EXISTS public.sonds_meal_completions (
  device_id UUID NOT NULL REFERENCES public.sonds_device_sync(device_id) ON DELETE CASCADE,
  day_date DATE NOT NULL,
  meal_id TEXT NOT NULL,
  completed BOOLEAN NOT NULL,
  message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (device_id, day_date, meal_id)
);
CREATE TABLE IF NOT EXISTS public.sonds_rewards (
  device_id UUID NOT NULL REFERENCES public.sonds_device_sync(device_id) ON DELETE CASCADE,
  reward_id TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (device_id, reward_id)
);
CREATE TABLE IF NOT EXISTS public.sonds_activity_games (
  device_id UUID NOT NULL REFERENCES public.sonds_device_sync(device_id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  instruction TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'reps',
  duration INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '',
  image TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (device_id, game_id)
);
CREATE TABLE IF NOT EXISTS public.sonds_game_reminders (
  device_id UUID NOT NULL REFERENCES public.sonds_device_sync(device_id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_time TEXT NOT NULL DEFAULT '18:00',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (device_id, game_id)
);
CREATE TABLE IF NOT EXISTS public.sonds_activity_sessions (
  id BIGSERIAL PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES public.sonds_device_sync(device_id) ON DELETE CASCADE,
  game_id TEXT,
  reps INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sonds_activity_sessions_device_completed_idx
  ON public.sonds_activity_sessions (device_id, completed_at DESC);
CREATE TABLE IF NOT EXISTS public.sonds_water_daily (
  device_id UUID NOT NULL REFERENCES public.sonds_device_sync(device_id) ON DELETE CASCADE,
  day_date DATE NOT NULL,
  cups INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (device_id, day_date)
);
CREATE TABLE IF NOT EXISTS public.sonds_water_weights (
  device_id UUID NOT NULL REFERENCES public.sonds_device_sync(device_id) ON DELETE CASCADE,
  day_date DATE NOT NULL,
  weight NUMERIC(7,2) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (device_id, day_date)
);
COMMENT ON TABLE public.sonds_app_events IS 'Append-only journal of meaningful Sonds app changes, keyed by installation.';
COMMENT ON TABLE public.sonds_state_snapshots IS 'Historical JSON backups retained alongside the current device snapshot.';
