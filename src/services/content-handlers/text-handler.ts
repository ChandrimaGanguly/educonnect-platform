/**
 * Text Content Handler
 *
 * Handles text-based content including markdown, HTML, and plain text.
 * Optimized for low-bandwidth delivery with minimal processing overhead.
 */

import {
  ContentItem,
  CreateContentItemDto,
  VariantType,
} from '../../types/content.types';
import {
  BaseContentHandler,
  ValidationResult,
  OptimizationOptions,
  OptimizationResult,
  RenderOptions,
  RenderResult,
  AccessibilityChecks,
} from './base-handler';

export class TextContentHandler extends BaseContentHandler {
  contentType = 'text' as const;
  supportedMimeTypes = ['text/plain', 'text/markdown', 'text/html'];
  supportsOffline = true;
  supportsTextAlternative = true;

  validate(data: CreateContentItemDto): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.content_text && !data.external_url) {
      errors.push('Text content requires either content_text or external_url');
    }

    if (data.content_text && data.content_text.length > 1000000) {
      errors.push('Content text exceeds maximum length of 1,000,000 characters');
    }

    if (data.text_format && !['markdown', 'html', 'plain'].includes(data.text_format)) {
      errors.push('Invalid text format. Must be markdown, html, or plain');
    }

    if (data.content_text && data.content_text.length > 100000) {
      warnings.push('Long text content may affect page load times. Consider splitting into multiple lessons.');
    }

    // Check for potential accessibility issues
    if (data.text_format === 'html' && data.content_text) {
      if (/<img[^>]*(?!alt=)[^>]*>/i.test(data.content_text)) {
        warnings.push('HTML content contains images without alt attributes');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async process(content: ContentItem): Promise<ContentItem> {
    // Calculate word count
    const wordCount = content.content_text
      ? this.calculateWordCount(content.content_text)
      : 0;

    // Estimate reading time (average 200 words per minute)
    const readingTimeMinutes = Math.ceil(wordCount / 200);

    // For text content, the processed content is the same
    // but we can add metadata
    return {
      ...content,
      word_count: wordCount,
      duration_seconds: readingTimeMinutes * 60,
    };
  }

  generateOptimizationPlan(
    content: ContentItem,
    options: OptimizationOptions
  ): OptimizationResult {
    // Text content doesn't need many variants - it's already lightweight
    const variants = [];

    // Original/compressed variant
    variants.push({
      variantType: 'compressed' as VariantType,
      optimizedForNetwork: 'any' as const,
      config: {
        format: content.text_format,
      },
    });

    // Text-only variant (strip any embedded media references)
    if (options.generateTextAlternative && content.text_format !== 'plain') {
      variants.push({
        variantType: 'text_only' as VariantType,
        optimizedForNetwork: '2g' as const,
        config: {
          format: 'plain',
        },
      });
    }

    return {
      success: true,
      variants,
      textAlternative: content.content_text || undefined,
    };
  }

  async generateTextAlternative(content: ContentItem): Promise<string | null> {
    if (!content.content_text) return null;

    switch (content.text_format) {
      case 'html':
        return this.stripHtml(content.content_text);
      case 'markdown':
        // For markdown, convert to HTML then strip
        const html = this.markdownToHtml(content.content_text);
        return this.stripHtml(html);
      case 'plain':
      default:
        return content.content_text;
    }
  }

  render(content: ContentItem, options: RenderOptions): RenderResult {
    if (options.textOnly || !content.content_text) {
      return {
        html: `<div class="text-content text-only">${this.escapeHtml(content.content_text || '')}</div>`,
        metadata: {
          wordCount: content.word_count,
          format: 'plain',
        },
      };
    }

    let html: string;
    const scripts: string[] = [];
    const styles: string[] = [];

    switch (content.text_format) {
      case 'html':
        html = this.sanitizeHtml(content.content_text);
        break;
      case 'markdown':
        html = this.markdownToHtml(content.content_text);
        // Add syntax highlighting for code blocks
        if (html.includes('<code')) {
          scripts.push('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js');
          styles.push('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css');
        }
        break;
      case 'plain':
      default:
        html = `<pre class="plain-text">${this.escapeHtml(content.content_text)}</pre>`;
    }

    // Wrap with accessibility-friendly container
    const wrappedHtml = `
      <article class="text-content" lang="${content.original_language}" role="article">
        <h1 class="sr-only">${this.escapeHtml(content.title)}</h1>
        ${html}
      </article>
    `;

    return {
      html: wrappedHtml,
      scripts,
      styles,
      metadata: {
        wordCount: content.word_count,
        format: content.text_format,
        readingTimeMinutes: Math.ceil((content.word_count || 0) / 200),
      },
    };
  }

  checkAccessibility(content: ContentItem): AccessibilityChecks {
    const missingRequirements: string[] = [];
    let isScreenReaderCompatible = true;

    // Text content is inherently accessible, but check for issues
    if (content.text_format === 'html' && content.content_text) {
      // Check for images without alt text
      if (/<img[^>]*(?!alt=)[^>]*>/i.test(content.content_text)) {
        missingRequirements.push('Images in HTML content are missing alt text');
        isScreenReaderCompatible = false;
      }

      // Check for proper heading structure
      const headings = content.content_text.match(/<h[1-6][^>]*>/gi) || [];
      if (headings.length > 0) {
        const firstHeading = headings[0].match(/<h(\d)/i);
        if (firstHeading && parseInt(firstHeading[1]) > 1) {
          missingRequirements.push('Heading structure should start with h1');
        }
      }
    }

    return {
      hasAltText: true, // Text content doesn't need alt text
      hasTranscript: true, // Text is its own transcript
      hasCaptions: true, // Not applicable for text
      isKeyboardAccessible: true, // Text is always keyboard accessible
      isScreenReaderCompatible,
      missingRequirements,
    };
  }

  estimateBandwidth(content: ContentItem): number {
    if (!content.content_text) return 1;

    // Text is very lightweight - approximately 1 byte per character
    // Plus overhead for HTML rendering
    const contentBytes = content.content_text.length;
    const overhead = content.text_format === 'html' ? 1.2 : 1;

    return Math.ceil((contentBytes * overhead) / 1024);
  }

  getRequiredVariants(): VariantType[] {
    // Text content only really needs the original
    return ['original'];
  }

  private calculateWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
