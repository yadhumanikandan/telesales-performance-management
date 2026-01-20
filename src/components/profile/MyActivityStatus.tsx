import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Phone, 
  PhoneOff, 
  Coffee, 
  Utensils, 
  Clock, 
  AlertTriangle,
  Activity
} from 'lucide-react';
import { format, differenceInMinutes, parseISO, isToday } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Break schedule configuration
const BREAK_SCHEDULE = {
  break1: { start: '11:30', end: '11:45', label: 'Break' },
  lunch: { start: '13:15', end: '14:15', label: 'Lunch' },
  break2: { start: '16:15', end: '16:30', label: 'Break' },
  workEnd: '19:00',
  workStart: '10:00',
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const isOnBreak = (now: Date): { onBreak: boolean; breakLabel: string } => {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const break1Start = timeToMinutes(BREAK_SCHEDULE.break1.start);
  const break1End = timeToMinutes(BREAK_SCHEDULE.break1.end);
  if (currentMinutes >= break1Start && currentMinutes < break1End) {
    return { onBreak: true, breakLabel: BREAK_SCHEDULE.break1.label };
  }
  
  const lunchStart = timeToMinutes(BREAK_SCHEDULE.lunch.start);
  const lunchEnd = timeToMinutes(BREAK_SCHEDULE.lunch.end);
  if (currentMinutes >= lunchStart && currentMinutes < lunchEnd) {
    return { onBreak: true, breakLabel: BREAK_SCHEDULE.lunch.label };
  }
  
  const break2Start = timeToMinutes(BREAK_SCHEDULE.break2.start);
  const break2End = timeToMinutes(BREAK_SCHEDULE.break2.end);
  if (currentMinutes >= break2Start && currentMinutes < break2End) {
    return { onBreak: true, breakLabel: BREAK_SCHEDULE.break2.label };
  }
  
  return { onBreak: false, breakLabel: '' };
};

const isWithinWorkHours = (now: Date): boolean => {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const workStart = timeToMinutes(BREAK_SCHEDULE.workStart);
  const workEnd = timeToMinutes(BREAK_SCHEDULE.workEnd);
  return currentMinutes >= workStart && currentMinutes < workEnd;
};

const getTotalWorkMinutes = (): number => {
  const workStart = timeToMinutes(BREAK_SCHEDULE.workStart);
  const workEnd = timeToMinutes(BREAK_SCHEDULE.workEnd);
  const totalMinutes = workEnd - workStart;
  const breakMinutes = 90; // 15 + 60 + 15
  return totalMinutes - breakMinutes;
};

const getElapsedWorkMinutes = (now: Date): number => {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const workStart = timeToMinutes(BREAK_SCHEDULE.workStart);
  const workEnd = timeToMinutes(BREAK_SCHEDULE.workEnd);
  
  if (currentMinutes < workStart) return 0;
  if (currentMinutes >= workEnd) return getTotalWorkMinutes();
  
  let elapsed = currentMinutes - workStart;
  
  const break1Start = timeToMinutes(BREAK_SCHEDULE.break1.start);
  const break1End = timeToMinutes(BREAK_SCHEDULE.break1.end);
  if (currentMinutes >= break1End) elapsed -= 15;
  else if (currentMinutes > break1Start) elapsed -= (currentMinutes - break1Start);
  
  const lunchStart = timeToMinutes(BREAK_SCHEDULE.lunch.start);
  const lunchEnd = timeToMinutes(BREAK_SCHEDULE.lunch.end);
  if (currentMinutes >= lunchEnd) elapsed -= 60;
  else if (currentMinutes > lunchStart) elapsed -= (currentMinutes - lunchStart);
  
  const break2Start = timeToMinutes(BREAK_SCHEDULE.break2.start);
  const break2End = timeToMinutes(BREAK_SCHEDULE.break2.end);
  if (currentMinutes >= break2End) elapsed -= 15;
  else if (currentMinutes > break2Start) elapsed -= (currentMinutes - break2Start);
  
  return Math.max(0, elapsed);
};

type ActivityStatus = 'calling' | 'idle' | 'on_break' | 'inactive' | 'off_hours';

const getStatusConfig = (status: ActivityStatus) => {
  switch (status) {
    case 'calling':
      return {
        label: 'Active',
        icon: Phone,
        color: 'bg-success/10 text-success border-success/20',
        message: 'Great work! Keep it up!',
      };
    case 'idle':
      return {
        label: 'Idle',
        icon: Clock,
        color: 'bg-warning/10 text-warning border-warning/20',
        message: 'Time to make some calls!',
      };
    case 'on_break':
      return {
        label: 'On Break',
        icon: Coffee,
        color: 'bg-info/10 text-info border-info/20',
        message: 'Enjoy your break!',
      };
    case 'inactive':
      return {
        label: 'Inactive',
        icon: AlertTriangle,
        color: 'bg-destructive/10 text-destructive border-destructive/20',
        message: 'Start calling to stay on track!',
      };
    case 'off_hours':
      return {
        label: 'Off Hours',
        icon: PhoneOff,
        color: 'bg-muted text-muted-foreground',
        message: 'Work hours: 10 AM - 7 PM',
      };
  }
};

export const MyActivityStatus: React.FC = () => {
  const { user } = useAuth();
  const [now, setNow] = React.useState(new Date());
  
  React.useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const { data: activityData } = useQuery({
    queryKey: ['my-activity-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('call_feedback')
        .select('call_timestamp, feedback_status')
        .eq('agent_id', user.id)
        .gte('call_timestamp', `${today}T00:00:00`)
        .order('call_timestamp', { ascending: false });
      
      if (error) throw error;
      
      const todayCalls = data?.length || 0;
      const todayInterested = data?.filter(d => d.feedback_status === 'interested').length || 0;
      const lastCallTime = data?.[0]?.call_timestamp || null;
      
      return { todayCalls, todayInterested, lastCallTime };
    },
    refetchInterval: 60000,
    enabled: !!user?.id,
  });

  const { onBreak, breakLabel } = isOnBreak(now);
  const withinWorkHours = isWithinWorkHours(now);
  const elapsedMinutes = getElapsedWorkMinutes(now);
  const totalMinutes = getTotalWorkMinutes();
  const progressPercent = (elapsedMinutes / totalMinutes) * 100;

  // Determine status
  let status: ActivityStatus = 'inactive';
  
  if (!withinWorkHours) {
    status = 'off_hours';
  } else if (onBreak) {
    status = 'on_break';
  } else if (activityData?.lastCallTime) {
    const lastCall = parseISO(activityData.lastCallTime);
    if (isToday(lastCall)) {
      const minutesSinceLastCall = differenceInMinutes(now, lastCall);
      if (minutesSinceLastCall <= 10) {
        status = 'calling';
      } else if (minutesSinceLastCall <= 30) {
        status = 'idle';
      } else {
        status = 'inactive';
      }
    }
  }

  const config = getStatusConfig(status);
  const StatusIcon = config.icon;

  const lastCallFormatted = activityData?.lastCallTime && isToday(parseISO(activityData.lastCallTime))
    ? format(parseISO(activityData.lastCallTime), 'HH:mm')
    : activityData?.lastCallTime
    ? 'Yesterday'
    : 'No calls today';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            My Activity Status
          </CardTitle>
          <Badge className={`${config.color} gap-1`}>
            <StatusIcon className="w-3 h-3" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current status message */}
        <div className={`p-3 rounded-lg ${config.color.replace('text-', 'bg-').split(' ')[0]}`}>
          <div className="flex items-center gap-2">
            <StatusIcon className="w-5 h-5" />
            <span className="font-medium">{config.message}</span>
          </div>
          {onBreak && (
            <p className="text-sm mt-1 opacity-80">
              <Utensils className="w-3 h-3 inline mr-1" />
              {breakLabel} Time
            </p>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{activityData?.todayCalls || 0}</p>
            <p className="text-xs text-muted-foreground">Today's Calls</p>
          </div>
          <div className="p-2 rounded-lg bg-success/10">
            <p className="text-2xl font-bold text-success">{activityData?.todayInterested || 0}</p>
            <p className="text-xs text-muted-foreground">Interested</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{lastCallFormatted}</p>
            <p className="text-xs text-muted-foreground">Last Call</p>
          </div>
        </div>

        {/* Work day progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Work Day Progress</span>
            <span className="font-medium">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>10 AM</span>
            <span>7 PM</span>
          </div>
        </div>

        {/* Break schedule */}
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="gap-1">
            <Coffee className="w-3 h-3" /> 11:30-11:45
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Utensils className="w-3 h-3" /> 1:15-2:15
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Coffee className="w-3 h-3" /> 4:15-4:30
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
