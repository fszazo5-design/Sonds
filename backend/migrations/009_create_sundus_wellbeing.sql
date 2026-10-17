-- Private wellbeing journal for the Ana Sundus page.
CREATE TABLE IF NOT EXISTS public.sonds_sundus_entries (
  id BIGSERIAL PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES public.sonds_device_sync(device_id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('mood', 'gratitude')),
  mood_key TEXT,
  mood_score SMALLINT CHECK (mood_score IS NULL OR mood_score BETWEEN 1 AND 5),
  content TEXT NOT NULL DEFAULT '' CHECK (char_length(content) BETWEEN 0 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sonds_sundus_entries_device_created_idx
  ON public.sonds_sundus_entries (device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sonds_sundus_entries_device_type_idx
  ON public.sonds_sundus_entries (device_id, entry_type, created_at DESC);
