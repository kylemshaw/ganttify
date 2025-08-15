export interface Task {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  dependencies: string[];
}
