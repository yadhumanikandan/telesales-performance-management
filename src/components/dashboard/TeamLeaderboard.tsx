import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Medal, Award, Users } from 'lucide-react';
import { LeaderboardEntry } from '@/hooks/usePerformanceData';
import { useAuth } from '@/contexts/AuthContext';

interface TeamLeaderboardProps {
  data: LeaderboardEntry[];
  isLoading: boolean;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="w-5 h-5 text-yellow-500" />;
    case 2:
      return <Medal className="w-5 h-5 text-gray-400" />;
    case 3:
      return <Award className="w-5 h-5 text-amber-600" />;
    default:
      return <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-muted-foreground">#{rank}</span>;
  }
};

const getRankBadge = (rank: number) => {
  switch (rank) {
    case 1:
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">🥇 Gold</Badge>;
    case 2:
      return <Badge className="bg-gray-400/10 text-gray-600 border-gray-400/20">🥈 Silver</Badge>;
    case 3:
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">🥉 Bronze</Badge>;
    default:
      return null;
  }
};

export const TeamLeaderboard: React.FC<TeamLeaderboardProps> = ({ data, isLoading }) => {
  const { user } = useAuth();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Team Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Team Leaderboard
        </CardTitle>
        <CardDescription>
          Today's top performers
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No activity yet today</p>
              <p className="text-sm">Be the first to make calls!</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-center">Calls</TableHead>
                  <TableHead className="text-center">Interested</TableHead>
                  <TableHead className="text-center">Conversion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 10).map((entry) => {
                  const isCurrentUser = entry.agentId === user?.id;
                  return (
                    <TableRow 
                      key={entry.agentId}
                      className={isCurrentUser ? 'bg-primary/5 border-l-2 border-l-primary' : ''}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getRankIcon(entry.rank)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {entry.agentName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {entry.agentName}
                              {isCurrentUser && (
                                <Badge variant="outline" className="text-xs">You</Badge>
                              )}
                            </div>
                            {getRankBadge(entry.rank)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold">{entry.totalCalls}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-success/10 text-success">
                          {entry.interested}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-muted rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(entry.conversionRate, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {entry.conversionRate}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
