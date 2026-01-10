import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Flame, Lock, Sparkles, Trophy, Calendar, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoginStreakMilestonesProps {
  currentStreak: number;
  longestStreak: number;
  className?: string;
}

interface LoginMilestone {
  days: number;
  name: string;
  title: string;
  icon: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  color: string;
  reward: string;
}

const LOGIN_MILESTONES: LoginMilestone[] = [
  {
    days: 7,
    name: 'Week Warrior',
    title: '7-Day Streak',
    icon: '🗓️',
    description: 'Logged in for 7 consecutive days',
    rarity: 'rare',
    color: 'blue',
    reward: '+5 XP/day bonus',
  },
  {
    days: 30,
    name: 'Monthly Master',
    title: '30-Day Streak',
    icon: '🌟',
    description: 'Logged in for 30 consecutive days',
    rarity: 'epic',
    color: 'purple',
    reward: '+10 XP/day bonus',
  },
  {
    days: 100,
    name: 'Century Legend',
    title: '100-Day Streak',
    icon: '👑',
    description: 'Logged in for 100 consecutive days',
    rarity: 'legendary',
    color: 'yellow',
    reward: '+25 XP/day bonus',
  },
];

const rarityStyles: Record<string, { bg: string; border: string; text: string; glow: string; gradient: string }> = {
  common: {
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    text: 'text-slate-600 dark:text-slate-400',
    glow: '',
    gradient: 'from-slate-500 to-slate-600',
  },
  rare: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/40',
    text: 'text-blue-600 dark:text-blue-400',
    glow: 'shadow-md shadow-blue-500/20',
    gradient: 'from-blue-500 to-indigo-600',
  },
  epic: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/40',
    text: 'text-purple-600 dark:text-purple-400',
    glow: 'shadow-lg shadow-purple-500/25',
    gradient: 'from-purple-500 to-violet-600',
  },
  legendary: {
    bg: 'bg-gradient-to-br from-yellow-500/20 to-amber-500/20',
    border: 'border-yellow-500/50',
    text: 'text-yellow-600 dark:text-yellow-400',
    glow: 'shadow-xl shadow-yellow-500/30 ring-2 ring-yellow-500/20',
    gradient: 'from-yellow-400 to-amber-500',
  },
};

