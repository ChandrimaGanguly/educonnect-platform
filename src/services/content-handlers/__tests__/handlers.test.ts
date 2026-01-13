/**
 * Content Handler Tests
 *
 * Tests for format-specific content handlers ensuring proper
 * validation, processing, and rendering.
 */

import { TextContentHandler } from '../text-handler';
import { VideoContentHandler } from '../video-handler';
import { AudioContentHandler } from '../audio-handler';
import { ImageContentHandler } from '../image-handler';
import { DocumentContentHandler } from '../document-handler';
import { CodeContentHandler } from '../code-handler';
import { InteractiveContentHandler } from '../interactive-handler';
import {
  getContentHandler,
  getContentTypeFromMimeType,
  getHandlerByMimeType,
  supportsOffline,
  supportsTextAlternative,
} from '../handler-factory';
import { ContentItem, CreateContentItemDto } from '../../../types/content.types';

const createMockContent = (overrides: Partial<ContentItem> = {}): ContentItem => ({
  id: 'test-id',
  title: 'Test Content',
  content_type: 'text',
  text_format: 'markdown',
  original_language: 'en',
  status: 'draft',
  version: 1,
  created_at: new Date(),
  updated_at: new Date(),
  created_by: 'user-id',
  estimated_bandwidth_kb: 0,
  has_text_alternative: false,
  has_alt_text: false,
  has_captions: false,
  has_transcript: false,
  has_audio_description: false,
  accessibility_score: 0,
  quality_score: 0,
  view_count: 0,
  avg_rating: 0,
  rating_count: 0,
  ...overrides,
});

