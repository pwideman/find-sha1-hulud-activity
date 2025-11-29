import { AuditLogEvent, SuspiciousActivity } from './types';

const WORKFLOW_CREATED = 'workflows.created_workflow_run';
const WORKFLOW_COMPLETED = 'workflows.completed_workflow_run';
const WORKFLOW_DELETED = 'workflows.delete_workflow_run';

interface EventsByActorRepo {
  created: AuditLogEvent[];
  completed: AuditLogEvent[];
  deleted: AuditLogEvent[];
}

export function findSuspiciousActivity(
  events: AuditLogEvent[],
  timeWindowSeconds: number,
): SuspiciousActivity[] {
  const grouped = groupEventsByActorAndRepo(events);
  const suspicious: SuspiciousActivity[] = [];

  for (const [key, actorRepoEvents] of Object.entries(grouped)) {
    const [actor, repository] = key.split('|');

    const matches = findMatchingSequences(actorRepoEvents, timeWindowSeconds);

    for (const match of matches) {
      suspicious.push({
        actor,
        repository,
        createdAt: new Date(match.created['@timestamp']),
        completedAt: new Date(match.completed['@timestamp']),
        deletedAt: new Date(match.deleted['@timestamp']),
        timeRangeSeconds: match.timeRangeSeconds,
      });
    }
  }

  return suspicious.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

function groupEventsByActorAndRepo(events: AuditLogEvent[]): Record<string, EventsByActorRepo> {
  const grouped: Record<string, EventsByActorRepo> = {};

  for (const event of events) {
    if (
      event.action !== WORKFLOW_CREATED &&
      event.action !== WORKFLOW_COMPLETED &&
      event.action !== WORKFLOW_DELETED
    ) {
      continue;
    }

    if (!event.repo) {
      continue;
    }

    const key = `${event.actor}|${event.repo}`;

    if (!grouped[key]) {
      grouped[key] = { created: [], completed: [], deleted: [] };
    }

    if (event.action === WORKFLOW_CREATED) {
      grouped[key].created.push(event);
    } else if (event.action === WORKFLOW_COMPLETED) {
      grouped[key].completed.push(event);
    } else if (event.action === WORKFLOW_DELETED) {
      grouped[key].deleted.push(event);
    }
  }

  return grouped;
}

interface MatchedSequence {
  created: AuditLogEvent;
  completed: AuditLogEvent;
  deleted: AuditLogEvent;
  timeRangeSeconds: number;
}

function findMatchingSequences(
  actorRepoEvents: EventsByActorRepo,
  timeWindowSeconds: number,
): MatchedSequence[] {
  const matches: MatchedSequence[] = [];
  const timeWindowMs = timeWindowSeconds * 1000;

  const { created, completed, deleted } = actorRepoEvents;

  // Sort events by timestamp
  const sortedCreated = [...created].sort((a, b) => a['@timestamp'] - b['@timestamp']);
  const sortedCompleted = [...completed].sort((a, b) => a['@timestamp'] - b['@timestamp']);
  const sortedDeleted = [...deleted].sort((a, b) => a['@timestamp'] - b['@timestamp']);

  // Track used events to avoid double-counting
  const usedCompleted = new Set<number>();
  const usedDeleted = new Set<number>();

  for (const createdEvent of sortedCreated) {
    const createdTime = createdEvent['@timestamp'];

    // Find a matching completed event (must be after created, within time window)
    let matchedCompleted: AuditLogEvent | null = null;
    for (let i = 0; i < sortedCompleted.length; i++) {
      const completedEvent = sortedCompleted[i];
      if (usedCompleted.has(i)) continue;

      const completedTime = completedEvent['@timestamp'];
      if (completedTime >= createdTime && completedTime - createdTime <= timeWindowMs) {
        matchedCompleted = completedEvent;
        usedCompleted.add(i);
        break;
      }
    }

    if (!matchedCompleted) continue;

    // Find a matching deleted event (must be after completed, within time window from created)
    const completedTime = matchedCompleted['@timestamp'];
    let matchedDeleted: AuditLogEvent | null = null;
    for (let i = 0; i < sortedDeleted.length; i++) {
      const deletedEvent = sortedDeleted[i];
      if (usedDeleted.has(i)) continue;

      const deletedTime = deletedEvent['@timestamp'];
      if (deletedTime >= completedTime && deletedTime - createdTime <= timeWindowMs) {
        matchedDeleted = deletedEvent;
        usedDeleted.add(i);
        break;
      }
    }

    if (!matchedDeleted) continue;

    const timeRangeMs = matchedDeleted['@timestamp'] - createdTime;
    matches.push({
      created: createdEvent,
      completed: matchedCompleted,
      deleted: matchedDeleted,
      timeRangeSeconds: Math.round(timeRangeMs / 1000),
    });
  }

  return matches;
}
