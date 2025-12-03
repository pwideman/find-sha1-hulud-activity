import * as fs from 'fs';
import * as path from 'path';
import { AuditLogEvent } from './types.js';

export function writeCsvToFile(csvContent: string, outputDir: string, org: string): string {
  fs.mkdirSync(outputDir, { recursive: true });

  const csvFileName = `suspicious-activity-${org}.csv`;
  const csvPath = path.join(outputDir, csvFileName);
  fs.writeFileSync(csvPath, csvContent);

  return csvPath;
}

export function writeContextCsvToFile(
  events: AuditLogEvent[],
  outputDir: string,
  actor: string,
  startTime: Date,
): string {
  fs.mkdirSync(outputDir, { recursive: true });

  const timestamp = startTime.toISOString().replace(/[:.]/g, '-').replace('Z', '');
  const safeActor = actor.replace(/[^a-zA-Z0-9-_]/g, '_');
  const csvFileName = `context-${safeActor}-${timestamp}.csv`;
  const csvPath = path.join(outputDir, csvFileName);

  const csvContent = generateContextCsv(events);
  fs.writeFileSync(csvPath, csvContent);

  return csvPath;
}

function generateContextCsv(events: AuditLogEvent[]): string {
  const lines: string[] = [];

  lines.push('Timestamp,Action,Actor,User,Repository,Workflow Run ID,Country');

  for (const event of events) {
    const timestamp = new Date(event['@timestamp']).toISOString();
    const action = event.action || '';
    const actor = event.actor || '';
    const user = event.user || '';
    const repo = event.repo || '';
    const workflowRunId = event.workflow_run_id || '';
    const country = event.actor_location?.country_code || '';

    lines.push(
      `"${timestamp}","${action}","${actor}","${user}","${repo}","${workflowRunId}","${country}"`,
    );
  }

  return lines.join('\n');
}