describe('TextContentHandler', () => {
  let handler: TextContentHandler;

  beforeEach(() => {
    handler = new TextContentHandler();
  });

  describe('validate', () => {
    it('should validate valid text content', () => {
      const data: CreateContentItemDto = {
        title: 'Test Lesson',
        content_type: 'text',
        content_text: 'Some test content',
        text_format: 'markdown',
      };

      const result = handler.validate(data);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation without content_text or external_url', () => {
      const data: CreateContentItemDto = {
        title: 'Test Lesson',
        content_type: 'text',
      };

      const result = handler.validate(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Text content requires either content_text or external_url');
    });

    it('should warn about long content', () => {
      const data: CreateContentItemDto = {
        title: 'Test Lesson',
        content_type: 'text',
        content_text: 'a'.repeat(150000),
      };

      const result = handler.validate(data);

      expect(result.warnings).toContain(
        'Long text content may affect page load times. Consider splitting into multiple lessons.'
      );
    });

    it('should warn about images without alt in HTML', () => {
      const data: CreateContentItemDto = {
        title: 'Test Lesson',
        content_type: 'text',
        content_text: '<img src="test.jpg">',
        text_format: 'html',
      };

      const result = handler.validate(data);

      expect(result.warnings).toContain('HTML content contains images without alt attributes');
    });
  });

  describe('process', () => {
    it('should calculate word count', async () => {
      const content = createMockContent({
        content_text: 'One two three four five',
      });

      const processed = await handler.process(content);

      expect(processed.word_count).toBe(5);
    });

    it('should estimate reading time', async () => {
      const content = createMockContent({
        content_text: Array(400).fill('word').join(' '), // 400 words = 2 minutes
      });

      const processed = await handler.process(content);

      expect(processed.duration_seconds).toBe(120); // 2 minutes
    });
  });

  describe('generateTextAlternative', () => {
    it('should return plain text for plain format', async () => {
      const content = createMockContent({
        content_text: 'Plain text content',
        text_format: 'plain',
      });

      const result = await handler.generateTextAlternative(content);

      expect(result).toBe('Plain text content');
    });

    it('should strip HTML from html format', async () => {
      const content = createMockContent({
        content_text: '<p>Hello <strong>world</strong></p>',
        text_format: 'html',
      });

      const result = await handler.generateTextAlternative(content);

      expect(result).toContain('Hello');
      expect(result).toContain('world');
      expect(result).not.toContain('<');
    });
  });

  describe('render', () => {
    it('should render markdown content', () => {
      const content = createMockContent({
        content_text: '# Hello World\n\nThis is **bold**.',
        text_format: 'markdown',
      });

      const result = handler.render(content, {});

      expect(result.html).toContain('<h1>');
      expect(result.html).toContain('<strong>');
    });

    it('should render text-only mode', () => {
      const content = createMockContent({
        content_text: '<p>Hello</p>',
        text_format: 'html',
      });

      const result = handler.render(content, { textOnly: true });

      expect(result.html).toContain('text-only');
    });
  });

  describe('checkAccessibility', () => {
    it('should return accessible for plain text', () => {
      const content = createMockContent({
        content_text: 'Simple text',
        text_format: 'plain',
      });

      const result = handler.checkAccessibility(content);

      expect(result.isScreenReaderCompatible).toBe(true);
      expect(result.missingRequirements).toHaveLength(0);
    });
  });

  describe('estimateBandwidth', () => {
    it('should estimate bandwidth for text content', () => {
      const content = createMockContent({
        content_text: 'a'.repeat(1000),
      });

      const result = handler.estimateBandwidth(content);

      expect(result).toBe(1); // ~1KB
    });
  });
});

describe('VideoContentHandler', () => {
  let handler: VideoContentHandler;

  beforeEach(() => {
    handler = new VideoContentHandler();
  });

  describe('validate', () => {
    it('should validate valid video content', () => {
      const data: CreateContentItemDto = {
        title: 'Test Video',
        content_type: 'video',
        content_file_id: 'file-123',
        duration_seconds: 300,
      };

      const result = handler.validate(data);

      expect(result.valid).toBe(true);
    });

    it('should warn about missing transcript', () => {
      const data: CreateContentItemDto = {
        title: 'Test Video',
        content_type: 'video',
        content_file_id: 'file-123',
      };

      const result = handler.validate(data);

      expect(result.warnings).toContain(
        'Video should have a transcript for accessibility (WCAG 1.2.3)'
      );
    });

    it('should warn about long videos', () => {
      const data: CreateContentItemDto = {
        title: 'Test Video',
        content_type: 'video',
        content_file_id: 'file-123',
        duration_seconds: 7200, // 2 hours
      };

      const result = handler.validate(data);

      expect(result.warnings).toContain(
        'Long videos (>1 hour) may have playback issues. Consider splitting into shorter segments.'
      );
    });
  });

  describe('generateOptimizationPlan', () => {
    it('should generate multiple quality variants', () => {
      const content = createMockContent({
        content_type: 'video',
        duration_seconds: 300,
      });

      const result = handler.generateOptimizationPlan(content, {});

      expect(result.success).toBe(true);
      expect(result.variants.length).toBeGreaterThan(0);

      const variantTypes = result.variants.map(v => v.variantType);
      expect(variantTypes).toContain('thumbnail');
      expect(variantTypes).toContain('preview');
      expect(variantTypes).toContain('audio_only');
    });
  });

  describe('checkAccessibility', () => {
    it('should flag missing captions', () => {
      const content = createMockContent({
        content_type: 'video',
        has_captions: false,
        has_transcript: false,
      });

      const result = handler.checkAccessibility(content);

      expect(result.hasCaptions).toBe(false);
      expect(result.missingRequirements).toContain('Video must have captions (WCAG 1.2.2)');
    });
  });

  describe('estimateBandwidth', () => {
    it('should estimate based on file size if available', () => {
      const content = createMockContent({
        content_type: 'video',
        file_size_bytes: 50 * 1024 * 1024, // 50MB
      });

      const result = handler.estimateBandwidth(content);

      expect(result).toBe(51200); // 50MB in KB
    });

    it('should estimate based on duration', () => {
      const content = createMockContent({
        content_type: 'video',
        duration_seconds: 60, // 1 minute
      });

      const result = handler.estimateBandwidth(content);

      // ~187.5 KB/s * 60s
      expect(result).toBeGreaterThan(10000);
    });
  });
});

describe('AudioContentHandler', () => {
  let handler: AudioContentHandler;

  beforeEach(() => {
    handler = new AudioContentHandler();
  });

  describe('validate', () => {
    it('should validate valid audio content', () => {
      const data: CreateContentItemDto = {
        title: 'Test Audio',
        content_type: 'audio',
        content_file_id: 'file-123',
        transcript: 'Audio transcript here',
      };

      const result = handler.validate(data);

      expect(result.valid).toBe(true);
      expect(result.warnings).not.toContain(
        'Audio should have a transcript for accessibility (WCAG 1.2.1)'
      );
    });

    it('should warn about missing transcript', () => {
      const data: CreateContentItemDto = {
        title: 'Test Audio',
        content_type: 'audio',
        content_file_id: 'file-123',
      };

      const result = handler.validate(data);

      expect(result.warnings).toContain(
        'Audio should have a transcript for accessibility (WCAG 1.2.1)'
      );
    });
  });

  describe('generateOptimizationPlan', () => {
    it('should generate bitrate variants', () => {
      const content = createMockContent({
        content_type: 'audio',
        duration_seconds: 300,
      });

      const result = handler.generateOptimizationPlan(content, {});

      expect(result.success).toBe(true);
      expect(result.variants.length).toBeGreaterThan(0);

      const variantTypes = result.variants.map(v => v.variantType);
      expect(variantTypes).toContain('low_quality');
      expect(variantTypes).toContain('medium_quality');
    });
  });
});

describe('ImageContentHandler', () => {
  let handler: ImageContentHandler;

  beforeEach(() => {
    handler = new ImageContentHandler();
  });

  describe('validate', () => {
    it('should require alt text', () => {
      const data: CreateContentItemDto = {
        title: 'Test Image',
        content_type: 'image',
        content_file_id: 'file-123',
      };

      const result = handler.validate(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Image must have alt text for accessibility (WCAG 1.1.1)');
    });

    it('should validate with alt text', () => {
      const data: CreateContentItemDto = {
        title: 'Test Image',
        content_type: 'image',
        content_file_id: 'file-123',
        alt_text: 'A beautiful sunset over the ocean',
      };

      const result = handler.validate(data);

      expect(result.valid).toBe(true);
    });

    it('should warn about short alt text', () => {
      const data: CreateContentItemDto = {
        title: 'Test Image',
        content_type: 'image',
        content_file_id: 'file-123',
        alt_text: 'img',
      };

      const result = handler.validate(data);

      expect(result.warnings).toContain('Alt text seems too short. Provide a meaningful description.');
    });
  });

  describe('generateOptimizationPlan', () => {
    it('should generate responsive image variants', () => {
      const content = createMockContent({
        content_type: 'image',
        file_size_bytes: 500000,
      });

      const result = handler.generateOptimizationPlan(content, {});

      expect(result.success).toBe(true);
      expect(result.variants.length).toBeGreaterThan(0);

      const variantTypes = result.variants.map(v => v.variantType);
      expect(variantTypes).toContain('thumbnail');
      expect(variantTypes).toContain('low_quality');
    });
  });
});

describe('DocumentContentHandler', () => {
  let handler: DocumentContentHandler;

  beforeEach(() => {
    handler = new DocumentContentHandler();
  });

  describe('validate', () => {
    it('should validate document content', () => {
      const data: CreateContentItemDto = {
        title: 'Test Document',
        content_type: 'document',
        content_file_id: 'file-123',
        description: 'A test PDF document',
      };

      const result = handler.validate(data);

      expect(result.valid).toBe(true);
    });
  });

  describe('generateOptimizationPlan', () => {
    it('should generate document variants', () => {
      const content = createMockContent({
        content_type: 'document',
        file_size_bytes: 2000000, // 2MB
      });

      const result = handler.generateOptimizationPlan(content, {
        generateTextAlternative: true,
      });

      expect(result.success).toBe(true);

      const variantTypes = result.variants.map(v => v.variantType);
      expect(variantTypes).toContain('thumbnail');
      expect(variantTypes).toContain('preview');
      expect(variantTypes).toContain('compressed');
      expect(variantTypes).toContain('text_only');
    });
  });
});

describe('CodeContentHandler', () => {
  let handler: CodeContentHandler;

  beforeEach(() => {
    handler = new CodeContentHandler();
  });

  describe('validate', () => {
    it('should validate code exercise content', () => {
      const data: CreateContentItemDto = {
        title: 'JavaScript Exercise',
        content_type: 'code',
        content_text: JSON.stringify({
          language: 'javascript',
          starter_code: 'function add(a, b) { }',
          instructions: 'Implement the add function',
        }),
        description: 'Practice basic JavaScript functions',
      };

      const result = handler.validate(data);

      expect(result.valid).toBe(true);
    });

    it('should fail without content_text', () => {
      const data: CreateContentItemDto = {
        title: 'JavaScript Exercise',
        content_type: 'code',
      };

      const result = handler.validate(data);

      expect(result.valid).toBe(false);
    });
  });

  describe('generateTextAlternative', () => {
    it('should generate text alternative from code exercise', async () => {
      const content = createMockContent({
        content_type: 'code',
        content_text: JSON.stringify({
          language: 'python',
          starter_code: 'def hello():\n    pass',
          instructions: 'Implement a hello function',
        }),
      });

      const result = await handler.generateTextAlternative(content);

      expect(result).toContain('python');
      expect(result).toContain('def hello');
    });
  });
});

describe('InteractiveContentHandler', () => {
  let handler: InteractiveContentHandler;

  beforeEach(() => {
    handler = new InteractiveContentHandler();
  });

  describe('validate', () => {
    it('should validate interactive content', () => {
      const data: CreateContentItemDto = {
        title: 'Quiz Widget',
        content_type: 'interactive',
        content_text: JSON.stringify({
          element_type: 'quiz_widget',
          data: {
            questions: [{ question: 'Test?', options: ['A', 'B'], correct: 0 }],
          },
        }),
        text_alternative: 'Quiz about testing',
      };

      const result = handler.validate(data);

      expect(result.valid).toBe(true);
    });

    it('should warn about missing text alternative', () => {
      const data: CreateContentItemDto = {
        title: 'Simulation',
        content_type: 'interactive',
        content_text: JSON.stringify({ element_type: 'simulation' }),
      };

      const result = handler.validate(data);

      expect(result.warnings).toContain(
        'Interactive content should have a text alternative for accessibility'
      );
    });
  });

  describe('render', () => {
    it('should render quiz widget', () => {
      const content = createMockContent({
        content_type: 'interactive',
        content_text: JSON.stringify({
          element_type: 'quiz_widget',
          data: {
            questions: [
              { question: 'What is 2+2?', options: ['3', '4', '5'], correct: 1 },
            ],
          },
        }),
      });

      const result = handler.render(content, {});

      expect(result.html).toContain('quiz-widget');
      expect(result.html).toContain('What is 2+2?');
      expect(result.scripts).toContain('/js/quiz-widget.js');
    });

    it('should render flashcard', () => {
      const content = createMockContent({
        content_type: 'interactive',
        content_text: JSON.stringify({
          element_type: 'flashcard',
          data: {
            cards: [{ front: 'Q', back: 'A' }],
          },
        }),
      });

      const result = handler.render(content, {});

      expect(result.html).toContain('flashcard-widget');
    });
  });
});

describe('Handler Factory', () => {
  describe('getContentHandler', () => {
    it('should return correct handler for each content type', () => {
      expect(getContentHandler('text')).toBeInstanceOf(TextContentHandler);
      expect(getContentHandler('video')).toBeInstanceOf(VideoContentHandler);
      expect(getContentHandler('audio')).toBeInstanceOf(AudioContentHandler);
      expect(getContentHandler('image')).toBeInstanceOf(ImageContentHandler);
      expect(getContentHandler('document')).toBeInstanceOf(DocumentContentHandler);
      expect(getContentHandler('code')).toBeInstanceOf(CodeContentHandler);
      expect(getContentHandler('interactive')).toBeInstanceOf(InteractiveContentHandler);
      expect(getContentHandler('quiz')).toBeInstanceOf(InteractiveContentHandler);
    });

    it('should return text handler for mixed content', () => {
      expect(getContentHandler('mixed')).toBeInstanceOf(TextContentHandler);
    });
  });

  describe('getContentTypeFromMimeType', () => {
    it('should detect text types', () => {
      expect(getContentTypeFromMimeType('text/plain')).toBe('text');
      expect(getContentTypeFromMimeType('text/html')).toBe('text');
      expect(getContentTypeFromMimeType('text/markdown')).toBe('text');
    });

    it('should detect video types', () => {
      expect(getContentTypeFromMimeType('video/mp4')).toBe('video');
      expect(getContentTypeFromMimeType('video/webm')).toBe('video');
    });

    it('should detect audio types', () => {
      expect(getContentTypeFromMimeType('audio/mpeg')).toBe('audio');
      expect(getContentTypeFromMimeType('audio/ogg')).toBe('audio');
    });

    it('should detect image types', () => {
      expect(getContentTypeFromMimeType('image/jpeg')).toBe('image');
      expect(getContentTypeFromMimeType('image/png')).toBe('image');
    });

    it('should detect document types', () => {
      expect(getContentTypeFromMimeType('application/pdf')).toBe('document');
      expect(getContentTypeFromMimeType('application/epub+zip')).toBe('document');
    });
  });

  describe('getHandlerByMimeType', () => {
    it('should return handler for supported MIME types', () => {
      const handler = getHandlerByMimeType('video/mp4');
      expect(handler).toBeInstanceOf(VideoContentHandler);
    });
  });

  describe('supportsOffline', () => {
    it('should correctly identify offline support', () => {
      expect(supportsOffline('text')).toBe(true);
      expect(supportsOffline('video')).toBe(true);
      expect(supportsOffline('audio')).toBe(true);
      expect(supportsOffline('code')).toBe(false); // Requires server
    });
  });

  describe('supportsTextAlternative', () => {
    it('should correctly identify text alternative support', () => {
      expect(supportsTextAlternative('text')).toBe(true);
      expect(supportsTextAlternative('video')).toBe(true);
      expect(supportsTextAlternative('audio')).toBe(true);
      expect(supportsTextAlternative('image')).toBe(true);
    });
  });
});
