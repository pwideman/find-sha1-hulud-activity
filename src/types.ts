export interface AuditLogEvent {
  '@timestamp': number;
  action: string;
  actor: string;
  repo?: string;
  workflow_run_id?: number;
}

export interface SuspiciousActivity {
  actor: string;
  repository: string;
  workflowRunId: number;
  createdAt: Date;
  completedAt: Date;
  deletedAt: Date;
  timeRangeSeconds: number;
}

export interface ActionInputs {
  token: string;
  enterprise: string;
  daysBack: number;
  timeWindow: number;
  outputDir: string;
}
