import { App } from 'octokit';
import { AuditLogEvent } from './types.js';

const PAGE_SIZE = 100;

const WORKFLOW_ACTIONS = [
  'workflows.created_workflow_run',
  'workflows.completed_workflow_run',
  'workflows.delete_workflow_run',
] as const;

export async function fetchAuditLogEvents(
  appId: string,
  appPrivateKey: string,
  appInstallationId: string,
  org: string,
  daysBack: number,
  additionalPhrase: string = '',
): Promise<AuditLogEvent[]> {
  const app = new App({
    appId,
    privateKey: appPrivateKey,
  });

  const octokit = await app.getInstallationOctokit(parseInt(appInstallationId, 10));

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  const startDateString = startDate.toISOString().split('T')[0];

  const allEvents: AuditLogEvent[] = [];
  let cursor: string | undefined;

  const actionFilters = WORKFLOW_ACTIONS.map((action) => `action:${action}`).join(' ');
  let phrase = `${actionFilters} created:>=${startDateString}`;

  if (additionalPhrase.trim()) {
    phrase = `${phrase} ${additionalPhrase.trim()}`;
  }

  do {
    const response = await octokit.request('GET /orgs/{org}/audit-log', {
      org,
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

export async function fetchContextAuditLogEvents(
  appId: string,
  appPrivateKey: string,
  appInstallationId: string,
  org: string,
  actor: string,
  startTime: Date,
  endTime: Date,
): Promise<AuditLogEvent[]> {
  const app = new App({
    appId,
    privateKey: appPrivateKey,
  });

  const octokit = await app.getInstallationOctokit(parseInt(appInstallationId, 10));

  const startDateString = startTime.toISOString().split('T')[0];
  const endDateString = endTime.toISOString().split('T')[0];

  const allEvents: AuditLogEvent[] = [];
  let cursor: string | undefined;

  const phrase = `actor:${actor} created:${startDateString}..${endDateString}`;

  do {
    const response = await octokit.request('GET /orgs/{org}/audit-log', {
      org,
      phrase,
      per_page: PAGE_SIZE,
      after: cursor,
    });

    const events = response.data as AuditLogEvent[];

    const filteredEvents = events.filter((event) => {
      const eventTime = event['@timestamp'];
      return eventTime >= startTime.getTime() && eventTime <= endTime.getTime();
    });

    allEvents.push(...filteredEvents);

    const linkHeader = response.headers.link;
    cursor = extractNextCursor(linkHeader);
  } while (cursor);

  return allEvents.sort((a, b) => a['@timestamp'] - b['@timestamp']);
}

export function buildAuditLogSearchUrl(
  org: string,
  actor: string,
  startTime: Date,
  endTime: Date,
): string {
  const startDateString = startTime.toISOString().split('T')[0];
  const endDateString = endTime.toISOString().split('T')[0];
  const phrase = `actor:${actor} created:${startDateString}..${endDateString}`;

  return `https://github.com/organizations/${org}/settings/audit-log?q=${encodeURIComponent(phrase)}`;
}
