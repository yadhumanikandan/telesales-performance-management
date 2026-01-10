import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { GoalWithProgress, GoalStreak } from './useAgentGoals';
import { Flame, AlertTriangle } from 'lucide-react';

interface UseStreakRemindersProps {
  goals: GoalWithProgress[];
  streaks: GoalStreak[];
}

export const useStreakReminders = ({ goals, streaks }: UseStreakRemindersProps) => {
  const hasNotified = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (goals.length === 0) return;

    goals.forEach((goal) => {
      // Only check goals that are not yet completed
      if (goal.isCompleted) return;

      // Find matching streak for this goal
      const matchingStreak = streaks.find(
        s => s.metric === goal.metric && s.goalType === goal.goal_type
      );

      // Only notify if there's an active streak at risk
      const hasActiveStreak = matchingStreak && matchingStreak.currentStreak > 0;

      // Create unique notification key
      const notificationKey = `${goal.id}-${goal.daysRemaining}`;
      if (hasNotified.current.has(notificationKey)) return;

      // Define reminder thresholds
      const isWeekly = goal.goal_type === 'weekly';
      const urgentThreshold = isWeekly ? 1 : 3; // 1 day for weekly, 3 days for monthly
      const warningThreshold = isWeekly ? 2 : 7; // 2 days for weekly, 7 days for monthly

      // Check if goal is at risk
      if (goal.daysRemaining <= urgentThreshold && goal.progressPercentage < 100) {
        hasNotified.current.add(notificationKey);

        if (hasActiveStreak) {
          toast.warning(
            `🔥 Streak at risk! Only ${goal.daysRemaining} day${goal.daysRemaining === 1 ? '' : 's'} left to complete your ${goal.goal_type} ${goal.metric} goal and maintain your ${matchingStreak.currentStreak}-${isWeekly ? 'week' : 'month'} streak!`,
            {
              duration: 10000,
              id: `streak-urgent-${goal.id}`,
            }
          );
        } else {
          toast.warning(
            `⏰ ${goal.daysRemaining} day${goal.daysRemaining === 1 ? '' : 's'} left! You need ${goal.target_value - goal.currentValue} more ${goal.metric} to hit your ${goal.goal_type} goal.`,
            {
              duration: 8000,
              id: `goal-urgent-${goal.id}`,
            }
          );
        }
      } else if (goal.daysRemaining <= warningThreshold && goal.progressPercentage < 75) {
        hasNotified.current.add(notificationKey);

        if (hasActiveStreak) {
          toast.info(
            `💪 Keep going! ${goal.daysRemaining} days left to maintain your ${matchingStreak.currentStreak}-${isWeekly ? 'week' : 'month'} ${goal.metric} streak. You're at ${goal.progressPercentage}% of your goal.`,
            {
              duration: 6000,
              id: `streak-warning-${goal.id}`,
            }
          );
        }
      }
    });
  }, [goals, streaks]);

  // Function to get at-risk goals for UI display
  const getAtRiskGoals = () => {
    return goals.filter((goal) => {
      if (goal.isCompleted) return false;

      const isWeekly = goal.goal_type === 'weekly';
      const warningThreshold = isWeekly ? 2 : 7;

      const matchingStreak = streaks.find(
        s => s.metric === goal.metric && s.goalType === goal.goal_type
      );

      return (
        goal.daysRemaining <= warningThreshold &&
        goal.progressPercentage < 100 &&
        matchingStreak &&
        matchingStreak.currentStreak > 0
      );
    });
  };

  return { getAtRiskGoals };
};
