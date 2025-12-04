import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('audit-log', () => {
  describe('fetchAuditLogEvents', () => {
    let mockRequest: ReturnType<typeof vi.fn>;
    let mockGetInstallationOctokit: ReturnType<typeof vi.fn>;

    // Helper to create regex for base phrase (action filters + date)
    const basePhrasePattern =
      /^action:workflows\.created_workflow_run action:workflows\.completed_workflow_run action:workflows\.delete_workflow_run created:>=\d{4}-\d{2}-\d{2}$/;

    beforeEach(() => {
      vi.resetModules();
      vi.clearAllMocks();

      // Mock the octokit request
      mockRequest = vi.fn().mockResolvedValue({
        data: [],
        headers: {},
      });

      mockGetInstallationOctokit = vi.fn().mockResolvedValue({
        request: mockRequest,
      });

      // Mock the App from octokit using a class
      vi.doMock('octokit', () => ({
        App: class {
          getInstallationOctokit = mockGetInstallationOctokit;
        },
      }));
    });

    afterEach(() => {
      vi.clearAllMocks();
      vi.resetModules();
    });

    it('should construct base phrase without additional phrase', async () => {
      const { fetchAuditLogEvents } = await import('../src/audit-log');

      await fetchAuditLogEvents('app-id', 'private-key', 'install-id', 'test-org', 7);

      expect(mockRequest).toHaveBeenCalledWith(
        'GET /orgs/{org}/audit-log',
        expect.objectContaining({
          org: 'test-org',
          phrase: expect.stringMatching(basePhrasePattern),
        }),
      );
    });

    it('should append additional phrase when provided', async () => {
      const { fetchAuditLogEvents } = await import('../src/audit-log');

      await fetchAuditLogEvents(
        'app-id',
        'private-key',
        'install-id',
        'test-org',
        7,
        '-actor:bot-user',
      );

      expect(mockRequest).toHaveBeenCalledWith(
        'GET /orgs/{org}/audit-log',
        expect.objectContaining({
          org: 'test-org',
          phrase: expect.stringMatching(
            new RegExp(`${basePhrasePattern.source.replace('$', '')} -actor:bot-user$`),
          ),
        }),
      );
    });

    it('should trim whitespace from additional phrase', async () => {
      const { fetchAuditLogEvents } = await import('../src/audit-log');

      await fetchAuditLogEvents(
        'app-id',
        'private-key',
        'install-id',
        'test-org',
        7,
        '  -actor:bot-user  ',
      );

      expect(mockRequest).toHaveBeenCalledWith(
        'GET /orgs/{org}/audit-log',
        expect.objectContaining({
          org: 'test-org',
          phrase: expect.stringMatching(
            new RegExp(`${basePhrasePattern.source.replace('$', '')} -actor:bot-user$`),
          ),
        }),
      );
    });

    it('should not append when additional phrase is empty string', async () => {
      const { fetchAuditLogEvents } = await import('../src/audit-log');

      await fetchAuditLogEvents('app-id', 'private-key', 'install-id', 'test-org', 7, '');

      expect(mockRequest).toHaveBeenCalledWith(
        'GET /orgs/{org}/audit-log',
        expect.objectContaining({
          org: 'test-org',
          phrase: expect.stringMatching(basePhrasePattern),
        }),
      );
    });

    it('should not append when additional phrase is only whitespace', async () => {
      const { fetchAuditLogEvents } = await import('../src/audit-log');

      await fetchAuditLogEvents('app-id', 'private-key', 'install-id', 'test-org', 7, '   ');

      expect(mockRequest).toHaveBeenCalledWith(
        'GET /orgs/{org}/audit-log',
        expect.objectContaining({
          org: 'test-org',
          phrase: expect.stringMatching(basePhrasePattern),
        }),
      );
    });

    it('should correctly append complex additional phrase', async () => {
      const { fetchAuditLogEvents } = await import('../src/audit-log');

      await fetchAuditLogEvents(
        'app-id',
        'private-key',
        'install-id',
        'test-org',
        7,
        '-actor:bot-user repo:my-org/my-repo',
      );

      expect(mockRequest).toHaveBeenCalledWith(
        'GET /orgs/{org}/audit-log',
        expect.objectContaining({
          org: 'test-org',
          phrase: expect.stringMatching(
            new RegExp(
              `${basePhrasePattern.source.replace('$', '')} -actor:bot-user repo:my-org\\/my-repo$`,
            ),
          ),
        }),
      );
    });
  });

  describe('fetchContextAuditLogEvents', () => {
    let mockRequest: ReturnType<typeof vi.fn>;
    let mockGetInstallationOctokit: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.resetModules();
      vi.clearAllMocks();

      mockRequest = vi.fn().mockResolvedValue({
        data: [],
        headers: {},
      });

      mockGetInstallationOctokit = vi.fn().mockResolvedValue({
        request: mockRequest,
      });

      vi.doMock('octokit', () => ({
        App: class {
          getInstallationOctokit = mockGetInstallationOctokit;
        },
      }));
    });

    afterEach(() => {
      vi.clearAllMocks();
      vi.resetModules();
    });

    it('should construct phrase with actor and date range', async () => {
      const { fetchContextAuditLogEvents } = await import('../src/audit-log');

      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-02T00:00:00Z');

      await fetchContextAuditLogEvents(
        'app-id',
        'private-key',
        'install-id',
        'test-org',
        'test-user',
        startTime,
        endTime,
      );

      expect(mockRequest).toHaveBeenCalledWith(
        'GET /orgs/{org}/audit-log',
        expect.objectContaining({
          org: 'test-org',
          phrase: 'actor:test-user created:2024-01-01..2024-01-02',
        }),
      );
    });

    it('should filter events by timestamp', async () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T12:00:00Z');

      const mockEvents = [
        {
          '@timestamp': new Date('2024-01-01T09:00:00Z').getTime(),
          action: 'repo.access',
          actor: 'test-user',
        },
        {
          '@timestamp': new Date('2024-01-01T11:00:00Z').getTime(),
          action: 'repo.create',
          actor: 'test-user',
        },
        {
          '@timestamp': new Date('2024-01-01T13:00:00Z').getTime(),
          action: 'repo.delete',
          actor: 'test-user',
        },
      ];

      mockRequest.mockResolvedValue({
        data: mockEvents,
        headers: {},
      });

      const { fetchContextAuditLogEvents } = await import('../src/audit-log');

      const result = await fetchContextAuditLogEvents(
        'app-id',
        'private-key',
        'install-id',
        'test-org',
        'test-user',
        startTime,
        endTime,
      );

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('repo.create');
    });

    it('should sort events by timestamp', async () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T12:00:00Z');

      const mockEvents = [
        {
          '@timestamp': new Date('2024-01-01T11:30:00Z').getTime(),
          action: 'repo.delete',
          actor: 'test-user',
        },
        {
          '@timestamp': new Date('2024-01-01T11:00:00Z').getTime(),
          action: 'repo.create',
          actor: 'test-user',
        },
        {
          '@timestamp': new Date('2024-01-01T11:15:00Z').getTime(),
          action: 'repo.access',
          actor: 'test-user',
        },
      ];

      mockRequest.mockResolvedValue({
        data: mockEvents,
        headers: {},
      });

      const { fetchContextAuditLogEvents } = await import('../src/audit-log');

      const result = await fetchContextAuditLogEvents(
        'app-id',
        'private-key',
        'install-id',
        'test-org',
        'test-user',
        startTime,
        endTime,
      );

      expect(result).toHaveLength(3);
      expect(result[0].action).toBe('repo.create');
      expect(result[1].action).toBe('repo.access');
      expect(result[2].action).toBe('repo.delete');
    });
  });

  describe('buildAuditLogSearchUrl', () => {
    it('should generate correct URL with encoded parameters', async () => {
      const { buildAuditLogSearchUrl } = await import('../src/audit-log');

      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-02T12:00:00Z');

      const url = buildAuditLogSearchUrl('test-org', 'test-user', startTime, endTime);

      expect(url).toContain('https://github.com/organizations/test-org/settings/audit-log?q=');
      expect(url).toContain(encodeURIComponent('actor:test-user'));
      expect(url).toContain(encodeURIComponent('created:2024-01-01..2024-01-02'));
    });
  });
});
