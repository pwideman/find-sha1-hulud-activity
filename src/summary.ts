import * as core from '@actions/core';
import { SuspiciousActivity } from './types';

export function generateSummary(
  activities: SuspiciousActivity[],
  daysBack: number,
  timeWindow: number,
): string {
  const lines: string[] = [];

  lines.push('# Sha1-Hulud Activity Scan Results');
  lines.push('');
  lines.push('## Scan Parameters');
  lines.push(`- **Days scanned:** ${daysBack}`);
  lines.push(`- **Time window:** ${timeWindow} seconds`);
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
  lines.push('| Actor | Repository | Created At | Completed At | Deleted At | Duration (s) |');
  lines.push('|-------|------------|------------|--------------|------------|--------------|');

  for (const activity of activities) {
    lines.push(
      `| ${activity.actor} | ${activity.repository} | ${formatDate(activity.createdAt)} | ${formatDate(activity.completedAt)} | ${formatDate(activity.deletedAt)} | ${activity.timeRangeSeconds} |`,
    );
  }

  return lines.join('\n');
}

export async function writeSummary(summary: string): Promise<void> {
  await core.summary.addRaw(summary).write();
}

function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').replace('Z', ' UTC');
}

export function generateCsv(activities: SuspiciousActivity[]): string {
  const lines: string[] = [];

  lines.push('Actor,Repository,Created At,Completed At,Deleted At,Duration (seconds)');

  for (const activity of activities) {
    lines.push(
      `"${activity.actor}","${activity.repository}","${activity.createdAt.toISOString()}","${activity.completedAt.toISOString()}","${activity.deletedAt.toISOString()}",${activity.timeRangeSeconds}`,
    );
  }

  return lines.join('\n');
}
