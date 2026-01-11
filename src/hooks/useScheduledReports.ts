import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ScheduledReport {
  id: string;
  report_type: string;
  frequency: string;
  schedule_day: number;
  schedule_time: string;
  recipients: string[];
  include_team_summary: boolean;
  include_agent_breakdown: boolean;
  include_alerts_summary: boolean;
  is_active: boolean;
  last_sent_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CreateScheduleInput {
  report_type?: string;
  frequency?: string;
  schedule_day?: number;
  schedule_time?: string;
  recipients?: string[];
  include_team_summary?: boolean;
  include_agent_breakdown?: boolean;
  include_alerts_summary?: boolean;
}

export const useScheduledReports = () => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = userRole === 'admin' || userRole === 'super_admin' || userRole === 'operations_head' || userRole === 'supervisor';

  // Fetch scheduled reports
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['scheduled-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map((schedule: any) => ({
        ...schedule,
        recipients: Array.isArray(schedule.recipients) ? schedule.recipients : [],
      })) as ScheduledReport[];
    },
    enabled: !!user?.id && isAdmin,
  });

  // Create schedule mutation
  const createSchedule = useMutation({
    mutationFn: async (input: CreateScheduleInput) => {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .insert({
          report_type: input.report_type || 'weekly_performance',
          frequency: input.frequency || 'weekly',
          schedule_day: input.schedule_day ?? 1,
          schedule_time: input.schedule_time || '08:00:00',
          recipients: input.recipients || [],
          include_team_summary: input.include_team_summary ?? true,
          include_agent_breakdown: input.include_agent_breakdown ?? true,
          include_alerts_summary: input.include_alerts_summary ?? true,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Report schedule created');
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
    },
    onError: (error) => {
      toast.error('Failed to create schedule: ' + error.message);
    },
  });

  // Update schedule mutation
  const updateSchedule = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScheduledReport> & { id: string }) => {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Schedule updated');
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
    },
    onError: (error) => {
      toast.error('Failed to update schedule: ' + error.message);
    },
  });

  // Delete schedule mutation
  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduled_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Schedule deleted');
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
    },
    onError: (error) => {
      toast.error('Failed to delete schedule: ' + error.message);
    },
  });

  // Generate report now
  const generateReportNow = useMutation({
    mutationFn: async (scheduleId?: string) => {
      const { data, error } = await supabase.functions.invoke('generate-weekly-report', {
        body: { scheduleId, manual: true },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('Report generated successfully');
      return data;
    },
    onError: (error) => {
      toast.error('Failed to generate report: ' + error.message);
    },
  });

  return {
    schedules,
    isLoading,
    isAdmin,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    generateReportNow,
  };
};
