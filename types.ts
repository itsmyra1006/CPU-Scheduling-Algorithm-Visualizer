export type ProcessState = 'not arrived' | 'waiting' | 'running' | 'completed';

export interface Process {
  id: number;
  name: string;
  arrivalTime: number;
  burstTime: number;
  priority: number | null;
  remainingTime: number;
  color: string;
  completionTime: number;
  turnaroundTime: number;
  waitingTime: number;
  state: ProcessState;
}

export interface GanttEntry {
  processName: string;
  start: number;
  end: number;
  color: string;
}

export interface AlgorithmResult {
  name: string;
  ganttChart: GanttEntry[];
  processes: Process[];
  avgWaitingTime: number;
  avgTurnaroundTime: number;
  totalTime: number;
}
