
"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Task } from '@/lib/types';
import { addDays, differenceInDays, format, eachDayOfInterval, min, max, getDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface GanttChartProps {
  tasks: Task[];
}

const ROW_HEIGHT = 40;
const DAY_CELL_WIDTH_MIN = 20;
const DAY_CELL_WIDTH_MAX = 150;
const DAY_CELL_WIDTH_DEFAULT = 50;
const HEADER_HEIGHT = 40;
const TASK_LIST_WIDTH = 250;
const TASK_BAR_HEIGHT = 28;
const ARROW_HEAD_SIZE = 5;

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
      chartStartDate: addDays(minDate, -1),
      chartEndDate: addDays(maxDate, 7),
    };
  }, [tasks]);

  const days = useMemo(() => {
    return eachDayOfInterval({ start: chartStartDate, end: chartEndDate });
  }, [chartStartDate, chartEndDate]);

  const tasksWithPositions = useMemo(() => {
    return tasks.map((task, index) => {
      const top = index * ROW_HEIGHT + (ROW_HEIGHT - TASK_BAR_HEIGHT) / 2;
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
            const startX = dependencyTask.left + dependencyTask.width / 2;
            const startY = dependencyTask.top + TASK_BAR_HEIGHT;
            
            const endX = task.left - ARROW_HEAD_SIZE - 2;
            const endY = task.top + TASK_BAR_HEIGHT / 2;
  
            const d = `M ${startX} ${startY} V ${endY} H ${endX}`;
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
      if(tasks.length > 0) {
        const firstTaskLeft = differenceInDays(tasks[0].startDate, chartStartDate) * dayCellWidth;
        scrollContainerRef.current.scrollLeft = Math.max(0, firstTaskLeft - 50);
      } else {
        const todayIndex = differenceInDays(new Date(), chartStartDate);
        if (todayIndex > 0 && todayIndex < days.length) {
          scrollContainerRef.current.scrollLeft = (todayIndex * dayCellWidth) - (scrollContainerRef.current.clientWidth / 2);
        } else {
          scrollContainerRef.current.scrollLeft = 0;
        }
      }
    }
  }, [tasks, chartStartDate, dayCellWidth, days.length]);

  const chartWidth = days.length * dayCellWidth;
  const chartHeight = tasks.length * ROW_HEIGHT;

  return (
    <TooltipProvider>
      <div className="w-full flex flex-col bg-card text-card-foreground rounded-lg overflow-hidden border">
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
        <div className="overflow-x-auto" ref={scrollContainerRef}>
          <div className="relative" style={{ width: chartWidth + TASK_LIST_WIDTH, height: chartHeight + HEADER_HEIGHT }}>
            {/* Header */}
            <div className="sticky top-0 z-20 bg-background flex" style={{width: chartWidth + TASK_LIST_WIDTH}}>
              <div className="sticky left-0 z-10 border-r border-b p-2 flex items-center bg-background" style={{width: TASK_LIST_WIDTH, minWidth: TASK_LIST_WIDTH, height: HEADER_HEIGHT}}>
                 <h4 className="font-semibold">Tasks</h4>
              </div>
              <div className="overflow-hidden">
                <div className="flex" style={{ width: chartWidth }}>
                  {days.map((day) => {
                      const dayOfWeek = getDay(day);
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                      return (
                        <div 
                          key={day.toISOString()} 
                          className={cn("flex items-center justify-center border-b border-r text-center text-xs text-muted-foreground", {
                            "bg-muted": isWeekend,
                          })}
                          style={{ width: dayCellWidth, minWidth: dayCellWidth, height: HEADER_HEIGHT }}
                        >
                          <div>{format(day, 'MMM d')}</div>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="relative" style={{ width: chartWidth + TASK_LIST_WIDTH, height: chartHeight }}>
              {/* Task List */}
              <div className="absolute top-0 left-0 z-10 bg-background" style={{ width: TASK_LIST_WIDTH, height: chartHeight }}>
                {tasksWithPositions.map((task, index) => (
                  <div 
                    key={task.id} 
                    className="p-2 border-r border-b truncate text-sm flex items-center justify-between"
                    style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT, width: TASK_LIST_WIDTH, position: 'absolute' }}
                  >
                    <div className='flex items-center gap-2'>
                        <span className="font-medium truncate">{task.title}</span>
                        <span className="text-muted-foreground">{task.workingDuration} days</span>
                    </div>

                    {task.resource && (
                      <Badge variant="secondary" className="gap-1.5 shrink-0">
                        <User className="w-3 h-3" />
                        {task.resource}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>

              {/* Grid & Bars */}
              <div className="absolute top-0" style={{ left: TASK_LIST_WIDTH, width: chartWidth, height: chartHeight }}>
                {/* Vertical grid lines */}
                <div className="absolute top-0 left-0 h-full w-full">
                  {days.map((day, index) => {
                    const dayOfWeek = getDay(day);
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    return (
                      <div 
                        key={day.toISOString()} 
                        className={cn("absolute top-0 h-full border-r", {
                          "bg-muted/75": isWeekend,
                        })}
                        style={{ 
                          left: index * dayCellWidth, 
                          width: dayCellWidth, 
                          borderRightStyle: dayOfWeek === 0 ? 'solid' : 'dashed' 
                        }} 
                      />
                    )
                  })}
                </div>
                
                {/* Horizontal grid lines */}
                {tasksWithPositions.map((_, index) => (
                  <div key={index} className="w-full border-b" style={{ height: ROW_HEIGHT, top: index*ROW_HEIGHT, position: 'absolute' }} />
                ))}

                {/* Task Bars & Dep Lines Container */}
                <div className="absolute top-0 left-0 w-full h-full">
                    {/* Dependency Arrows */}
                    <svg width={chartWidth} height={chartHeight} className="absolute top-0 left-0 pointer-events-none z-0">
                      <defs>
                        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--accent))" stroke="hsl(var(--accent))" />
                        </marker>
                      </defs>
                      {dependencyLines.map(line => (
                        <path key={line.key} d={line.d} stroke="hsl(var(--accent))" strokeWidth="2" fill="none" markerEnd="url(#arrow)" />
                      ))}
                    </svg>

                    {/* Task Bars */}
                    {tasksWithPositions.map((task) => (
                        <Tooltip key={task.id}>
                          <TooltipTrigger asChild>
                            <div
                              className="absolute bg-primary/80 hover:bg-primary rounded-md flex items-center justify-start pl-2 cursor-pointer transition-all duration-200 z-10"
                              style={{ top: task.top, left: task.left, width: task.width, height: TASK_BAR_HEIGHT }}
                            >
                              <span className="text-xs font-medium text-primary-foreground truncate hidden md:inline">{task.title}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-bold">{task.title}</p>
                            {task.resource && <p>Resource: {task.resource}</p>}
                            <p>Start: {format(task.startDate, 'MMM d, yyyy')}</p>
                            {task.endDate && <p>End: {format(task.endDate, 'MMM d, yyyy')}</p>}
                            <p>Duration: {task.workingDuration} working days</p>
                          </TooltipContent>
                        </Tooltip>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
