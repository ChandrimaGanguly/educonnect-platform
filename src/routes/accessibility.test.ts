/**
 * Accessibility Routes Tests
 *
 * Tests for accessibility compliance API endpoints including:
 * - Accessibility checks
 * - Alt text management
 * - Caption management
 * - Transcript management
 * - User preferences
 * - Color contrast checking
 * - Compliance reports
 */

import { FastifyInstance } from 'fastify';
import { accessibilityRoutes } from './accessibility';
import { accessibilityService } from '../services/accessibility.service';

// Mock the accessibility service
jest.mock('../services/accessibility.service', () => ({
  accessibilityService: {
    createCheck: jest.fn(),
    getCheckById: jest.fn(),
    getChecksForContent: jest.fn(),
    updateCheckStatus: jest.fn(),
    runAutomatedCheck: jest.fn(),
    createIssue: jest.fn(),
    getIssueById: jest.fn(),
    getIssuesForCheck: jest.fn(),
    updateIssueStatus: jest.fn(),
    assignIssue: jest.fn(),
    createAltText: jest.fn(),
    getAltTextById: jest.fn(),
    getAltTextForContent: jest.fn(),
    updateAltText: jest.fn(),
    approveAltText: jest.fn(),
    createCaption: jest.fn(),
    getCaptionById: jest.fn(),
    getCaptionsForContent: jest.fn(),
    updateCaption: jest.fn(),
    approveCaption: jest.fn(),
    createTranscript: jest.fn(),
    getTranscriptById: jest.fn(),
    getTranscriptsForContent: jest.fn(),
    updateTranscript: jest.fn(),
    approveTranscript: jest.fn(),
    getUserPreferences: jest.fn(),
    updateUserPreferences: jest.fn(),
    checkContrastCompliance: jest.fn(),
    generateComplianceReport: jest.fn(),
  },
}));

// Create mock Fastify instance
const createMockApp = (): FastifyInstance => {
  const routes: any[] = [];

  const mockServer: any = {
    get: jest.fn((path: string, options: any, handler: any) => {
      routes.push({ method: 'GET', path, options, handler: handler || options });
    }),
    post: jest.fn((path: string, options: any, handler: any) => {
      routes.push({ method: 'POST', path, options, handler: handler || options });
    }),
    patch: jest.fn((path: string, options: any, handler: any) => {
      routes.push({ method: 'PATCH', path, options, handler: handler || options });
    }),
    delete: jest.fn((path: string, options: any, handler: any) => {
      routes.push({ method: 'DELETE', path, options, handler: handler || options });
    }),
    routes,
    getRoute: (method: string, path: string) => {
      return routes.find(r => r.method === method && r.path === path);
    },
  };

  return mockServer as FastifyInstance;
};

const createMockRequest = (overrides: any = {}) => ({
  user: { id: 'user-123' },
  params: {},
  query: {},
  body: {},
  log: { error: jest.fn(), info: jest.fn() },
  ...overrides,
});

const createMockReply = () => ({
  code: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
});

