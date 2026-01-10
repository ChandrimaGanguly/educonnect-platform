import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { ContentAuthoringService } from '../services/content-authoring.service';
import { MediaEmbedService } from '../services/media-embed.service';
import { AssessmentBuilderService } from '../services/assessment-builder.service';
import { LearningObjectiveService } from '../services/learning-objective.service';
import { ContentPreviewService } from '../services/content-preview.service';
import { AccessibilityCheckerService } from '../services/accessibility-checker.service';

// ========== Validation Schemas ==========

const createDraftSchema = z.object({
  content_type: z.enum(['lesson', 'module', 'course', 'resource']),
  content_id: z.string().uuid().optional(),
  community_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  content_format: z.enum(['blocks', 'markdown', 'html']).optional(),
});

const updateDraftSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  slug: z.string().max(100).optional(),
  content_blocks: z.array(z.any()).optional(),
  raw_content: z.string().optional(),
  content_format: z.enum(['blocks', 'markdown', 'html']).optional(),
  status: z.enum(['editing', 'ready_for_review', 'approved', 'rejected', 'published']).optional(),
  estimated_minutes: z.number().int().positive().optional(),
});

const addBlockSchema = z.object({
  block_type: z.enum([
    'paragraph', 'heading', 'list', 'code', 'quote', 'image',
    'video', 'audio', 'embed', 'callout', 'divider', 'table',
    'interactive', 'assessment'
  ]),
  content: z.record(z.any()),
  plain_text: z.string().optional(),
  attributes: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
  order_index: z.number().int(),
  parent_block_id: z.string().uuid().optional(),
});

const createQuestionSchema = z.object({
  draft_id: z.string().uuid().optional(),
  lesson_id: z.string().uuid().optional(),
  community_id: z.string().uuid(),
  question_type: z.enum([
    'multiple_choice', 'multiple_select', 'true_false', 'short_answer',
    'long_answer', 'fill_blank', 'matching', 'ordering', 'code', 'file_upload'
  ]),
  question_text: z.string().min(1),
  question_content: z.record(z.any()).optional(),
  points: z.number().positive().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).optional(),
  hints: z.array(z.string()).optional(),
  explanation: z.string().optional(),
  correct_feedback: z.string().optional(),
  incorrect_feedback: z.string().optional(),
  tags: z.array(z.string()).optional(),
  objective_ids: z.array(z.string().uuid()).optional(),
});

const createOptionSchema = z.object({
  option_text: z.string().min(1),
  option_content: z.record(z.any()).optional(),
  is_correct: z.boolean(),
  partial_credit: z.number().min(0).max(1).optional(),
  display_order: z.number().int(),
  match_key: z.string().max(100).optional(),
  correct_position: z.number().int().optional(),
  feedback: z.string().optional(),
});

const createObjectiveSchema = z.object({
  parent_id: z.string().uuid().optional(),
  community_id: z.string().uuid().optional(),
  code: z.string().min(1).max(50),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  cognitive_level: z.enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']),
  objective_type: z.enum(['knowledge', 'skill', 'attitude', 'competency']).optional(),
  tags: z.array(z.string()).optional(),
  is_measurable: z.boolean().optional(),
  assessment_criteria: z.array(z.any()).optional(),
});

const linkObjectiveSchema = z.object({
  objective_id: z.string().uuid(),
  lesson_id: z.string().uuid().optional(),
  module_id: z.string().uuid().optional(),
  course_id: z.string().uuid().optional(),
  draft_id: z.string().uuid().optional(),
  is_primary: z.boolean().optional(),
});

const createPreviewSchema = z.object({
  draft_id: z.string().uuid(),
  preview_mode: z.enum(['desktop', 'tablet', 'mobile', 'text_only', 'low_bandwidth']).optional(),
  require_auth: z.boolean().optional(),
  allowed_user_ids: z.array(z.string().uuid()).optional(),
  expires_in_hours: z.number().int().positive().max(168).optional(), // Max 1 week
});

const createMediaEmbedSchema = z.object({
  draft_id: z.string().uuid(),
  block_id: z.string().uuid().optional(),
  file_id: z.string().uuid().optional(),
  media_type: z.enum(['image', 'video', 'audio', 'document', 'embed', 'interactive']),
  external_url: z.string().url().optional(),
  embed_code: z.string().max(2000).optional(),
  alignment: z.enum(['left', 'center', 'right', 'full']).optional(),
  is_inline: z.boolean().optional(),
  alt_text: z.string().max(500).optional(),
  caption: z.string().optional(),
  text_fallback: z.string().optional(),
});

