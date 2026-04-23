-- Migration: create conversations table for persistent chat history

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'default',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS conversations_user_title_uidx
  ON public.conversations (user_id, title);

CREATE INDEX IF NOT EXISTS conversations_user_id_idx
  ON public.conversations (user_id);

CREATE INDEX IF NOT EXISTS conversations_updated_at_idx
  ON public.conversations (updated_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversations'
      AND policyname = 'Service role full access conversations'
  ) THEN
    CREATE POLICY "Service role full access conversations"
      ON public.conversations
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
