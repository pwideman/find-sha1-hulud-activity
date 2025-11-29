import { Octokit } from 'octokit';
import { AuditLogEvent } from './types';

const PAGE_SIZE = 100;

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

  const phrase = `action:workflows.created_workflow_run action:workflows.completed_workflow_run action:workflows.delete_workflow_run created:>=${startDateString}`;

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
