-- Idempotent schema setup for Sonds device-scoped cloud sync.
-- This migration creates one new table and does not alter or delete existing tables.
CREATE TABLE IF NOT EXISTS public.sonds_device_sync (
  device_id UUID PRIMARY KEY,
  secret_hash TEXT NOT NULL CHECK (secret_hash ~ '^[a-f0-9]{64}$'),
  state JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(state) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sonds_device_sync_updated_at_idx
  ON public.sonds_device_sync (updated_at DESC);

COMMENT ON TABLE public.sonds_device_sync IS
  'Device-scoped Sonds app state. API authorizes access with a locally held high-entropy device secret.';
COMMENT ON COLUMN public.sonds_device_sync.secret_hash IS
  'SHA-256 digest of the 256-bit per-installation secret; the raw secret is never stored in Neon.';
