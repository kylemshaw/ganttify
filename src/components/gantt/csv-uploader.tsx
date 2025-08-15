"use client";

import { useRef, type ChangeEvent } from 'react';
import { parse, addDays, max as dateMax, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Task } from '@/lib/types';
import { Upload, X, FileText } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface CsvUploaderProps {
  onDataUploaded: (tasks: Task[]) => void;
  onClear: () => void;
  hasData: boolean;
}

export default function CsvUploader({ onDataUploaded, onClear, hasData }: CsvUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const parsedTasks = parseCsv(text);
        onDataUploaded(parsedTasks);
        toast({
          title: "Success",
          description: `Successfully loaded ${parsedTasks.length} tasks.`,
        });
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "CSV Parsing Error",
          description: error.message,
        });
      }
      // Reset file input to allow re-uploading the same file
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const parseCsv = (csvText: string): Task[] => {
    const lines = csvText.trim().split('\n');
    const header = lines.shift()?.trim().split(',');

    if (!header || header.join(',') !== 'title,startDate,duration,dependencies') {
      throw new Error('Invalid CSV header. Expected: title,startDate,duration,dependencies');
    }

    const rawTasks = lines.map((line, index) => {
      const [title, startDateStr, durationStr, dependenciesStr] = line.trim().split(',');
      if (!title || !startDateStr || !durationStr) {
        throw new Error(`Invalid data on line ${index + 2}. Each task must have a title, startDate, and duration.`);
      }

      const startDate = parse(startDateStr, 'yyyy-MM-dd', new Date());
      if (isNaN(startDate.getTime())) {
        throw new Error(`Invalid date format on line ${index + 2}. Use YYYY-MM-DD.`);
      }

      const duration = parseInt(durationStr, 10);
      if (isNaN(duration) || duration <= 0) {
        throw new Error(`Invalid duration on line ${index + 2}. Must be a positive number.`);
      }

      const dependencies = dependenciesStr?.trim() ? dependenciesStr.trim().split(';').map(d => d.trim()).filter(Boolean) : [];
      
      return { id: title, title, startDate, duration, dependencies };
    });

    const taskMap = new Map<string, Task>();
    const orderedTasks: Task[] = [];

    // First pass: Validate dependencies and create initial tasks
    const rawTaskMap = new Map(rawTasks.map(t => [t.id, t]));
    for (const rawTask of rawTasks) {
        for (const depId of rawTask.dependencies) {
            if (!rawTaskMap.has(depId)) {
                throw new Error(`Dependency '${depId}' for task '${rawTask.title}' not found in the CSV.`);
            }
        }
    }

    // Process tasks in an order that respects dependencies
    const processed = new Set<string>();
    let changedInPass = true;
    while(orderedTasks.length < rawTasks.length && changedInPass) {
        changedInPass = false;
        for(const rawTask of rawTasks) {
            if(processed.has(rawTask.id)) continue;

            const dependenciesMet = rawTask.dependencies.every(depId => processed.has(depId));
            if(dependenciesMet) {
                let effectiveStartDate = rawTask.startDate;

                if (rawTask.dependencies.length > 0) {
                    const dependencyEndDates = rawTask.dependencies
                        .map(depId => taskMap.get(depId)!.endDate)
                        .filter((d): d is Date => !!d);

                    if (dependencyEndDates.length > 0) {
                        const latestDependencyEndDate = dateMax(dependencyEndDates);
                        const dayAfterDependency = addDays(latestDependencyEndDate, 1);
                        if(effectiveStartDate < dayAfterDependency) {
                            effectiveStartDate = dayAfterDependency;
                        }
                    }
                }
                
                const finalTask: Task = {
                    ...rawTask,
                    startDate: effectiveStartDate,
                    endDate: addDays(effectiveStartDate, rawTask.duration - 1),
                };
                
                taskMap.set(finalTask.id, finalTask);
                orderedTasks.push(finalTask);
                processed.add(finalTask.id);
                changedInPass = true;
            }
        }
    }

    if (orderedTasks.length < rawTasks.length) {
        const unprocessed = rawTasks.filter(t => !processed.has(t.id)).map(t => t.id).join(', ');
        throw new Error(`Circular dependency detected or invalid dependency structure. Could not process tasks: ${unprocessed}`);
    }

    return orderedTasks;
  };

  return (
    <div className="space-y-4">
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertTitle>CSV Format Guide</AlertTitle>
        <AlertDescription>
         Your CSV file must have a header: <br/><code className="font-mono text-sm">title,startDate,duration,dependencies</code>. Separate multiple dependencies with a semicolon (;).
        </AlertDescription>
      </Alert>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={() => fileInputRef.current?.click()} className="w-full">
          <Upload className="mr-2" /> Upload CSV
        </Button>
        <Input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        {hasData && (
          <Button onClick={onClear} variant="destructive" className="w-full sm:w-auto">
            <X className="mr-2" /> Clear
          </Button>
        )}
      </div>
    </div>
  );
}
