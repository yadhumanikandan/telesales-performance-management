import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Lightweight hook to check if user has an active session today
 * Used for navigation guards - doesn't need all the session management logic
 */
export function useActivitySessionStatus() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['activity-session-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return { hasStarted: false, isActive: false };
      
      const today = new Date().toISOString().split('T')[0];
      const { data: session, error } = await supabase
        .from('activity_sessions')
        .select('start_time, is_active')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();
      
      if (error) {
        // Don't log transient network errors as they're expected occasionally
        if (!error.message?.includes('Failed to fetch') && !error.message?.includes('aborted')) {
          console.error('Error checking session status:', error);
        }
        throw error; // Throw to trigger retry
      }

      return {
        hasStarted: !!session?.start_time,
        isActive: session?.is_active && !!session?.start_time,
      };
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Check every 30 seconds (reduced from 5s)
    staleTime: 15000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  return {
    hasStarted: data?.hasStarted ?? false,
    isActive: data?.isActive ?? false,
    isLoading,
  };
}
