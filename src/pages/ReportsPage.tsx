import React from 'react';
import { ScheduledReportsManager } from '@/components/reports/ScheduledReportsManager';
import { WeeklyReportPDFGenerator } from '@/components/reports/WeeklyReportPDFGenerator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Download } from 'lucide-react';

const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground">
          Generate and schedule automated performance reports
        </p>
      </div>

      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList>
          <TabsTrigger value="generate" className="gap-2">
            <Download className="h-4 w-4" />
            Generate Report
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-2">
            <Calendar className="h-4 w-4" />
            Scheduled Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          <WeeklyReportPDFGenerator />
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <ScheduledReportsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
