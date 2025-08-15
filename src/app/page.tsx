
"use client";

import { useState } from 'react';
import type { Task } from '@/lib/types';
import CsvUploader from '@/components/gantt/csv-uploader';
import GanttChart from '@/components/gantt/gantt-chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GanttChartSquare } from 'lucide-react';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [key, setKey] = useState(Date.now()); // To re-render chart on new upload

  const handleDataUploaded = (newTasks: Task[]) => {
    setTasks(newTasks);
    setKey(Date.now()); // Force re-mount of GanttChart to reset its internal state
  };
  
  const handleClear = () => {
    setTasks([]);
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-body">
      <header className="p-4 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold font-headline text-primary">Ganttify</h1>
          <p className="text-muted-foreground">Create Gantt charts from your CSV files instantly.</p>
        </div>
      </header>
      <main className="flex-1 container mx-auto p-4 flex flex-col gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Upload Your Data</CardTitle>
            <CardDescription>Upload a CSV file to generate your Gantt chart. You can also clear the existing chart.</CardDescription>
          </CardHeader>
          <CardContent>
            <CsvUploader onDataUploaded={handleDataUploaded} onClear={handleClear} hasData={tasks.length > 0} />
          </CardContent>
        </Card>
        
        <div className="flex-1">
           <Card className="shadow-md min-h-[600px] h-full">
            <CardContent className="h-full p-2 md:p-4">
              {tasks.length > 0 ? (
                <GanttChart key={key} tasks={tasks} />
              ) : (
                <div className="flex items-center justify-center h-full rounded-lg bg-muted/50">
                  <div className="text-center text-muted-foreground p-8">
                    <GanttChartSquare className="mx-auto h-16 w-16 mb-4 text-primary/50" />
                    <h2 className="text-xl font-semibold mb-2 text-foreground">Your Gantt Chart Awaits</h2>
                    <p>Upload a CSV file with your project tasks to get started. The chart will dynamically appear here.</p>
                    <div className="mt-4 text-sm text-left bg-background/50 p-4 rounded-md border">
                      <h3 className="font-semibold mb-2 text-foreground">CSV Format:</h3>
                      <code className="block whitespace-pre-wrap font-mono text-xs">
                        title,startDate,duration,dependencies<br/>
                        Task A,2024-08-01,5,<br/>
                        Task B,2024-08-08,4,Task A<br/>
                        Task C,2024-08-08,6,Task A
                      </code>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
