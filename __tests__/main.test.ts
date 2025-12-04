import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('main', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('getInputs', () => {
    it('should parse valid inputs correctly', async () => {
      vi.doMock('@actions/core', () => ({
        getInput: vi.fn((name: string) => {
          switch (name) {
            case 'org':
              return 'test-org';
            case 'app-id':
              return '12345';
            case 'app-installation-id':
              return '67890';
            case 'app-private-key':
              return 'test-private-key';
            case 'days-back':
              return '14';
            case 'time-window':
              return '30';
            default:
              return '';
          }
        }),
        info: vi.fn(),
        setOutput: vi.fn(),
        setFailed: vi.fn(),
        warning: vi.fn(),
        summary: {
          addRaw: vi.fn().mockReturnThis(),
          write: vi.fn().mockResolvedValue(undefined),
        },
      }));

      const { getInputs } = await import('../src/main');
      const inputs = getInputs();

      expect(inputs.org).toBe('test-org');
      expect(inputs.appId).toBe('12345');
      expect(inputs.appInstallationId).toBe('67890');
      expect(inputs.appPrivateKey).toBe('test-private-key');
      expect(inputs.daysBack).toBe(14);
      expect(inputs.timeWindow).toBe(30);
    });

    it('should use default values when optional inputs are not provided', async () => {
      vi.doMock('@actions/core', () => ({
        getInput: vi.fn((name: string) => {
          switch (name) {
            case 'org':
              return 'test-org';
            case 'app-id':
              return '12345';
            case 'app-installation-id':
              return '67890';
            case 'app-private-key':
              return 'test-private-key';
            default:
              return '';
          }
        }),
        info: vi.fn(),
        setOutput: vi.fn(),
        setFailed: vi.fn(),
        warning: vi.fn(),
        summary: {
          addRaw: vi.fn().mockReturnThis(),
          write: vi.fn().mockResolvedValue(undefined),
        },
      }));

      const { getInputs } = await import('../src/main');
      const inputs = getInputs();

      expect(inputs.daysBack).toBe(7);
      expect(inputs.timeWindow).toBe(60);
      expect(inputs.additionalPhrase).toBe('');
      expect(inputs.contextSearchMinutes).toBe(10);
    });

    it('should parse additional-phrase input when provided', async () => {
      vi.doMock('@actions/core', () => ({
        getInput: vi.fn((name: string) => {
          switch (name) {
            case 'org':
              return 'test-org';
            case 'app-id':
              return '12345';
            case 'app-installation-id':
              return '67890';
            case 'app-private-key':
              return 'test-private-key';
            case 'additional-phrase':
              return '-actor:test-user repo:my-org/my-repo';
            default:
              return '';
          }
        }),
        info: vi.fn(),
        setOutput: vi.fn(),
        setFailed: vi.fn(),
        warning: vi.fn(),
        summary: {
          addRaw: vi.fn().mockReturnThis(),
          write: vi.fn().mockResolvedValue(undefined),
        },
      }));

      const { getInputs } = await import('../src/main');
      const inputs = getInputs();

      expect(inputs.additionalPhrase).toBe('-actor:test-user repo:my-org/my-repo');
    });

    it('should throw error for invalid days-back value', async () => {
      vi.doMock('@actions/core', () => ({
        getInput: vi.fn((name: string) => {
          switch (name) {
            case 'org':
              return 'test-org';
            case 'app-id':
              return '12345';
            case 'app-installation-id':
              return '67890';
            case 'app-private-key':
              return 'test-private-key';
            case 'days-back':
              return 'invalid';
            default:
              return '';
          }
        }),
        info: vi.fn(),
        setOutput: vi.fn(),
        setFailed: vi.fn(),
        warning: vi.fn(),
        summary: {
          addRaw: vi.fn().mockReturnThis(),
          write: vi.fn().mockResolvedValue(undefined),
        },
      }));

      const { getInputs } = await import('../src/main');
      expect(() => getInputs()).toThrow('Invalid days-back value: invalid');
    });

    it('should throw error for invalid time-window value', async () => {
      vi.doMock('@actions/core', () => ({
        getInput: vi.fn((name: string) => {
          switch (name) {
            case 'org':
              return 'test-org';
            case 'app-id':
              return '12345';
            case 'app-installation-id':
              return '67890';
            case 'app-private-key':
              return 'test-private-key';
            case 'time-window':
              return '-5';
            default:
              return '';
          }
        }),
        info: vi.fn(),
        setOutput: vi.fn(),
        setFailed: vi.fn(),
        warning: vi.fn(),
        summary: {
          addRaw: vi.fn().mockReturnThis(),
          write: vi.fn().mockResolvedValue(undefined),
        },
      }));

      const { getInputs } = await import('../src/main');
      expect(() => getInputs()).toThrow('Invalid time-window value: -5');
    });

    it('should parse context-search-minutes input when provided', async () => {
      vi.doMock('@actions/core', () => ({
        getInput: vi.fn((name: string) => {
          switch (name) {
            case 'org':
              return 'test-org';
            case 'app-id':
              return '12345';
            case 'app-installation-id':
              return '67890';
            case 'app-private-key':
              return 'test-private-key';
            case 'context-search-minutes':
              return '20';
            default:
              return '';
          }
        }),
        info: vi.fn(),
        setOutput: vi.fn(),
        setFailed: vi.fn(),
        warning: vi.fn(),
        summary: {
          addRaw: vi.fn().mockReturnThis(),
          write: vi.fn().mockResolvedValue(undefined),
        },
      }));

      const { getInputs } = await import('../src/main');
      const inputs = getInputs();

      expect(inputs.contextSearchMinutes).toBe(20);
    });

    it('should throw error for invalid context-search-minutes value', async () => {
      vi.doMock('@actions/core', () => ({
        getInput: vi.fn((name: string) => {
          switch (name) {
            case 'org':
              return 'test-org';
            case 'app-id':
              return '12345';
            case 'app-installation-id':
              return '67890';
            case 'app-private-key':
              return 'test-private-key';
            case 'context-search-minutes':
              return 'invalid';
            default:
              return '';
          }
        }),
        info: vi.fn(),
        setOutput: vi.fn(),
        setFailed: vi.fn(),
        warning: vi.fn(),
        summary: {
          addRaw: vi.fn().mockReturnThis(),
          write: vi.fn().mockResolvedValue(undefined),
        },
      }));

      const { getInputs } = await import('../src/main');
      expect(() => getInputs()).toThrow('Invalid context-search-minutes value: invalid');
    });
  });

  describe('run', () => {
    it('should complete successfully with no suspicious activity', async () => {
      const mockCore = {
        getInput: vi.fn((name: string) => {
          switch (name) {
            case 'org':
              return 'test-org';
            case 'app-id':
              return '12345';
            case 'app-installation-id':
              return '67890';
            case 'app-private-key':
              return 'test-private-key';
            default:
              return '';
          }
        }),
        info: vi.fn(),
        setOutput: vi.fn(),
        setFailed: vi.fn(),
        warning: vi.fn(),
        summary: {
          addRaw: vi.fn().mockReturnThis(),
          write: vi.fn().mockResolvedValue(undefined),
        },
      };

      vi.doMock('@actions/core', () => mockCore);
      vi.doMock('../src/audit-log', () => ({
        fetchAuditLogEvents: vi.fn().mockResolvedValue([]),
      }));

      const { run } = await import('../src/main');
      await run();

      expect(mockCore.info).toHaveBeenCalledWith('Searching audit logs for organization: test-org');
      expect(mockCore.info).toHaveBeenCalledWith('Looking back 7 days');
      expect(mockCore.info).toHaveBeenCalledWith('Time window: 60 seconds');
      expect(mockCore.info).toHaveBeenCalledWith('No suspicious activity found.');
      expect(mockCore.info).toHaveBeenCalledWith('Scan complete.');
      expect(mockCore.setOutput).toHaveBeenCalledWith('suspicious-actors-count', 0);
      expect(mockCore.setOutput).toHaveBeenCalledWith('suspicious-activities-count', 0);
      expect(mockCore.setFailed).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const mockCore = {
        getInput: vi.fn(() => {
          throw new Error('Test error');
        }),
        info: vi.fn(),
        setOutput: vi.fn(),
        setFailed: vi.fn(),
        warning: vi.fn(),
        summary: {
          addRaw: vi.fn().mockReturnThis(),
          write: vi.fn().mockResolvedValue(undefined),
        },
      };

      vi.doMock('@actions/core', () => mockCore);
      vi.doMock('../src/audit-log', () => ({
        fetchAuditLogEvents: vi.fn().mockResolvedValue([]),
      }));

      const { run } = await import('../src/main');
      await run();

      expect(mockCore.setFailed).toHaveBeenCalledWith('Test error');
    });

    it('should fetch context events when contextSearchMinutes > 0 and suspicious activities found', async () => {
      const mockCore = {
        getInput: vi.fn((name: string) => {
          switch (name) {
            case 'org':
              return 'test-org';
            case 'app-id':
              return '12345';
            case 'app-installation-id':
              return '67890';
            case 'app-private-key':
              return 'test-private-key';
            case 'context-search-minutes':
              return '15';
            default:
              return '';
          }
        }),
        info: vi.fn(),
        setOutput: vi.fn(),
        setFailed: vi.fn(),
        warning: vi.fn(),
        summary: {
          addRaw: vi.fn().mockReturnThis(),
          write: vi.fn().mockResolvedValue(undefined),
        },
      };

      const mockAuditLogEvents = [
        {
          '@timestamp': 1704103200000,
          action: 'workflows.created_workflow_run',
          actor: 'test-user',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
        {
          '@timestamp': 1704103205000,
          action: 'workflows.completed_workflow_run',
          actor: 'test-user',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
        {
          '@timestamp': 1704103210000,
          action: 'workflows.delete_workflow_run',
          actor: 'test-user',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
      ];

      const mockContextEvents = [
        {
          '@timestamp': 1704103100000,
          action: 'repo.access',
          actor: 'test-user',
          repo: 'org/repo1',
        },
      ];

      const mockFetchContextAuditLogEvents = vi.fn().mockResolvedValue(mockContextEvents);
      const mockWriteContextCsvToFile = vi.fn().mockReturnValue('/tmp/context-test-user.csv');

      vi.doMock('@actions/core', () => mockCore);
      vi.doMock('../src/audit-log', () => ({
        fetchAuditLogEvents: vi.fn().mockResolvedValue(mockAuditLogEvents),
        fetchContextAuditLogEvents: mockFetchContextAuditLogEvents,
      }));
      vi.doMock('../src/artifact-writer', () => ({
        writeCsvToFile: vi.fn().mockReturnValue('/tmp/suspicious-activity-test-org.csv'),
        writeContextCsvToFile: mockWriteContextCsvToFile,
      }));

      const { run } = await import('../src/main');
      await run();

      expect(mockCore.info).toHaveBeenCalledWith(
        'Fetching context audit log events for suspicious activities...',
      );
      expect(mockFetchContextAuditLogEvents).toHaveBeenCalledTimes(1);
      expect(mockFetchContextAuditLogEvents).toHaveBeenCalledWith(
        '12345',
        'test-private-key',
        '67890',
        'test-org',
        'test-user',
        expect.any(Date),
        expect.any(Date),
      );

      const callArgs = mockFetchContextAuditLogEvents.mock.calls[0];
      const startTime = callArgs[5] as Date;
      const endTime = callArgs[6] as Date;

      expect(startTime.getTime()).toBe(1704103200000 - 15 * 60 * 1000);
      expect(endTime.getTime()).toBe(1704103210000 + 15 * 60 * 1000);

      expect(mockWriteContextCsvToFile).toHaveBeenCalledTimes(1);
      expect(mockCore.info).toHaveBeenCalledWith('Found 1 context events');
    });

    it('should not fetch context events when contextSearchMinutes is 0', async () => {
      const mockCore = {
        getInput: vi.fn((name: string) => {
          switch (name) {
            case 'org':
              return 'test-org';
            case 'app-id':
              return '12345';
            case 'app-installation-id':
              return '67890';
            case 'app-private-key':
              return 'test-private-key';
            case 'context-search-minutes':
              return '0';
            default:
              return '';
          }
        }),
        info: vi.fn(),
        setOutput: vi.fn(),
        setFailed: vi.fn(),
        warning: vi.fn(),
        summary: {
          addRaw: vi.fn().mockReturnThis(),
          write: vi.fn().mockResolvedValue(undefined),
        },
      };

      const mockAuditLogEvents = [
        {
          '@timestamp': 1704103200000,
          action: 'workflows.created_workflow_run',
          actor: 'test-user',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
        {
          '@timestamp': 1704103205000,
          action: 'workflows.completed_workflow_run',
          actor: 'test-user',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
        {
          '@timestamp': 1704103210000,
          action: 'workflows.delete_workflow_run',
          actor: 'test-user',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
      ];

      const mockFetchContextAuditLogEvents = vi.fn();

      vi.doMock('@actions/core', () => mockCore);
      vi.doMock('../src/audit-log', () => ({
        fetchAuditLogEvents: vi.fn().mockResolvedValue(mockAuditLogEvents),
        fetchContextAuditLogEvents: mockFetchContextAuditLogEvents,
      }));
      vi.doMock('../src/artifact-writer', () => ({
        writeCsvToFile: vi.fn().mockReturnValue('/tmp/suspicious-activity-test-org.csv'),
        writeContextCsvToFile: vi.fn(),
      }));

      const { run } = await import('../src/main');
      await run();

      expect(mockCore.info).not.toHaveBeenCalledWith(
        'Fetching context audit log events for suspicious activities...',
      );
      expect(mockFetchContextAuditLogEvents).not.toHaveBeenCalled();
    });

    it('should not write CSV when no context events found', async () => {
      const mockCore = {
        getInput: vi.fn((name: string) => {
          switch (name) {
            case 'org':
              return 'test-org';
            case 'app-id':
              return '12345';
            case 'app-installation-id':
              return '67890';
            case 'app-private-key':
              return 'test-private-key';
            case 'context-search-minutes':
              return '10';
            default:
              return '';
          }
        }),
        info: vi.fn(),
        setOutput: vi.fn(),
        setFailed: vi.fn(),
        warning: vi.fn(),
        summary: {
          addRaw: vi.fn().mockReturnThis(),
          write: vi.fn().mockResolvedValue(undefined),
        },
      };

      const mockAuditLogEvents = [
        {
          '@timestamp': 1704103200000,
          action: 'workflows.created_workflow_run',
          actor: 'test-user',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
        {
          '@timestamp': 1704103205000,
          action: 'workflows.completed_workflow_run',
          actor: 'test-user',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
        {
          '@timestamp': 1704103210000,
          action: 'workflows.delete_workflow_run',
          actor: 'test-user',
          repo: 'org/repo1',
          workflow_run_id: 12345,
        },
      ];

      const mockFetchContextAuditLogEvents = vi.fn().mockResolvedValue([]);
      const mockWriteContextCsvToFile = vi.fn();

      vi.doMock('@actions/core', () => mockCore);
      vi.doMock('../src/audit-log', () => ({
        fetchAuditLogEvents: vi.fn().mockResolvedValue(mockAuditLogEvents),
        fetchContextAuditLogEvents: mockFetchContextAuditLogEvents,
      }));
      vi.doMock('../src/artifact-writer', () => ({
        writeCsvToFile: vi.fn().mockReturnValue('/tmp/suspicious-activity-test-org.csv'),
        writeContextCsvToFile: mockWriteContextCsvToFile,
      }));

      const { run } = await import('../src/main');
      await run();

      expect(mockFetchContextAuditLogEvents).toHaveBeenCalledTimes(1);
      expect(mockWriteContextCsvToFile).not.toHaveBeenCalled();
      expect(mockCore.info).toHaveBeenCalledWith('Found 0 context events');
    });

    it('should handle multiple suspicious activities with context fetching', async () => {
      const mockCore = {
        getInput: vi.fn((name: string) => {
          switch (name) {
            case 'org':
              return 'test-org';
            case 'app-id':
              return '12345';
            case 'app-installation-id':
              return '67890';
            case 'app-private-key':
              return 'test-private-key';
            case 'context-search-minutes':
              return '5';
            default:
              return '';
          }
        }),
        info: vi.fn(),
        setOutput: vi.fn(),
        setFailed: vi.fn(),
        warning: vi.fn(),
        summary: {
          addRaw: vi.fn().mockReturnThis(),
          write: vi.fn().mockResolvedValue(undefined),
        },
      };

      const mockAuditLogEvents = [
        {
          '@timestamp': 1704103200000,
          action: 'workflows.created_workflow_run',
          actor: 'user1',
          repo: 'org/repo1',
          workflow_run_id: 11111,
        },
        {
          '@timestamp': 1704103205000,
          action: 'workflows.completed_workflow_run',
          actor: 'user1',
          repo: 'org/repo1',
          workflow_run_id: 11111,
        },
        {
          '@timestamp': 1704103210000,
          action: 'workflows.delete_workflow_run',
          actor: 'user1',
          repo: 'org/repo1',
          workflow_run_id: 11111,
        },
        {
          '@timestamp': 1704103300000,
          action: 'workflows.created_workflow_run',
          actor: 'user2',
          repo: 'org/repo2',
          workflow_run_id: 22222,
        },
        {
          '@timestamp': 1704103305000,
          action: 'workflows.completed_workflow_run',
          actor: 'user2',
          repo: 'org/repo2',
          workflow_run_id: 22222,
        },
        {
          '@timestamp': 1704103310000,
          action: 'workflows.delete_workflow_run',
          actor: 'user2',
          repo: 'org/repo2',
          workflow_run_id: 22222,
        },
      ];

      const mockContextEvents1 = [
        {
          '@timestamp': 1704103100000,
          action: 'repo.access',
          actor: 'user1',
          repo: 'org/repo1',
        },
      ];

      const mockContextEvents2 = [
        {
          '@timestamp': 1704103200000,
          action: 'team.add_member',
          actor: 'user2',
        },
      ];

      const mockFetchContextAuditLogEvents = vi
        .fn()
        .mockResolvedValueOnce(mockContextEvents1)
        .mockResolvedValueOnce(mockContextEvents2);

      const mockWriteContextCsvToFile = vi.fn().mockReturnValue('/tmp/context.csv');

      vi.doMock('@actions/core', () => mockCore);
      vi.doMock('../src/audit-log', () => ({
        fetchAuditLogEvents: vi.fn().mockResolvedValue(mockAuditLogEvents),
        fetchContextAuditLogEvents: mockFetchContextAuditLogEvents,
      }));
      vi.doMock('../src/artifact-writer', () => ({
        writeCsvToFile: vi.fn().mockReturnValue('/tmp/suspicious-activity-test-org.csv'),
        writeContextCsvToFile: mockWriteContextCsvToFile,
      }));

      const { run } = await import('../src/main');
      await run();

      expect(mockFetchContextAuditLogEvents).toHaveBeenCalledTimes(2);
      expect(mockWriteContextCsvToFile).toHaveBeenCalledTimes(2);

      const firstCall = mockFetchContextAuditLogEvents.mock.calls[0];
      expect(firstCall[4]).toBe('user1');

      const secondCall = mockFetchContextAuditLogEvents.mock.calls[1];
      expect(secondCall[4]).toBe('user2');
    });
  });
});
