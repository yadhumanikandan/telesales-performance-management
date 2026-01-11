import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileDown, Loader2, Calendar, BarChart3, Users, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

interface TeamMetrics {
  totalCalls: number;
  interestedCalls: number;
  notInterestedCalls: number;
  notAnsweredCalls: number;
  leadsGenerated: number;
  conversionRate: number;
}

interface AgentSummary {
  id: string;
  name: string;
  email: string;
  metrics: TeamMetrics;
}

interface TeamSummary {
  id: string;
  name: string;
  metrics: TeamMetrics;
  agents: AgentSummary[];
}

interface ReportData {
  reportPeriod: {
    start: string;
    end: string;
  };
  teamSummaries: TeamSummary[];
  alertsSummary: {
    active: number;
    acknowledged: number;
    resolved: number;
    critical: number;
  };
  generatedAt: string;
}

export const WeeklyReportPDFGenerator: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-weekly-report', {
        body: { manual: true },
      });

      if (error) throw error;
      
      if (data?.data) {
        setReportData(data.data);
        toast.success('Report data loaded');
      }
    } catch (error: any) {
      toast.error('Failed to generate report: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    const addText = (text: string, x: number, y: number, options?: { 
      fontSize?: number; 
      fontStyle?: 'normal' | 'bold'; 
      color?: [number, number, number] 
    }) => {
      const { fontSize = 12, fontStyle = 'normal', color = [0, 0, 0] } = options || {};
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', fontStyle);
      doc.setTextColor(...color);
      doc.text(text, x, y);
    };

    const addLine = (y: number) => {
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
    };

    const checkNewPage = (requiredSpace: number) => {
      if (yPos + requiredSpace > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        yPos = 20;
      }
    };

    // Header
    addText('Weekly Performance Report', margin, yPos, { fontSize: 24, fontStyle: 'bold', color: [41, 98, 255] });
    yPos += 12;
    
    const startDate = format(new Date(reportData.reportPeriod.start), 'MMM d, yyyy');
    const endDate = format(new Date(reportData.reportPeriod.end), 'MMM d, yyyy');
    addText(`${startDate} - ${endDate}`, margin, yPos, { fontSize: 12, color: [100, 100, 100] });
    yPos += 8;
    addText(`Generated: ${format(new Date(reportData.generatedAt), 'MMMM d, yyyy h:mm a')}`, margin, yPos, { fontSize: 10, color: [150, 150, 150] });
    yPos += 15;
    addLine(yPos);
    yPos += 15;

    // Alerts Summary
    addText('Alerts Summary', margin, yPos, { fontSize: 16, fontStyle: 'bold' });
    yPos += 10;

    const alertsText = `Active: ${reportData.alertsSummary.active} | Acknowledged: ${reportData.alertsSummary.acknowledged} | Resolved: ${reportData.alertsSummary.resolved} | Critical: ${reportData.alertsSummary.critical}`;
    addText(alertsText, margin, yPos, { fontSize: 10 });
    yPos += 15;

    // Team Summaries
    for (const team of reportData.teamSummaries) {
      checkNewPage(60);
      
      addText(team.name, margin, yPos, { fontSize: 14, fontStyle: 'bold', color: [41, 98, 255] });
      yPos += 8;

      // Team metrics
      const teamMetrics = [
        `Calls: ${team.metrics.totalCalls}`,
        `Interested: ${team.metrics.interestedCalls}`,
        `Leads: ${team.metrics.leadsGenerated}`,
        `Conversion: ${team.metrics.conversionRate}%`,
      ].join(' | ');
      addText(teamMetrics, margin, yPos, { fontSize: 10 });
      yPos += 10;

      // Agent table header
      if (team.agents.length > 0) {
        checkNewPage(20);
        doc.setFillColor(248, 249, 250);
        doc.rect(margin, yPos - 2, pageWidth - margin * 2, 8, 'F');
        
        const colWidths = [50, 25, 25, 25, 25, 25];
        const headers = ['Agent', 'Calls', 'Interested', 'Not Int.', 'Leads', 'Conv %'];
        let xPos = margin + 3;
        
        headers.forEach((header, i) => {
          addText(header, xPos, yPos + 4, { fontSize: 8, fontStyle: 'bold' });
          xPos += colWidths[i];
        });
        yPos += 10;

        // Agent rows
        for (const agent of team.agents) {
          checkNewPage(8);
          xPos = margin + 3;
          const values = [
            agent.name,
            agent.metrics.totalCalls.toString(),
            agent.metrics.interestedCalls.toString(),
            agent.metrics.notInterestedCalls.toString(),
            agent.metrics.leadsGenerated.toString(),
            `${agent.metrics.conversionRate}%`,
          ];
          
          values.forEach((value, i) => {
            const displayValue = i === 0 && value.length > 20 ? value.slice(0, 17) + '...' : value;
            addText(displayValue, xPos, yPos + 4, { fontSize: 8 });
            xPos += colWidths[i];
          });
          yPos += 7;
        }
      }
      
      yPos += 10;
      addLine(yPos);
      yPos += 10;
    }

    // Footer
    checkNewPage(20);
    addText('This report was automatically generated by the Sales Performance System.', margin, yPos, { fontSize: 8, color: [150, 150, 150] });

    // Save
    const fileName = `Weekly_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
    toast.success('PDF downloaded');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="h-5 w-5" />
          Generate Weekly Report
        </CardTitle>
        <CardDescription>
          Generate and download a PDF summary of last week's performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={generateReport} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <BarChart3 className="h-4 w-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
          {reportData && (
            <Button variant="outline" onClick={downloadPDF}>
              <FileDown className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          )}
        </div>

        {reportData && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(reportData.reportPeriod.start), 'MMM d')} - {format(new Date(reportData.reportPeriod.end), 'MMM d, yyyy')}
              </span>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Teams</p>
                <p className="text-xl font-bold">{reportData.teamSummaries.length}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Total Calls</p>
                <p className="text-xl font-bold">
                  {reportData.teamSummaries.reduce((sum, t) => sum + t.metrics.totalCalls, 0)}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Total Leads</p>
                <p className="text-xl font-bold">
                  {reportData.teamSummaries.reduce((sum, t) => sum + t.metrics.leadsGenerated, 0)}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Active Alerts</p>
                <p className="text-xl font-bold">{reportData.alertsSummary.active}</p>
              </div>
            </div>

            {/* Team List */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Teams Included</p>
              <div className="flex flex-wrap gap-2">
                {reportData.teamSummaries.map(team => (
                  <Badge key={team.id} variant="outline">
                    <Users className="h-3 w-3 mr-1" />
                    {team.name} ({team.agents.length} agents)
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
