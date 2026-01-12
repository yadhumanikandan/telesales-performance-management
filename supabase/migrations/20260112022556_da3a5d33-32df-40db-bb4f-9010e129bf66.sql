
-- Create table for coach chat conversations
CREATE TABLE public.coach_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for coach chat messages
CREATE TABLE public.coach_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.coach_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coach_conversations - agents can only see their own
CREATE POLICY "Agents can view own conversations"
ON public.coach_conversations
FOR SELECT
USING (agent_id = auth.uid());

CREATE POLICY "Agents can create own conversations"
ON public.coach_conversations
FOR INSERT
WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update own conversations"
ON public.coach_conversations
FOR UPDATE
USING (agent_id = auth.uid());

CREATE POLICY "Agents can delete own conversations"
ON public.coach_conversations
FOR DELETE
USING (agent_id = auth.uid());

-- RLS Policies for coach_messages - through conversation ownership
CREATE POLICY "Agents can view messages in own conversations"
ON public.coach_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.coach_conversations c
    WHERE c.id = coach_messages.conversation_id
    AND c.agent_id = auth.uid()
  )
);

CREATE POLICY "Agents can insert messages in own conversations"
ON public.coach_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.coach_conversations c
    WHERE c.id = coach_messages.conversation_id
    AND c.agent_id = auth.uid()
  )
);

-- Indexes for performance
CREATE INDEX idx_coach_conversations_agent_id ON public.coach_conversations(agent_id);
CREATE INDEX idx_coach_conversations_updated_at ON public.coach_conversations(updated_at DESC);
CREATE INDEX idx_coach_messages_conversation_id ON public.coach_messages(conversation_id);
CREATE INDEX idx_coach_messages_created_at ON public.coach_messages(created_at);

-- Trigger to update updated_at on conversations
CREATE TRIGGER update_coach_conversations_updated_at
BEFORE UPDATE ON public.coach_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
