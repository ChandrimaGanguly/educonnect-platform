/**
 * Base Content Handler
 *
 * Abstract base class for all content format handlers.
 * Defines the interface that all format-specific handlers must implement.
 */

import {
  ContentItem,
  ContentVariant,
  CreateContentItemDto,
  ContentType,
  VariantType,
  NetworkType,
} from '../../types/content.types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface OptimizationOptions {
  targetNetwork?: NetworkType;
  maxFileSizeKb?: number;
  generateTextAlternative?: boolean;
  preserveQuality?: boolean;
}

export interface OptimizationResult {
  success: boolean;
  variants: VariantRequest[];
  textAlternative?: string;
  error?: string;
}

export interface VariantRequest {
  variantType: VariantType;
  optimizedForNetwork: NetworkType;
  config: VariantConfig;
}

export interface VariantConfig {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  bitrate?: number;
  format?: string;
  codec?: string;
}

export interface RenderOptions {
  textOnly?: boolean;
  networkType?: NetworkType;
  language?: string;
  includeAccessibility?: boolean;
}

export interface RenderResult {
  html: string;
  scripts?: string[];
  styles?: string[];
  metadata: Record<string, unknown>;
}

export interface AccessibilityChecks {
  hasAltText: boolean;
  hasTranscript: boolean;
  hasCaptions: boolean;
  isKeyboardAccessible: boolean;
  isScreenReaderCompatible: boolean;
  missingRequirements: string[];
}

export abstract class BaseContentHandler {
  abstract contentType: ContentType;
  abstract supportedMimeTypes: string[];
  abstract supportsOffline: boolean;
  abstract supportsTextAlternative: boolean;

  /**
   * Validate content before saving
   */
  abstract validate(data: CreateContentItemDto): ValidationResult;

  /**
   * Process content after upload/creation
   */
  abstract process(content: ContentItem): Promise<ContentItem>;

  /**
   * Generate optimized variants for different network conditions
   */
  abstract generateOptimizationPlan(
    content: ContentItem,
    options: OptimizationOptions
  ): OptimizationResult;

  /**
   * Generate text alternative for low-bandwidth mode
   */
  abstract generateTextAlternative(content: ContentItem): Promise<string | null>;

  /**
   * Render content for display
   */
  abstract render(content: ContentItem, options: RenderOptions): RenderResult;

  /**
   * Check accessibility requirements
   */
  abstract checkAccessibility(content: ContentItem): AccessibilityChecks;

  /**
   * Calculate estimated bandwidth in KB
   */
  abstract estimateBandwidth(content: ContentItem): number;

  /**
   * Get required variants for this content type
   */
  abstract getRequiredVariants(): VariantType[];

  /**
   * Check if mime type is supported
   */
  isMimeTypeSupported(mimeType: string): boolean {
    return this.supportedMimeTypes.some(
      (supported) =>
        supported === mimeType ||
        (supported.endsWith('/*') &&
          mimeType.startsWith(supported.replace('/*', '/')))
    );
  }

  /**
   * Get file extension from mime type
   */
  protected getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'text/plain': '.txt',
      'text/markdown': '.md',
      'text/html': '.html',
      'application/pdf': '.pdf',
      'application/epub+zip': '.epub',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'audio/mpeg': '.mp3',
      'audio/ogg': '.ogg',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'application/json': '.json',
    };
    return mimeToExt[mimeType] || '';
  }

  /**
   * Sanitize HTML content
   */
  protected sanitizeHtml(html: string): string {
    // Basic sanitization - in production use a proper library like DOMPurify
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '');
  }

  /**
   * Convert markdown to HTML (basic implementation)
   */
  protected markdownToHtml(markdown: string): string {
    return markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      // Code blocks
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      // Inline code
      .replace(/`(.+?)`/g, '<code>$1</code>')
      // Links
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
      // Images
      .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" />')
      // Line breaks
      .replace(/\n/g, '<br />');
  }

  /**
   * Strip HTML tags for text-only mode
   */
  protected stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
}
