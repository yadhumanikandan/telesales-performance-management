import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, isWithinInterval, parseISO } from 'date-fns';
import { toast } from 'sonner';

export type GoalType = 'weekly' | 'monthly';
export type GoalMetric = 'calls' | 'interested' | 'leads' | 'conversion';

export interface Goal {
  id: string;
  agent_id: string;
  goal_type: GoalType;
  metric: GoalMetric;
  target_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GoalWithProgress extends Goal {
  currentValue: number;
  progressPercentage: number;
  isCompleted: boolean;
  daysRemaining: number;
}

export interface CreateGoalInput {
  goal_type: GoalType;
  metric: GoalMetric;
  target_value: number;
}

const getDateRange = (goalType: GoalType): { start: Date; end: Date } => {
  const today = new Date();
  if (goalType === 'weekly') {
    return {
      start: startOfWeek(today, { weekStartsOn: 1 }),
      end: endOfWeek(today, { weekStartsOn: 1 }),
    };
  }
  return {
    start: startOfMonth(today),
    end: endOfMonth(today),
  };
};

export const useAgentGoals = (agentId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const targetUserId = agentId || user?.id;

  // Fetch goals with progress
  const { data: goals, isLoading } = useQuery({
    queryKey: ['agent-goals', targetUserId],
    queryFn: async (): Promise<GoalWithProgress[]> => {
      if (!targetUserId) throw new Error('No user');

      // Fetch goals
      const { data: goalsData, error } = await supabase
        .from('agent_goals')
        .select('*')
        .eq('agent_id', targetUserId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const today = new Date();
      const goalsWithProgress: GoalWithProgress[] = [];

      for (const goal of goalsData || []) {
        const startDate = parseISO(goal.start_date);
        const endDate = parseISO(goal.end_date);
        
        // Check if goal is within current period
        const isCurrentPeriod = isWithinInterval(today, { start: startDate, end: endDate });
        
        if (!isCurrentPeriod) continue;

        // Fetch current progress based on metric
        let currentValue = 0;

        if (goal.metric === 'calls' || goal.metric === 'interested') {
          const { data: feedback } = await supabase
            .from('call_feedback')
            .select('feedback_status')
            .eq('agent_id', targetUserId)
            .gte('call_timestamp', startDate.toISOString())
            .lte('call_timestamp', endDate.toISOString());

          if (goal.metric === 'calls') {
            currentValue = feedback?.length || 0;
          } else {
            currentValue = feedback?.filter(f => f.feedback_status === 'interested').length || 0;
          }
        } else if (goal.metric === 'leads') {
          const { data: leads } = await supabase
            .from('leads')
            .select('id')
            .eq('agent_id', targetUserId)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

          currentValue = leads?.length || 0;
        } else if (goal.metric === 'conversion') {
          const { data: feedback } = await supabase
            .from('call_feedback')
            .select('feedback_status')
            .eq('agent_id', targetUserId)
            .gte('call_timestamp', startDate.toISOString())
            .lte('call_timestamp', endDate.toISOString());

          const totalCalls = feedback?.length || 0;
          const interested = feedback?.filter(f => f.feedback_status === 'interested').length || 0;
          currentValue = totalCalls > 0 ? Math.round((interested / totalCalls) * 100) : 0;
        }

        const progressPercentage = Math.min(Math.round((currentValue / goal.target_value) * 100), 100);
        const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

        goalsWithProgress.push({
          ...goal,
          goal_type: goal.goal_type as GoalType,
          metric: goal.metric as GoalMetric,
          currentValue,
          progressPercentage,
          isCompleted: currentValue >= goal.target_value,
          daysRemaining,
        });
      }

      return goalsWithProgress;
    },
    enabled: !!targetUserId,
  });

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      if (!targetUserId) throw new Error('No user');

      const { start, end } = getDateRange(input.goal_type);

      const { data, error } = await supabase
        .from('agent_goals')
        .insert({
          agent_id: targetUserId,
          goal_type: input.goal_type,
          metric: input.metric,
          target_value: input.target_value,
          start_date: format(start, 'yyyy-MM-dd'),
          end_date: format(end, 'yyyy-MM-dd'),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-goals', targetUserId] });
      toast.success('Goal created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create goal: ' + error.message);
    },
  });

  // Update goal mutation
  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, target_value }: { id: string; target_value: number }) => {
      const { data, error } = await supabase
        .from('agent_goals')
        .update({ target_value })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-goals', targetUserId] });
      toast.success('Goal updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update goal: ' + error.message);
    },
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agent_goals')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-goals', targetUserId] });
      toast.success('Goal removed');
    },
    onError: (error) => {
      toast.error('Failed to remove goal: ' + error.message);
    },
  });

  return {
    goals: goals || [],
    isLoading,
    createGoal: createGoalMutation.mutate,
    updateGoal: updateGoalMutation.mutate,
    deleteGoal: deleteGoalMutation.mutate,
    isCreating: createGoalMutation.isPending,
  };
};
