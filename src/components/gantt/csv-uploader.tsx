
"use client";

import { useRef, useState, type ChangeEvent } from 'react';
import { parse, addDays, max as dateMax, format, getDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Task, RawTask } from '@/lib/types';
import { Upload, X, FileText, GanttChartSquare } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Label } from '../ui/label';
import { processTasks, toTitleCase } from '@/lib/task-utils';


interface CsvUploaderProps {
  onDataUploaded: (tasks: Task[], projectName: string) => void;
  onClear: () => void;
  hasData: boolean;
}

export default function CsvUploader({ onDataUploaded, onClear, hasData }: CsvUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState('');

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const fileNameWithoutExt = selectedFile.name.split('.').slice(0, -1).join('.');
    setProjectName(toTitleCase(fileNameWithoutExt));
    setFile(selectedFile);
  };
  
  const handleProcessFile = () => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "No File Selected",
        description: "Please select a CSV file to upload.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const parsedTasks = parseCsv(text);
        onDataUploaded(parsedTasks, projectName);
        toast({
          title: "Success",
          description: `Successfully loaded ${parsedTasks.length} tasks for project "${projectName}".`,
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
      setFile(null);
      setProjectName('');
    };
    reader.readAsText(file);
  }

  const parseCsv = (csvText: string): Task[] => {
    const lines = csvText.trim().split('\n');
    const headerLine = lines.shift()?.trim();
    if (!headerLine) throw new Error('CSV is empty or has no header.');
    
    const header = headerLine.split(',').map(h => h.trim());
    const hasIdColumn = header.includes('id');

    if (!header.includes('title') || !header.includes('startDate') || !header.includes('duration')) {
        throw new Error('Invalid CSV header. It must contain "title", "startDate", and "duration".');
    }

    const rawTasks: RawTask[] = lines.map((line, index) => {
        const values = line.trim().split(',');
        const row: { [key: string]: string } = {};
        header.forEach((h, i) => {
            row[h] = values[i];
        });

        const { id, title, startDate: startDateStr, duration: durationStr, dependencies: dependenciesStr, resource } = row;

        if (!title || !startDateStr || !durationStr) {
            throw new Error(`Invalid data on line ${index + 2}. Each task must have a title, startDate, and duration.`);
        }

        let startDate = parse(startDateStr, 'yyyy-MM-dd', new Date());
        if (isNaN(startDate.getTime())) {
            throw new Error(`Invalid date format on line ${index + 2}. Use YYYY-MM-DD.`);
        }
        
        const duration = parseInt(durationStr, 10);
        if (isNaN(duration) || duration <= 0) {
            throw new Error(`Invalid duration on line ${index + 2}. Must be a positive number.`);
        }

        const dependencies = dependenciesStr?.trim() ? dependenciesStr.trim().split(';').map(d => d.trim()).filter(Boolean) : [];
        
        return {
            id: hasIdColumn && id ? id.trim() : title.trim(),
            title: title.trim(),
            startDate,
            workingDuration: duration,
            dependencies,
            resource: resource?.trim()
        };
    });

    return processTasks(rawTasks);
  };

  return (
    <div className="space-y-4">
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertTitle>CSV Format Guide</AlertTitle>
        <AlertDescription>
          <div className="space-y-2 text-foreground/80">
            <p>Your CSV file must include a header row with the following columns:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
                <li><strong className="text-foreground">title:</strong> The name of the task.</li>
                <li><strong className="text-foreground">startDate:</strong> The task's start date in <code className="font-mono bg-muted/50 p-0.5 rounded">YYYY-MM-DD</code> format.</li>
                <li><strong className="text-foreground">duration:</strong> The number of working days for the task (weekends are skipped).</li>
            </ul>
            <p>Optional columns include:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
                <li><strong className="text-foreground">id:</strong> A unique identifier for the task. If not provided, the title will be used as the ID.</li>
                <li><strong className="text-foreground">dependencies:</strong> A semicolon-separated list of task <strong className="text-foreground">titles</strong> that must be completed before this task can start.</li>
                <li><strong className="text-foreground">resource:</strong> The name of the person or resource assigned to the task.</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      {!file ? (
         <Button onClick={() => fileInputRef.current?.click()} className="w-full">
            <Upload className="mr-2" /> Select CSV File
          </Button>
      ) : (
        <div className="space-y-4 rounded-md border p-4">
            <div className="space-y-2">
                <Label htmlFor='project-name'>Project Name</Label>
                <Input 
                    id="project-name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter project name"
                />
            </div>
            <Button onClick={handleProcessFile} className="w-full">
                <GanttChartSquare className="mr-2" /> Create Chart
            </Button>
        </div>
      )}
      
      <Input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {hasData && (
        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
          <Button onClick={onClear} variant="destructive" className="w-full">
            <X className="mr-2" /> Clear Chart Data
          </Button>
        </div>
      )}
    </div>
  );
}

    