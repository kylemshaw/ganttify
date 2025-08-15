"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Task } from '@/lib/types';
import { addDays, differenceInDays, format, eachDayOfInterval, min, max } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GanttChartProps {
  tasks: Task[];
}

const ROW_HEIGHT = 40;
const DAY_CELL_WIDTH_MIN = 20;
const DAY_CELL_WIDTH_MAX = 100;
const DAY_CELL_WIDTH_DEFAULT = 40;

export default function GanttChart({ tasks }: GanttChartProps) {
  const [dayCellWidth, setDayCellWidth] = useState(DAY_CELL_WIDTH_DEFAULT);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { chartStartDate, chartEndDate } = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      return { chartStartDate: addDays(today, -7), chartEndDate: addDays(today, 30) };
    }
    const startDates = tasks.map(t => t.startDate);
    const endDates = tasks.map(t => t.endDate);
    const minDate = min(startDates);
    const maxDate = max(endDates);
    return {
      chartStartDate: addDays(minDate, -7),
      chartEndDate: addDays(maxDate, 7),
    };
  }, [tasks]);

  const days = useMemo(() => {
    return eachDayOfInterval({ start: chartStartDate, end: chartEndDate });
  }, [chartStartDate, chartEndDate]);

  const tasksWithPositions = useMemo(() => {
    return tasks.map((task, index) => {
      const top = index * ROW_HEIGHT;
      const left = differenceInDays(task.startDate, chartStartDate) * dayCellWidth;
      const width = task.duration * dayCellWidth - 2; // -2 for padding
      return { ...task, top, left, width };
    });
  }, [tasks, chartStartDate, dayCellWidth]);

  const dependencyLines = useMemo(() => {
    const taskMap = new Map(tasksWithPositions.map(t => [t.id, t]));
    const lines: { key: string; d: string }[] = [];
    tasksWithPositions.forEach(task => {
      task.dependencies.forEach(depId => {
        const dependencyTask = taskMap.get(depId);
        if (dependencyTask) {
          const startX = dependencyTask.left + dependencyTask.width;
          const startY = dependencyTask.top + ROW_HEIGHT / 2;
          const endX = task.left;
          const endY = task.top + ROW_HEIGHT / 2;

          const d = `M ${startX} ${startY} H ${startX + 10} V ${endY} H ${endX}`;
          lines.push({ key: `${depId}-${task.id}`, d });
        }
      });
    });
    return lines;
  }, [tasksWithPositions]);

  const handleZoom = (direction: 'in' | 'out') => {
    setDayCellWidth(prev => {
      const newWidth = direction === 'in' ? prev * 1.25 : prev / 1.25;
      return Math.max(DAY_CELL_WIDTH_MIN, Math.min(DAY_CELL_WIDTH_MAX, newWidth));
    });
  };

  const handlePan = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };
  
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
  }, [tasks]);

  const chartWidth = days.length * dayCellWidth;
  const chartHeight = tasks.length * ROW_HEIGHT;

  return (
    <TooltipProvider>
      <div className="h-full w-full flex flex-col bg-card text-card-foreground rounded-lg overflow-hidden border">
        <div className="p-2 border-b flex items-center justify-between bg-muted/50">
          <h3 className="font-semibold text-lg">Project Timeline</h3>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => handlePan('left')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => handlePan('right')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => handleZoom('in')}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => handleZoom('out')}>
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto" ref={scrollContainerRef}>
          <div className="relative" style={{ width: chartWidth, height: chartHeight }}>
            {/* Timeline Header */}
            <div className="sticky top-0 z-20 bg-background">
              <div className="flex" style={{ width: chartWidth }}>
                {days.map((day, index) => {
                  const isMonthStart = day.getDate() === 1 || index === 0;
                  return (
                    <div key={day.toISOString()} className="flex flex-col items-center" style={{ width: dayCellWidth }}>
                      {isMonthStart && (
                        <div className="text-sm font-medium text-primary -ml-8 py-1">
                          {format(day, 'MMM yyyy')}
                        </div>
                      )}
                      <div className={cn("w-full text-center border-r border-t text-xs py-1", isMonthStart ? 'border-l-2 border-primary/50' : '')}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Task List */}
            <div className="sticky left-0 z-10 w-[250px] bg-background">
              {tasks.map((task, index) => (
                <div key={task.id} className="p-2 border-r border-b truncate text-sm font-medium" style={{ height: ROW_HEIGHT, top: index * ROW_HEIGHT, position: 'absolute' }}>
                  {task.title}
                </div>
              ))}
            </div>

            {/* Grid & Bars */}
            <div className="absolute top-0 left-0 w-full h-full" style={{ marginLeft: '250px', width: `calc(100% - 250px)` }}>
               {/* Vertical grid lines */}
              <div className="absolute top-0 left-0 h-full w-full">
                {days.map((day, index) => (
                  <div key={day.toISOString()} className="absolute top-0 h-full border-r" style={{ left: index * dayCellWidth, width: dayCellWidth, borderRightStyle: day.getDay() === 0 ? 'solid' : 'dashed' }} />
                ))}
              </div>
              
              {/* Horizontal grid lines and task bars */}
              {tasksWithPositions.map((task, index) => (
                <div key={task.id} className="absolute w-full border-b" style={{ top: task.top, height: ROW_HEIGHT }}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute bg-primary/80 hover:bg-primary rounded-md my-1.5 mx-px flex items-center justify-start pl-2 cursor-pointer transition-all duration-200"
                        style={{ left: task.left, width: task.width, height: ROW_HEIGHT - 12, top: 5 }}
                      >
                        <span className="text-xs font-medium text-primary-foreground truncate hidden md:inline">{task.title}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-bold">{task.title}</p>
                      <p>Start: {format(task.startDate, 'MMM d, yyyy')}</p>
                      <p>End: {format(task.endDate, 'MMM d, yyyy')}</p>
                      <p>Duration: {task.duration} days</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              ))}
              
              {/* Dependency Arrows */}
              <svg width={chartWidth} height={chartHeight} className="absolute top-0 left-0 pointer-events-none">
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-accent)" stroke="hsl(var(--accent))" />
                  </marker>
                </defs>
                {dependencyLines.map(line => (
                  <path key={line.key} d={line.d} stroke="hsl(var(--accent))" strokeWidth="2" fill="none" markerEnd="url(#arrow)" />
                ))}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
