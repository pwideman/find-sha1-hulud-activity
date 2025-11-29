import { Octokit } from 'octokit';
import { AuditLogEvent } from './types.js';

const PAGE_SIZE = 100;

const WORKFLOW_ACTIONS = [
  'workflows.created_workflow_run',
  'workflows.completed_workflow_run',
  'workflows.delete_workflow_run',
] as const;

export async function fetchAuditLogEvents(
  token: string,
  enterprise: string,
  daysBack: number,
): Promise<AuditLogEvent[]> {
  const octokit = new Octokit({ auth: token });

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  const startDateString = startDate.toISOString().split('T')[0];

  const allEvents: AuditLogEvent[] = [];
  let cursor: string | undefined;

  const actionFilters = WORKFLOW_ACTIONS.map((action) => `action:${action}`).join(' ');
  const phrase = `${actionFilters} created:>=${startDateString}`;

  do {
    const response = await octokit.request('GET /enterprises/{enterprise}/audit-log', {
      enterprise,
      phrase,
      per_page: PAGE_SIZE,
      after: cursor,
    });

    const events = response.data as AuditLogEvent[];
    allEvents.push(...events);

    const linkHeader = response.headers.link;
    cursor = extractNextCursor(linkHeader);
  } while (cursor);

  return allEvents;
}

function extractNextCursor(linkHeader: string | undefined): string | undefined {
  if (!linkHeader) return undefined;

  const nextMatch = linkHeader.match(/<[^>]*[?&]after=([^&>]+)[^>]*>;\s*rel="next"/);
  if (nextMatch) {
    return decodeURIComponent(nextMatch[1]);
  }

  return undefined;
}
