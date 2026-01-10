import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { HourlyCallData } from '@/hooks/usePerformanceData';
import { BarChart3 } from 'lucide-react';

interface CallsChartProps {
  data: HourlyCallData[];
  isLoading: boolean;
}

const chartConfig = {
  calls: {
    label: 'Total Calls',
    color: 'hsl(var(--primary))',
  },
  interested: {
    label: 'Interested',
    color: 'hsl(var(--success))',
  },
  notInterested: {
    label: 'Not Interested',
    color: 'hsl(var(--destructive))',
  },
};

export const CallsChart: React.FC<CallsChartProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Calls Per Hour
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasData = data.some(d => d.calls > 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Calls Per Hour
            </CardTitle>
            <CardDescription className="mt-1">
              Hourly breakdown of your calls today
            </CardDescription>
          </div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-primary" />
              <span className="text-muted-foreground">Total</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-success" />
              <span className="text-muted-foreground">Interested</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {!hasData ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No calls recorded yet today</p>
              <p className="text-sm">Start making calls to see your progress!</p>
            </div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="hour" 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar 
                dataKey="calls" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
                name="Total Calls"
              />
              <Bar 
                dataKey="interested" 
                fill="hsl(var(--success))" 
                radius={[4, 4, 0, 0]}
                name="Interested"
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};
