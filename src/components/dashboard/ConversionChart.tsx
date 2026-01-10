import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { PerformanceStats } from '@/hooks/usePerformanceData';
import { PieChartIcon } from 'lucide-react';

interface ConversionChartProps {
  stats: PerformanceStats;
  isLoading: boolean;
}

const COLORS = {
  interested: 'hsl(var(--success))',
  notInterested: 'hsl(var(--destructive))',
  notAnswered: 'hsl(var(--warning))',
  other: 'hsl(var(--muted))',
};

const chartConfig = {
  interested: {
    label: 'Interested',
    color: COLORS.interested,
  },
  notInterested: {
    label: 'Not Interested',
    color: COLORS.notInterested,
  },
  notAnswered: {
    label: 'Not Answered',
    color: COLORS.notAnswered,
  },
};

export const ConversionChart: React.FC<ConversionChartProps> = ({ stats, isLoading }) => {
  const pieData = [
    { name: 'Interested', value: stats.interested, color: COLORS.interested },
    { name: 'Not Interested', value: stats.notInterested, color: COLORS.notInterested },
    { name: 'Not Answered', value: stats.notAnswered, color: COLORS.notAnswered },
  ].filter(d => d.value > 0);

  const totalCalls = stats.totalCalls;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-primary" />
            Conversion Breakdown
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

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="w-5 h-5 text-primary" />
          Conversion Breakdown
        </CardTitle>
        <CardDescription>
          Call outcomes distribution
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {totalCalls === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <PieChartIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No data available</p>
              <p className="text-sm">Make some calls to see your conversion rates!</p>
            </div>
          </div>
        ) : (
          <div className="relative">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            
            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.conversionRate}%</div>
                <div className="text-xs text-muted-foreground">Conversion</div>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-4">
          {pieData.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-muted-foreground">
                {entry.name}: {entry.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