const MilestoneBadge: React.FC<{ 
  milestone: LoginMilestone; 
  isUnlocked: boolean; 
  currentStreak: number;
  isNext: boolean;
}> = ({ milestone, isUnlocked, currentStreak, isNext }) => {
  const styles = rarityStyles[milestone.rarity];
  const progress = Math.min((currentStreak / milestone.days) * 100, 100);
  const daysRemaining = Math.max(milestone.days - currentStreak, 0);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all cursor-pointer min-w-[140px]',
              isUnlocked ? [styles.bg, styles.border, styles.glow, 'hover:scale-105'] : [
                'bg-muted/30 border-muted-foreground/20 opacity-60 hover:opacity-80'
              ],
              isNext && !isUnlocked && 'ring-2 ring-primary/50 opacity-100'
            )}
          >
            {/* Sparkle effect for legendary */}
            {isUnlocked && milestone.rarity === 'legendary' && (
              <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-yellow-500 animate-pulse" />
            )}
            
            {/* Lock icon for locked milestones */}
            {!isUnlocked && (
              <div className="absolute -top-2 -right-2 p-1 rounded-full bg-muted border border-muted-foreground/30">
                <Lock className="w-3 h-3 text-muted-foreground" />
              </div>
            )}

            {/* Next milestone indicator */}
            {isNext && !isUnlocked && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                NEXT
              </div>
            )}

            {/* Icon */}
            <div className={cn(
              'text-4xl mb-2 transition-all',
              !isUnlocked && 'grayscale'
            )}>
              {milestone.icon}
            </div>

            {/* Name */}
            <span className={cn(
              'text-sm font-bold text-center',
              isUnlocked ? styles.text : 'text-muted-foreground'
            )}>
              {milestone.name}
            </span>

            {/* Days badge */}
            <Badge 
              variant={isUnlocked ? 'default' : 'secondary'} 
              className={cn(
                'mt-2 text-xs',
                isUnlocked && `bg-gradient-to-r ${styles.gradient} text-white border-0`
              )}
            >
              {milestone.days} Days
            </Badge>

            {/* Progress bar for locked milestones */}
            {!isUnlocked && (
              <div className="w-full mt-3 space-y-1">
                <Progress value={progress} className="h-1.5" />
                <p className="text-[10px] text-center text-muted-foreground">
                  {daysRemaining} days to go
                </p>
              </div>
            )}

            {/* Reward info for unlocked */}
            {isUnlocked && (
              <p className="text-[10px] text-center text-muted-foreground mt-2">
                {milestone.reward}
              </p>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[220px]">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{milestone.icon}</span>
              <div>
                <p className="font-bold">{milestone.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{milestone.rarity} Badge</p>
              </div>
            </div>
            <p className="text-sm">{milestone.description}</p>
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-primary">{milestone.reward}</p>
            </div>
            {!isUnlocked && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress:</span>
                  <span className="font-medium">{currentStreak}/{milestone.days} days</span>
                </div>
                <Progress value={progress} className="h-1.5 mt-1" />
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const LoginStreakMilestones: React.FC<LoginStreakMilestonesProps> = ({
  currentStreak,
  longestStreak,
  className,
}) => {
  const unlockedCount = LOGIN_MILESTONES.filter(m => currentStreak >= m.days).length;
  const nextMilestoneIndex = LOGIN_MILESTONES.findIndex(m => currentStreak < m.days);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              Login Streak Milestones
            </CardTitle>
            <CardDescription className="mt-1">
              Log in daily to unlock exclusive badges
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="font-bold text-orange-600 dark:text-orange-400">{currentStreak}</span>
              <span className="text-xs text-muted-foreground">current</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="font-bold">{longestStreak}</span>
              <span className="text-xs text-muted-foreground">best</span>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Crown className="w-3 h-3" />
              {unlockedCount}/{LOGIN_MILESTONES.length} unlocked
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Milestone progression */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {LOGIN_MILESTONES.map((milestone, index) => (
            <React.Fragment key={milestone.days}>
              <MilestoneBadge
                milestone={milestone}
                isUnlocked={currentStreak >= milestone.days}
                currentStreak={currentStreak}
                isNext={index === nextMilestoneIndex}
              />
              {/* Connector line */}
              {index < LOGIN_MILESTONES.length - 1 && (
                <div className="hidden md:flex items-center">
                  <div className={cn(
                    'w-8 h-0.5 transition-colors',
                    currentStreak >= LOGIN_MILESTONES[index + 1].days 
                      ? 'bg-primary' 
                      : currentStreak >= milestone.days 
                        ? 'bg-gradient-to-r from-primary to-muted' 
                        : 'bg-muted'
                  )} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Encouragement message */}
        {nextMilestoneIndex !== -1 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {currentStreak > 0 ? (
                <>
                  Keep going! <span className="font-medium text-foreground">
                    {LOGIN_MILESTONES[nextMilestoneIndex].days - currentStreak} more days
                  </span> until you unlock <span className="font-medium text-foreground">
                    {LOGIN_MILESTONES[nextMilestoneIndex].name}
                  </span>! 🔥
                </>
              ) : (
                <>Start your streak today to work toward the <span className="font-medium text-foreground">Week Warrior</span> badge!</>
              )}
            </p>
          </div>
        )}

        {/* All unlocked celebration */}
        {unlockedCount === LOGIN_MILESTONES.length && (
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 text-center">
            <div className="flex items-center justify-center gap-2 text-yellow-600 dark:text-yellow-400">
              <Crown className="w-5 h-5" />
              <span className="font-bold">All Milestones Unlocked!</span>
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              You've achieved legendary status! Keep your streak going for maximum XP.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
