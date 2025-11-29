import { describe, expect, it, vi } from 'vitest';
import { generateCsv, generateSummary } from '../src/summary';
import { SuspiciousActivity } from '../src/types';

vi.mock('@actions/core', () => import('../__fixtures__/core'));

describe('summary', () => {
  describe('generateSummary', () => {
    it('should generate summary with no suspicious activity', () => {
      const result = generateSummary([], 7, 60);

      expect(result).toContain('# Sha1-Hulud Activity Scan Results');
      expect(result).toContain('**Days scanned:** 7');
      expect(result).toContain('**Time window:** 60 seconds');
      expect(result).toContain('✅ **No suspicious activity found.**');
    });

    it('should generate summary with suspicious activity', () => {
      const activities: SuspiciousActivity[] = [
        {
          actor: 'malicious-user',
          repository: 'org/repo1',
          workflowRunId: 12345,
          createdAt: new Date('2024-01-01T10:00:00Z'),
          completedAt: new Date('2024-01-01T10:00:05Z'),
          deletedAt: new Date('2024-01-01T10:00:10Z'),
          timeRangeSeconds: 10,
        },
      ];

      const result = generateSummary(activities, 14, 60);

      expect(result).toContain('**Suspicious activity sequences:** 1');
      expect(result).toContain('**Unique actors:** 1');
      expect(result).toContain('**Unique repositories affected:** 1');
      expect(result).toContain('| malicious-user |');
      expect(result).toContain('| org/repo1 |');
      expect(result).toContain('| 12345 |');
      expect(result).toContain('| 10 |');
    });

    it('should count unique actors and repos correctly', () => {
      const activities: SuspiciousActivity[] = [
        {
          actor: 'user1',
          repository: 'org/repo1',
          workflowRunId: 11111,
          createdAt: new Date('2024-01-01T10:00:00Z'),
          completedAt: new Date('2024-01-01T10:00:05Z'),
          deletedAt: new Date('2024-01-01T10:00:10Z'),
          timeRangeSeconds: 10,
        },
        {
          actor: 'user1',
          repository: 'org/repo2',
          workflowRunId: 22222,
          createdAt: new Date('2024-01-01T11:00:00Z'),
          completedAt: new Date('2024-01-01T11:00:05Z'),
          deletedAt: new Date('2024-01-01T11:00:10Z'),
          timeRangeSeconds: 10,
        },
        {
          actor: 'user2',
          repository: 'org/repo1',
          workflowRunId: 33333,
          createdAt: new Date('2024-01-01T12:00:00Z'),
          completedAt: new Date('2024-01-01T12:00:05Z'),
          deletedAt: new Date('2024-01-01T12:00:10Z'),
          timeRangeSeconds: 10,
        },
      ];

      const result = generateSummary(activities, 7, 60);

      expect(result).toContain('**Suspicious activity sequences:** 3');
      expect(result).toContain('**Unique actors:** 2');
      expect(result).toContain('**Unique repositories affected:** 2');
    });
  });

  describe('generateCsv', () => {
    it('should generate CSV with header when no activities', () => {
      const result = generateCsv([]);

      expect(result).toBe(
        'Actor,Repository,Workflow Run ID,Created At,Completed At,Deleted At,Duration (seconds)',
      );
    });

    it('should generate CSV with activity data', () => {
      const activities: SuspiciousActivity[] = [
        {
          actor: 'malicious-user',
          repository: 'org/repo1',
          workflowRunId: 12345,
          createdAt: new Date('2024-01-01T10:00:00.000Z'),
          completedAt: new Date('2024-01-01T10:00:05.000Z'),
          deletedAt: new Date('2024-01-01T10:00:10.000Z'),
          timeRangeSeconds: 10,
        },
      ];

      const result = generateCsv(activities);
      const lines = result.split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe(
        'Actor,Repository,Workflow Run ID,Created At,Completed At,Deleted At,Duration (seconds)',
      );
      expect(lines[1]).toContain('"malicious-user"');
      expect(lines[1]).toContain('"org/repo1"');
      expect(lines[1]).toContain('12345');
      expect(lines[1]).toContain('2024-01-01T10:00:00.000Z');
      expect(lines[1]).toContain('2024-01-01T10:00:10.000Z');
      expect(lines[1]).toContain(',10');
    });

    it('should handle multiple activities', () => {
      const activities: SuspiciousActivity[] = [
        {
          actor: 'user1',
          repository: 'org/repo1',
          workflowRunId: 11111,
          createdAt: new Date('2024-01-01T10:00:00.000Z'),
          completedAt: new Date('2024-01-01T10:00:05.000Z'),
          deletedAt: new Date('2024-01-01T10:00:10.000Z'),
          timeRangeSeconds: 10,
        },
        {
          actor: 'user2',
          repository: 'org/repo2',
          workflowRunId: 22222,
          createdAt: new Date('2024-01-01T11:00:00.000Z'),
          completedAt: new Date('2024-01-01T11:00:03.000Z'),
          deletedAt: new Date('2024-01-01T11:00:08.000Z'),
          timeRangeSeconds: 8,
        },
      ];

      const result = generateCsv(activities);
      const lines = result.split('\n');

      expect(lines).toHaveLength(3);
      expect(lines[1]).toContain('"user1"');
      expect(lines[2]).toContain('"user2"');
    });
  });
});
