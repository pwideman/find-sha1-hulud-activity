export interface AuditLogEvent {
  '@timestamp': number;
  action: string;
  actor: string;
  repo?: string;
}

export interface SuspiciousActivity {
  actor: string;
  repository: string;
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
}
