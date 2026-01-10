/**
 * Audio Content Handler
 *
 * Handles audio content including podcasts, narrations, and music.
 * Optimized for streaming with transcript support.
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

export class AudioContentHandler extends BaseContentHandler {
  contentType = 'audio' as const;
  supportedMimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/*'];
  supportsOffline = true;
  supportsTextAlternative = true;

  // Bitrate presets for audio transcoding
  private bitratePresets = {
    ultra_low: 32000, // 32 kbps
    low: 64000, // 64 kbps
    medium: 128000, // 128 kbps
    high: 256000, // 256 kbps
    original: 320000, // 320 kbps
  };

  validate(data: CreateContentItemDto): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.content_file_id && !data.external_url) {
      errors.push('Audio content requires either content_file_id or external_url');
    }

    if (!data.duration_seconds) {
      warnings.push('Audio duration not specified. Consider adding duration for better user experience.');
    }

    if (!data.transcript) {
      warnings.push('Audio should have a transcript for accessibility (WCAG 1.2.1)');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async process(content: ContentItem): Promise<ContentItem> {
    // In a real implementation, this would:
    // 1. Extract audio metadata (duration, bitrate, sample rate)
    // 2. Generate waveform visualization
    // 3. Queue for transcoding to multiple bitrates

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

    // Low quality for 2G/3G
    variants.push({
      variantType: 'low_quality' as VariantType,
      optimizedForNetwork: '3g' as const,
      config: {
        bitrate: this.bitratePresets.low,
        format: 'mp3',
      },
    });

    // Medium quality for 4G
    variants.push({
      variantType: 'medium_quality' as VariantType,
      optimizedForNetwork: '4g' as const,
      config: {
        bitrate: this.bitratePresets.medium,
        format: 'mp3',
      },
    });

    // High quality for WiFi
    if (!options.maxFileSizeKb || options.maxFileSizeKb > 10000) {
      variants.push({
        variantType: 'high_quality' as VariantType,
        optimizedForNetwork: 'wifi' as const,
        config: {
          bitrate: this.bitratePresets.high,
          format: 'mp3',
        },
      });
    }

    // Compressed/ultra-low for extreme bandwidth constraints
    variants.push({
      variantType: 'compressed' as VariantType,
      optimizedForNetwork: '2g' as const,
      config: {
        bitrate: this.bitratePresets.ultra_low,
        format: 'mp3',
      },
    });

    return {
      success: true,
      variants,
      textAlternative: options.generateTextAlternative ? content.transcript || undefined : undefined,
    };
  }

  async generateTextAlternative(content: ContentItem): Promise<string | null> {
    if (content.transcript) {
      return content.transcript;
    }

    // Generate basic description
    return `Audio: ${content.title}\n` +
      `Duration: ${this.formatDuration(content.duration_seconds || 0)}\n\n` +
      `${content.description || 'No transcript available.'}`;
  }

  render(content: ContentItem, options: RenderOptions): RenderResult {
    if (options.textOnly) {
      return this.renderTextOnly(content);
    }

    const audioId = `audio-${content.id}`;

    const html = `
      <div class="audio-container" role="region" aria-label="Audio: ${this.escapeAttr(content.title)}">
        <div class="audio-info">
          <h3 class="audio-title">${this.escapeHtml(content.title)}</h3>
          <p class="audio-duration">${this.formatDuration(content.duration_seconds || 0)}</p>
        </div>

        <audio
          id="${audioId}"
          class="audio-player"
          controls
          preload="metadata"
          aria-describedby="${audioId}-description"
        >
          <source src="/api/v1/content/${content.id}/stream" type="audio/mpeg" />
          <p class="audio-fallback">
            Your browser does not support HTML5 audio.
            <a href="/api/v1/content/${content.id}/download">Download the audio</a>
          </p>
        </audio>

        <div id="${audioId}-description" class="sr-only">
          ${content.description || content.title}
        </div>

        <div class="audio-controls-extra">
          <div class="playback-speed">
            <label for="${audioId}-speed">Speed:</label>
            <select id="${audioId}-speed" class="speed-selector">
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1" selected>1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>
          <button class="btn-text-mode" aria-label="Show transcript">
            View Transcript
          </button>
        </div>

        ${content.has_transcript ? this.renderTranscriptSection(content, audioId) : ''}
      </div>
    `;

    return {
      html,
      scripts: ['/js/audio-player.js'],
      styles: ['/css/audio-player.css'],
      metadata: {
        duration: content.duration_seconds,
        hasTranscript: content.has_transcript,
        format: 'mp3',
      },
    };
  }

  checkAccessibility(content: ContentItem): AccessibilityChecks {
    const missingRequirements: string[] = [];

    if (!content.has_transcript) {
      missingRequirements.push('Audio must have a transcript (WCAG 1.2.1)');
    }

    return {
      hasAltText: !!content.description,
      hasTranscript: content.has_transcript,
      hasCaptions: true, // Captions not applicable for audio-only
      isKeyboardAccessible: true, // HTML5 audio is keyboard accessible
      isScreenReaderCompatible: content.has_transcript,
      missingRequirements,
    };
  }

  estimateBandwidth(content: ContentItem): number {
    if (content.file_size_bytes) {
      return Math.ceil(content.file_size_bytes / 1024);
    }

    // Estimate based on duration (assuming medium quality 128 kbps)
    // 128 kbps = 16 KB/s
    const durationSeconds = content.duration_seconds || 300;
    return Math.ceil(durationSeconds * 16);
  }

  getRequiredVariants(): VariantType[] {
    return ['low_quality', 'medium_quality', 'high_quality'];
  }

  private renderTextOnly(content: ContentItem): RenderResult {
    const html = `
      <div class="audio-text-alternative" role="article">
        <h2>${this.escapeHtml(content.title)}</h2>
        <p class="audio-meta">
          Audio Duration: ${this.formatDuration(content.duration_seconds || 0)}
        </p>
        <div class="audio-description">
          ${content.description || 'No description available.'}
        </div>
        ${content.transcript ? `
          <div class="audio-transcript">
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

  private renderTranscriptSection(content: ContentItem, audioId: string): string {
    return `
      <details class="audio-transcript-toggle" id="${audioId}-transcript">
        <summary>Transcript</summary>
        <div class="transcript-content" tabindex="0">
          ${this.formatTranscript(content.transcript || '')}
        </div>
      </details>
    `;
  }

  private formatTranscript(transcript: string): string {
    // Handle timestamp-based transcripts
    // Format: [00:00] Speaker: Text
    return transcript
      .split('\n')
      .map((line) => {
        const timestampMatch = line.match(/^\[(\d{2}:\d{2}(?::\d{2})?)\]\s*(.*)$/);
        if (timestampMatch) {
          return `<p class="transcript-line" data-timestamp="${timestampMatch[1]}">
            <span class="timestamp">${timestampMatch[1]}</span>
            <span class="text">${this.escapeHtml(timestampMatch[2])}</span>
          </p>`;
        }
        return line ? `<p>${this.escapeHtml(line)}</p>` : '';
      })
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
