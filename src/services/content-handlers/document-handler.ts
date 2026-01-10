/**
 * Document Content Handler
 *
 * Handles document content including PDF, EPUB, and other downloadable documents.
 * Supports both inline viewing and download.
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

export class DocumentContentHandler extends BaseContentHandler {
  contentType = 'document' as const;
  supportedMimeTypes = [
    'application/pdf',
    'application/epub+zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];
  supportsOffline = true;
  supportsTextAlternative = true;

  validate(data: CreateContentItemDto): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.content_file_id && !data.external_url) {
      errors.push('Document content requires either content_file_id or external_url');
    }

    if (!data.description) {
      warnings.push('Document should have a description for better discoverability');
    }

    if (!data.text_alternative) {
      warnings.push('Consider providing a text alternative for accessibility');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async process(content: ContentItem): Promise<ContentItem> {
    // In a real implementation, this would:
    // 1. Extract document metadata (page count, author, title)
    // 2. Generate preview images of pages
    // 3. Extract text content for search indexing

    return {
      ...content,
      file_size_bytes: content.file_size_bytes || 0,
    };
  }

  generateOptimizationPlan(
    content: ContentItem,
    options: OptimizationOptions
  ): OptimizationResult {
    const variants = [];

    // Thumbnail preview (first page)
    variants.push({
      variantType: 'thumbnail' as VariantType,
      optimizedForNetwork: 'any' as const,
      config: {
        format: 'webp',
        maxWidth: 200,
        maxHeight: 260,
        page: 1,
      },
    });

    // Preview variant (low-res images of all pages)
    variants.push({
      variantType: 'preview' as VariantType,
      optimizedForNetwork: '3g' as const,
      config: {
        format: 'pdf',
        quality: 50,
        maxWidth: 600,
      },
    });

    // Compressed variant
    if (content.file_size_bytes && content.file_size_bytes > 1024 * 1024) {
      variants.push({
        variantType: 'compressed' as VariantType,
        optimizedForNetwork: '3g' as const,
        config: {
          format: 'pdf',
          quality: 75,
          compressImages: true,
        },
      });
    }

    // Text-only variant (extracted text)
    if (options.generateTextAlternative) {
      variants.push({
        variantType: 'text_only' as VariantType,
        optimizedForNetwork: '2g' as const,
        config: {
          format: 'txt',
          extractText: true,
        },
      });
    }

    return {
      success: true,
      variants,
      textAlternative: options.generateTextAlternative ? content.text_alternative || undefined : undefined,
    };
  }

  async generateTextAlternative(content: ContentItem): Promise<string | null> {
    if (content.text_alternative) {
      return content.text_alternative;
    }

    // In production, this would extract text from the document
    return `Document: ${content.title}\n` +
      `${content.page_count ? `Pages: ${content.page_count}\n` : ''}` +
      `${content.description || 'No text content extracted.'}`;
  }

  render(content: ContentItem, options: RenderOptions): RenderResult {
    if (options.textOnly) {
      return this.renderTextOnly(content);
    }

    const docId = `document-${content.id}`;
    const mimeType = this.getMimeTypeFromExtension(content);

    let viewerHtml: string;
    if (mimeType === 'application/pdf') {
      viewerHtml = this.renderPdfViewer(content, docId);
    } else if (mimeType === 'application/epub+zip') {
      viewerHtml = this.renderEpubViewer(content, docId);
    } else {
      viewerHtml = this.renderGenericDocument(content, docId);
    }

    return {
      html: viewerHtml,
      scripts: this.getViewerScripts(mimeType),
      styles: ['/css/document-viewer.css'],
      metadata: {
        mimeType,
        pageCount: content.page_count,
        hasTextExtraction: !!content.text_alternative,
      },
    };
  }

  checkAccessibility(content: ContentItem): AccessibilityChecks {
    const missingRequirements: string[] = [];

    if (!content.text_alternative) {
      missingRequirements.push('Document should have extractable text or text alternative');
    }

    if (!content.description) {
      missingRequirements.push('Document should have a description');
    }

    // PDF-specific accessibility concerns
    const mimeType = this.getMimeTypeFromExtension(content);
    if (mimeType === 'application/pdf') {
      missingRequirements.push('Verify PDF is tagged for accessibility');
    }

    return {
      hasAltText: !!content.description,
      hasTranscript: !!content.text_alternative,
      hasCaptions: true, // Not applicable for documents
      isKeyboardAccessible: true,
      isScreenReaderCompatible: !!content.text_alternative,
      missingRequirements,
    };
  }

  estimateBandwidth(content: ContentItem): number {
    if (content.file_size_bytes) {
      return Math.ceil(content.file_size_bytes / 1024);
    }

    // Estimate based on page count (average ~100KB per page)
    const pageCount = content.page_count || 10;
    return pageCount * 100;
  }

  getRequiredVariants(): VariantType[] {
    return ['thumbnail', 'preview', 'compressed'];
  }

  private renderTextOnly(content: ContentItem): RenderResult {
    const html = `
      <div class="document-text-alternative" role="article">
        <header class="document-header">
          <div class="document-icon">📄</div>
          <h2>${this.escapeHtml(content.title)}</h2>
          <p class="document-meta">
            ${content.page_count ? `${content.page_count} pages` : 'Document'}
            ${content.file_size_bytes ? ` • ${this.formatFileSize(content.file_size_bytes)}` : ''}
          </p>
        </header>
        <div class="document-description">
          ${content.description || 'No description available.'}
        </div>
        ${content.text_alternative ? `
          <div class="document-text-content">
            <h3>Document Content</h3>
            <div class="text-content">
              ${this.formatTextContent(content.text_alternative)}
            </div>
          </div>
        ` : ''}
        <div class="document-download">
          <a href="/api/v1/content/${content.id}/download" class="download-link">
            Download Document
          </a>
        </div>
      </div>
    `;

    return {
      html,
      metadata: {
        mode: 'text_only',
        pageCount: content.page_count,
      },
    };
  }

  private renderPdfViewer(content: ContentItem, docId: string): string {
    return `
      <div class="document-container pdf-viewer" id="${docId}" role="document" aria-label="${this.escapeAttr(content.title)}">
        <div class="document-toolbar">
          <div class="toolbar-section">
            <button class="btn-prev-page" aria-label="Previous page">
              <span>◀</span>
            </button>
            <span class="page-info">
              Page <input type="number" class="page-input" value="1" min="1" max="${content.page_count || 1}" aria-label="Page number" />
              of ${content.page_count || '?'}
            </span>
            <button class="btn-next-page" aria-label="Next page">
              <span>▶</span>
            </button>
          </div>
          <div class="toolbar-section">
            <button class="btn-zoom-out" aria-label="Zoom out">−</button>
            <span class="zoom-level">100%</span>
            <button class="btn-zoom-in" aria-label="Zoom in">+</button>
          </div>
          <div class="toolbar-section">
            <button class="btn-fullscreen" aria-label="Fullscreen">⛶</button>
            <a href="/api/v1/content/${content.id}/download" class="btn-download" aria-label="Download">↓</a>
          </div>
        </div>
        <div class="pdf-canvas-container">
          <canvas class="pdf-canvas" tabindex="0"></canvas>
        </div>
        <input type="hidden" class="pdf-url" value="/api/v1/content/${content.id}/file" />
      </div>
    `;
  }

  private renderEpubViewer(content: ContentItem, docId: string): string {
    return `
      <div class="document-container epub-viewer" id="${docId}" role="document" aria-label="${this.escapeAttr(content.title)}">
        <div class="epub-toolbar">
          <button class="btn-toc" aria-label="Table of Contents">☰</button>
          <div class="toolbar-section">
            <button class="btn-prev-chapter" aria-label="Previous chapter">◀</button>
            <span class="chapter-title">Loading...</span>
            <button class="btn-next-chapter" aria-label="Next chapter">▶</button>
          </div>
          <div class="toolbar-section">
            <button class="btn-font-decrease" aria-label="Decrease font size">A−</button>
            <button class="btn-font-increase" aria-label="Increase font size">A+</button>
          </div>
        </div>
        <div class="epub-toc" hidden>
          <h3>Table of Contents</h3>
          <nav class="toc-list"></nav>
        </div>
        <div class="epub-content" tabindex="0"></div>
        <input type="hidden" class="epub-url" value="/api/v1/content/${content.id}/file" />
      </div>
    `;
  }

  private renderGenericDocument(content: ContentItem, docId: string): string {
    return `
      <div class="document-container generic-document" id="${docId}" role="document" aria-label="${this.escapeAttr(content.title)}">
        <div class="document-preview">
          <img
            src="/api/v1/content/${content.id}/thumbnail"
            alt="Preview of ${this.escapeAttr(content.title)}"
            class="document-thumbnail"
          />
        </div>
        <div class="document-info">
          <h3>${this.escapeHtml(content.title)}</h3>
          <p class="document-description">${this.escapeHtml(content.description || '')}</p>
          <p class="document-meta">
            ${content.page_count ? `${content.page_count} pages • ` : ''}
            ${content.file_size_bytes ? this.formatFileSize(content.file_size_bytes) : ''}
          </p>
          <a href="/api/v1/content/${content.id}/download" class="btn btn-primary">
            Download Document
          </a>
        </div>
      </div>
    `;
  }

  private getViewerScripts(mimeType: string): string[] {
    if (mimeType === 'application/pdf') {
      return [
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
        '/js/pdf-viewer.js',
      ];
    }
    if (mimeType === 'application/epub+zip') {
      return ['/js/epub-viewer.js'];
    }
    return [];
  }

  private getMimeTypeFromExtension(content: ContentItem): string {
    // In production, this would come from the actual file metadata
    if (content.content_file_id) {
      // Assume PDF for now
      return 'application/pdf';
    }
    if (content.external_url) {
      const ext = content.external_url.split('.').pop()?.toLowerCase();
      const mimeMap: Record<string, string> = {
        pdf: 'application/pdf',
        epub: 'application/epub+zip',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ppt: 'application/vnd.ms-powerpoint',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      };
      return mimeMap[ext || ''] || 'application/octet-stream';
    }
    return 'application/pdf';
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private formatTextContent(text: string): string {
    return text
      .split('\n\n')
      .map((para) => `<p>${this.escapeHtml(para)}</p>`)
      .join('');
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private escapeAttr(text: string): string {
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}
