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
            case 'token':
              return 'test-token';
            case 'enterprise':
              return 'test-enterprise';
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

      expect(inputs.token).toBe('test-token');
      expect(inputs.enterprise).toBe('test-enterprise');
      expect(inputs.daysBack).toBe(14);
      expect(inputs.timeWindow).toBe(30);
    });

    it('should use default values when optional inputs are not provided', async () => {
      vi.doMock('@actions/core', () => ({
        getInput: vi.fn((name: string) => {
          switch (name) {
            case 'token':
              return 'test-token';
            case 'enterprise':
              return 'test-enterprise';
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
    });

    it('should throw error for invalid days-back value', async () => {
      vi.doMock('@actions/core', () => ({
        getInput: vi.fn((name: string) => {
          switch (name) {
            case 'token':
              return 'test-token';
            case 'enterprise':
              return 'test-enterprise';
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
            case 'token':
              return 'test-token';
            case 'enterprise':
              return 'test-enterprise';
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
  });

  describe('run', () => {
    it('should complete successfully with no suspicious activity', async () => {
      const mockCore = {
        getInput: vi.fn((name: string) => {
          switch (name) {
            case 'token':
              return 'test-token';
            case 'enterprise':
              return 'test-enterprise';
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
      vi.doMock('@actions/artifact', () => ({
        DefaultArtifactClient: vi.fn().mockImplementation(() => ({
          uploadArtifact: vi.fn().mockResolvedValue(undefined),
        })),
      }));
      vi.doMock('../src/audit-log', () => ({
        fetchAuditLogEvents: vi.fn().mockResolvedValue([]),
      }));

      const { run } = await import('../src/main');
      await run();

      expect(mockCore.info).toHaveBeenCalledWith(
        'Searching audit logs for enterprise: test-enterprise',
      );
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
      vi.doMock('@actions/artifact', () => ({
        DefaultArtifactClient: vi.fn().mockImplementation(() => ({
          uploadArtifact: vi.fn().mockResolvedValue(undefined),
        })),
      }));
      vi.doMock('../src/audit-log', () => ({
        fetchAuditLogEvents: vi.fn().mockResolvedValue([]),
      }));

      const { run } = await import('../src/main');
      await run();

      expect(mockCore.setFailed).toHaveBeenCalledWith('Test error');
    });
  });
});
