
"use client";

import { useState, useMemo } from 'react';
import type { Task } from '@/lib/types';
import CsvUploader from '@/components/gantt/csv-uploader';
import GanttChart from '@/components/gantt/gantt-chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GanttChartSquare, Upload, Download, User, Calendar, Briefcase } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { format, min as dateMin, max as dateMax } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


interface ResourceSummary {
  startDate: Date;
  endDate: Date;
  totalWorkingDays: number;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [key, setKey] = useState(Date.now()); // To re-render chart on new upload
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);

  const handleDataUploaded = (newTasks: Task[]) => {
    setTasks(newTasks);
    setKey(Date.now()); // Force re-mount of GanttChart to reset its internal state
    setIsUploaderOpen(false); // Close sheet on successful upload
  };
  
  const handleClear = () => {
    setTasks([]);
    setIsUploaderOpen(false);
  }

  const handleExport = () => {
    if (tasks.length === 0) return;

    const header = 'title,startDate,duration,dependencies,resource\n';
    const csvRows = tasks.map(task => {
      const title = `"${task.title.replace(/"/g, '""')}"`;
      const startDate = format(task.startDate, 'yyyy-MM-dd');
      const duration = task.workingDuration;
      const dependencies = `"${task.dependencies.join(';')}"`;
      const resource = task.resource ? `"${task.resource.replace(/"/g, '""')}"` : '';
      return [title, startDate, duration, dependencies, resource].join(',');
    });

    const csvContent = header + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-t;' });
    const link = document.createElement('a');
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'gantt-chart-export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resourceSummary = useMemo(() => {
    if (tasks.length === 0) return null;

    const summary = new Map<string, ResourceSummary>();

    tasks.forEach(task => {
      if (task.resource) {
        const resource = task.resource;
        const existing = summary.get(resource);
        if (existing) {
          existing.startDate = dateMin([existing.startDate, task.startDate]);
          existing.endDate = dateMax([existing.endDate, task.endDate]);
          existing.totalWorkingDays += task.workingDuration;
        } else {
          summary.set(resource, {
            startDate: task.startDate,
            endDate: task.endDate,
            totalWorkingDays: task.workingDuration
          });
        }
      }
    });

    const sortedSummary = Array.from(summary.entries()).sort(([a], [b]) => a.localeCompare(b));
    
    // Project total calculation
    const projectStartDate = dateMin(tasks.map(t => t.startDate));
    const projectEndDate = dateMax(tasks.map(t => t.endDate));
    const projectTotalDays = Array.from(summary.values()).reduce((acc, curr) => acc + curr.totalWorkingDays, 0);

    const projectSummary: [string, ResourceSummary] = ['Project Total', {
      startDate: projectStartDate,
      endDate: projectEndDate,
      totalWorkingDays: projectTotalDays
    }];

    return [...sortedSummary, projectSummary];

  }, [tasks]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-body">
      <header className="p-4 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-headline text-primary">Ganttify</h1>
            <p className="text-muted-foreground">Create Gantt charts from your CSV files instantly.</p>
          </div>
          <div className="flex items-center gap-2">
            {tasks.length > 0 && (
              <Button onClick={handleExport} variant="outline">
                <Download className="mr-2" />
                Export CSV
              </Button>
            )}
            <Sheet open={isUploaderOpen} onOpenChange={setIsUploaderOpen}>
              <SheetTrigger asChild>
                <Button>
                  <Upload className="mr-2" />
                  Upload CSV
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Upload Your Data</SheetTitle>
                  <SheetDescription>
                    Upload a CSV file to generate your Gantt chart. You can also clear the existing chart.
                  </SheetDescription>
                </SheetHeader>
                <div className="py-4">
                  <CsvUploader onDataUploaded={handleDataUploaded} onClear={handleClear} hasData={tasks.length > 0} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto p-4 flex flex-col gap-6">
        <div className="flex-1 w-full">
           <Card className="shadow-md">
            <CardContent className="p-0">
              {tasks.length > 0 ? (
                <GanttChart key={key} tasks={tasks} />
              ) : (
                <div className="flex items-center justify-center min-h-[500px] rounded-lg bg-muted/50">
                  <div className="text-center text-muted-foreground p-8">
                    <GanttChartSquare className="mx-auto h-16 w-16 mb-4 text-primary/50" />
                    <h2 className="text-xl font-semibold mb-2 text-foreground">Your Gantt Chart Awaits</h2>
                    <p>Click "Upload CSV" to get started. The chart will dynamically appear here.</p>
                    <div className="mt-4 text-sm text-left bg-background/50 p-4 rounded-md border">
                      <h3 className="font-semibold mb-2 text-foreground">CSV Format:</h3>
                      <code className="block whitespace-pre-wrap font-mono text-xs">
                        title,startDate,duration,dependencies,resource<br/>
                        Task A,2024-08-01,5,,Resource 1<br/>
                        Task B,2024-08-08,4,Task A,Resource 2<br/>
                        Task C,2024-08-08,6,Task A,Resource 1
                      </code>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        {resourceSummary && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase />
                Resource Summary
              </CardTitle>
              <CardDescription>
                An overview of resource allocation and project timeline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">
                      <div className="flex items-center gap-2"><User /> Resource</div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2"><Calendar /> Start Date</div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2"><Calendar /> End Date</div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center gap-2 justify-end"><Briefcase /> Total Working Days</div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resourceSummary.map(([resource, summary]) => (
                    <TableRow key={resource} className={resource === 'Project Total' ? 'bg-muted/80 hover:bg-muted font-bold' : ''}>
                      <TableCell>{resource}</TableCell>
                      <TableCell>{format(summary.startDate, 'MMM d, yyyy')}</TableCell>
                      <TableCell>{format(summary.endDate, 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">{summary.totalWorkingDays}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
