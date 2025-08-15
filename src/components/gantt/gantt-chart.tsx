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

const ROW_HEIGHT = 60;
const DAY_CELL_WIDTH_MIN = 20;
const DAY_CELL_WIDTH_MAX = 150;
const DAY_CELL_WIDTH_DEFAULT = 50;

export default function GanttChart({ tasks }: GanttChartProps) {
  const [dayCellWidth, setDayCellWidth] = useState(DAY_CELL_WIDTH_DEFAULT);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { chartStartDate, chartEndDate } = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      return { chartStartDate: today, chartEndDate: addDays(today, 30) };
    }
    const startDates = tasks.map(t => t.startDate);
    const endDates = tasks.map(t => t.endDate).filter((d): d is Date => !!d);
    
    const minDate = min(startDates);
    const maxDate = endDates.length > 0 ? max(endDates) : addDays(minDate, 30);
    
    return {
      chartStartDate: minDate,
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
      return { ...task, top, left, width, rowIndex: index };
    });
  }, [tasks, chartStartDate, dayCellWidth]);

  const dependencyLines = useMemo(() => {
    const taskMap = new Map(tasksWithPositions.map(t => [t.id, t]));
    const lines: { key: string; d: string }[] = [];
    tasksWithPositions.forEach(task => {
      if(task.dependencies) {
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
      }
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
          <div className="relative grid" style={{ width: chartWidth + 250, minHeight: chartHeight }}>
            {/* Header */}
            <div className="sticky top-0 z-20 bg-background grid" style={{ gridTemplateColumns: '250px 1fr' }}>
              <div className="sticky left-0 z-10 border-r border-b p-2 flex items-center bg-background">
                 <h4 className="font-semibold">Tasks</h4>
              </div>
              <div className="overflow-hidden">
                <div className="flex" style={{ width: chartWidth }}>
                  {days.map((day) => {
                    const isMonthStart = day.getDate() === 1;
                    return (
                      <div 
                        key={day.toISOString()} 
                        className={cn(
                          "flex flex-col items-center justify-center border-b border-r h-12",
                          isMonthStart ? "border-l-2 border-primary/50" : ""
                        )}
                        style={{ width: dayCellWidth }}
                      >
                         <div className="text-xs text-muted-foreground">{format(day, 'MMM')}</div>
                         <div className="text-sm font-medium">{format(day, 'd')}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="relative" style={{ gridColumn: '1 / -1', gridRow: '2' }}>
              {/* Task List */}
              <div className="absolute top-0 left-0 z-10" style={{ width: 250 }}>
                {tasks.map((task, index) => (
                  <div 
                    key={task.id} 
                    className="sticky left-0 bg-background p-2 border-r border-b truncate text-sm font-medium flex items-center"
                    style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT, width: 250 }}
                  >
                    {task.title}
                  </div>
                ))}
              </div>

              {/* Grid & Bars */}
              <div className="absolute top-0 left-[250px]" style={{ width: chartWidth, height: chartHeight }}>
                {/* Vertical grid lines */}
                <div className="absolute top-0 left-0 h-full w-full">
                  {days.map((day, index) => (
                    <div 
                      key={day.toISOString()} 
                      className="absolute top-0 h-full border-r" 
                      style={{ 
                        left: index * dayCellWidth, 
                        width: dayCellWidth, 
                        borderRightStyle: day.getDay() === 0 ? 'solid' : 'dashed' 
                      }} 
                    />
                  ))}
                </div>
                
                {/* Horizontal grid lines */}
                {tasks.map((_, index) => (
                  <div key={index} className="w-full border-b" style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT, position: 'absolute' }} />
                ))}

                {/* Task Bars */}
                {tasksWithPositions.map((task) => (
                    <Tooltip key={task.id}>
                      <TooltipTrigger asChild>
                        <div
                          className="absolute bg-primary/80 hover:bg-primary rounded-md my-1.5 mx-px flex items-center justify-start pl-2 cursor-pointer transition-all duration-200"
                          style={{ top: task.top + 6, left: task.left, width: task.width, height: ROW_HEIGHT - 12 }}
                        >
                          <span className="text-xs font-medium text-primary-foreground truncate hidden md:inline">{task.title}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-bold">{task.title}</p>
                        <p>Start: {format(task.startDate, 'MMM d, yyyy')}</p>
                        {task.endDate && <p>End: {format(task.endDate, 'MMM d, yyyy')}</p>}
                        <p>Duration: {task.duration} days</p>
                      </TooltipContent>
                    </Tooltip>
                ))}
                
                {/* Dependency Arrows */}
                <svg width={chartWidth} height={chartHeight} className="absolute top-0 left-0 pointer-events-none">
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--accent))" stroke="hsl(var(--accent))" />
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
      </div>
    </TooltipProvider>
  );
}
