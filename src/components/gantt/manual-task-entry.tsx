
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, GanttChartSquare, Plus, Trash2 } from 'lucide-react';
import { format, parse } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { RawTask } from '@/lib/types';


interface ManualTask {
  id: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  duration: string;
  dependencies: string;
  resource: string;
}

interface ManualTaskEntryProps {
  onAddTasks: (tasks: RawTask[]) => void;
  hasTasks: boolean;
}

const newRow = (): ManualTask => ({
  id: `task-${Date.now()}-${Math.random()}`,
  title: '',
  startDate: format(new Date(), 'yyyy-MM-dd'),
  duration: '1',
  dependencies: '',
  resource: '',
});

export default function ManualTaskEntry({ onAddTasks, hasTasks }: ManualTaskEntryProps) {
  const [rows, setRows] = useState<ManualTask[]>([newRow()]);
  const [projectName, setProjectName] = useState('My Project');
  const { toast } = useToast();

  const handleAddRow = () => {
    setRows([...rows, newRow()]);
  };

  const handleRemoveRow = (id: string) => {
    setRows(rows.filter(row => row.id !== id));
  };

  const handleRowChange = (id: string, field: keyof Omit<ManualTask, 'id'>, value: string) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleGenerateChart = () => {
    if (!hasTasks && !projectName.trim()) {
      toast({
        variant: "destructive",
        title: "Project Name Required",
        description: "Please enter a name for the project.",
      });
      return;
    }
    
    try {
       const rawTasks: RawTask[] = rows
        .filter(row => row.title.trim() !== '' && row.duration.trim() !== '')
        .map((row, index) => {
          if (!row.title || !row.startDate || !row.duration) {
              throw new Error(`Invalid data on row ${index + 1}. Each task must have a title, startDate, and duration.`);
          }

          let startDate = parse(row.startDate, 'yyyy-MM-dd', new Date());
          if (isNaN(startDate.getTime())) {
              throw new Error(`Invalid date format on row ${index + 1}. Use YYYY-MM-DD.`);
          }
          
          const duration = parseInt(row.duration, 10);
          if (isNaN(duration) || duration <= 0) {
              throw new Error(`Invalid duration on row ${index + 1}. Must be a positive number.`);
          }

          const dependencies = row.dependencies?.trim() ? row.dependencies.trim().split(';').map(d => d.trim()).filter(Boolean) : [];
          
          return {
              id: row.title, // Use title as ID for dependency linking and uniqueness
              title: row.title.trim(),
              startDate,
              workingDuration: duration,
              dependencies,
              resource: row.resource?.trim()
          };
        });

      if (rawTasks.length === 0) {
        toast({
          variant: "destructive",
          title: "No Tasks to Add",
          description: "Please fill out at least one task row.",
        });
        return;
      }
      
      onAddTasks(rawTasks);

    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Processing Error",
        description: error.message,
      });
    }
  };


  return (
    <div className="space-y-4">
      {!hasTasks && (
        <div className="space-y-2">
            <Label htmlFor='project-name-manual'>Project Name</Label>
            <Input 
                id="project-name-manual"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
            />
        </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead className="w-[100px]">Duration</TableHead>
              <TableHead>Dependencies</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Input 
                    value={row.title} 
                    onChange={e => handleRowChange(row.id, 'title', e.target.value)}
                    placeholder={`Task ${index + 1}`}
                  />
                </TableCell>
                <TableCell>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={"outline"}
                            className={cn("w-full justify-start text-left font-normal", !row.startDate && "text-muted-foreground")}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {row.startDate ? format(parse(row.startDate, 'yyyy-MM-dd', new Date()), "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={parse(row.startDate, 'yyyy-MM-dd', new Date())}
                                onSelect={(date) => date && handleRowChange(row.id, 'startDate', format(date, 'yyyy-MM-dd'))}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </TableCell>
                 <TableCell>
                  <Input 
                    type="number"
                    value={row.duration} 
                    onChange={e => handleRowChange(row.id, 'duration', e.target.value)}
                    min="1"
                    placeholder='Days'
                  />
                </TableCell>
                 <TableCell>
                  <Input 
                    value={row.dependencies} 
                    onChange={e => handleRowChange(row.id, 'dependencies', e.target.value)}
                    placeholder='Task 1;Task 2'
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    value={row.resource} 
                    onChange={e => handleRowChange(row.id, 'resource', e.target.value)}
                    placeholder='Resource Name'
                  />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveRow(row.id)} disabled={rows.length <= 1}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-between items-center mt-4">
        <Button variant="outline" onClick={handleAddRow}>
            <Plus className="mr-2" />
            Add Row
        </Button>
        <Button onClick={handleGenerateChart}>
            <GanttChartSquare className="mr-2" />
            {hasTasks ? 'Add to Project' : 'Create Chart'}
        </Button>
      </div>
    </div>
  );
}
