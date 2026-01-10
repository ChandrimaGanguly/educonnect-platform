import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  accessibilityService,
  CheckType,
  WcagLevel,
  CheckStatus,
  IssueSeverity,
  IssueStatus,
  CaptionType,
  CaptionFormat,
  CaptionSource,
  TranscriptType,
  AltTextSource,
} from '../services/accessibility.service';

/**
 * Accessibility Compliance Routes
 *
 * API endpoints for managing content accessibility:
 * - Accessibility checks and audits
 * - Alt text management
 * - Caption management
 * - Transcript management
 * - User accessibility preferences
 * - Color contrast checking
 * - Compliance reports
 *
 * Per WCAG 2.1 AA requirements from curriculum spec:
 * - Alt text for all images (1.1.1)
 * - Captions for all video (1.2.2)
 * - Transcripts for all audio (1.2.1)
 * - Keyboard navigation support (2.1.1)
 * - Screen reader compatibility (4.1.2)
 * - Color contrast compliance (1.4.3)
 */

// Request/Response interfaces
interface CreateCheckBody {
  lessonId?: string;
  resourceId?: string;
  contentFileId?: string;
  checkType: CheckType;
  wcagLevel?: WcagLevel;
  wcagVersion?: string;
  isAutomated?: boolean;
}

interface RunAutomatedCheckBody {
  contentHtml: string;
  checkType: CheckType;
  lessonId?: string;
  resourceId?: string;
  contentFileId?: string;
  wcagLevel?: WcagLevel;
}

interface UpdateCheckStatusBody {
  status: CheckStatus;
  complianceScore?: number;
  issuesFound?: number;
  issuesResolved?: number;
  checkResults?: Record<string, any>;
}

interface CreateIssueBody {
  checkId: string;
  severity: IssueSeverity;
  wcagCriterion: string;
  wcagCriterionName: string;
  issueCode: string;
  description: string;
  impact: string;
  elementSelector?: string;
  elementHtml?: string;
  lineNumber?: number;
  columnNumber?: number;
  recommendation: string;
  fixExample?: string;
  helpUrl?: string;
}

interface UpdateIssueStatusBody {
  status: IssueStatus;
  resolutionNotes?: string;
}

interface AssignIssueBody {
  assigneeId: string;
}

interface CreateAltTextBody {
  contentFileId?: string;
  resourceId?: string;
  altText: string;
  longDescription?: string;
  isDecorative?: boolean;
  source?: AltTextSource;
  confidenceScore?: number;
  language?: string;
}

interface UpdateAltTextBody {
  altText?: string;
  longDescription?: string;
  isDecorative?: boolean;
}

interface CreateCaptionBody {
  contentFileId?: string;
  resourceId?: string;
  language?: string;
  languageName?: string;
  captionType?: CaptionType;
  format?: CaptionFormat;
  content?: string;
  fileUrl?: string;
  durationMs?: number;
  source?: CaptionSource;
}

interface UpdateCaptionBody {
  content?: string;
  fileUrl?: string;
  isSynced?: boolean;
}

interface CreateTranscriptBody {
  contentFileId?: string;
  resourceId?: string;
  lessonId?: string;
  language?: string;
  languageName?: string;
  transcriptType?: TranscriptType;
  content: string;
  segments?: Array<{ startTime: number; endTime: number; text: string; speaker?: string }>;
  durationMs?: number;
  source?: CaptionSource;
}

interface UpdateTranscriptBody {
  content?: string;
  segments?: Array<{ startTime: number; endTime: number; text: string; speaker?: string }>;
}

interface UpdatePreferencesBody {
  highContrastMode?: boolean;
  largeText?: boolean;
  textScaleFactor?: number;
  dyslexiaFriendlyFont?: boolean;
  reduceMotion?: boolean;
  reduceTransparency?: boolean;
  colorScheme?: string;
  invertColors?: boolean;
  grayscale?: boolean;
  customColors?: Record<string, string>;
  captionsEnabled?: boolean;
  audioDescriptionsEnabled?: boolean;
  autoPlayMedia?: boolean;
  captionLanguage?: string;
  captionStyle?: Record<string, any>;
  keyboardNavigation?: boolean;
  skipLinksEnabled?: boolean;
  focusIndicatorsEnhanced?: boolean;
  linkUnderlines?: boolean;
  screenReaderOptimized?: boolean;
  announceImages?: boolean;
  announceLinks?: boolean;
  ariaLivePoliteness?: string;
  simplifiedLayout?: boolean;
  readingGuide?: boolean;
  textToSpeech?: boolean;
  readingSpeed?: number;
  clickDelayMs?: number;
  stickyKeys?: boolean;
  bounceKeys?: boolean;
}

