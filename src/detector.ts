import { AuditLogEvent, SuspiciousActivity } from './types.js';

const WORKFLOW_CREATED = 'workflows.created_workflow_run';
const WORKFLOW_COMPLETED = 'workflows.completed_workflow_run';
const WORKFLOW_DELETED = 'workflows.delete_workflow_run';

interface WorkflowRunEvents {
  created?: AuditLogEvent;
  completed?: AuditLogEvent;
  deleted?: AuditLogEvent;
}

export function findSuspiciousActivity(
  events: AuditLogEvent[],
  timeWindowSeconds: number,
): SuspiciousActivity[] {
  const grouped = groupEventsByActorAndWorkflowRun(events);
  const suspicious: SuspiciousActivity[] = [];
  const timeWindowMs = timeWindowSeconds * 1000;

  for (const [key, workflowEvents] of Object.entries(grouped)) {
    const [actor, workflowRunIdStr] = key.split('|');
    const workflowRunId = parseInt(workflowRunIdStr, 10);

    // Check if all three events exist
    if (!workflowEvents.created || !workflowEvents.completed || !workflowEvents.deleted) {
      continue;
    }

    const createdTime = workflowEvents.created['@timestamp'];
    const completedTime = workflowEvents.completed['@timestamp'];
    const deletedTime = workflowEvents.deleted['@timestamp'];

    // Check if events are in the correct order
    if (completedTime < createdTime || deletedTime < completedTime) {
      continue;
    }

    // Check if the entire sequence is within the time window
    const timeRangeMs = deletedTime - createdTime;
    if (timeRangeMs > timeWindowMs) {
      continue;
    }

    // Get the repository from the created event
    const repository = workflowEvents.created.repo || 'unknown';

    suspicious.push({
      actor,
      repository,
      workflowRunId,
      createdAt: new Date(createdTime),
      completedAt: new Date(completedTime),
      deletedAt: new Date(deletedTime),
      timeRangeSeconds: Math.round(timeRangeMs / 1000),
    });
  }

  return suspicious.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

function groupEventsByActorAndWorkflowRun(
  events: AuditLogEvent[],
): Record<string, WorkflowRunEvents> {
  const grouped: Record<string, WorkflowRunEvents> = {};

  for (const event of events) {
    if (
      event.action !== WORKFLOW_CREATED &&
      event.action !== WORKFLOW_COMPLETED &&
      event.action !== WORKFLOW_DELETED
    ) {
      continue;
    }

    if (!event.workflow_run_id) {
      continue;
    }

    const key = `${event.actor}|${event.workflow_run_id}`;

    if (!grouped[key]) {
      grouped[key] = {};
    }

    if (event.action === WORKFLOW_CREATED) {
      grouped[key].created = event;
    } else if (event.action === WORKFLOW_COMPLETED) {
      grouped[key].completed = event;
    } else if (event.action === WORKFLOW_DELETED) {
      grouped[key].deleted = event;
    }
  }

  return grouped;
}
