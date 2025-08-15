
import { addDays, max as dateMax, getDay } from 'date-fns';
import type { Task, RawTask } from './types';

export const addWorkingDays = (startDate: Date, duration: number): Date => {
  let currentDate = new Date(startDate);
  // We subtract 1 from duration because the start date itself counts as the first day.
  let remainingDuration = duration - 1;

  if (remainingDuration < 0) return startDate;

  while(remainingDuration > 0) {
    currentDate = addDays(currentDate, 1);
    const dayOfWeek = getDay(currentDate);
    // 0 is Sunday, 6 is Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      remainingDuration--;
    }
  }

  return currentDate;
}

// Recalculates the actual calendar duration based on the new end date
export const getCalendarDuration = (startDate: Date, endDate: Date): number => {
  // differenceInDays is exclusive of the last day, so we add 1
  return Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

export const toTitleCase = (str: string) => {
  return str.replace(/[-_]/g, ' ').replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

export const processTasks = (rawTasks: RawTask[]): Task[] => {
    const taskMap = new Map<string, Task>();
    const orderedTasks: Task[] = [];
    const resourceEndDates = new Map<string, Date>();

    // First pass: Validate dependencies and create initial tasks
    const rawTaskMap = new Map(rawTasks.map(t => [t.title, t]));
    for (const rawTask of rawTasks) {
        for (const depTitle of rawTask.dependencies) {
            if (!rawTaskMap.has(depTitle)) {
                throw new Error(`Dependency '${depTitle}' for task '${rawTask.title}' not found.`);
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

            const dependenciesMet = rawTask.dependencies.every(depTitle => {
                const depId = rawTaskMap.get(depTitle)?.id;
                return depId ? processed.has(depId) : false;
            });

            if(dependenciesMet) {
                let effectiveStartDate = rawTask.startDate;

                // Check dependency constraints
                if (rawTask.dependencies.length > 0) {
                    const dependencyEndDates = rawTask.dependencies
                        .map(depTitle => {
                            const depId = rawTaskMap.get(depTitle)?.id;
                            return depId ? taskMap.get(depId)?.endDate : undefined;
                        })
                        .filter((d): d is Date => !!d);

                    if (dependencyEndDates.length > 0) {
                        const latestDependencyEndDate = dateMax(dependencyEndDates);
                        const dayAfterDependency = addDays(latestDependencyEndDate, 1);
                        effectiveStartDate = dateMax([effectiveStartDate, dayAfterDependency]);
                    }
                }
                
                // Check resource constraints
                if (rawTask.resource) {
                  const lastResourceTaskEndDate = resourceEndDates.get(rawTask.resource);
                  if (lastResourceTaskEndDate) {
                    const dayAfterResourceFreed = addDays(lastResourceTaskEndDate, 1);
                    effectiveStartDate = dateMax([effectiveStartDate, dayAfterResourceFreed]);
                  }
                }
                
                // Adjust start date if it falls on a weekend
                let dayOfWeek = getDay(effectiveStartDate);
                if (dayOfWeek === 0) { // Sunday
                    effectiveStartDate = addDays(effectiveStartDate, 1);
                } else if (dayOfWeek === 6) { // Saturday
                    effectiveStartDate = addDays(effectiveStartDate, 2);
                }
                
                const endDate = addWorkingDays(effectiveStartDate, rawTask.workingDuration);
                
                const finalTask: Task = {
                    ...rawTask,
                    startDate: effectiveStartDate,
                    endDate: endDate,
                    duration: getCalendarDuration(effectiveStartDate, endDate),
                };
                
                taskMap.set(finalTask.id, finalTask);
                orderedTasks.push(finalTask);
                if (finalTask.resource) {
                  resourceEndDates.set(finalTask.resource, endDate);
                }
                processed.add(finalTask.id);
                changedInPass = true;
            }
        }
    }

    if (orderedTasks.length < rawTasks.length) {
        const unprocessed = rawTasks.filter(t => !processed.has(t.id)).map(t => t.id).join(', ');
        throw new Error(`Circular dependency detected or invalid dependency structure. Could not process tasks: ${unprocessed}`);
    }

    // Sort final list by resource then start date for consistent display
    orderedTasks.sort((a, b) => {
        const resourceA = a.resource || 'zzzzzz'; // Unassigned resources last
        const resourceB = b.resource || 'zzzzzz';
        if (resourceA < resourceB) return -1;
        if (resourceA > resourceB) return 1;
        return a.startDate.getTime() - b.startDate.getTime();
    });

    return orderedTasks;
  };

    