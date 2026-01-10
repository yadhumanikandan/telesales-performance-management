import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Target, ThumbsUp, ThumbsDown, PhoneOff, MessageSquare, TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PerformanceStats } from '@/hooks/usePerformanceData';

interface StatsGridProps {
  stats: PerformanceStats;
  isLoading: boolean;
  onRefresh: () => void;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats, isLoading, onRefresh }) => {
  const statCards = [
    { 
      label: 'Calls Today', 
      value: stats.totalCalls, 
      icon: Phone, 
      color: 'bg-primary text-primary-foreground',
      description: 'Total calls made'
    },
    { 
      label: 'Interested', 
      value: stats.interested, 
      icon: ThumbsUp, 
      color: 'bg-success text-success-foreground',
      description: 'Positive responses'
    },
    { 
      label: 'Not Interested', 
      value: stats.notInterested, 
      icon: ThumbsDown, 
      color: 'bg-destructive text-destructive-foreground',
      description: 'Declined'
    },
    { 
      label: 'Not Answered', 
      value: stats.notAnswered, 
      icon: PhoneOff, 
      color: 'bg-warning text-warning-foreground',
      description: 'No response'
    },
    { 
      label: 'Leads Generated', 
      value: stats.leadsGenerated, 
      icon: Target, 
      color: 'bg-accent text-accent-foreground',
      description: 'Qualified leads'
    },
    { 
      label: 'WhatsApp Sent', 
      value: stats.whatsappSent, 
      icon: MessageSquare, 
      color: 'bg-info text-info-foreground',
      description: 'Follow-up messages'
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Today's Performance</h2>
            <p className="text-sm text-muted-foreground">
              Conversion Rate: <span className="font-bold text-primary">{stats.conversionRate}%</span>
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, index) => (
          <Card 
            key={index} 
            className="hover:shadow-md transition-all duration-200 border-l-4 hover:scale-[1.02]"
            style={{ borderLeftColor: `hsl(var(--primary))` }}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <p className="text-xs text-muted-foreground/70">{stat.description}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${stat.color} shadow-sm`}>
                <stat.icon className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">
                {isLoading ? (
                  <div className="h-9 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  stat.value
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
