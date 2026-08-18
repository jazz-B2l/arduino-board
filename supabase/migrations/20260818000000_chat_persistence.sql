-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New Chat',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])),
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at ASC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversations RLS policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can select their own conversations') THEN
    CREATE POLICY "Users can select their own conversations" 
      ON public.conversations FOR SELECT 
      TO authenticated 
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own conversations') THEN
    CREATE POLICY "Users can insert their own conversations" 
      ON public.conversations FOR INSERT 
      TO authenticated 
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own conversations') THEN
    CREATE POLICY "Users can update their own conversations" 
      ON public.conversations FOR UPDATE 
      TO authenticated 
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own conversations') THEN
    CREATE POLICY "Users can delete their own conversations" 
      ON public.conversations FOR DELETE 
      TO authenticated 
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Messages RLS policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can select messages of their own conversations') THEN
    CREATE POLICY "Users can select messages of their own conversations" 
      ON public.messages FOR SELECT 
      TO authenticated 
      USING (
        exists (
          select 1 from public.conversations 
          where conversations.id = messages.conversation_id 
            and conversations.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert messages into their own conversations') THEN
    CREATE POLICY "Users can insert messages into their own conversations" 
      ON public.messages FOR INSERT 
      TO authenticated 
      WITH CHECK (
        exists (
          select 1 from public.conversations 
          where conversations.id = messages.conversation_id 
            and conversations.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete messages of their own conversations') THEN
    CREATE POLICY "Users can delete messages of their own conversations" 
      ON public.messages FOR DELETE 
      TO authenticated 
      USING (
        exists (
          select 1 from public.conversations 
          where conversations.id = messages.conversation_id 
            and conversations.user_id = auth.uid()
        )
      );
  END IF;
END $$;
