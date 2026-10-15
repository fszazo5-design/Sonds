-- Store custom game images outside the JSON sync snapshot.
-- The app state keeps only the Cloudflare Worker URL returned after upload.
CREATE TABLE IF NOT EXISTS public.sonds_game_images (
  image_id TEXT PRIMARY KEY CHECK (image_id ~ '^[a-f0-9]{64}$'),
  device_id UUID NOT NULL REFERENCES public.sonds_device_sync(device_id) ON DELETE CASCADE,
  game_id TEXT NOT NULL CHECK (char_length(game_id) BETWEEN 1 AND 120),
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/webp', 'image/jpeg', 'image/png')),
  byte_size INTEGER NOT NULL CHECK (byte_size > 0 AND byte_size <= 430080),
  sha256 TEXT NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  image_bytes BYTEA NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (device_id, game_id),
  CHECK (octet_length(image_bytes) = byte_size)
);
CREATE INDEX IF NOT EXISTS sonds_game_images_device_idx
  ON public.sonds_game_images (device_id, updated_at DESC);
COMMENT ON TABLE public.sonds_game_images IS 'Custom game images stored in Neon and served through the Sonds Cloudflare Worker.';
