CREATE TABLE IF NOT EXISTS public.sonds_video_library (
  video_id TEXT PRIMARY KEY CHECK (video_id ~ '^[a-z0-9-]{1,64}$'),
  title TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'video/mp4' CHECK (mime_type = 'video/mp4'),
  byte_size BIGINT NOT NULL CHECK (byte_size > 0 AND byte_size <= 10485760),
  sha256 TEXT NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  duration_seconds NUMERIC(8,3) NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  sort_order SMALLINT NOT NULL DEFAULT 0,
  video_bytes BYTEA NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (octet_length(video_bytes) = byte_size)
);

CREATE INDEX IF NOT EXISTS sonds_video_library_active_order_idx
  ON public.sonds_video_library (sort_order, video_id)
  WHERE is_active = TRUE;
