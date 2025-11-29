import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { DefaultArtifactClient } from '@actions/artifact';
import { fetchAuditLogEvents } from './audit-log';
import { findSuspiciousActivity } from './detector';
import { generateCsv, generateSummary, writeSummary } from './summary';
import { ActionInputs } from './types';

export function getInputs(): ActionInputs {
  const token = core.getInput('token', { required: true });
  const enterprise = core.getInput('enterprise', { required: true });
  const daysBackStr = core.getInput('days-back') || '7';
  const timeWindowStr = core.getInput('time-window') || '20';

  const daysBack = parseInt(daysBackStr, 10);
  if (isNaN(daysBack) || daysBack <= 0) {
    throw new Error(`Invalid days-back value: ${daysBackStr}`);
  }

  const timeWindow = parseInt(timeWindowStr, 10);
  if (isNaN(timeWindow) || timeWindow <= 0) {
    throw new Error(`Invalid time-window value: ${timeWindowStr}`);
  }

  return { token, enterprise, daysBack, timeWindow };
}

export async function run(): Promise<void> {
  try {
    const inputs = getInputs();

    core.info(`Searching audit logs for enterprise: ${inputs.enterprise}`);
    core.info(`Looking back ${inputs.daysBack} days`);
    core.info(`Time window: ${inputs.timeWindow} seconds`);

    core.info('Fetching audit log events...');
    const events = await fetchAuditLogEvents(inputs.token, inputs.enterprise, inputs.daysBack);
    core.info(`Retrieved ${events.length} workflow events`);

    core.info('Analyzing events for suspicious activity...');
    const suspiciousActivities = findSuspiciousActivity(events, inputs.timeWindow);

    const uniqueActors = new Set(suspiciousActivities.map((a) => a.actor));

    core.setOutput('suspicious-actors-count', uniqueActors.size);
    core.setOutput('suspicious-activities-count', suspiciousActivities.length);

    if (suspiciousActivities.length === 0) {
      core.info('No suspicious activity found.');
    } else {
      core.warning(
        `Found ${suspiciousActivities.length} suspicious activity sequences from ${uniqueActors.size} actors`,
      );
    }

    const summary = generateSummary(suspiciousActivities, inputs.daysBack, inputs.timeWindow);
    await writeSummary(summary);

    if (suspiciousActivities.length > 0) {
      const csv = generateCsv(suspiciousActivities);
      const artifactDir = path.join(process.env.RUNNER_TEMP || '/tmp', 'sha1-hulud-artifacts');
      fs.mkdirSync(artifactDir, { recursive: true });

      const csvPath = path.join(artifactDir, 'suspicious-activity.csv');
      fs.writeFileSync(csvPath, csv);

      const artifact = new DefaultArtifactClient();
      await artifact.uploadArtifact('sha1-hulud-suspicious-activity', [csvPath], artifactDir);
      core.info('Uploaded suspicious activity CSV as workflow artifact');
    }

    core.info('Scan complete.');
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unknown error occurred');
    }
  }
}