// ========== Service Instances ==========

const contentService = new ContentAuthoringService();
const mediaService = new MediaEmbedService();
const assessmentService = new AssessmentBuilderService();
const objectiveService = new LearningObjectiveService();
const previewService = new ContentPreviewService();
const accessibilityService = new AccessibilityCheckerService();

// ========== Routes ==========

export async function contentAuthoringRoutes(server: FastifyInstance): Promise<void> {
  // ========== Draft Routes ==========

  /**
   * POST /drafts
   * Create a new content draft
   */
  server.post('/drafts', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = createDraftSchema.parse(request.body);
      const draft = await contentService.createDraft(request.user!.userId, data);
      return reply.status(201).send({ draft });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      throw error;
    }
  });

  /**
   * GET /drafts/:draftId
   * Get a draft by ID
   */
  server.get('/drafts/:draftId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { draftId: string } }>, reply: FastifyReply) => {
    const draft = await contentService.getDraftById(request.params.draftId);
    if (!draft) {
      return reply.status(404).send({ error: 'Not Found', message: 'Draft not found' });
    }
    return { draft };
  });

  /**
   * GET /drafts
   * Get drafts for a user in a community
   */
  server.get('/drafts', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Querystring: {
      community_id: string;
      status?: string;
      content_type?: string;
      limit?: string;
      offset?: string;
    }
  }>, reply: FastifyReply) => {
    const { community_id, status, content_type, limit, offset } = request.query;

    const result = await contentService.getUserDrafts(
      request.user!.userId,
      community_id,
      {
        status: status as any,
        content_type: content_type as any,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
      }
    );

    return result;
  });

  /**
   * PUT /drafts/:draftId
   * Update a draft
   */
  server.put('/drafts/:draftId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { draftId: string } }>, reply: FastifyReply) => {
    try {
      const data = updateDraftSchema.parse(request.body);
      const draft = await contentService.updateDraft(
        request.params.draftId,
        request.user!.userId,
        data
      );
      return { draft };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      throw error;
    }
  });

  /**
   * POST /drafts/:draftId/autosave
   * Auto-save draft content
   */
  server.post('/drafts/:draftId/autosave', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { draftId: string };
    Body: { content_blocks: any[] };
  }>, reply: FastifyReply) => {
    const draft = await contentService.autoSaveDraft(
      request.params.draftId,
      request.user!.userId,
      request.body.content_blocks
    );
    return { draft };
  });

  /**
   * POST /drafts/:draftId/submit
   * Submit draft for review
   */
  server.post('/drafts/:draftId/submit', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { draftId: string } }>, reply: FastifyReply) => {
    const draft = await contentService.submitForReview(
      request.params.draftId,
      request.user!.userId
    );
    return { draft };
  });

  /**
   * POST /drafts/:draftId/validate
   * Validate draft content
   */
  server.post('/drafts/:draftId/validate', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { draftId: string } }>, reply: FastifyReply) => {
    const result = await contentService.validateDraft(request.params.draftId);
    return result;
  });

  /**
   * DELETE /drafts/:draftId
   * Delete a draft
   */
  server.delete('/drafts/:draftId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { draftId: string } }>, reply: FastifyReply) => {
    await contentService.deleteDraft(request.params.draftId);
    return { message: 'Draft deleted successfully' };
  });

  // ========== Block Routes ==========

  /**
   * GET /drafts/:draftId/blocks
   * Get all blocks for a draft
   */
  server.get('/drafts/:draftId/blocks', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { draftId: string } }>, reply: FastifyReply) => {
    const blocks = await contentService.getDraftBlocks(request.params.draftId);
    return { blocks };
  });

  /**
   * POST /drafts/:draftId/blocks
   * Add a block to a draft
   */
  server.post('/drafts/:draftId/blocks', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { draftId: string } }>, reply: FastifyReply) => {
    try {
      const data = addBlockSchema.parse(request.body);
      const block = await contentService.addBlock(request.params.draftId, data);
      return reply.status(201).send({ block });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      throw error;
    }
  });

  /**
   * PUT /blocks/:blockId
   * Update a block
   */
  server.put('/blocks/:blockId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { blockId: string } }>, reply: FastifyReply) => {
    const block = await contentService.updateBlock(request.params.blockId, request.body as any);
    return { block };
  });

  /**
   * DELETE /blocks/:blockId
   * Delete a block
   */
  server.delete('/blocks/:blockId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { blockId: string } }>, reply: FastifyReply) => {
    await contentService.deleteBlock(request.params.blockId);
    return { message: 'Block deleted successfully' };
  });

  /**
   * POST /drafts/:draftId/blocks/reorder
   * Reorder blocks in a draft
   */
  server.post('/drafts/:draftId/blocks/reorder', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { draftId: string };
    Body: { block_order: { id: string; order_index: number }[] };
  }>, reply: FastifyReply) => {
    await contentService.reorderBlocks(request.params.draftId, request.body.block_order);
    return { message: 'Blocks reordered successfully' };
  });

  // ========== Assessment Question Routes ==========

  /**
   * POST /questions
   * Create a new assessment question
   */
  server.post('/questions', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = createQuestionSchema.parse(request.body);
      const question = await assessmentService.createQuestion(request.user!.userId, data);
      return reply.status(201).send({ question });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      throw error;
    }
  });

  /**
   * GET /questions/:questionId
   * Get a question by ID
   */
  server.get('/questions/:questionId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { questionId: string } }>, reply: FastifyReply) => {
    const question = await assessmentService.getQuestion(request.params.questionId);
    if (!question) {
      return reply.status(404).send({ error: 'Not Found', message: 'Question not found' });
    }
    const options = await assessmentService.getQuestionOptions(request.params.questionId);
    return { question, options };
  });

  /**
   * GET /questions
   * Get questions with filtering
   */
  server.get('/questions', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Querystring: {
      draft_id?: string;
      lesson_id?: string;
      community_id?: string;
      difficulty?: string;
      question_type?: string;
      limit?: string;
      offset?: string;
    }
  }>, reply: FastifyReply) => {
    const { draft_id, lesson_id, community_id, difficulty, question_type, limit, offset } = request.query;

    const result = await assessmentService.getQuestions({
      draft_id,
      lesson_id,
      community_id,
      difficulty: difficulty as any,
      question_type: question_type as any,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    return result;
  });

  /**
   * PUT /questions/:questionId
   * Update a question
   */
  server.put('/questions/:questionId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { questionId: string } }>, reply: FastifyReply) => {
    const question = await assessmentService.updateQuestion(
      request.params.questionId,
      request.user!.userId,
      request.body as any
    );
    return { question };
  });

  /**
   * DELETE /questions/:questionId
   * Delete a question
   */
  server.delete('/questions/:questionId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { questionId: string } }>, reply: FastifyReply) => {
    await assessmentService.deleteQuestion(request.params.questionId);
    return { message: 'Question deleted successfully' };
  });

  /**
   * POST /questions/:questionId/duplicate
   * Duplicate a question
   */
  server.post('/questions/:questionId/duplicate', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { questionId: string } }>, reply: FastifyReply) => {
    const question = await assessmentService.duplicateQuestion(
      request.params.questionId,
      request.user!.userId
    );
    return reply.status(201).send({ question });
  });

  /**
   * POST /questions/:questionId/validate
   * Validate a question
   */
  server.post('/questions/:questionId/validate', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { questionId: string } }>, reply: FastifyReply) => {
    const result = await assessmentService.validateQuestion(request.params.questionId);
    return result;
  });

  // ========== Question Options Routes ==========

  /**
   * POST /questions/:questionId/options
   * Add an option to a question
   */
  server.post('/questions/:questionId/options', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { questionId: string } }>, reply: FastifyReply) => {
    try {
      const data = createOptionSchema.parse(request.body);
      const option = await assessmentService.createOption(request.params.questionId, data);
      return reply.status(201).send({ option });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      throw error;
    }
  });

  /**
   * PUT /options/:optionId
   * Update an option
   */
  server.put('/options/:optionId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { optionId: string } }>, reply: FastifyReply) => {
    const option = await assessmentService.updateOption(request.params.optionId, request.body as any);
    return { option };
  });

  /**
   * DELETE /options/:optionId
   * Delete an option
   */
  server.delete('/options/:optionId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { optionId: string } }>, reply: FastifyReply) => {
    await assessmentService.deleteOption(request.params.optionId);
    return { message: 'Option deleted successfully' };
  });

  /**
   * PUT /questions/:questionId/options
   * Replace all options for a question
   */
  server.put('/questions/:questionId/options', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { questionId: string };
    Body: { options: any[] };
  }>, reply: FastifyReply) => {
    const options = await assessmentService.replaceOptions(
      request.params.questionId,
      request.body.options
    );
    return { options };
  });

  // ========== Learning Objective Routes ==========

  /**
   * POST /objectives
   * Create a learning objective
   */
  server.post('/objectives', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = createObjectiveSchema.parse(request.body);
      const objective = await objectiveService.createObjective(request.user!.userId, data);
      return reply.status(201).send({ objective });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      throw error;
    }
  });

  /**
   * GET /objectives/:objectiveId
   * Get an objective by ID
   */
  server.get('/objectives/:objectiveId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { objectiveId: string } }>, reply: FastifyReply) => {
    const objective = await objectiveService.getObjective(request.params.objectiveId);
    if (!objective) {
      return reply.status(404).send({ error: 'Not Found', message: 'Objective not found' });
    }
    return { objective };
  });

  /**
   * GET /objectives
   * Get objectives with filtering
   */
  server.get('/objectives', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Querystring: {
      community_id?: string;
      parent_id?: string;
      cognitive_level?: string;
      status?: string;
      search?: string;
      limit?: string;
      offset?: string;
    }
  }>, reply: FastifyReply) => {
    const { community_id, parent_id, cognitive_level, status, search, limit, offset } = request.query;

    const result = await objectiveService.getObjectives({
      community_id,
      parent_id: parent_id === 'null' ? null : parent_id,
      cognitive_level: cognitive_level as any,
      status: status as any,
      search,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    return result;
  });

  /**
   * GET /objectives/tree
   * Get objectives as tree structure
   */
  server.get('/objectives/tree', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Querystring: { community_id: string }
  }>, reply: FastifyReply) => {
    const tree = await objectiveService.getObjectiveTree(request.query.community_id);
    return { objectives: tree };
  });

  /**
   * PUT /objectives/:objectiveId
   * Update an objective
   */
  server.put('/objectives/:objectiveId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { objectiveId: string } }>, reply: FastifyReply) => {
    const objective = await objectiveService.updateObjective(
      request.params.objectiveId,
      request.body as any
    );
    return { objective };
  });

  /**
   * DELETE /objectives/:objectiveId
   * Delete an objective
   */
  server.delete('/objectives/:objectiveId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { objectiveId: string } }>, reply: FastifyReply) => {
    await objectiveService.deleteObjective(request.params.objectiveId);
    return { message: 'Objective deleted successfully' };
  });

  /**
   * POST /content-objectives
   * Link objective to content
   */
  server.post('/content-objectives', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = linkObjectiveSchema.parse(request.body);
      const link = await objectiveService.linkObjective(request.user!.userId, data);
      return reply.status(201).send({ link });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      throw error;
    }
  });

  /**
   * DELETE /content-objectives/:linkId
   * Unlink objective from content
   */
  server.delete('/content-objectives/:linkId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { linkId: string } }>, reply: FastifyReply) => {
    await objectiveService.unlinkObjective(request.params.linkId);
    return { message: 'Objective unlinked successfully' };
  });

  // ========== Preview Routes ==========

  /**
   * POST /previews
   * Create a preview link
   */
  server.post('/previews', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = createPreviewSchema.parse(request.body);
      const preview = await previewService.createPreview(request.user!.userId, data);
      return reply.status(201).send({
        preview,
        url: previewService.getPreviewUrl(preview.preview_token),
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      throw error;
    }
  });

  /**
   * GET /previews/:token
   * Render a preview (public endpoint)
   */
  server.get('/previews/:token', async (request: FastifyRequest<{
    Params: { token: string };
    Querystring: { mode?: string };
  }>, reply: FastifyReply) => {
    try {
      const result = await previewService.renderPreview(
        request.params.token,
        undefined, // No user ID for public preview
        { mode: request.query.mode as any }
      );
      return result;
    } catch (error: any) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: error.message,
      });
    }
  });

  /**
   * DELETE /previews/:previewId
   * Deactivate a preview
   */
  server.delete('/previews/:previewId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { previewId: string } }>, reply: FastifyReply) => {
    await previewService.deactivatePreview(request.params.previewId);
    return { message: 'Preview deactivated successfully' };
  });

  /**
   * POST /drafts/:draftId/test-structure
   * Test content structure
   */
  server.post('/drafts/:draftId/test-structure', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { draftId: string } }>, reply: FastifyReply) => {
    const result = await previewService.testContentStructure(request.params.draftId);
    return result;
  });

  /**
   * POST /drafts/:draftId/test-questions
   * Test assessment questions
   */
  server.post('/drafts/:draftId/test-questions', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { draftId: string } }>, reply: FastifyReply) => {
    const result = await previewService.testAssessmentQuestions(request.params.draftId);
    return result;
  });

  // ========== Media Embed Routes ==========

  /**
   * POST /media-embeds
   * Create a media embed
   */
  server.post('/media-embeds', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = createMediaEmbedSchema.parse(request.body);
      const embed = await mediaService.createMediaEmbed(data);
      return reply.status(201).send({ embed });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      throw error;
    }
  });

  /**
   * GET /drafts/:draftId/media-embeds
   * Get media embeds for a draft
   */
  server.get('/drafts/:draftId/media-embeds', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { draftId: string } }>, reply: FastifyReply) => {
    const embeds = await mediaService.getDraftEmbeds(request.params.draftId);
    return { embeds };
  });

  /**
   * PUT /media-embeds/:embedId
   * Update a media embed
   */
  server.put('/media-embeds/:embedId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { embedId: string } }>, reply: FastifyReply) => {
    const embed = await mediaService.updateMediaEmbed(request.params.embedId, request.body as any);
    return { embed };
  });

  /**
   * DELETE /media-embeds/:embedId
   * Delete a media embed
   */
  server.delete('/media-embeds/:embedId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { embedId: string } }>, reply: FastifyReply) => {
    await mediaService.deleteMediaEmbed(request.params.embedId);
    return { message: 'Media embed deleted successfully' };
  });

  /**
   * POST /media-embeds/parse-url
   * Parse an external URL for embedding
   */
  server.post('/media-embeds/parse-url', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Body: { url: string } }>, reply: FastifyReply) => {
    const result = mediaService.parseExternalUrl(request.body.url);
    if (!result) {
      return reply.status(400).send({
        error: 'Invalid URL',
        message: 'Could not parse the provided URL for embedding',
      });
    }
    const embedCode = mediaService.generateEmbedCode(result);
    return { ...result, embedCode };
  });

  // ========== Accessibility Check Routes ==========

  /**
   * POST /drafts/:draftId/accessibility-check
   * Run accessibility check on a draft
   */
  server.post('/drafts/:draftId/accessibility-check', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { draftId: string };
    Body: {
      check_images?: boolean;
      check_video?: boolean;
      check_audio?: boolean;
      check_structure?: boolean;
      check_navigation?: boolean;
      check_interactive?: boolean;
    };
  }>, reply: FastifyReply) => {
    const result = await accessibilityService.checkDraft(
      request.params.draftId,
      request.user!.userId,
      request.body
    );
    return result;
  });

  /**
   * GET /drafts/:draftId/accessibility-history
   * Get accessibility check history
   */
  server.get('/drafts/:draftId/accessibility-history', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { draftId: string };
    Querystring: { limit?: string; offset?: string };
  }>, reply: FastifyReply) => {
    const { limit, offset } = request.query;
    const result = await accessibilityService.getCheckHistory(
      request.params.draftId,
      undefined,
      {
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
      }
    );
    return result;
  });

  // ========== Version Routes ==========

  /**
   * POST /versions
   * Create a new content version
   */
  server.post('/versions', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Body: {
      lesson_id?: string;
      module_id?: string;
      course_id?: string;
      content_snapshot: Record<string, any>;
      blocks_snapshot?: Record<string, any>;
      metadata_snapshot?: Record<string, any>;
      change_summary?: string;
    }
  }>, reply: FastifyReply) => {
    const version = await contentService.createVersion(request.user!.userId, request.body);
    return reply.status(201).send({ version });
  });

  /**
   * GET /versions
   * Get version history for content
   */
  server.get('/versions', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Querystring: {
      content_type: string;
      content_id: string;
      limit?: string;
      offset?: string;
    }
  }>, reply: FastifyReply) => {
    const { content_type, content_id, limit, offset } = request.query;
    const result = await contentService.getVersionHistory(
      content_type as 'lesson' | 'module' | 'course',
      content_id,
      {
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
      }
    );
    return result;
  });

  /**
   * POST /versions/:versionId/publish
   * Publish a version
   */
  server.post('/versions/:versionId/publish', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { versionId: string } }>, reply: FastifyReply) => {
    const version = await contentService.publishVersion(
      request.params.versionId,
      request.user!.userId
    );
    return { version };
  });

  /**
   * POST /versions/:versionId/restore
   * Restore a previous version
   */
  server.post('/versions/:versionId/restore', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { versionId: string } }>, reply: FastifyReply) => {
    const version = await contentService.restoreVersion(
      request.params.versionId,
      request.user!.userId
    );
    return { version };
  });

  server.log.info('Content authoring routes registered');
}
