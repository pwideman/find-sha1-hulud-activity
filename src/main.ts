import * as core from '@actions/core';
import { writeCsvToFile, writeContextCsvToFile } from './artifact-writer.js';
import { fetchAuditLogEvents, fetchContextAuditLogEvents } from './audit-log.js';
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
  const additionalPhrase = core.getInput('additional-phrase') || '';
  const contextSearchMinutesStr = core.getInput('context-search-minutes') || '10';

  const daysBack = parseInt(daysBackStr, 10);
  if (isNaN(daysBack) || daysBack <= 0) {
    throw new Error(`Invalid days-back value: ${daysBackStr}`);
  }

  const timeWindow = parseInt(timeWindowStr, 10);
  if (isNaN(timeWindow) || timeWindow <= 0) {
    throw new Error(`Invalid time-window value: ${timeWindowStr}`);
  }

  // Allow zero to disable context search; positive values enable it
  const contextSearchMinutes = parseInt(contextSearchMinutesStr, 10);
  if (isNaN(contextSearchMinutes) || contextSearchMinutes < 0) {
    throw new Error(`Invalid context-search-minutes value: ${contextSearchMinutesStr}`);
  }

  return {
    org,
    appId,
    appInstallationId,
    appPrivateKey,
    daysBack,
    timeWindow,
    outputDir,
    additionalPhrase,
    contextSearchMinutes,
  };
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
      inputs.additionalPhrase,
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

      if (inputs.contextSearchMinutes > 0) {
        core.info('Fetching context audit log events for suspicious activities...');
        for (let i = 0; i < suspiciousActivities.length; i++) {
          const activity = suspiciousActivities[i];
          const startTime = new Date(
            activity.createdAt.getTime() - inputs.contextSearchMinutes * 60 * 1000,
          );
          const endTime = new Date(
            activity.deletedAt.getTime() + inputs.contextSearchMinutes * 60 * 1000,
          );

          core.info(
            `Fetching context for activity ${i + 1}/${suspiciousActivities.length}: ${activity.actor} in ${activity.repository}`,
          );

          const contextEvents = await fetchContextAuditLogEvents(
            inputs.appId,
            inputs.appPrivateKey,
            inputs.appInstallationId,
            inputs.org,
            activity.actor,
            startTime,
            endTime,
          );

          activity.contextEvents = contextEvents;
          core.info(`Found ${contextEvents.length} context events`);

          if (contextEvents.length > 0) {
            const csvPath = writeContextCsvToFile(
              contextEvents,
              inputs.outputDir,
              activity.actor,
              startTime,
            );
            core.info(`Context CSV file written to: ${csvPath}`);
          }
        }
      }
    }

    const summary = generateSummary(
      suspiciousActivities,
      inputs.daysBack,
      inputs.timeWindow,
      inputs.org,
      inputs.contextSearchMinutes,
    );
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
