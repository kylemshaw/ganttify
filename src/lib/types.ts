export interface Task {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  duration: number; // calendar days
  workingDuration: number; // working days
  dependencies: string[];
  resource?: string;
}
