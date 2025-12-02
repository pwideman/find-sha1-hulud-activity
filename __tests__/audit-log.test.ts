import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('audit-log', () => {
  describe('fetchAuditLogEvents', () => {
    let mockRequest: ReturnType<typeof vi.fn>;
    let mockGetInstallationOctokit: ReturnType<typeof vi.fn>;

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
          phrase: expect.stringMatching(
            /^action:workflows\.created_workflow_run action:workflows\.completed_workflow_run action:workflows\.delete_workflow_run created:>=\d{4}-\d{2}-\d{2}$/,
          ),
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
            /^action:workflows\.created_workflow_run action:workflows\.completed_workflow_run action:workflows\.delete_workflow_run created:>=\d{4}-\d{2}-\d{2} -actor:bot-user$/,
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
            /^action:workflows\.created_workflow_run action:workflows\.completed_workflow_run action:workflows\.delete_workflow_run created:>=\d{4}-\d{2}-\d{2} -actor:bot-user$/,
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
          phrase: expect.stringMatching(
            /^action:workflows\.created_workflow_run action:workflows\.completed_workflow_run action:workflows\.delete_workflow_run created:>=\d{4}-\d{2}-\d{2}$/,
          ),
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
          phrase: expect.stringMatching(
            /^action:workflows\.created_workflow_run action:workflows\.completed_workflow_run action:workflows\.delete_workflow_run created:>=\d{4}-\d{2}-\d{2}$/,
          ),
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
            /^action:workflows\.created_workflow_run action:workflows\.completed_workflow_run action:workflows\.delete_workflow_run created:>=\d{4}-\d{2}-\d{2} -actor:bot-user repo:my-org\/my-repo$/,
          ),
        }),
      );
    });
  });
});