describe('Accessibility Routes', () => {
  let mockApp: FastifyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockApp = createMockApp();
    await accessibilityRoutes(mockApp);
  });

  describe('Route Registration', () => {
    it('should register all accessibility check routes', () => {
      const routes = (mockApp as any).routes;
      const checkRoutes = routes.filter((r: any) => r.path.includes('/checks'));

      expect(checkRoutes.length).toBeGreaterThan(0);
      expect(routes.some((r: any) => r.method === 'POST' && r.path === '/accessibility/checks')).toBe(true);
      expect(routes.some((r: any) => r.method === 'GET' && r.path === '/accessibility/checks')).toBe(true);
      expect(routes.some((r: any) => r.method === 'GET' && r.path === '/accessibility/checks/:id')).toBe(true);
    });

    it('should register all alt text routes', () => {
      const routes = (mockApp as any).routes;

      expect(routes.some((r: any) => r.method === 'POST' && r.path === '/accessibility/alt-text')).toBe(true);
      expect(routes.some((r: any) => r.method === 'GET' && r.path === '/accessibility/alt-text')).toBe(true);
      expect(routes.some((r: any) => r.method === 'GET' && r.path === '/accessibility/alt-text/:id')).toBe(true);
      expect(routes.some((r: any) => r.method === 'PATCH' && r.path === '/accessibility/alt-text/:id')).toBe(true);
    });

    it('should register all caption routes', () => {
      const routes = (mockApp as any).routes;

      expect(routes.some((r: any) => r.method === 'POST' && r.path === '/accessibility/captions')).toBe(true);
      expect(routes.some((r: any) => r.method === 'GET' && r.path === '/accessibility/captions')).toBe(true);
    });

    it('should register all transcript routes', () => {
      const routes = (mockApp as any).routes;

      expect(routes.some((r: any) => r.method === 'POST' && r.path === '/accessibility/transcripts')).toBe(true);
      expect(routes.some((r: any) => r.method === 'GET' && r.path === '/accessibility/transcripts')).toBe(true);
    });

    it('should register preference routes', () => {
      const routes = (mockApp as any).routes;

      expect(routes.some((r: any) => r.method === 'GET' && r.path === '/accessibility/preferences')).toBe(true);
      expect(routes.some((r: any) => r.method === 'PATCH' && r.path === '/accessibility/preferences')).toBe(true);
    });

    it('should register contrast check route', () => {
      const routes = (mockApp as any).routes;

      expect(routes.some((r: any) => r.method === 'POST' && r.path === '/accessibility/contrast/check')).toBe(true);
    });

    it('should register compliance report route', () => {
      const routes = (mockApp as any).routes;

      expect(routes.some((r: any) => r.method === 'GET' && r.path === '/accessibility/compliance-report')).toBe(true);
    });
  });

  describe('Accessibility Checks Endpoints', () => {
    describe('POST /accessibility/checks', () => {
      it('should create accessibility check', async () => {
        const mockCheck = {
          id: 'check-123',
          lessonId: 'lesson-123',
          checkType: 'alt_text',
          status: 'pending',
        };
        (accessibilityService.createCheck as jest.Mock).mockResolvedValue(mockCheck);

        const route = (mockApp as any).getRoute('POST', '/accessibility/checks');
        const request = createMockRequest({
          body: {
            lessonId: 'lesson-123',
            checkType: 'alt_text',
          },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(accessibilityService.createCheck).toHaveBeenCalled();
        expect(reply.code).toHaveBeenCalledWith(201);
        expect(reply.send).toHaveBeenCalledWith(mockCheck);
      });

      it('should return 401 if not authenticated', async () => {
        const route = (mockApp as any).getRoute('POST', '/accessibility/checks');
        const request = createMockRequest({
          user: null,
          body: { lessonId: 'lesson-123', checkType: 'alt_text' },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(reply.code).toHaveBeenCalledWith(401);
      });

      it('should return 400 if no content reference provided', async () => {
        const route = (mockApp as any).getRoute('POST', '/accessibility/checks');
        const request = createMockRequest({
          body: { checkType: 'alt_text' },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(reply.code).toHaveBeenCalledWith(400);
      });
    });

    describe('POST /accessibility/checks/automated', () => {
      it('should run automated check', async () => {
        const mockResult = {
          check: { id: 'check-123', status: 'passed' },
          issues: [],
        };
        (accessibilityService.runAutomatedCheck as jest.Mock).mockResolvedValue(mockResult);

        const route = (mockApp as any).getRoute('POST', '/accessibility/checks/automated');
        const request = createMockRequest({
          body: {
            contentHtml: '<html><body><img src="test.jpg" alt="test"></body></html>',
            checkType: 'alt_text',
            lessonId: 'lesson-123',
          },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(accessibilityService.runAutomatedCheck).toHaveBeenCalled();
        expect(reply.send).toHaveBeenCalledWith(mockResult);
      });
    });

    describe('GET /accessibility/checks', () => {
      it('should get checks with filters', async () => {
        const mockChecks = [
          { id: 'check-1', checkType: 'alt_text', status: 'passed' },
        ];
        (accessibilityService.getChecksForContent as jest.Mock).mockResolvedValue(mockChecks);

        const route = (mockApp as any).getRoute('GET', '/accessibility/checks');
        const request = createMockRequest({
          query: { lessonId: 'lesson-123', status: 'passed' },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(accessibilityService.getChecksForContent).toHaveBeenCalledWith({
          lessonId: 'lesson-123',
          status: 'passed',
        });
        expect(reply.send).toHaveBeenCalledWith(mockChecks);
      });
    });

    describe('GET /accessibility/checks/:id', () => {
      it('should get check by ID', async () => {
        const mockCheck = { id: 'check-123', checkType: 'alt_text' };
        (accessibilityService.getCheckById as jest.Mock).mockResolvedValue(mockCheck);

        const route = (mockApp as any).getRoute('GET', '/accessibility/checks/:id');
        const request = createMockRequest({
          params: { id: 'check-123' },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(accessibilityService.getCheckById).toHaveBeenCalledWith('check-123');
        expect(reply.send).toHaveBeenCalledWith(mockCheck);
      });

      it('should return 404 for non-existent check', async () => {
        (accessibilityService.getCheckById as jest.Mock).mockResolvedValue(null);

        const route = (mockApp as any).getRoute('GET', '/accessibility/checks/:id');
        const request = createMockRequest({
          params: { id: 'non-existent' },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(reply.code).toHaveBeenCalledWith(404);
      });
    });
  });

  describe('Alt Text Endpoints', () => {
    describe('POST /accessibility/alt-text', () => {
      it('should create alt text', async () => {
        const mockAltText = {
          id: 'alt-123',
          altText: 'A scenic mountain landscape',
          isApproved: false,
        };
        (accessibilityService.createAltText as jest.Mock).mockResolvedValue(mockAltText);

        const route = (mockApp as any).getRoute('POST', '/accessibility/alt-text');
        const request = createMockRequest({
          body: {
            contentFileId: 'file-123',
            altText: 'A scenic mountain landscape',
          },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(accessibilityService.createAltText).toHaveBeenCalled();
        expect(reply.code).toHaveBeenCalledWith(201);
      });

      it('should return 400 if no content reference', async () => {
        const route = (mockApp as any).getRoute('POST', '/accessibility/alt-text');
        const request = createMockRequest({
          body: { altText: 'Test alt text' },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(reply.code).toHaveBeenCalledWith(400);
      });
    });

    describe('GET /accessibility/alt-text/:id', () => {
      it('should get alt text by ID', async () => {
        const mockAltText = { id: 'alt-123', altText: 'Test' };
        (accessibilityService.getAltTextById as jest.Mock).mockResolvedValue(mockAltText);

        const route = (mockApp as any).getRoute('GET', '/accessibility/alt-text/:id');
        const request = createMockRequest({
          params: { id: 'alt-123' },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockAltText);
      });

      it('should return 404 for non-existent alt text', async () => {
        (accessibilityService.getAltTextById as jest.Mock).mockResolvedValue(null);

        const route = (mockApp as any).getRoute('GET', '/accessibility/alt-text/:id');
        const request = createMockRequest({
          params: { id: 'non-existent' },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(reply.code).toHaveBeenCalledWith(404);
      });
    });

    describe('PATCH /accessibility/alt-text/:id', () => {
      it('should update alt text', async () => {
        const mockAltText = { id: 'alt-123', altText: 'Updated description' };
        (accessibilityService.updateAltText as jest.Mock).mockResolvedValue(mockAltText);

        const route = (mockApp as any).getRoute('PATCH', '/accessibility/alt-text/:id');
        const request = createMockRequest({
          params: { id: 'alt-123' },
          body: { altText: 'Updated description' },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(accessibilityService.updateAltText).toHaveBeenCalled();
        expect(reply.send).toHaveBeenCalledWith(mockAltText);
      });
    });

    describe('POST /accessibility/alt-text/:id/approve', () => {
      it('should approve alt text', async () => {
        const mockAltText = { id: 'alt-123', isApproved: true };
        (accessibilityService.approveAltText as jest.Mock).mockResolvedValue(mockAltText);

        const route = (mockApp as any).getRoute('POST', '/accessibility/alt-text/:id/approve');
        const request = createMockRequest({
          params: { id: 'alt-123' },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(accessibilityService.approveAltText).toHaveBeenCalledWith('alt-123', 'user-123');
      });
    });
  });

  describe('Caption Endpoints', () => {
    describe('POST /accessibility/captions', () => {
      it('should create caption', async () => {
        const mockCaption = {
          id: 'cap-123',
          language: 'en',
          format: 'vtt',
        };
        (accessibilityService.createCaption as jest.Mock).mockResolvedValue(mockCaption);

        const route = (mockApp as any).getRoute('POST', '/accessibility/captions');
        const request = createMockRequest({
          body: {
            contentFileId: 'file-123',
            content: 'WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nHello!',
          },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(accessibilityService.createCaption).toHaveBeenCalled();
        expect(reply.code).toHaveBeenCalledWith(201);
      });

      it('should return 400 if no content or fileUrl', async () => {
        const route = (mockApp as any).getRoute('POST', '/accessibility/captions');
        const request = createMockRequest({
          body: { contentFileId: 'file-123' },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(reply.code).toHaveBeenCalledWith(400);
      });
    });

    describe('POST /accessibility/captions/:id/approve', () => {
      it('should approve caption', async () => {
        const mockCaption = { id: 'cap-123', isApproved: true };
        (accessibilityService.approveCaption as jest.Mock).mockResolvedValue(mockCaption);

        const route = (mockApp as any).getRoute('POST', '/accessibility/captions/:id/approve');
        const request = createMockRequest({
          params: { id: 'cap-123' },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(accessibilityService.approveCaption).toHaveBeenCalledWith('cap-123', 'user-123');
      });
    });
  });

  describe('Transcript Endpoints', () => {
    describe('POST /accessibility/transcripts', () => {
      it('should create transcript', async () => {
        const mockTranscript = {
          id: 'trans-123',
          content: 'Transcript content',
        };
        (accessibilityService.createTranscript as jest.Mock).mockResolvedValue(mockTranscript);

        const route = (mockApp as any).getRoute('POST', '/accessibility/transcripts');
        const request = createMockRequest({
          body: {
            lessonId: 'lesson-123',
            content: 'Transcript content',
          },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(accessibilityService.createTranscript).toHaveBeenCalled();
        expect(reply.code).toHaveBeenCalledWith(201);
      });

      it('should return 400 if no content reference', async () => {
        const route = (mockApp as any).getRoute('POST', '/accessibility/transcripts');
        const request = createMockRequest({
          body: { content: 'Transcript content' },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(reply.code).toHaveBeenCalledWith(400);
      });
    });
  });

  describe('User Preferences Endpoints', () => {
    describe('GET /accessibility/preferences', () => {
      it('should get user preferences', async () => {
        const mockPrefs = {
          userId: 'user-123',
          highContrastMode: false,
          textScaleFactor: 1.0,
        };
        (accessibilityService.getUserPreferences as jest.Mock).mockResolvedValue(mockPrefs);

        const route = (mockApp as any).getRoute('GET', '/accessibility/preferences');
        const request = createMockRequest();
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(accessibilityService.getUserPreferences).toHaveBeenCalledWith('user-123');
        expect(reply.send).toHaveBeenCalledWith(mockPrefs);
      });
    });

    describe('PATCH /accessibility/preferences', () => {
      it('should update user preferences', async () => {
        const mockPrefs = {
          userId: 'user-123',
          highContrastMode: true,
          textScaleFactor: 1.5,
        };
        (accessibilityService.updateUserPreferences as jest.Mock).mockResolvedValue(mockPrefs);

        const route = (mockApp as any).getRoute('PATCH', '/accessibility/preferences');
        const request = createMockRequest({
          body: {
            highContrastMode: true,
            textScaleFactor: 1.5,
          },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(accessibilityService.updateUserPreferences).toHaveBeenCalled();
        expect(reply.send).toHaveBeenCalledWith(mockPrefs);
      });
    });
  });

  describe('Color Contrast Endpoint', () => {
    describe('POST /accessibility/contrast/check', () => {
      it('should check color contrast', async () => {
        const mockResult = {
          ratio: 21,
          passesAa: true,
          passesAaa: true,
        };
        (accessibilityService.checkContrastCompliance as jest.Mock).mockReturnValue(mockResult);

        const route = (mockApp as any).getRoute('POST', '/accessibility/contrast/check');
        const request = createMockRequest({
          body: {
            foreground: '#000000',
            background: '#FFFFFF',
          },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(accessibilityService.checkContrastCompliance).toHaveBeenCalledWith('#000000', '#FFFFFF', undefined);
        expect(reply.send).toHaveBeenCalledWith(mockResult);
      });

      it('should handle large text flag', async () => {
        const mockResult = {
          ratio: 4,
          passesAa: true,
          passesAaa: false,
        };
        (accessibilityService.checkContrastCompliance as jest.Mock).mockReturnValue(mockResult);

        const route = (mockApp as any).getRoute('POST', '/accessibility/contrast/check');
        const request = createMockRequest({
          body: {
            foreground: '#666666',
            background: '#FFFFFF',
            isLargeText: true,
          },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(accessibilityService.checkContrastCompliance).toHaveBeenCalledWith('#666666', '#FFFFFF', true);
      });
    });
  });

  describe('Compliance Report Endpoint', () => {
    describe('GET /accessibility/compliance-report', () => {
      it('should generate compliance report', async () => {
        const mockReport = {
          overallScore: 95,
          wcagLevel: 'AA',
          checksPerformed: 5,
          issuesFound: 2,
          issuesResolved: 1,
          criticalIssues: 0,
          accessibilityFeatures: {
            hasAltText: true,
            hasCaptions: true,
            hasTranscripts: true,
            meetsColorContrast: true,
          },
        };
        (accessibilityService.generateComplianceReport as jest.Mock).mockResolvedValue(mockReport);

        const route = (mockApp as any).getRoute('GET', '/accessibility/compliance-report');
        const request = createMockRequest({
          query: { lessonId: 'lesson-123' },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(accessibilityService.generateComplianceReport).toHaveBeenCalled();
        expect(reply.send).toHaveBeenCalledWith(mockReport);
      });

      it('should return 400 if no content reference', async () => {
        const route = (mockApp as any).getRoute('GET', '/accessibility/compliance-report');
        const request = createMockRequest({
          query: {},
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(reply.code).toHaveBeenCalledWith(400);
      });
    });
  });

  describe('Issue Endpoints', () => {
    describe('POST /accessibility/issues', () => {
      it('should create issue', async () => {
        const mockIssue = {
          id: 'issue-123',
          severity: 'critical',
          wcagCriterion: '1.1.1',
        };
        (accessibilityService.createIssue as jest.Mock).mockResolvedValue(mockIssue);

        const route = (mockApp as any).getRoute('POST', '/accessibility/issues');
        const request = createMockRequest({
          body: {
            checkId: 'check-123',
            severity: 'critical',
            wcagCriterion: '1.1.1',
            wcagCriterionName: 'Non-text Content',
            issueCode: 'img-alt-missing',
            description: 'Image missing alt',
            impact: 'Screen readers cannot describe image',
            recommendation: 'Add alt attribute',
          },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(accessibilityService.createIssue).toHaveBeenCalled();
        expect(reply.code).toHaveBeenCalledWith(201);
      });
    });

    describe('PATCH /accessibility/issues/:id/status', () => {
      it('should update issue status', async () => {
        const mockIssue = {
          id: 'issue-123',
          status: 'resolved',
        };
        (accessibilityService.updateIssueStatus as jest.Mock).mockResolvedValue(mockIssue);

        const route = (mockApp as any).getRoute('PATCH', '/accessibility/issues/:id/status');
        const request = createMockRequest({
          params: { id: 'issue-123' },
          body: { status: 'resolved', resolutionNotes: 'Fixed' },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(accessibilityService.updateIssueStatus).toHaveBeenCalledWith(
          'issue-123',
          'resolved',
          'user-123',
          'Fixed'
        );
      });
    });

    describe('POST /accessibility/issues/:id/assign', () => {
      it('should assign issue', async () => {
        const mockIssue = {
          id: 'issue-123',
          assignedTo: 'assignee-123',
        };
        (accessibilityService.assignIssue as jest.Mock).mockResolvedValue(mockIssue);

        const route = (mockApp as any).getRoute('POST', '/accessibility/issues/:id/assign');
        const request = createMockRequest({
          params: { id: 'issue-123' },
          body: { assigneeId: 'assignee-123' },
        });
        const reply = createMockReply();

        await route.handler(request, reply);

        expect(accessibilityService.assignIssue).toHaveBeenCalledWith(
          'issue-123',
          'assignee-123',
          'user-123'
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 500 on service error', async () => {
      (accessibilityService.getChecksForContent as jest.Mock).mockRejectedValue(new Error('Database error'));

      const route = (mockApp as any).getRoute('GET', '/accessibility/checks');
      const request = createMockRequest({
        query: { lessonId: 'lesson-123' },
      });
      const reply = createMockReply();

      await route.handler(request, reply);

      expect(reply.code).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Failed to fetch accessibility checks' });
    });
  });
});
