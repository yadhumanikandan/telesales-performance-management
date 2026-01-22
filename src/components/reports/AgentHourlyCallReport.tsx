import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamLeaderData } from '@/hooks/useTeamLeaderData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  AlertTriangle,
  CalendarIcon,
  FileDown,
  Loader2,
  CalendarDays,
  CalendarRange,
  ArrowLeft,
  Phone,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type FilterMode = 'single' | 'range' | null;

interface HourlyData {
  [hour: number]: number;
}

interface AgentHourlyStats {
  agentId: string;
  agentName: string;
  hourlyData: HourlyData;
  totalCalls: number;
}

interface DateWiseData {
  date: string;
  dateLabel: string;
  agents: AgentHourlyStats[];
  hourlyTotals: HourlyData;
  grandTotal: number;
}

interface AgentOption {
  id: string;
  name: string;
}

interface SummaryStats {
  totalCalls: number;
  totalDays: number;
  peakHour: number;
  peakHourCalls: number;
  topAgent: string;
  topAgentCalls: number;
  avgCallsPerDay: number;
}

// Hours from 8 AM to 8 PM
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const formatHour = (hour: number): string => {
  if (hour === 12) return '12PM';
  if (hour > 12) return `${hour - 12}PM`;
  return `${hour}AM`;
};

// Summary Card Component
const SummaryCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}> = ({ icon, label, value, subtext, variant = 'default' }) => {
  const bgClass = {
    default: 'bg-muted/50',
    primary: 'bg-primary/10',
    success: 'bg-green-500/10',
    warning: 'bg-amber-500/10',
  }[variant];

  return (
    <div className={cn('rounded-lg p-4 transition-all', bgClass)}>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subtext && <div className="text-xs text-muted-foreground mt-1">{subtext}</div>}
    </div>
  );
};

