import * as core from '@actions/core';
import { writeCsvToFile } from './artifact-writer.js';
import { fetchAuditLogEvents } from './audit-log.js';
import { findSuspiciousActivity } from './detector.js';
import { generateCsv, generateSummary, writeSummary } from './summary.js';
import { ActionInputs } from './types.js';

export function getInputs(): ActionInputs {
  const org = core.getInput('org', { required: true });
  const appId = core.getInput('app-id', { required: true });
  const appInstallationId = core.getInput('app-installation-id', { required: true });
  const appPrivateKey = core.getInput('app-private-key', { required: true });
  const daysBackStr = core.getInput('days-back') || '7';
  const timeWindowStr = core.getInput('time-window') || '60';
  const outputDir = core.getInput('output-dir') || '.';

  const daysBack = parseInt(daysBackStr, 10);
  if (isNaN(daysBack) || daysBack <= 0) {
    throw new Error(`Invalid days-back value: ${daysBackStr}`);
  }

  const timeWindow = parseInt(timeWindowStr, 10);
  if (isNaN(timeWindow) || timeWindow <= 0) {
    throw new Error(`Invalid time-window value: ${timeWindowStr}`);
  }

  return { org, appId, appInstallationId, appPrivateKey, daysBack, timeWindow, outputDir };
}

export async function run(): Promise<void> {
  try {
    const inputs = getInputs();

    core.info(`Searching audit logs for organization: ${inputs.org}`);
    core.info(`Looking back ${inputs.daysBack} days`);
    core.info(`Time window: ${inputs.timeWindow} seconds`);

    core.info('Fetching audit log events...');
    const events = await fetchAuditLogEvents(
      inputs.appId,
      inputs.appPrivateKey,
      inputs.appInstallationId,
      inputs.org,
      inputs.daysBack,
    );
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
      const csvPath = writeCsvToFile(csv, inputs.outputDir, inputs.org);
      core.info(`CSV file written to: ${csvPath}`);
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
