-- Create goals table for agent target tracking
CREATE TABLE public.agent_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('weekly', 'monthly')),
  metric TEXT NOT NULL CHECK (metric IN ('calls', 'interested', 'leads', 'conversion')),
  target_value INTEGER NOT NULL CHECK (target_value > 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Enable Row Level Security
ALTER TABLE public.agent_goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own goals"
ON public.agent_goals
FOR SELECT
USING (auth.uid() = agent_id);

CREATE POLICY "Users can create their own goals"
ON public.agent_goals
FOR INSERT
WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Users can update their own goals"
ON public.agent_goals
FOR UPDATE
USING (auth.uid() = agent_id);

CREATE POLICY "Users can delete their own goals"
ON public.agent_goals
FOR DELETE
USING (auth.uid() = agent_id);

-- Supervisors can view their team's goals
CREATE POLICY "Supervisors can view team goals"
ON public.agent_goals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = agent_goals.agent_id
    AND p.supervisor_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_agent_goals_updated_at
BEFORE UPDATE ON public.agent_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient queries
CREATE INDEX idx_agent_goals_agent_id ON public.agent_goals(agent_id);
CREATE INDEX idx_agent_goals_active ON public.agent_goals(is_active, end_date);