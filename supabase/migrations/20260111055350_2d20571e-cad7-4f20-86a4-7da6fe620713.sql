-- Create scheduled_reports table
CREATE TABLE public.scheduled_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL DEFAULT 'weekly_performance',
  frequency TEXT NOT NULL DEFAULT 'weekly',
  schedule_day INTEGER NOT NULL DEFAULT 1, -- 0=Sunday, 1=Monday, etc.
  schedule_time TIME NOT NULL DEFAULT '08:00:00',
  recipients JSONB NOT NULL DEFAULT '[]', -- Array of user IDs or emails
  include_team_summary BOOLEAN NOT NULL DEFAULT true,
  include_agent_breakdown BOOLEAN NOT NULL DEFAULT true,
  include_alerts_summary BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

-- Only admins and supervisors can view/manage scheduled reports
CREATE POLICY "Admins can manage scheduled reports"
ON public.scheduled_reports
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'operations_head', 'supervisor')
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_scheduled_reports_updated_at
BEFORE UPDATE ON public.scheduled_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();