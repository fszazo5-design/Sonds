-- Knowledge base and device-scoped conversation history for the Sundus assistant.
-- Knowledge rows may contain extracted PDF text or ordinary structured notes.
CREATE TABLE IF NOT EXISTS public.sonds_assistant_knowledge (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'text',
  source_url TEXT,
  mime_type TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sonds_assistant_knowledge_search_idx
  ON public.sonds_assistant_knowledge USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS sonds_assistant_knowledge_active_idx
  ON public.sonds_assistant_knowledge (is_active, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.sonds_assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.sonds_device_sync(device_id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'محادثة سندس الذكية',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sonds_assistant_conversations_device_idx
  ON public.sonds_assistant_conversations (device_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.sonds_assistant_messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.sonds_assistant_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 12000),
  knowledge_ids BIGINT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sonds_assistant_messages_conversation_idx
  ON public.sonds_assistant_messages (conversation_id, created_at DESC);

COMMENT ON TABLE public.sonds_assistant_knowledge IS
  'Searchable text from PDFs and structured Sundus app knowledge used before the external AI fallback.';
COMMENT ON TABLE public.sonds_assistant_messages IS
  'Device-scoped chat history sent through the authenticated Worker.';
