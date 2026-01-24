export interface CronJobLog {
  id: string;
  jobName: string;
  status: string;
  output?: string;
  executionTime: number;
  startedAt: Date;
  endedAt: Date;
}
