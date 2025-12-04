import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { writeContextCsvToFile } from '../src/artifact-writer';
import { AuditLogEvent } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

describe('artifact-writer', () => {
  const testOutputDir = '/tmp/test-artifact-writer';

  beforeEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true });
    }
    fs.mkdirSync(testOutputDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true });
    }
  });

  describe('writeContextCsvToFile', () => {
    it('should write context CSV file with correct filename', () => {
      const events: AuditLogEvent[] = [
        {
          '@timestamp': 1700000000000,
          action: 'repo.access',
          actor: 'test-user',
          repo: 'org/repo1',
        },
      ];

      const startTime = new Date('2024-01-01T10:00:00Z');
      const csvPath = writeContextCsvToFile(events, testOutputDir, 'test-user', startTime);

      expect(fs.existsSync(csvPath)).toBe(true);
      expect(csvPath).toContain('context-test-user-');
      expect(csvPath).toContain('.csv');
    });

    it('should sanitize username in filename', () => {
      const events: AuditLogEvent[] = [
        {
          '@timestamp': 1700000000000,
          action: 'repo.access',
          actor: 'test@user',
        },
      ];

      const startTime = new Date('2024-01-01T10:00:00Z');
      const csvPath = writeContextCsvToFile(events, testOutputDir, 'test@user', startTime);

      expect(fs.existsSync(csvPath)).toBe(true);
      expect(path.basename(csvPath)).toContain('test_user');
      expect(path.basename(csvPath)).not.toContain('@');
    });

    it('should write CSV with correct headers', () => {
      const events: AuditLogEvent[] = [
        {
          '@timestamp': 1700000000000,
          action: 'repo.access',
          actor: 'test-user',
        },
      ];

      const startTime = new Date('2024-01-01T10:00:00Z');
      const csvPath = writeContextCsvToFile(events, testOutputDir, 'test-user', startTime);

      const content = fs.readFileSync(csvPath, 'utf-8');
      const lines = content.split('\n');

      expect(lines[0]).toBe('Timestamp,Action,Actor,User,Repository,Workflow Run ID,Country');
    });

    it('should write event data correctly', () => {
      const events: AuditLogEvent[] = [
        {
          '@timestamp': 1704103200000,
          action: 'repo.access',
          actor: 'test-user',
          user: 'target-user',
          repo: 'org/repo1',
          workflow_run_id: 12345,
          actor_location: {
            country_code: 'US',
          },
        },
      ];

      const startTime = new Date('2024-01-01T10:00:00Z');
      const csvPath = writeContextCsvToFile(events, testOutputDir, 'test-user', startTime);

      const content = fs.readFileSync(csvPath, 'utf-8');
      const lines = content.split('\n');

      expect(lines[1]).toContain('repo.access');
      expect(lines[1]).toContain('test-user');
      expect(lines[1]).toContain('target-user');
      expect(lines[1]).toContain('org/repo1');
      expect(lines[1]).toContain('12345');
      expect(lines[1]).toContain('US');
    });

    it('should handle missing optional fields', () => {
      const events: AuditLogEvent[] = [
        {
          '@timestamp': 1704103200000,
          action: 'repo.access',
          actor: 'test-user',
        },
      ];

      const startTime = new Date('2024-01-01T10:00:00Z');
      const csvPath = writeContextCsvToFile(events, testOutputDir, 'test-user', startTime);

      const content = fs.readFileSync(csvPath, 'utf-8');
      const lines = content.split('\n');

      expect(lines[1]).toContain('repo.access');
      expect(lines[1]).toContain('test-user');
      expect(lines[1]).toContain('""');
    });

    it('should write multiple events', () => {
      const events: AuditLogEvent[] = [
        {
          '@timestamp': 1704103200000,
          action: 'repo.access',
          actor: 'test-user',
        },
        {
          '@timestamp': 1704103260000,
          action: 'repo.create',
          actor: 'test-user',
          repo: 'org/repo2',
        },
      ];

      const startTime = new Date('2024-01-01T10:00:00Z');
      const csvPath = writeContextCsvToFile(events, testOutputDir, 'test-user', startTime);

      const content = fs.readFileSync(csvPath, 'utf-8');
      const lines = content.split('\n');

      expect(lines).toHaveLength(3);
      expect(lines[1]).toContain('repo.access');
      expect(lines[2]).toContain('repo.create');
    });
  });
});
