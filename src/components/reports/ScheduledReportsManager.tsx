import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, 
  Clock, 
  FileText, 
  Plus, 
  Trash2, 
  Play, 
  Settings,
  Users,
  AlertTriangle,
  BarChart3,
  Mail,
  Loader2
} from 'lucide-react';
import { useScheduledReports, ScheduledReport } from '@/hooks/useScheduledReports';
import { format } from 'date-fns';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

interface ScheduleFormData {
  frequency: string;
  schedule_day: number;
  schedule_time: string;
  include_team_summary: boolean;
  include_agent_breakdown: boolean;
  include_alerts_summary: boolean;
  recipients: string[];
}

const defaultFormData: ScheduleFormData = {
  frequency: 'weekly',
  schedule_day: 1,
  schedule_time: '08:00',
  include_team_summary: true,
  include_agent_breakdown: true,
  include_alerts_summary: true,
  recipients: [],
};

export const ScheduledReportsManager: React.FC = () => {
  const { 
    schedules, 
    isLoading, 
    isAdmin,
    createSchedule, 
    updateSchedule, 
    deleteSchedule,
    generateReportNow 
  } = useScheduledReports();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState<ScheduleFormData>(defaultFormData);
  const [recipientInput, setRecipientInput] = useState('');
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  if (!isAdmin) {
    return null;
  }

  const handleCreate = async () => {
    await createSchedule.mutateAsync({
      frequency: formData.frequency,
      schedule_day: formData.schedule_day,
      schedule_time: formData.schedule_time + ':00',
      include_team_summary: formData.include_team_summary,
      include_agent_breakdown: formData.include_agent_breakdown,
      include_alerts_summary: formData.include_alerts_summary,
      recipients: formData.recipients,
    });
    setIsCreateOpen(false);
    setFormData(defaultFormData);
  };

  const handleToggleActive = async (schedule: ScheduledReport) => {
    await updateSchedule.mutateAsync({
      id: schedule.id,
      is_active: !schedule.is_active,
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this schedule?')) {
      await deleteSchedule.mutateAsync(id);
    }
  };

  const handleGenerateNow = async (scheduleId: string) => {
    setGeneratingId(scheduleId);
    try {
      await generateReportNow.mutateAsync(scheduleId);
    } finally {
      setGeneratingId(null);
    }
  };

  const addRecipient = () => {
    if (recipientInput && !formData.recipients.includes(recipientInput)) {
      setFormData(prev => ({
        ...prev,
        recipients: [...prev.recipients, recipientInput],
      }));
      setRecipientInput('');
    }
  };

  const removeRecipient = (email: string) => {
    setFormData(prev => ({
      ...prev,
      recipients: prev.recipients.filter(r => r !== email),
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Scheduled Reports
            </CardTitle>
            <CardDescription>
              Configure automated weekly performance reports
            </CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Report Schedule</DialogTitle>
                <DialogDescription>
                  Set up a new automated report schedule
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={formData.frequency}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, frequency: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Day</Label>
                    <Select
                      value={formData.schedule_day.toString()}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, schedule_day: parseInt(v) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map(day => (
                          <SelectItem key={day.value} value={day.value.toString()}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={formData.schedule_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, schedule_time: e.target.value }))}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Report Contents</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="team-summary"
                        checked={formData.include_team_summary}
                        onCheckedChange={(c) => setFormData(prev => ({ ...prev, include_team_summary: !!c }))}
                      />
                      <Label htmlFor="team-summary" className="text-sm font-normal flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        Team Summary
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="agent-breakdown"
                        checked={formData.include_agent_breakdown}
                        onCheckedChange={(c) => setFormData(prev => ({ ...prev, include_agent_breakdown: !!c }))}
                      />
                      <Label htmlFor="agent-breakdown" className="text-sm font-normal flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        Agent Breakdown
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="alerts-summary"
                        checked={formData.include_alerts_summary}
                        onCheckedChange={(c) => setFormData(prev => ({ ...prev, include_alerts_summary: !!c }))}
                      />
                      <Label htmlFor="alerts-summary" className="text-sm font-normal flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        Alerts Summary
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Recipients (Email)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={recipientInput}
                      onChange={(e) => setRecipientInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                    />
                    <Button type="button" variant="outline" onClick={addRecipient}>
                      Add
                    </Button>
                  </div>
                  {formData.recipients.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.recipients.map(email => (
                        <Badge key={email} variant="secondary" className="gap-1">
                          {email}
                          <button onClick={() => removeRecipient(email)} className="ml-1 hover:text-destructive">
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createSchedule.isPending}>
                  {createSchedule.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Create Schedule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {schedules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No scheduled reports yet</p>
            <p className="text-sm">Create your first automated report schedule</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {schedules.map(schedule => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                        {schedule.is_active ? 'Active' : 'Paused'}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {schedule.frequency}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {DAYS_OF_WEEK.find(d => d.value === schedule.schedule_day)?.label}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {schedule.schedule_time.slice(0, 5)}
                      </span>
                      {schedule.recipients.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {schedule.recipients.length} recipient{schedule.recipients.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {schedule.last_sent_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last sent: {format(new Date(schedule.last_sent_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={schedule.is_active}
                      onCheckedChange={() => handleToggleActive(schedule)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateNow(schedule.id)}
                      disabled={generatingId === schedule.id}
                    >
                      {generatingId === schedule.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(schedule.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
