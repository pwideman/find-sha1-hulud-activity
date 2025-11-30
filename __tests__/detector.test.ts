import { describe, expect, it } from 'vitest';
import { findSuspiciousActivity } from '../src/detector';
import { AuditLogEvent } from '../src/types';

describe('detector', () => {
  describe('findSuspiciousActivity', () => {
    it('should return empty array when no events', () => {
      const result = findSuspiciousActivity([], 60);
      expect(result).toEqual([]);
    });

    it('should return empty array when only created events exist', () => {
      const events: AuditLogEvent[] = [
        {
          '@timestamp': 1000000,
          action: 'workflows.created_workflow_run',
          actor: 'user1',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
      ];

      const result = findSuspiciousActivity(events, 60);
      expect(result).toEqual([]);
    });

    it('should return empty array when sequence is incomplete', () => {
      const events: AuditLogEvent[] = [
        {
          '@timestamp': 1000000,
          action: 'workflows.created_workflow_run',
          actor: 'user1',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
        {
          '@timestamp': 1005000,
          action: 'workflows.completed_workflow_run',
          actor: 'user1',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
      ];

      const result = findSuspiciousActivity(events, 60);
      expect(result).toEqual([]);
    });

    it('should detect suspicious activity within time window', () => {
      const baseTime = 1700000000000;
      const events: AuditLogEvent[] = [
        {
          '@timestamp': baseTime,
          action: 'workflows.created_workflow_run',
          actor: 'malicious-user',
          repo: 'org/target-repo',
          workflow_run_id: 12345,
        },
        {
          '@timestamp': baseTime + 5000, // 5 seconds later
          action: 'workflows.completed_workflow_run',
          actor: 'malicious-user',
          repo: 'org/target-repo',
          workflow_run_id: 12345,
        },
        {
          '@timestamp': baseTime + 10000, // 10 seconds later
          action: 'workflows.delete_workflow_run',
          actor: 'malicious-user',
          repo: 'org/target-repo',
          workflow_run_id: 12345,
        },
      ];

      const result = findSuspiciousActivity(events, 60);

      expect(result).toHaveLength(1);
      expect(result[0].actor).toBe('malicious-user');
      expect(result[0].repository).toBe('org/target-repo');
      expect(result[0].workflowRunId).toBe(12345);
      expect(result[0].timeRangeSeconds).toBe(10);
    });

    it('should not detect activity outside time window', () => {
      const baseTime = 1700000000000;
      const events: AuditLogEvent[] = [
        {
          '@timestamp': baseTime,
          action: 'workflows.created_workflow_run',
          actor: 'user1',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
        {
          '@timestamp': baseTime + 30000, // 30 seconds later
          action: 'workflows.completed_workflow_run',
          actor: 'user1',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
        {
          '@timestamp': baseTime + 65000, // 65 seconds later (outside 60s window)
          action: 'workflows.delete_workflow_run',
          actor: 'user1',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
      ];

      const result = findSuspiciousActivity(events, 60);
      expect(result).toHaveLength(0);
    });

    it('should detect multiple suspicious activities from same actor', () => {
      const baseTime = 1700000000000;
      const events: AuditLogEvent[] = [
        // First sequence
        {
          '@timestamp': baseTime,
          action: 'workflows.created_workflow_run',
          actor: 'attacker',
          repo: 'org/repo1',
          workflow_run_id: 11111,
        },
        {
          '@timestamp': baseTime + 3000,
          action: 'workflows.completed_workflow_run',
          actor: 'attacker',
          repo: 'org/repo1',
          workflow_run_id: 11111,
        },
        {
          '@timestamp': baseTime + 6000,
          action: 'workflows.delete_workflow_run',
          actor: 'attacker',
          repo: 'org/repo1',
          workflow_run_id: 11111,
        },
        // Second sequence
        {
          '@timestamp': baseTime + 60000,
          action: 'workflows.created_workflow_run',
          actor: 'attacker',
          repo: 'org/repo2',
          workflow_run_id: 22222,
        },
        {
          '@timestamp': baseTime + 64000,
          action: 'workflows.completed_workflow_run',
          actor: 'attacker',
          repo: 'org/repo2',
          workflow_run_id: 22222,
        },
        {
          '@timestamp': baseTime + 68000,
          action: 'workflows.delete_workflow_run',
          actor: 'attacker',
          repo: 'org/repo2',
          workflow_run_id: 22222,
        },
      ];

      const result = findSuspiciousActivity(events, 60);

      expect(result).toHaveLength(2);
      expect(result[0].repository).toBe('org/repo1');
      expect(result[0].workflowRunId).toBe(11111);
      expect(result[1].repository).toBe('org/repo2');
      expect(result[1].workflowRunId).toBe(22222);
    });

    it('should detect activities from different actors', () => {
      const baseTime = 1700000000000;
      const events: AuditLogEvent[] = [
        {
          '@timestamp': baseTime,
          action: 'workflows.created_workflow_run',
          actor: 'attacker1',
          repo: 'org/repo1',
          workflow_run_id: 11111,
        },
        {
          '@timestamp': baseTime + 5000,
          action: 'workflows.completed_workflow_run',
          actor: 'attacker1',
          repo: 'org/repo1',
          workflow_run_id: 11111,
        },
        {
          '@timestamp': baseTime + 8000,
          action: 'workflows.delete_workflow_run',
          actor: 'attacker1',
          repo: 'org/repo1',
          workflow_run_id: 11111,
        },
        {
          '@timestamp': baseTime + 1000,
          action: 'workflows.created_workflow_run',
          actor: 'attacker2',
          repo: 'org/repo2',
          workflow_run_id: 22222,
        },
        {
          '@timestamp': baseTime + 4000,
          action: 'workflows.completed_workflow_run',
          actor: 'attacker2',
          repo: 'org/repo2',
          workflow_run_id: 22222,
        },
        {
          '@timestamp': baseTime + 7000,
          action: 'workflows.delete_workflow_run',
          actor: 'attacker2',
          repo: 'org/repo2',
          workflow_run_id: 22222,
        },
      ];

      const result = findSuspiciousActivity(events, 60);

      expect(result).toHaveLength(2);
      const actors = new Set(result.map((r) => r.actor));
      expect(actors.has('attacker1')).toBe(true);
      expect(actors.has('attacker2')).toBe(true);
    });

    it('should not match events from different workflow runs', () => {
      const baseTime = 1700000000000;
      const events: AuditLogEvent[] = [
        {
          '@timestamp': baseTime,
          action: 'workflows.created_workflow_run',
          actor: 'user1',
          repo: 'org/repo1',
          workflow_run_id: 11111,
        },
        {
          '@timestamp': baseTime + 5000,
          action: 'workflows.completed_workflow_run',
          actor: 'user1',
          repo: 'org/repo1',
          workflow_run_id: 22222, // Different workflow run
        },
        {
          '@timestamp': baseTime + 8000,
          action: 'workflows.delete_workflow_run',
          actor: 'user1',
          repo: 'org/repo1',
          workflow_run_id: 11111,
        },
      ];

      const result = findSuspiciousActivity(events, 60);
      expect(result).toHaveLength(0);
    });

    it('should ignore events without workflow_run_id', () => {
      const baseTime = 1700000000000;
      const events: AuditLogEvent[] = [
        {
          '@timestamp': baseTime,
          action: 'workflows.created_workflow_run',
          actor: 'user1',
          repo: 'org/repo1',
        },
        {
          '@timestamp': baseTime + 5000,
          action: 'workflows.completed_workflow_run',
          actor: 'user1',
          repo: 'org/repo1',
        },
        {
          '@timestamp': baseTime + 8000,
          action: 'workflows.delete_workflow_run',
          actor: 'user1',
          repo: 'org/repo1',
        },
      ];

      const result = findSuspiciousActivity(events, 60);
      expect(result).toHaveLength(0);
    });

    it('should ignore unrelated event actions', () => {
      const baseTime = 1700000000000;
      const events: AuditLogEvent[] = [
        {
          '@timestamp': baseTime,
          action: 'workflows.created_workflow_run',
          actor: 'user1',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
        {
          '@timestamp': baseTime + 2000,
          action: 'repo.access', // Unrelated action
          actor: 'user1',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
        {
          '@timestamp': baseTime + 5000,
          action: 'workflows.completed_workflow_run',
          actor: 'user1',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
        {
          '@timestamp': baseTime + 8000,
          action: 'workflows.delete_workflow_run',
          actor: 'user1',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
      ];

      const result = findSuspiciousActivity(events, 60);
      expect(result).toHaveLength(1);
    });

    it('should respect custom time window', () => {
      const baseTime = 1700000000000;
      const events: AuditLogEvent[] = [
        {
          '@timestamp': baseTime,
          action: 'workflows.created_workflow_run',
          actor: 'user1',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
        {
          '@timestamp': baseTime + 25000, // 25 seconds
          action: 'workflows.completed_workflow_run',
          actor: 'user1',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
        {
          '@timestamp': baseTime + 55000, // 55 seconds
          action: 'workflows.delete_workflow_run',
          actor: 'user1',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
      ];

      // With 20 second window, should not detect
      expect(findSuspiciousActivity(events, 20)).toHaveLength(0);

      // With 60 second window, should detect
      const result = findSuspiciousActivity(events, 60);
      expect(result).toHaveLength(1);
      expect(result[0].timeRangeSeconds).toBe(55);
    });

    it('should require events to occur in correct order', () => {
      const baseTime = 1700000000000;
      const events: AuditLogEvent[] = [
        {
          '@timestamp': baseTime + 10000, // Created comes after completed
          action: 'workflows.created_workflow_run',
          actor: 'user1',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
        {
          '@timestamp': baseTime, // Completed comes first
          action: 'workflows.completed_workflow_run',
          actor: 'user1',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
        {
          '@timestamp': baseTime + 15000,
          action: 'workflows.delete_workflow_run',
          actor: 'user1',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
      ];

      const result = findSuspiciousActivity(events, 60);
      expect(result).toHaveLength(0);
    });
  });
});
