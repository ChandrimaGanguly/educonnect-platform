/**
 * Image Content Handler
 *
 * Handles image content with support for multiple formats,
 * responsive images, and accessibility features.
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

export class ImageContentHandler extends BaseContentHandler {
  contentType = 'image' as const;
  supportedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/*'];
  supportsOffline = true;
  supportsTextAlternative = true;

  // Size presets for responsive images
  private sizePresets = {
    thumbnail: { width: 150, height: 150 },
    small: { width: 320, height: 240 },
    medium: { width: 640, height: 480 },
    large: { width: 1024, height: 768 },
    original: { width: 1920, height: 1080 },
  };

  validate(data: CreateContentItemDto): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.content_file_id && !data.external_url) {
      errors.push('Image content requires either content_file_id or external_url');
    }

    if (!data.alt_text) {
      errors.push('Image must have alt text for accessibility (WCAG 1.1.1)');
    } else if (data.alt_text.length < 5) {
      warnings.push('Alt text seems too short. Provide a meaningful description.');
    } else if (data.alt_text.length > 250) {
      warnings.push('Alt text is very long. Consider using a shorter description with longdesc for complex images.');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async process(content: ContentItem): Promise<ContentItem> {
    // In a real implementation, this would:
    // 1. Extract image metadata (dimensions, format, color profile)
    // 2. Generate responsive variants
    // 3. Convert to modern formats (WebP, AVIF)

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

    // Thumbnail for previews
    variants.push({
      variantType: 'thumbnail' as VariantType,
      optimizedForNetwork: 'any' as const,
      config: {
        ...this.sizePresets.thumbnail,
        format: 'webp',
        quality: 70,
      },
    });

    // Low quality for 2G/3G (small, heavily compressed)
    variants.push({
      variantType: 'low_quality' as VariantType,
      optimizedForNetwork: '3g' as const,
      config: {
        ...this.sizePresets.small,
        format: 'webp',
        quality: 60,
      },
    });

    // Medium quality for 4G
    variants.push({
      variantType: 'medium_quality' as VariantType,
      optimizedForNetwork: '4g' as const,
      config: {
        ...this.sizePresets.medium,
        format: 'webp',
        quality: 80,
      },
    });

    // High quality for WiFi
    if (!options.maxFileSizeKb || options.maxFileSizeKb > 500) {
      variants.push({
        variantType: 'high_quality' as VariantType,
        optimizedForNetwork: 'wifi' as const,
        config: {
          ...this.sizePresets.large,
          format: 'webp',
          quality: 90,
        },
      });
    }

    return {
      success: true,
      variants,
      textAlternative: options.generateTextAlternative ? content.alt_text || undefined : undefined,
    };
  }

  async generateTextAlternative(content: ContentItem): Promise<string | null> {
    if (content.alt_text) {
      return `Image: ${content.title}\n${content.alt_text}`;
    }
    return `Image: ${content.title}\n${content.description || 'No description available.'}`;
  }

  render(content: ContentItem, options: RenderOptions): RenderResult {
    if (options.textOnly) {
      return this.renderTextOnly(content);
    }

    const imageId = `image-${content.id}`;
    const srcset = this.generateSrcSet(content.id);

    const html = `
      <figure class="image-container" id="${imageId}">
        <picture>
          <source
            type="image/webp"
            srcset="${srcset.webp}"
            sizes="(max-width: 320px) 320px, (max-width: 640px) 640px, (max-width: 1024px) 1024px, 1920px"
          />
          <img
            src="/api/v1/content/${content.id}/image?quality=medium"
            srcset="${srcset.default}"
            sizes="(max-width: 320px) 320px, (max-width: 640px) 640px, (max-width: 1024px) 1024px, 1920px"
            alt="${this.escapeAttr(content.alt_text || content.title)}"
            loading="lazy"
            class="responsive-image"
            ${content.description ? `aria-describedby="${imageId}-desc"` : ''}
          />
        </picture>
        ${content.description ? `
          <figcaption id="${imageId}-desc" class="image-caption">
            ${this.escapeHtml(content.description)}
          </figcaption>
        ` : ''}
      </figure>
    `;

    return {
      html,
      styles: ['/css/image-viewer.css'],
      scripts: ['/js/image-zoom.js'],
      metadata: {
        hasAltText: !!content.alt_text,
        hasCaption: !!content.description,
        responsive: true,
      },
    };
  }

  checkAccessibility(content: ContentItem): AccessibilityChecks {
    const missingRequirements: string[] = [];

    if (!content.alt_text) {
      missingRequirements.push('Image must have alt text (WCAG 1.1.1)');
    }

    // Check if alt text is meaningful (not just "image" or "photo")
    const genericAltPatterns = /^(image|photo|picture|graphic|icon)$/i;
    if (content.alt_text && genericAltPatterns.test(content.alt_text.trim())) {
      missingRequirements.push('Alt text should be descriptive, not generic');
    }

    return {
      hasAltText: !!content.alt_text,
      hasTranscript: true, // Not applicable for images
      hasCaptions: !!content.description,
      isKeyboardAccessible: true,
      isScreenReaderCompatible: !!content.alt_text,
      missingRequirements,
    };
  }

  estimateBandwidth(content: ContentItem): number {
    if (content.file_size_bytes) {
      return Math.ceil(content.file_size_bytes / 1024);
    }

    // Average compressed image ~100-500 KB
    return 250;
  }

  getRequiredVariants(): VariantType[] {
    return ['thumbnail', 'low_quality', 'medium_quality', 'high_quality'];
  }

  private renderTextOnly(content: ContentItem): RenderResult {
    const html = `
      <div class="image-text-alternative" role="img" aria-label="${this.escapeAttr(content.alt_text || content.title)}">
        <div class="image-placeholder">
          <span class="icon">🖼️</span>
          <span class="label">Image</span>
        </div>
        <div class="image-details">
          <strong>${this.escapeHtml(content.title)}</strong>
          <p>${this.escapeHtml(content.alt_text || content.description || 'No description available.')}</p>
        </div>
      </div>
    `;

    return {
      html,
      metadata: {
        mode: 'text_only',
        altText: content.alt_text,
      },
    };
  }

  private generateSrcSet(contentId: string): { webp: string; default: string } {
    const sizes = [320, 640, 1024, 1920];

    const webp = sizes
      .map((w) => `/api/v1/content/${contentId}/image?format=webp&width=${w} ${w}w`)
      .join(', ');

    const defaultSet = sizes
      .map((w) => `/api/v1/content/${contentId}/image?width=${w} ${w}w`)
      .join(', ');

    return { webp, default: defaultSet };
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