// Collapsible Date Section Component
const DateSection: React.FC<{
  dateData: DateWiseData;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ dateData, isExpanded, onToggle }) => {
  return (
    <div className="border rounded-lg overflow-hidden mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
          <CalendarDays className="h-5 w-5 text-primary" />
          <span className="font-semibold">{dateData.dateLabel}</span>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            {dateData.agents.length} agents
          </Badge>
          <Badge variant="secondary" className="gap-1 font-bold">
            <Phone className="h-3 w-3" />
            {dateData.grandTotal} calls
          </Badge>
        </div>
      </button>

      {isExpanded && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="font-bold sticky left-0 bg-muted/20 z-10 min-w-[140px]">
                  Agent Name
                </TableHead>
                {HOURS.map(hour => (
                  <TableHead key={hour} className="text-center font-bold min-w-[50px]">
                    {formatHour(hour)}
                  </TableHead>
                ))}
                <TableHead className="text-center font-bold bg-primary/10 min-w-[80px]">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dateData.agents.map((agent, index) => (
                <TableRow key={agent.agentId} className={index === 0 ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                  <TableCell className="font-medium sticky left-0 bg-background z-10">
                    {agent.agentName}
                  </TableCell>
                  {HOURS.map(hour => (
                    <TableCell key={hour} className="text-center">
                      <span className={cn(
                        (agent.hourlyData[hour] || 0) > 0 ? 'font-medium' : 'text-muted-foreground'
                      )}>
                        {agent.hourlyData[hour] || 0}
                      </span>
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-bold bg-primary/5">
                    {agent.totalCalls}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted font-bold">
                <TableCell className="sticky left-0 bg-muted z-10">DAY TOTAL</TableCell>
                {HOURS.map(hour => (
                  <TableCell key={hour} className="text-center">
                    {dateData.hourlyTotals[hour] || 0}
                  </TableCell>
                ))}
                <TableCell className="text-center bg-primary/10 text-lg">
                  {dateData.grandTotal}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </div>
  );
};

export const AgentHourlyCallReport: React.FC = () => {
  const { ledTeamId, user } = useAuth();
  const { teamInfo, isTeamLeader } = useTeamLeaderData();
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Filter mode selection
  const [filterMode, setFilterMode] = useState<FilterMode>(null);
  
  // Draft date selections (not applied yet)
  const [singleDate, setSingleDate] = useState<Date | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  // Applied filter values (triggers query)
  const [appliedMode, setAppliedMode] = useState<FilterMode>(null);
  const [appliedSingleDate, setAppliedSingleDate] = useState<Date | null>(null);
  const [appliedStartDate, setAppliedStartDate] = useState<Date | null>(null);
  const [appliedEndDate, setAppliedEndDate] = useState<Date | null>(null);
  const [appliedAgent, setAppliedAgent] = useState<string>('all');

  const hasAppliedFilter = appliedMode === 'single' 
    ? !!appliedSingleDate 
    : appliedMode === 'range' 
      ? !!appliedStartDate && !!appliedEndDate 
      : false;

  const canApplyFilter = filterMode === 'single'
    ? !!singleDate
    : filterMode === 'range'
      ? !!startDate && !!endDate
      : false;

  // Fetch team agents for filter dropdown
  const { data: teamAgents } = useQuery({
    queryKey: ['team-agents-for-hourly-report', ledTeamId],
    queryFn: async (): Promise<AgentOption[]> => {
      if (!ledTeamId) return [];

      const { data: profiles, error } = await supabase
        .from('profiles_public')
        .select('id, full_name, username')
        .eq('team_id', ledTeamId)
        .eq('is_active', true);

      if (error) throw error;

      return (profiles || []).map(p => ({
        id: p.id!,
        name: p.full_name || p.username || 'Unknown',
      }));
    },
    enabled: !!ledTeamId,
  });

  const handleApplyFilter = () => {
    if (filterMode === 'single' && singleDate) {
      setAppliedMode('single');
      setAppliedSingleDate(singleDate);
      setAppliedStartDate(null);
      setAppliedEndDate(null);
      setAppliedAgent(selectedAgent);
      setExpandedDates(new Set([format(singleDate, 'yyyy-MM-dd')]));
    } else if (filterMode === 'range' && startDate && endDate) {
      setAppliedMode('range');
      setAppliedStartDate(startDate);
      setAppliedEndDate(endDate);
      setAppliedSingleDate(null);
      setAppliedAgent(selectedAgent);
      setExpandedDates(new Set());
    }
  };

  const handleClearAll = () => {
    setFilterMode(null);
    setSingleDate(null);
    setStartDate(null);
    setEndDate(null);
    setSelectedAgent('all');
    setAppliedMode(null);
    setAppliedSingleDate(null);
    setAppliedStartDate(null);
    setAppliedEndDate(null);
    setAppliedAgent('all');
    setExpandedDates(new Set());
  };

  const handleChangeFilterType = () => {
    setFilterMode(null);
    setSingleDate(null);
    setStartDate(null);
    setEndDate(null);
  };

  const toggleDateExpansion = (date: string) => {
    setExpandedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    if (reportData) {
      setExpandedDates(new Set(reportData.dateWiseData.map(d => d.date)));
    }
  };

  const collapseAll = () => {
    setExpandedDates(new Set());
  };

  const getAppliedDateRange = () => {
    if (appliedMode === 'single' && appliedSingleDate) {
      return {
        start: startOfDay(appliedSingleDate),
        end: endOfDay(appliedSingleDate),
      };
    }
    if (appliedMode === 'range' && appliedStartDate && appliedEndDate) {
      return {
        start: startOfDay(appliedStartDate),
        end: endOfDay(appliedEndDate),
      };
    }
    return null;
  };

  const getAgentName = () => {
    if (appliedAgent === 'all') return 'All Agents';
    const agent = teamAgents?.find(a => a.id === appliedAgent);
    return agent?.name || 'Unknown';
  };

  // Fetch hourly call data - now date-wise
  const { data: reportData, isLoading } = useQuery({
    queryKey: [
      'agent-hourly-report-datewise',
      ledTeamId,
      appliedMode,
      appliedSingleDate?.toISOString(),
      appliedStartDate?.toISOString(),
      appliedEndDate?.toISOString(),
      appliedAgent,
    ],
    queryFn: async (): Promise<{
      dateWiseData: DateWiseData[];
      overallHourlyTotals: HourlyData;
      overallGrandTotal: number;
      summary: SummaryStats;
    }> => {
      if (!ledTeamId || !hasAppliedFilter) {
        return { dateWiseData: [], overallHourlyTotals: {}, overallGrandTotal: 0, summary: { totalCalls: 0, totalDays: 0, peakHour: 0, peakHourCalls: 0, topAgent: '', topAgentCalls: 0, avgCallsPerDay: 0 } };
      }

      const dateRange = getAppliedDateRange();
      if (!dateRange) {
        return { dateWiseData: [], overallHourlyTotals: {}, overallGrandTotal: 0, summary: { totalCalls: 0, totalDays: 0, peakHour: 0, peakHourCalls: 0, topAgent: '', topAgentCalls: 0, avgCallsPerDay: 0 } };
      }

      // Get team members
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles_public')
        .select('id, full_name, username')
        .eq('team_id', ledTeamId)
        .eq('is_active', true);

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) {
        return { dateWiseData: [], overallHourlyTotals: {}, overallGrandTotal: 0, summary: { totalCalls: 0, totalDays: 0, peakHour: 0, peakHourCalls: 0, topAgent: '', topAgentCalls: 0, avgCallsPerDay: 0 } };
      }

      // Filter by specific agent if selected
      let filteredProfiles = profiles;
      if (appliedAgent !== 'all') {
        filteredProfiles = profiles.filter(p => p.id === appliedAgent);
      }

      const memberIds = filteredProfiles.map(p => p.id);
      const profileMap = new Map(filteredProfiles.map(p => [p.id, p.full_name || p.username || 'Unknown']));

      // Get call feedback with timestamps
      const { data: feedback, error: feedbackError } = await supabase
        .from('call_feedback')
        .select('agent_id, call_timestamp')
        .in('agent_id', memberIds)
        .gte('call_timestamp', dateRange.start.toISOString())
        .lte('call_timestamp', dateRange.end.toISOString());

      if (feedbackError) throw feedbackError;

      // Group by date first, then by agent and hour
      const dateMap = new Map<string, Map<string, AgentHourlyStats>>();
      const overallAgentTotals = new Map<string, number>();

      feedback?.forEach(f => {
        if (f.call_timestamp) {
          const callDate = new Date(f.call_timestamp);
          const dateKey = format(callDate, 'yyyy-MM-dd');
          const hour = callDate.getHours();

          if (hour >= 8 && hour <= 20) {
            // Initialize date map if needed
            if (!dateMap.has(dateKey)) {
              const agentMap = new Map<string, AgentHourlyStats>();
              filteredProfiles.forEach(profile => {
                agentMap.set(profile.id!, {
                  agentId: profile.id!,
                  agentName: profileMap.get(profile.id!) || 'Unknown',
                  hourlyData: {},
                  totalCalls: 0,
                });
              });
              dateMap.set(dateKey, agentMap);
            }

            const agentMap = dateMap.get(dateKey)!;
            const agent = agentMap.get(f.agent_id);
            if (agent) {
              agent.hourlyData[hour] = (agent.hourlyData[hour] || 0) + 1;
              agent.totalCalls++;
            }

            // Track overall agent totals for summary
            overallAgentTotals.set(f.agent_id, (overallAgentTotals.get(f.agent_id) || 0) + 1);
          }
        }
      });

      // Convert to DateWiseData array
      const dateWiseData: DateWiseData[] = [];
      const overallHourlyTotals: HourlyData = {};
      let overallGrandTotal = 0;

      // Sort dates in descending order (most recent first)
      const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));

      sortedDates.forEach(dateKey => {
        const agentMap = dateMap.get(dateKey)!;
        const agents = Array.from(agentMap.values())
          .filter(a => a.totalCalls > 0)
          .sort((a, b) => b.totalCalls - a.totalCalls);

        if (agents.length > 0) {
          const hourlyTotals: HourlyData = {};
          let grandTotal = 0;

          agents.forEach(agent => {
            HOURS.forEach(hour => {
              const count = agent.hourlyData[hour] || 0;
              hourlyTotals[hour] = (hourlyTotals[hour] || 0) + count;
              overallHourlyTotals[hour] = (overallHourlyTotals[hour] || 0) + count;
            });
            grandTotal += agent.totalCalls;
          });

          overallGrandTotal += grandTotal;

          dateWiseData.push({
            date: dateKey,
            dateLabel: format(parseISO(dateKey), 'EEEE, MMMM d, yyyy'),
            agents,
            hourlyTotals,
            grandTotal,
          });
        }
      });

      // Calculate summary statistics
      let peakHour = 0;
      let peakHourCalls = 0;
      HOURS.forEach(hour => {
        if ((overallHourlyTotals[hour] || 0) > peakHourCalls) {
          peakHour = hour;
          peakHourCalls = overallHourlyTotals[hour] || 0;
        }
      });

      let topAgent = '';
      let topAgentCalls = 0;
      overallAgentTotals.forEach((calls, agentId) => {
        if (calls > topAgentCalls) {
          topAgent = profileMap.get(agentId) || 'Unknown';
          topAgentCalls = calls;
        }
      });

      const summary: SummaryStats = {
        totalCalls: overallGrandTotal,
        totalDays: dateWiseData.length,
        peakHour,
        peakHourCalls,
        topAgent,
        topAgentCalls,
        avgCallsPerDay: dateWiseData.length > 0 ? Math.round(overallGrandTotal / dateWiseData.length) : 0,
      };

      return { dateWiseData, overallHourlyTotals, overallGrandTotal, summary };
    },
    enabled: !!ledTeamId && !!user?.id && hasAppliedFilter,
  });

  const getPeriodLabel = () => {
    if (appliedMode === 'single' && appliedSingleDate) {
      return format(appliedSingleDate, 'MMMM d, yyyy');
    }
    if (appliedMode === 'range' && appliedStartDate && appliedEndDate) {
      return `${format(appliedStartDate, 'MMM d')} - ${format(appliedEndDate, 'MMM d, yyyy')}`;
    }
    return 'Select date range';
  };

  const downloadPDF = () => {
    if (!reportData || reportData.dateWiseData.length === 0) return;
    setIsDownloading(true);

    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;
      let yPos = 15;

      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(41, 98, 255);
      doc.text('Agent Performance Report - Hour-wise Call Volume', margin, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`${teamInfo?.name || 'Team'} | ${getPeriodLabel()} | Agent: ${getAgentName()}`, margin, yPos);
      yPos += 5;

      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, margin, yPos);
      yPos += 10;

      // Summary section
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Summary', margin, yPos);
      yPos += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const summaryText = `Total Calls: ${reportData.summary.totalCalls} | Days: ${reportData.summary.totalDays} | Avg/Day: ${reportData.summary.avgCallsPerDay} | Peak Hour: ${formatHour(reportData.summary.peakHour)} (${reportData.summary.peakHourCalls} calls)`;
      doc.text(summaryText, margin, yPos);
      yPos += 10;

      // For each date, create a table
      reportData.dateWiseData.forEach((dateData, dateIndex) => {
        // Check if we need a new page
        if (yPos > 170) {
          doc.addPage();
          yPos = 15;
        }

        // Date header
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(41, 98, 255);
        doc.text(dateData.dateLabel, margin, yPos);
        yPos += 6;

        // Table headers
        const headers = ['Agent Name', ...HOURS.map(formatHour), 'Total'];

        // Table data
        const tableData = dateData.agents.map(agent => [
          agent.agentName,
          ...HOURS.map(hour => (agent.hourlyData[hour] || 0).toString()),
          agent.totalCalls.toString(),
        ]);

        // Add day totals row
        tableData.push([
          'DAY TOTAL',
          ...HOURS.map(hour => (dateData.hourlyTotals[hour] || 0).toString()),
          dateData.grandTotal.toString(),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [headers],
          body: tableData,
          theme: 'striped',
          headStyles: {
            fillColor: [41, 98, 255],
            textColor: 255,
            fontSize: 6,
            fontStyle: 'bold',
            halign: 'center',
          },
          bodyStyles: {
            fontSize: 6,
            halign: 'center',
          },
          columnStyles: {
            0: { halign: 'left', cellWidth: 35 },
          },
          margin: { left: margin, right: margin },
          didParseCell: (data) => {
            // Style the totals row
            if (data.row.index === tableData.length - 1) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [240, 240, 240];
            }
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      });

      // Overall Summary Table
      if (reportData.dateWiseData.length > 1) {
        if (yPos > 170) {
          doc.addPage();
          yPos = 15;
        }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(41, 98, 255);
        doc.text('OVERALL SUMMARY', margin, yPos);
        yPos += 6;

        const overallHeaders = ['', ...HOURS.map(formatHour), 'Grand Total'];
        const overallData = [[
          'ALL DAYS TOTAL',
          ...HOURS.map(hour => (reportData.overallHourlyTotals[hour] || 0).toString()),
          reportData.overallGrandTotal.toString(),
        ]];

        autoTable(doc, {
          startY: yPos,
          head: [overallHeaders],
          body: overallData,
          theme: 'striped',
          headStyles: {
            fillColor: [76, 175, 80],
            textColor: 255,
            fontSize: 7,
            fontStyle: 'bold',
            halign: 'center',
          },
          bodyStyles: {
            fontSize: 7,
            halign: 'center',
            fontStyle: 'bold',
          },
          columnStyles: {
            0: { halign: 'left', cellWidth: 35 },
          },
          margin: { left: margin, right: margin },
        });
      }

      const fileName = `Agent_Hourly_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      toast.error('Failed to generate PDF');
      console.error(error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isTeamLeader) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Team Leader Access Required</AlertTitle>
        <AlertDescription>
          This report is only available to team leaders. Contact your administrator if you believe this is an error.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Agent Performance Report - Hour-wise Call Volume
              </CardTitle>
              <CardDescription>
                Date-wise hourly breakdown of calls from 8 AM to 8 PM for {teamInfo?.name || 'your team'}
              </CardDescription>
            </div>
            {hasAppliedFilter && reportData && reportData.dateWiseData.length > 0 && (
              <Button onClick={downloadPDF} disabled={isLoading || isDownloading}>
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                <span className="ml-2">Download PDF</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Step 1: Filter Mode Selection */}
          {filterMode === null && (
            <div className="flex flex-col items-center justify-center py-12">
              <CalendarIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Select Date Filter Type</h3>
              <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                Choose how you want to filter the report data
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setFilterMode('single')}
                  className="gap-2 min-w-[200px] h-16"
                >
                  <CalendarDays className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Single Day</div>
                    <div className="text-xs text-muted-foreground">Pick a specific date</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setFilterMode('range')}
                  className="gap-2 min-w-[200px] h-16"
                >
                  <CalendarRange className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Date Range</div>
                    <div className="text-xs text-muted-foreground">From - To dates</div>
                  </div>
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Single Date Selection */}
          {filterMode === 'single' && !hasAppliedFilter && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleChangeFilterType}
                className="gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Change Filter Type
              </Button>
              
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-full max-w-md space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Select a Date:</label>
                    <DatePicker
                      selected={singleDate}
                      onChange={(date) => setSingleDate(date)}
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Click to select a date"
                      maxDate={new Date()}
                      isClearable
                      showMonthDropdown
                      showYearDropdown
                      dropdownMode="select"
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Filter by Agent:</label>
                    <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select agent" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Agents</SelectItem>
                        {teamAgents?.map(agent => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {singleDate && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Selected: {format(singleDate, 'MMMM d, yyyy')}
                  </p>
                )}
                
                <div className="flex gap-2 mt-6">
                  <Button
                    onClick={handleApplyFilter}
                    disabled={!canApplyFilter}
                  >
                    Apply Filter & Show Data
                  </Button>
                  <Button variant="outline" onClick={handleClearAll}>
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Date Range Selection */}
          {filterMode === 'range' && !hasAppliedFilter && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleChangeFilterType}
                className="gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Change Filter Type
              </Button>
              
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-full max-w-lg space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">From Date:</label>
                      <DatePicker
                        selected={startDate}
                        onChange={(date) => {
                          setStartDate(date);
                          if (endDate && date && date > endDate) {
                            setEndDate(null);
                          }
                        }}
                        selectsStart
                        startDate={startDate}
                        endDate={endDate}
                        maxDate={endDate || new Date()}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Select start date"
                        isClearable
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">To Date:</label>
                      <DatePicker
                        selected={endDate}
                        onChange={(date) => setEndDate(date)}
                        selectsEnd
                        startDate={startDate}
                        endDate={endDate}
                        minDate={startDate}
                        maxDate={new Date()}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Select end date"
                        disabled={!startDate}
                        isClearable
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        className={cn(
                          "w-full px-3 py-2 border border-input rounded-md bg-background text-sm",
                          !startDate && "opacity-50 cursor-not-allowed"
                        )}
                      />
                      {!startDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Select From Date first
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Filter by Agent:</label>
                    <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select agent" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Agents</SelectItem>
                        {teamAgents?.map(agent => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {startDate && endDate && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Selected: {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
                  </p>
                )}
                
                <div className="flex gap-2 mt-6">
                  <Button
                    onClick={handleApplyFilter}
                    disabled={!canApplyFilter}
                  >
                    Apply Filter & Show Data
                  </Button>
                  <Button variant="outline" onClick={handleClearAll}>
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && hasAppliedFilter && (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          )}

          {/* Results */}
          {hasAppliedFilter && !isLoading && reportData && (
            <div className="space-y-6">
              {/* Filter Info & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{getPeriodLabel()}</span>
                  <span className="mx-2">|</span>
                  <span className="font-medium">Agent:</span>
                  <span>{getAgentName()}</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleClearAll}>
                  Change Filter
                </Button>
              </div>

              {reportData.dateWiseData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Call Data Found</h3>
                  <p className="text-sm text-muted-foreground">
                    No calls were recorded for this date range.
                  </p>
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <SummaryCard
                      icon={<Phone className="h-4 w-4" />}
                      label="Total Calls"
                      value={reportData.summary.totalCalls}
                      subtext={`${reportData.summary.totalDays} day(s)`}
                      variant="primary"
                    />
                    <SummaryCard
                      icon={<TrendingUp className="h-4 w-4" />}
                      label="Avg Calls/Day"
                      value={reportData.summary.avgCallsPerDay}
                      variant="success"
                    />
                    <SummaryCard
                      icon={<Clock className="h-4 w-4" />}
                      label="Peak Hour"
                      value={formatHour(reportData.summary.peakHour)}
                      subtext={`${reportData.summary.peakHourCalls} calls`}
                      variant="warning"
                    />
                    <SummaryCard
                      icon={<Users className="h-4 w-4" />}
                      label="Top Performer"
                      value={reportData.summary.topAgentCalls}
                      subtext={reportData.summary.topAgent}
                      variant="default"
                    />
                  </div>

                  {/* Expand/Collapse Controls */}
                  {reportData.dateWiseData.length > 1 && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={expandAll}>
                        Expand All ({reportData.dateWiseData.length})
                      </Button>
                      <Button variant="outline" size="sm" onClick={collapseAll}>
                        Collapse All
                      </Button>
                    </div>
                  )}

                  {/* Date-wise Sections */}
                  {reportData.dateWiseData.map(dateData => (
                    <DateSection
                      key={dateData.date}
                      dateData={dateData}
                      isExpanded={expandedDates.has(dateData.date)}
                      onToggle={() => toggleDateExpansion(dateData.date)}
                    />
                  ))}

                  {/* Overall Summary Table (for range) */}
                  {reportData.dateWiseData.length > 1 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="p-4 bg-green-500/10 border-b">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                          Overall Summary (All Days)
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-green-500/5">
                              <TableHead className="font-bold sticky left-0 bg-green-500/5 z-10 min-w-[140px]">
                                
                              </TableHead>
                              {HOURS.map(hour => (
                                <TableHead key={hour} className="text-center font-bold min-w-[50px]">
                                  {formatHour(hour)}
                                </TableHead>
                              ))}
                              <TableHead className="text-center font-bold bg-green-500/20 min-w-[100px]">
                                Grand Total
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow className="font-bold">
                              <TableCell className="sticky left-0 bg-background z-10">
                                ALL DAYS TOTAL
                              </TableCell>
                              {HOURS.map(hour => (
                                <TableCell key={hour} className="text-center text-lg">
                                  {reportData.overallHourlyTotals[hour] || 0}
                                </TableCell>
                              ))}
                              <TableCell className="text-center text-xl font-bold bg-green-500/10">
                                {reportData.overallGrandTotal}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
