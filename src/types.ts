export interface AuditLogEvent {
  '@timestamp': number;
  action: string;
  actor: string;
  repo?: string;
  workflow_run_id?: number;
  user?: string;
  actor_location?: {
    country_code?: string;
  };
}

export interface SuspiciousActivity {
  actor: string;
  repository: string;
  workflowRunId: number;
  createdAt: Date;
  completedAt: Date;
  deletedAt: Date;
  timeRangeSeconds: number;
  contextEvents?: AuditLogEvent[];
}

export interface ActionInputs {
  org: string;
  appId: string;
  appInstallationId: string;
  appPrivateKey: string;
  daysBack: number;
  timeWindow: number;
  outputDir: string;
  additionalPhrase: string;
  contextSearchMinutes: number;
}
