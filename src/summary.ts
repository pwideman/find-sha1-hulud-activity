import * as core from '@actions/core';
import { SuspiciousActivity } from './types.js';
import { buildAuditLogSearchUrl } from './audit-log.js';

export function generateSummary(
  activities: SuspiciousActivity[],
  daysBack: number,
  timeWindow: number,
  org: string,
  contextSearchMinutes: number,
): string {
  const lines: string[] = [];

  lines.push('# Sha1-Hulud Activity Scan Results');
  lines.push('');
  lines.push('## Scan Parameters');
  lines.push(`- **Days scanned:** ${daysBack}`);
  lines.push(`- **Time window:** ${timeWindow} seconds`);
  if (contextSearchMinutes > 0) {
    lines.push(`- **Context search window:** ${contextSearchMinutes} minutes`);
  }
  lines.push('');

  lines.push('## Statistics');

  if (activities.length === 0) {
    lines.push('');
    lines.push('✅ **No suspicious activity found.**');
    return lines.join('\n');
  }

  const uniqueActors = new Set(activities.map((a) => a.actor));
  const uniqueRepos = new Set(activities.map((a) => a.repository));

  lines.push(`- **Suspicious activity sequences:** ${activities.length}`);
  lines.push(`- **Unique actors:** ${uniqueActors.size}`);
  lines.push(`- **Unique repositories affected:** ${uniqueRepos.size}`);
  lines.push('');

  lines.push('## Suspicious Activity Details');
  lines.push('');
  lines.push(
    '| Actor | Repository | Workflow Run ID | Created At | Completed At | Deleted At | Duration (s) | Audit Log |',
  );
  lines.push(
    '|-------|------------|-----------------|------------|--------------|------------|--------------|-----------|',
  );

  for (const activity of activities) {
    const auditLogUrl = buildActivityAuditLogUrl(org, activity, contextSearchMinutes);
    lines.push(
      `| ${activity.actor} | ${activity.repository} | ${activity.workflowRunId} | ${formatDate(activity.createdAt)} | ${formatDate(activity.completedAt)} | ${formatDate(activity.deletedAt)} | ${activity.timeRangeSeconds} | [View](${auditLogUrl}) |`,
    );
  }

  if (
    contextSearchMinutes > 0 &&
    activities.some((a) => a.contextEvents && a.contextEvents.length > 0)
  ) {
    lines.push('');
    lines.push('## Context Activity Details');
    lines.push('');
    lines.push('Additional audit log activity found around the suspicious activity timeframes:');
    lines.push('');

    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      if (!activity.contextEvents || activity.contextEvents.length === 0) {
        continue;
      }

      lines.push(`### Activity ${i + 1}: ${activity.actor} in ${activity.repository}`);
      lines.push('');
      lines.push(
        `Timeframe: ${formatDate(activity.createdAt)} to ${formatDate(activity.deletedAt)}`,
      );
      lines.push('');
      lines.push('| Timestamp | Action | Actor | User | Repository | Workflow Run ID |');
      lines.push('|-----------|--------|-------|------|------------|-----------------|');

      for (const event of activity.contextEvents) {
        const timestamp = formatDate(new Date(event['@timestamp']));
        const action = event.action || '';
        const actor = event.actor || '';
        const user = event.user || '';
        const repo = event.repo || '';
        const workflowRunId = event.workflow_run_id || '';

        lines.push(
          `| ${timestamp} | ${action} | ${actor} | ${user} | ${repo} | ${workflowRunId} |`,
        );
      }

      lines.push('');
    }
  }

  return lines.join('\n');
}

function buildActivityAuditLogUrl(
  org: string,
  activity: SuspiciousActivity,
  contextSearchMinutes: number,
): string {
  const startTime = new Date(activity.createdAt.getTime() - contextSearchMinutes * 60 * 1000);
  const endTime = new Date(activity.deletedAt.getTime() + contextSearchMinutes * 60 * 1000);

  return buildAuditLogSearchUrl(org, activity.actor, startTime, endTime);
}

export async function writeSummary(summary: string): Promise<void> {
  await core.summary.addRaw(summary).write();
}

function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').replace('Z', ' UTC');
}

export function generateCsv(activities: SuspiciousActivity[]): string {
  const lines: string[] = [];

  lines.push(
    'Actor,Repository,Workflow Run ID,Created At,Completed At,Deleted At,Duration (seconds)',
  );

  for (const activity of activities) {
    lines.push(
      `"${activity.actor}","${activity.repository}",${activity.workflowRunId},"${activity.createdAt.toISOString()}","${activity.completedAt.toISOString()}","${activity.deletedAt.toISOString()}",${activity.timeRangeSeconds}`,
    );
  }

  return lines.join('\n');
}
