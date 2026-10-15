CREATE TABLE IF NOT EXISTS public.sonds_audio_assets (
  asset_key TEXT PRIMARY KEY CHECK (asset_key ~ '^[a-z0-9_-]{1,64}$'),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  cloudinary_public_id TEXT NOT NULL UNIQUE,
  cloudinary_url TEXT NOT NULL CHECK (cloudinary_url LIKE 'https://res.cloudinary.com/%'),
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'audio/mpeg' CHECK (mime_type = 'audio/mpeg'),
  byte_size BIGINT NOT NULL CHECK (byte_size > 0 AND byte_size <= 2097152),
  sha256 TEXT NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  duration_seconds NUMERIC(8,3) NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0 AND duration_seconds <= 60),
  audio_bytes BYTEA NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (octet_length(audio_bytes) = byte_size)
);
