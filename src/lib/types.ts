
export interface RawTask {
  id: string;
  title: string;
  startDate: Date;
  workingDuration: number;
  dependencies: string[];
  resource?: string;
}

export interface Task extends RawTask {
  endDate: Date;
  duration: number; // calendar days
}
