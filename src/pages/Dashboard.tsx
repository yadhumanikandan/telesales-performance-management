import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { CallsChart } from '@/components/dashboard/CallsChart';
import { ConversionChart } from '@/components/dashboard/ConversionChart';
import { TeamLeaderboard } from '@/components/dashboard/TeamLeaderboard';
import { usePerformanceData } from '@/hooks/usePerformanceData';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const { myStats, hourlyData, leaderboard, isLoading, refetch } = usePerformanceData();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'Agent'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's your real-time performance overview
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline" className="gap-2">
            <Link to="/upload">
              <Upload className="w-4 h-4" />
              Upload Contacts
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link to="/call-list">
              <Phone className="w-4 h-4" />
              Start Calling
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={myStats} isLoading={isLoading} onRefresh={refetch} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CallsChart data={hourlyData} isLoading={isLoading} />
        <ConversionChart stats={myStats} isLoading={isLoading} />
      </div>

      {/* Team Leaderboard */}
      <TeamLeaderboard data={leaderboard} isLoading={isLoading} />

      {/* Quick Actions Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="default" className="gap-2">
            <Link to="/call-list">
              <Phone className="w-4 h-4" />
              Continue Calling
            </Link>
          </Button>
          <Button asChild variant="secondary" className="gap-2">
            <Link to="/upload">
              <Upload className="w-4 h-4" />
              Upload New Contacts
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