interface CheckContrastBody {
  foreground: string;
  background: string;
  isLargeText?: boolean;
}

interface GetChecksQuery {
  lessonId?: string;
  resourceId?: string;
  contentFileId?: string;
  checkType?: CheckType;
  status?: CheckStatus;
  wcagLevel?: WcagLevel;
}

interface GetIssuesQuery {
  severity?: IssueSeverity;
  status?: IssueStatus;
}

interface GetAltTextQuery {
  contentFileId?: string;
  resourceId?: string;
  language?: string;
  approvedOnly?: string;
}

interface GetCaptionsQuery {
  contentFileId?: string;
  resourceId?: string;
  language?: string;
  captionType?: CaptionType;
  approvedOnly?: string;
}

interface GetTranscriptsQuery {
  contentFileId?: string;
  resourceId?: string;
  lessonId?: string;
  language?: string;
  transcriptType?: TranscriptType;
  approvedOnly?: string;
}

interface GenerateReportQuery {
  lessonId?: string;
  resourceId?: string;
  contentFileId?: string;
}

export async function accessibilityRoutes(server: FastifyInstance): Promise<void> {
  // ============================================
  // Accessibility Checks Endpoints
  // ============================================

  /**
   * Create a new accessibility check
   */
  server.post('/accessibility/checks', {
    schema: {
      description: 'Create a new accessibility check for content',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['checkType'],
        properties: {
          lessonId: { type: 'string', format: 'uuid' },
          resourceId: { type: 'string', format: 'uuid' },
          contentFileId: { type: 'string', format: 'uuid' },
          checkType: {
            type: 'string',
            enum: ['alt_text', 'captions', 'transcript', 'color_contrast', 'keyboard_navigation',
              'screen_reader', 'heading_structure', 'link_text', 'form_labels', 'language',
              'focus_indicators', 'text_scaling', 'motion_sensitivity', 'full_audit'],
          },
          wcagLevel: { type: 'string', enum: ['A', 'AA', 'AAA'] },
          wcagVersion: { type: 'string' },
          isAutomated: { type: 'boolean' },
        },
      },
      response: {
        201: {
          description: 'Created accessibility check',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: CreateCheckBody }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { lessonId, resourceId, contentFileId } = request.body;
      if (!lessonId && !resourceId && !contentFileId) {
        return reply.code(400).send({ error: 'At least one content reference is required' });
      }

      const check = await accessibilityService.createCheck({
        ...request.body,
        checkedBy: userId,
      });

      return reply.code(201).send(check);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to create accessibility check' });
    }
  });

  /**
   * Run automated accessibility check
   */
  server.post('/accessibility/checks/automated', {
    schema: {
      description: 'Run automated accessibility check on HTML content',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['contentHtml', 'checkType'],
        properties: {
          contentHtml: { type: 'string' },
          checkType: {
            type: 'string',
            enum: ['alt_text', 'captions', 'transcript', 'color_contrast', 'keyboard_navigation',
              'screen_reader', 'heading_structure', 'link_text', 'form_labels', 'language',
              'focus_indicators', 'text_scaling', 'motion_sensitivity', 'full_audit'],
          },
          lessonId: { type: 'string', format: 'uuid' },
          resourceId: { type: 'string', format: 'uuid' },
          contentFileId: { type: 'string', format: 'uuid' },
          wcagLevel: { type: 'string', enum: ['A', 'AA', 'AAA'] },
        },
      },
      response: {
        200: {
          description: 'Automated check results',
          type: 'object',
          properties: {
            check: { type: 'object' },
            issues: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: RunAutomatedCheckBody }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { contentHtml, checkType, lessonId, resourceId, contentFileId, wcagLevel } = request.body;

      if (!lessonId && !resourceId && !contentFileId) {
        return reply.code(400).send({ error: 'At least one content reference is required' });
      }

      const result = await accessibilityService.runAutomatedCheck(contentHtml, checkType, {
        lessonId,
        resourceId,
        contentFileId,
        checkType,
        wcagLevel,
        checkedBy: userId,
      });

      return reply.send(result);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to run automated check' });
    }
  });

  /**
   * Get accessibility checks
   */
  server.get('/accessibility/checks', {
    schema: {
      description: 'Get accessibility checks with optional filters',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          lessonId: { type: 'string', format: 'uuid' },
          resourceId: { type: 'string', format: 'uuid' },
          contentFileId: { type: 'string', format: 'uuid' },
          checkType: { type: 'string' },
          status: { type: 'string' },
          wcagLevel: { type: 'string' },
        },
      },
      response: {
        200: {
          description: 'List of accessibility checks',
          type: 'array',
          items: { type: 'object' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: GetChecksQuery }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const checks = await accessibilityService.getChecksForContent(request.query);
      return reply.send(checks);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch accessibility checks' });
    }
  });

  /**
   * Get accessibility check by ID
   */
  server.get('/accessibility/checks/:id', {
    schema: {
      description: 'Get accessibility check by ID',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Accessibility check details',
          type: 'object',
        },
        404: {
          description: 'Check not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const check = await accessibilityService.getCheckById(request.params.id);
      if (!check) {
        return reply.code(404).send({ error: 'Accessibility check not found' });
      }

      return reply.send(check);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch accessibility check' });
    }
  });

  /**
   * Update accessibility check status
   */
  server.patch('/accessibility/checks/:id/status', {
    schema: {
      description: 'Update accessibility check status',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['pending', 'in_progress', 'passed', 'failed', 'warning', 'not_applicable'] },
          complianceScore: { type: 'number', minimum: 0, maximum: 100 },
          issuesFound: { type: 'integer', minimum: 0 },
          issuesResolved: { type: 'integer', minimum: 0 },
          checkResults: { type: 'object' },
        },
      },
      response: {
        200: {
          description: 'Updated accessibility check',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateCheckStatusBody }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const check = await accessibilityService.updateCheckStatus(
        request.params.id,
        request.body.status,
        {
          complianceScore: request.body.complianceScore,
          issuesFound: request.body.issuesFound,
          issuesResolved: request.body.issuesResolved,
          checkResults: request.body.checkResults,
        },
        userId
      );

      return reply.send(check);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to update accessibility check status' });
    }
  });

  // ============================================
  // Accessibility Issues Endpoints
  // ============================================

  /**
   * Create an accessibility issue
   */
  server.post('/accessibility/issues', {
    schema: {
      description: 'Create a new accessibility issue',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['checkId', 'severity', 'wcagCriterion', 'wcagCriterionName', 'issueCode', 'description', 'impact', 'recommendation'],
        properties: {
          checkId: { type: 'string', format: 'uuid' },
          severity: { type: 'string', enum: ['critical', 'serious', 'moderate', 'minor'] },
          wcagCriterion: { type: 'string' },
          wcagCriterionName: { type: 'string' },
          issueCode: { type: 'string' },
          description: { type: 'string' },
          impact: { type: 'string' },
          elementSelector: { type: 'string' },
          elementHtml: { type: 'string' },
          lineNumber: { type: 'integer' },
          columnNumber: { type: 'integer' },
          recommendation: { type: 'string' },
          fixExample: { type: 'string' },
          helpUrl: { type: 'string' },
        },
      },
      response: {
        201: {
          description: 'Created accessibility issue',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: CreateIssueBody }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const issue = await accessibilityService.createIssue(request.body);
      return reply.code(201).send(issue);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to create accessibility issue' });
    }
  });

  /**
   * Get issues for a check
   */
  server.get('/accessibility/checks/:checkId/issues', {
    schema: {
      description: 'Get accessibility issues for a check',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['checkId'],
        properties: {
          checkId: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['critical', 'serious', 'moderate', 'minor'] },
          status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'wont_fix', 'false_positive'] },
        },
      },
      response: {
        200: {
          description: 'List of accessibility issues',
          type: 'array',
          items: { type: 'object' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { checkId: string }; Querystring: GetIssuesQuery }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const issues = await accessibilityService.getIssuesForCheck(request.params.checkId, request.query);
      return reply.send(issues);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch accessibility issues' });
    }
  });

  /**
   * Get issue by ID
   */
  server.get('/accessibility/issues/:id', {
    schema: {
      description: 'Get accessibility issue by ID',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Accessibility issue details',
          type: 'object',
        },
        404: {
          description: 'Issue not found',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const issue = await accessibilityService.getIssueById(request.params.id);
      if (!issue) {
        return reply.code(404).send({ error: 'Accessibility issue not found' });
      }

      return reply.send(issue);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch accessibility issue' });
    }
  });

  /**
   * Update issue status
   */
  server.patch('/accessibility/issues/:id/status', {
    schema: {
      description: 'Update accessibility issue status',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'wont_fix', 'false_positive'] },
          resolutionNotes: { type: 'string' },
        },
      },
      response: {
        200: {
          description: 'Updated accessibility issue',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateIssueStatusBody }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const issue = await accessibilityService.updateIssueStatus(
        request.params.id,
        request.body.status,
        userId,
        request.body.resolutionNotes
      );

      return reply.send(issue);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to update accessibility issue status' });
    }
  });

  /**
   * Assign issue to user
   */
  server.post('/accessibility/issues/:id/assign', {
    schema: {
      description: 'Assign accessibility issue to a user',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['assigneeId'],
        properties: {
          assigneeId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Updated accessibility issue',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: AssignIssueBody }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const issue = await accessibilityService.assignIssue(
        request.params.id,
        request.body.assigneeId,
        userId
      );

      return reply.send(issue);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to assign accessibility issue' });
    }
  });

  // ============================================
  // Alt Text Endpoints
  // ============================================

  /**
   * Create alt text
   */
  server.post('/accessibility/alt-text', {
    schema: {
      description: 'Create alt text for an image',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['altText'],
        properties: {
          contentFileId: { type: 'string', format: 'uuid' },
          resourceId: { type: 'string', format: 'uuid' },
          altText: { type: 'string', minLength: 1 },
          longDescription: { type: 'string' },
          isDecorative: { type: 'boolean' },
          source: { type: 'string', enum: ['manual', 'ai_generated', 'imported', 'auto_detected'] },
          confidenceScore: { type: 'number', minimum: 0, maximum: 100 },
          language: { type: 'string' },
        },
      },
      response: {
        201: {
          description: 'Created alt text',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: CreateAltTextBody }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { contentFileId, resourceId } = request.body;
      if (!contentFileId && !resourceId) {
        return reply.code(400).send({ error: 'Either contentFileId or resourceId is required' });
      }

      const altText = await accessibilityService.createAltText({
        ...request.body,
        createdBy: userId,
      });

      return reply.code(201).send(altText);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to create alt text' });
    }
  });

  /**
   * Get alt text for content
   */
  server.get('/accessibility/alt-text', {
    schema: {
      description: 'Get alt text for content',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          contentFileId: { type: 'string', format: 'uuid' },
          resourceId: { type: 'string', format: 'uuid' },
          language: { type: 'string' },
          approvedOnly: { type: 'string' },
        },
      },
      response: {
        200: {
          description: 'List of alt text entries',
          type: 'array',
          items: { type: 'object' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: GetAltTextQuery }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const altTexts = await accessibilityService.getAltTextForContent({
        ...request.query,
        approvedOnly: request.query.approvedOnly === 'true',
      });

      return reply.send(altTexts);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch alt text' });
    }
  });

  /**
   * Get alt text by ID
   */
  server.get('/accessibility/alt-text/:id', {
    schema: {
      description: 'Get alt text by ID',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Alt text details',
          type: 'object',
        },
        404: {
          description: 'Alt text not found',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const altText = await accessibilityService.getAltTextById(request.params.id);
      if (!altText) {
        return reply.code(404).send({ error: 'Alt text not found' });
      }

      return reply.send(altText);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch alt text' });
    }
  });

  /**
   * Update alt text
   */
  server.patch('/accessibility/alt-text/:id', {
    schema: {
      description: 'Update alt text',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          altText: { type: 'string', minLength: 1 },
          longDescription: { type: 'string' },
          isDecorative: { type: 'boolean' },
        },
      },
      response: {
        200: {
          description: 'Updated alt text',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateAltTextBody }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const altText = await accessibilityService.updateAltText(
        request.params.id,
        request.body,
        userId
      );

      return reply.send(altText);
    } catch (error: any) {
      if (error.message === 'Alt text not found') {
        return reply.code(404).send({ error: error.message });
      }
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to update alt text' });
    }
  });

  /**
   * Approve alt text
   */
  server.post('/accessibility/alt-text/:id/approve', {
    schema: {
      description: 'Approve alt text',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Approved alt text',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const altText = await accessibilityService.approveAltText(request.params.id, userId);
      return reply.send(altText);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to approve alt text' });
    }
  });

  // ============================================
  // Captions Endpoints
  // ============================================

  /**
   * Create captions
   */
  server.post('/accessibility/captions', {
    schema: {
      description: 'Create captions for video/audio content',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          contentFileId: { type: 'string', format: 'uuid' },
          resourceId: { type: 'string', format: 'uuid' },
          language: { type: 'string' },
          languageName: { type: 'string' },
          captionType: { type: 'string', enum: ['subtitles', 'captions', 'descriptions', 'chapters'] },
          format: { type: 'string', enum: ['vtt', 'srt', 'sbv', 'ass', 'ttml'] },
          content: { type: 'string' },
          fileUrl: { type: 'string' },
          durationMs: { type: 'integer', minimum: 0 },
          source: { type: 'string', enum: ['manual', 'auto_generated', 'professional', 'community', 'imported'] },
        },
      },
      response: {
        201: {
          description: 'Created captions',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: CreateCaptionBody }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { contentFileId, resourceId, content, fileUrl } = request.body;
      if (!contentFileId && !resourceId) {
        return reply.code(400).send({ error: 'Either contentFileId or resourceId is required' });
      }
      if (!content && !fileUrl) {
        return reply.code(400).send({ error: 'Either content or fileUrl is required' });
      }

      const caption = await accessibilityService.createCaption({
        ...request.body,
        createdBy: userId,
      });

      return reply.code(201).send(caption);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to create captions' });
    }
  });

  /**
   * Get captions for content
   */
  server.get('/accessibility/captions', {
    schema: {
      description: 'Get captions for content',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          contentFileId: { type: 'string', format: 'uuid' },
          resourceId: { type: 'string', format: 'uuid' },
          language: { type: 'string' },
          captionType: { type: 'string', enum: ['subtitles', 'captions', 'descriptions', 'chapters'] },
          approvedOnly: { type: 'string' },
        },
      },
      response: {
        200: {
          description: 'List of captions',
          type: 'array',
          items: { type: 'object' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: GetCaptionsQuery }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const captions = await accessibilityService.getCaptionsForContent({
        ...request.query,
        approvedOnly: request.query.approvedOnly === 'true',
      });

      return reply.send(captions);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch captions' });
    }
  });

  /**
   * Get caption by ID
   */
  server.get('/accessibility/captions/:id', {
    schema: {
      description: 'Get caption by ID',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Caption details',
          type: 'object',
        },
        404: {
          description: 'Caption not found',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const caption = await accessibilityService.getCaptionById(request.params.id);
      if (!caption) {
        return reply.code(404).send({ error: 'Caption not found' });
      }

      return reply.send(caption);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch caption' });
    }
  });

  /**
   * Update caption
   */
  server.patch('/accessibility/captions/:id', {
    schema: {
      description: 'Update caption content',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          fileUrl: { type: 'string' },
          isSynced: { type: 'boolean' },
        },
      },
      response: {
        200: {
          description: 'Updated caption',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateCaptionBody }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const caption = await accessibilityService.updateCaption(
        request.params.id,
        request.body,
        userId
      );

      return reply.send(caption);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to update caption' });
    }
  });

  /**
   * Approve caption
   */
  server.post('/accessibility/captions/:id/approve', {
    schema: {
      description: 'Approve caption',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Approved caption',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const caption = await accessibilityService.approveCaption(request.params.id, userId);
      return reply.send(caption);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to approve caption' });
    }
  });

  // ============================================
  // Transcripts Endpoints
  // ============================================

  /**
   * Create transcript
   */
  server.post('/accessibility/transcripts', {
    schema: {
      description: 'Create transcript for audio/video content',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          contentFileId: { type: 'string', format: 'uuid' },
          resourceId: { type: 'string', format: 'uuid' },
          lessonId: { type: 'string', format: 'uuid' },
          language: { type: 'string' },
          languageName: { type: 'string' },
          transcriptType: { type: 'string', enum: ['basic', 'timestamped', 'interactive', 'descriptive'] },
          content: { type: 'string', minLength: 1 },
          segments: {
            type: 'array',
            items: {
              type: 'object',
              required: ['startTime', 'endTime', 'text'],
              properties: {
                startTime: { type: 'number' },
                endTime: { type: 'number' },
                text: { type: 'string' },
                speaker: { type: 'string' },
              },
            },
          },
          durationMs: { type: 'integer', minimum: 0 },
          source: { type: 'string', enum: ['manual', 'auto_generated', 'professional', 'community', 'imported'] },
        },
      },
      response: {
        201: {
          description: 'Created transcript',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: CreateTranscriptBody }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { contentFileId, resourceId, lessonId } = request.body;
      if (!contentFileId && !resourceId && !lessonId) {
        return reply.code(400).send({ error: 'At least one content reference is required' });
      }

      const transcript = await accessibilityService.createTranscript({
        ...request.body,
        createdBy: userId,
      });

      return reply.code(201).send(transcript);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to create transcript' });
    }
  });

  /**
   * Get transcripts for content
   */
  server.get('/accessibility/transcripts', {
    schema: {
      description: 'Get transcripts for content',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          contentFileId: { type: 'string', format: 'uuid' },
          resourceId: { type: 'string', format: 'uuid' },
          lessonId: { type: 'string', format: 'uuid' },
          language: { type: 'string' },
          transcriptType: { type: 'string', enum: ['basic', 'timestamped', 'interactive', 'descriptive'] },
          approvedOnly: { type: 'string' },
        },
      },
      response: {
        200: {
          description: 'List of transcripts',
          type: 'array',
          items: { type: 'object' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: GetTranscriptsQuery }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const transcripts = await accessibilityService.getTranscriptsForContent({
        ...request.query,
        approvedOnly: request.query.approvedOnly === 'true',
      });

      return reply.send(transcripts);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch transcripts' });
    }
  });

  /**
   * Get transcript by ID
   */
  server.get('/accessibility/transcripts/:id', {
    schema: {
      description: 'Get transcript by ID',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Transcript details',
          type: 'object',
        },
        404: {
          description: 'Transcript not found',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const transcript = await accessibilityService.getTranscriptById(request.params.id);
      if (!transcript) {
        return reply.code(404).send({ error: 'Transcript not found' });
      }

      return reply.send(transcript);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch transcript' });
    }
  });

  /**
   * Update transcript
   */
  server.patch('/accessibility/transcripts/:id', {
    schema: {
      description: 'Update transcript content',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          segments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                startTime: { type: 'number' },
                endTime: { type: 'number' },
                text: { type: 'string' },
                speaker: { type: 'string' },
              },
            },
          },
        },
      },
      response: {
        200: {
          description: 'Updated transcript',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateTranscriptBody }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const transcript = await accessibilityService.updateTranscript(
        request.params.id,
        request.body,
        userId
      );

      return reply.send(transcript);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to update transcript' });
    }
  });

  /**
   * Approve transcript
   */
  server.post('/accessibility/transcripts/:id/approve', {
    schema: {
      description: 'Approve transcript',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Approved transcript',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const transcript = await accessibilityService.approveTranscript(request.params.id, userId);
      return reply.send(transcript);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to approve transcript' });
    }
  });

  // ============================================
  // User Preferences Endpoints
  // ============================================

  /**
   * Get user accessibility preferences
   */
  server.get('/accessibility/preferences', {
    schema: {
      description: 'Get accessibility preferences for the authenticated user',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'User accessibility preferences',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const preferences = await accessibilityService.getUserPreferences(userId);
      return reply.send(preferences);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch accessibility preferences' });
    }
  });

  /**
   * Update user accessibility preferences
   */
  server.patch('/accessibility/preferences', {
    schema: {
      description: 'Update accessibility preferences for the authenticated user',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          // Visual preferences
          highContrastMode: { type: 'boolean' },
          largeText: { type: 'boolean' },
          textScaleFactor: { type: 'number', minimum: 0.5, maximum: 2.0 },
          dyslexiaFriendlyFont: { type: 'boolean' },
          reduceMotion: { type: 'boolean' },
          reduceTransparency: { type: 'boolean' },
          // Color preferences
          colorScheme: { type: 'string', enum: ['default', 'dark', 'light', 'high-contrast'] },
          invertColors: { type: 'boolean' },
          grayscale: { type: 'boolean' },
          customColors: { type: 'object' },
          // Audio/Media preferences
          captionsEnabled: { type: 'boolean' },
          audioDescriptionsEnabled: { type: 'boolean' },
          autoPlayMedia: { type: 'boolean' },
          captionLanguage: { type: 'string' },
          captionStyle: { type: 'object' },
          // Navigation preferences
          keyboardNavigation: { type: 'boolean' },
          skipLinksEnabled: { type: 'boolean' },
          focusIndicatorsEnhanced: { type: 'boolean' },
          linkUnderlines: { type: 'boolean' },
          // Screen reader preferences
          screenReaderOptimized: { type: 'boolean' },
          announceImages: { type: 'boolean' },
          announceLinks: { type: 'boolean' },
          ariaLivePoliteness: { type: 'string', enum: ['polite', 'assertive', 'off'] },
          // Cognitive preferences
          simplifiedLayout: { type: 'boolean' },
          readingGuide: { type: 'boolean' },
          textToSpeech: { type: 'boolean' },
          readingSpeed: { type: 'number', minimum: 0.5, maximum: 2.0 },
          // Input preferences
          clickDelayMs: { type: 'integer', minimum: 0, maximum: 5000 },
          stickyKeys: { type: 'boolean' },
          bounceKeys: { type: 'boolean' },
        },
      },
      response: {
        200: {
          description: 'Updated accessibility preferences',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: UpdatePreferencesBody }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const preferences = await accessibilityService.updateUserPreferences(userId, request.body);
      return reply.send(preferences);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to update accessibility preferences' });
    }
  });

  // ============================================
  // Color Contrast Endpoints
  // ============================================

  /**
   * Check color contrast
   */
  server.post('/accessibility/contrast/check', {
    schema: {
      description: 'Check color contrast ratio between two colors',
      tags: ['accessibility'],
      body: {
        type: 'object',
        required: ['foreground', 'background'],
        properties: {
          foreground: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          background: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          isLargeText: { type: 'boolean' },
        },
      },
      response: {
        200: {
          description: 'Color contrast check result',
          type: 'object',
          properties: {
            ratio: { type: 'number' },
            passesAa: { type: 'boolean' },
            passesAaa: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: CheckContrastBody }>, reply: FastifyReply) => {
    try {
      const { foreground, background, isLargeText } = request.body;
      const result = accessibilityService.checkContrastCompliance(foreground, background, isLargeText);
      return reply.send(result);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to check color contrast' });
    }
  });

  // ============================================
  // Compliance Report Endpoints
  // ============================================

  /**
   * Generate compliance report
   */
  server.get('/accessibility/compliance-report', {
    schema: {
      description: 'Generate accessibility compliance report for content',
      tags: ['accessibility'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          lessonId: { type: 'string', format: 'uuid' },
          resourceId: { type: 'string', format: 'uuid' },
          contentFileId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Accessibility compliance report',
          type: 'object',
          properties: {
            overallScore: { type: 'number' },
            wcagLevel: { type: 'string' },
            checksPerformed: { type: 'integer' },
            issuesFound: { type: 'integer' },
            issuesResolved: { type: 'integer' },
            criticalIssues: { type: 'integer' },
            checksByType: { type: 'object' },
            accessibilityFeatures: {
              type: 'object',
              properties: {
                hasAltText: { type: 'boolean' },
                hasCaptions: { type: 'boolean' },
                hasTranscripts: { type: 'boolean' },
                meetsColorContrast: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: GenerateReportQuery }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { lessonId, resourceId, contentFileId } = request.query;
      if (!lessonId && !resourceId && !contentFileId) {
        return reply.code(400).send({ error: 'At least one content reference is required' });
      }

      const report = await accessibilityService.generateComplianceReport(request.query);
      return reply.send(report);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to generate compliance report' });
    }
  });
}
