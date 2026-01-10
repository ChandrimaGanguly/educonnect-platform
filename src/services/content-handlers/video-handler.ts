/**
 * Video Content Handler
 *
 * Handles video content with support for adaptive bitrate streaming,
 * multiple quality levels, and accessibility features like captions.
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

export class VideoContentHandler extends BaseContentHandler {
  contentType = 'video' as const;
  supportedMimeTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/*'];
  supportsOffline = true;
  supportsTextAlternative = true;

  // Quality presets for video transcoding
  private qualityPresets = {
    ultra_low: { width: 426, height: 240, bitrate: 400000 },
    low: { width: 640, height: 360, bitrate: 800000 },
    medium: { width: 854, height: 480, bitrate: 1500000 },
    high: { width: 1280, height: 720, bitrate: 3000000 },
    original: { width: 1920, height: 1080, bitrate: 6000000 },
  };

  validate(data: CreateContentItemDto): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.content_file_id && !data.external_url) {
      errors.push('Video content requires either content_file_id or external_url');
    }

    if (!data.duration_seconds) {
      warnings.push('Video duration not specified. Consider adding duration for better user experience.');
    }

    if (data.duration_seconds && data.duration_seconds > 3600) {
      warnings.push('Long videos (>1 hour) may have playback issues. Consider splitting into shorter segments.');
    }

    // Accessibility warnings
    if (!data.transcript) {
      warnings.push('Video should have a transcript for accessibility (WCAG 1.2.3)');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async process(content: ContentItem): Promise<ContentItem> {
    // In a real implementation, this would:
    // 1. Extract video metadata (duration, resolution, codec)
    // 2. Generate thumbnail
    // 3. Queue for transcoding to multiple qualities

    return {
      ...content,
      // Add placeholder metadata - in production this would come from video analysis
      file_size_bytes: content.file_size_bytes || 0,
    };
  }

  generateOptimizationPlan(
    content: ContentItem,
    options: OptimizationOptions
  ): OptimizationResult {
    const variants = [];

    // Always generate a thumbnail
    variants.push({
      variantType: 'thumbnail' as VariantType,
      optimizedForNetwork: 'any' as const,
      config: {
        maxWidth: 320,
        maxHeight: 180,
        format: 'webp',
      },
    });

    // Preview clip (first 30 seconds, low quality)
    variants.push({
      variantType: 'preview' as VariantType,
      optimizedForNetwork: 'any' as const,
      config: {
        ...this.qualityPresets.low,
        maxDuration: 30,
        format: 'mp4',
      },
    });

    // Quality variants based on target network
    if (!options.targetNetwork || options.targetNetwork === '2g') {
      variants.push({
        variantType: 'low_quality' as VariantType,
        optimizedForNetwork: '2g' as const,
        config: {
          ...this.qualityPresets.ultra_low,
          format: 'mp4',
          codec: 'h264',
        },
      });
    }

    if (!options.targetNetwork || options.targetNetwork === '3g') {
      variants.push({
        variantType: 'low_quality' as VariantType,
        optimizedForNetwork: '3g' as const,
        config: {
          ...this.qualityPresets.low,
          format: 'mp4',
          codec: 'h264',
        },
      });
    }

    if (!options.targetNetwork || options.targetNetwork === '4g') {
      variants.push({
        variantType: 'medium_quality' as VariantType,
        optimizedForNetwork: '4g' as const,
        config: {
          ...this.qualityPresets.medium,
          format: 'mp4',
          codec: 'h264',
        },
      });
    }

    if (!options.targetNetwork || ['5g', 'wifi'].includes(options.targetNetwork)) {
      variants.push({
        variantType: 'high_quality' as VariantType,
        optimizedForNetwork: 'wifi' as const,
        config: {
          ...this.qualityPresets.high,
          format: 'mp4',
          codec: 'h264',
        },
      });
    }

    // Audio-only variant for extreme low bandwidth
    variants.push({
      variantType: 'audio_only' as VariantType,
      optimizedForNetwork: '2g' as const,
      config: {
        format: 'mp3',
        bitrate: 128000,
      },
    });

    return {
      success: true,
      variants,
      textAlternative: options.generateTextAlternative ? content.transcript || undefined : undefined,
    };
  }

  async generateTextAlternative(content: ContentItem): Promise<string | null> {
    // Return transcript if available
    if (content.transcript) {
      return content.transcript;
    }

    // Generate a basic description
    const description = `Video: ${content.title}`;
    const duration = content.duration_seconds
      ? `Duration: ${this.formatDuration(content.duration_seconds)}`
      : '';

    return `${description}\n${duration}\n\n${content.description || 'No transcript available.'}`;
  }

  render(content: ContentItem, options: RenderOptions): RenderResult {
    if (options.textOnly) {
      return this.renderTextOnly(content);
    }

    const videoId = `video-${content.id}`;
    const captionTracks = this.generateCaptionTracks(content, options.language);

    const html = `
      <div class="video-container" role="region" aria-label="Video: ${this.escapeAttr(content.title)}">
        <video
          id="${videoId}"
          class="video-player"
          controls
          preload="metadata"
          poster="${content.content_file_id ? `/api/v1/content/${content.id}/thumbnail` : ''}"
          aria-describedby="${videoId}-description"
        >
          <source src="/api/v1/content/${content.id}/stream" type="video/mp4" />
          ${captionTracks}
          <p class="video-fallback">
            Your browser does not support HTML5 video.
            <a href="/api/v1/content/${content.id}/download">Download the video</a>
          </p>
        </video>

        <div id="${videoId}-description" class="sr-only">
          ${content.description || content.title}
        </div>

        <div class="video-controls-extra">
          <button class="btn-text-mode" aria-label="Switch to text mode">
            Text Alternative
          </button>
          <button class="btn-audio-only" aria-label="Audio only mode">
            Audio Only
          </button>
          <select class="quality-selector" aria-label="Video quality">
            <option value="auto">Auto</option>
            <option value="low">Low (360p)</option>
            <option value="medium">Medium (480p)</option>
            <option value="high">High (720p)</option>
          </select>
        </div>

        ${content.has_transcript ? this.renderTranscriptSection(content) : ''}
      </div>
    `;

    return {
      html,
      scripts: ['/js/video-player.js'],
      styles: ['/css/video-player.css'],
      metadata: {
        duration: content.duration_seconds,
        hasCaptions: content.has_captions,
        hasTranscript: content.has_transcript,
        qualityOptions: ['low', 'medium', 'high'],
      },
    };
  }

  checkAccessibility(content: ContentItem): AccessibilityChecks {
    const missingRequirements: string[] = [];

    if (!content.has_captions) {
      missingRequirements.push('Video must have captions (WCAG 1.2.2)');
    }

    if (!content.has_transcript) {
      missingRequirements.push('Video should have a transcript (WCAG 1.2.3)');
    }

    if (!content.has_audio_description && this.hasVisualOnlyContent(content)) {
      missingRequirements.push('Video may need audio description for visual content (WCAG 1.2.5)');
    }

    return {
      hasAltText: !!content.description,
      hasTranscript: content.has_transcript,
      hasCaptions: content.has_captions,
      isKeyboardAccessible: true, // HTML5 video is keyboard accessible
      isScreenReaderCompatible: content.has_captions && content.has_transcript,
      missingRequirements,
    };
  }

  estimateBandwidth(content: ContentItem): number {
    if (content.file_size_bytes) {
      return Math.ceil(content.file_size_bytes / 1024);
    }

    // Estimate based on duration (assuming medium quality)
    // Medium quality ~1.5 Mbps = ~187.5 KB/s
    const durationSeconds = content.duration_seconds || 300;
    return Math.ceil(durationSeconds * 187.5);
  }

  getRequiredVariants(): VariantType[] {
    return [
      'thumbnail',
      'low_quality',
      'medium_quality',
      'high_quality',
      'audio_only',
    ];
  }

  private renderTextOnly(content: ContentItem): RenderResult {
    const html = `
      <div class="video-text-alternative" role="article">
        <h2>${this.escapeHtml(content.title)}</h2>
        <p class="video-meta">
          Video Duration: ${this.formatDuration(content.duration_seconds || 0)}
        </p>
        <div class="video-description">
          ${content.description || 'No description available.'}
        </div>
        ${content.transcript ? `
          <div class="video-transcript">
            <h3>Transcript</h3>
            <div class="transcript-content">
              ${this.formatTranscript(content.transcript)}
            </div>
          </div>
        ` : '<p class="no-transcript">Transcript not available.</p>'}
      </div>
    `;

    return {
      html,
      metadata: {
        mode: 'text_only',
        duration: content.duration_seconds,
      },
    };
  }

  private generateCaptionTracks(content: ContentItem, preferredLanguage?: string): string {
    // In production, this would fetch actual caption tracks
    if (!content.has_captions) return '';

    return `
      <track
        kind="captions"
        src="/api/v1/content/${content.id}/captions/${preferredLanguage || content.original_language}"
        srclang="${preferredLanguage || content.original_language}"
        label="${this.getLanguageName(preferredLanguage || content.original_language)}"
        ${!preferredLanguage || preferredLanguage === content.original_language ? 'default' : ''}
      />
    `;
  }

  private renderTranscriptSection(content: ContentItem): string {
    return `
      <details class="video-transcript-toggle">
        <summary>Show Transcript</summary>
        <div class="transcript-content">
          ${this.formatTranscript(content.transcript || '')}
        </div>
      </details>
    `;
  }

  private formatTranscript(transcript: string): string {
    // Basic formatting - timestamps and paragraphs
    return transcript
      .split('\n\n')
      .map((para) => `<p>${this.escapeHtml(para)}</p>`)
      .join('');
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  private hasVisualOnlyContent(_content: ContentItem): boolean {
    // In production, this would analyze the video for visual-only segments
    return true;
  }

  private getLanguageName(code: string): string {
    const languages: Record<string, string> = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      hi: 'Hindi',
      zh: 'Chinese',
      ar: 'Arabic',
      pt: 'Portuguese',
    };
    return languages[code] || code;
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
