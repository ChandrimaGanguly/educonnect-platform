/**
 * Content Transcoding Service
 *
 * Handles transcoding and optimization of content for different network conditions.
 * Implements the Low-Bandwidth Optimization requirements from mobile/spec.md:
 * - Adaptive media quality
 * - Image optimization (WebP, AVIF formats)
 * - Video optimization (HLS/DASH, multiple quality levels)
 * - Compression for low bandwidth
 */

import { Knex } from 'knex';
import { nanoid } from 'nanoid';
import { getDatabase } from '../database';
import {
  ContentItem,
  ContentVariant,
  VariantType,
  NetworkType,
  VariantStatus,
} from '../types/content.types';
import {
  getContentHandler,
  ContentHandlerFactory,
} from './content-handlers/handler-factory';
import { OptimizationResult, VariantRequest } from './content-handlers/base-handler';

export interface TranscodingJob {
  id: string;
  content_item_id: string;
  variant_type: VariantType;
  optimized_for_network: NetworkType;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  config: Record<string, unknown>;
  error?: string;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
}

export interface TranscodingQueueItem {
  job_id: string;
  priority: number;
  retry_count: number;
  max_retries: number;
}

export interface OptimizationConfig {
  targetNetwork?: NetworkType;
  maxFileSizeKb?: number;
  generateTextAlternative?: boolean;
  preserveQuality?: boolean;
  priorityLevel?: 'low' | 'normal' | 'high';
}

export interface BandwidthEstimate {
  original_kb: number;
  optimized_kb: number;
  savings_percent: number;
  recommended_variant: VariantType;
}

export class ContentTranscodingService {
  private db: Knex;
  private handlerFactory: ContentHandlerFactory;

  constructor() {
    this.db = getDatabase();
    this.handlerFactory = ContentHandlerFactory.getInstance();
  }

  // ========== Transcoding Job Management ==========

  /**
   * Create optimization plan for content
   */
  async createOptimizationPlan(
    contentItemId: string,
    config: OptimizationConfig = {}
  ): Promise<OptimizationResult> {
    const content = await this.db('content_items')
      .where({ id: contentItemId })
      .first();

    if (!content) {
      throw new Error('Content item not found');
    }

    const handler = getContentHandler(content.content_type);
    return handler.generateOptimizationPlan(content, {
      targetNetwork: config.targetNetwork,
      maxFileSizeKb: config.maxFileSizeKb,
      generateTextAlternative: config.generateTextAlternative ?? true,
      preserveQuality: config.preserveQuality,
    });
  }

  /**
   * Queue transcoding jobs for content
   */
  async queueTranscodingJobs(
    contentItemId: string,
    config: OptimizationConfig = {}
  ): Promise<TranscodingJob[]> {
    const plan = await this.createOptimizationPlan(contentItemId, config);

    if (!plan.success) {
      throw new Error(plan.error || 'Failed to create optimization plan');
    }

    const jobs: TranscodingJob[] = [];
    const priority = this.getPriorityValue(config.priorityLevel || 'normal');

    for (const variant of plan.variants) {
      const job = await this.createTranscodingJob(
        contentItemId,
        variant,
        priority
      );
      jobs.push(job);
    }

    // Store text alternative if generated
    if (plan.textAlternative) {
      await this.db('content_items')
        .where({ id: contentItemId })
        .update({
          text_alternative: plan.textAlternative,
          has_text_alternative: true,
        });
    }

    return jobs;
  }

  /**
   * Create a single transcoding job
   */
  private async createTranscodingJob(
    contentItemId: string,
    variant: VariantRequest,
    priority: number
  ): Promise<TranscodingJob> {
    const jobId = nanoid();
    const now = new Date();

    // Check if variant already exists
    const existing = await this.db('content_variants')
      .where({
        content_item_id: contentItemId,
        variant_type: variant.variantType,
        optimized_for_network: variant.optimizedForNetwork,
      })
      .first();

    if (existing && existing.status === 'ready') {
      // Variant already exists, return mock job
      return {
        id: jobId,
        content_item_id: contentItemId,
        variant_type: variant.variantType,
        optimized_for_network: variant.optimizedForNetwork,
        status: 'completed',
        progress: 100,
        config: variant.config as Record<string, unknown>,
        created_at: now,
        updated_at: now,
        completed_at: now,
      };
    }

    // Create or update variant record
    if (existing) {
      await this.db('content_variants')
        .where({ id: existing.id })
        .update({
          status: 'pending',
          processing_error: null,
        });
    } else {
      await this.db('content_variants').insert({
        content_item_id: contentItemId,
        variant_type: variant.variantType,
        optimized_for_network: variant.optimizedForNetwork,
        status: 'pending',
      });
    }

    // In production, this would queue the job to a job processor (e.g., BullMQ)
    // For now, we return the job info
    return {
      id: jobId,
      content_item_id: contentItemId,
      variant_type: variant.variantType,
      optimized_for_network: variant.optimizedForNetwork,
      status: 'pending',
      progress: 0,
      config: variant.config as Record<string, unknown>,
      created_at: now,
      updated_at: now,
    };
  }

  /**
   * Process a transcoding job (called by worker)
   */
  async processTranscodingJob(
    contentItemId: string,
    variantType: VariantType,
    networkType: NetworkType
  ): Promise<ContentVariant> {
    // Update status to processing
    await this.db('content_variants')
      .where({
        content_item_id: contentItemId,
        variant_type: variantType,
        optimized_for_network: networkType,
      })
      .update({ status: 'processing' });

    try {
      // Get content item
      const content = await this.db('content_items')
        .where({ id: contentItemId })
        .first();

      if (!content) {
        throw new Error('Content item not found');
      }

      // Process based on variant type
      const result = await this.processVariant(content, variantType, networkType);

      // Update variant with results
      const [variant] = await this.db('content_variants')
        .where({
          content_item_id: contentItemId,
          variant_type: variantType,
          optimized_for_network: networkType,
        })
        .update({
          status: 'ready',
          file_id: result.fileId,
          content_text: result.contentText,
          mime_type: result.mimeType,
          file_size_bytes: result.fileSizeBytes,
          width: result.width,
          height: result.height,
          bitrate: result.bitrate,
          codec: result.codec,
          quality_score: result.qualityScore,
          bandwidth_estimate_kb: result.bandwidthEstimateKb,
        })
        .returning('*');

      return variant;
    } catch (error) {
      // Update status to failed
      await this.db('content_variants')
        .where({
          content_item_id: contentItemId,
          variant_type: variantType,
          optimized_for_network: networkType,
        })
        .update({
          status: 'failed',
          processing_error: error instanceof Error ? error.message : 'Unknown error',
        });

      throw error;
    }
  }

  /**
   * Process variant based on type
   */
  private async processVariant(
    content: ContentItem,
    variantType: VariantType,
    networkType: NetworkType
  ): Promise<{
    fileId?: string;
    contentText?: string;
    mimeType?: string;
    fileSizeBytes?: number;
    width?: number;
    height?: number;
    bitrate?: number;
    codec?: string;
    qualityScore: number;
    bandwidthEstimateKb: number;
  }> {
    // In production, this would call actual transcoding services
    // For now, return simulated results

    switch (variantType) {
      case 'text_only':
        return this.generateTextOnlyVariant(content);
      case 'thumbnail':
        return this.generateThumbnail(content);
      case 'low_quality':
        return this.generateLowQualityVariant(content, networkType);
      case 'medium_quality':
        return this.generateMediumQualityVariant(content);
      case 'high_quality':
        return this.generateHighQualityVariant(content);
      case 'audio_only':
        return this.generateAudioOnlyVariant(content);
      case 'compressed':
        return this.generateCompressedVariant(content);
      case 'preview':
        return this.generatePreviewVariant(content);
      case 'original':
      default:
        return this.generateOriginalVariant(content);
    }
  }

  private async generateTextOnlyVariant(content: ContentItem) {
    const handler = getContentHandler(content.content_type);
    const textAlternative = await handler.generateTextAlternative(content);

    return {
      contentText: textAlternative || content.content_text || content.description,
      mimeType: 'text/plain',
      fileSizeBytes: textAlternative?.length || 0,
      qualityScore: 30,
      bandwidthEstimateKb: Math.ceil((textAlternative?.length || 0) / 1024),
    };
  }

  private async generateThumbnail(_content: ContentItem) {
    // In production, would generate actual thumbnail
    return {
      mimeType: 'image/webp',
      fileSizeBytes: 15000,
      width: 320,
      height: 180,
      qualityScore: 50,
      bandwidthEstimateKb: 15,
    };
  }

  private async generateLowQualityVariant(content: ContentItem, networkType: NetworkType) {
    const bitrateMap: Record<NetworkType, number> = {
      '2g': 64000,
      '3g': 128000,
      '4g': 256000,
      '5g': 512000,
      wifi: 512000,
      any: 128000,
    };

    return {
      mimeType: content.content_type === 'video' ? 'video/mp4' : 'audio/mp3',
      fileSizeBytes: Math.ceil((content.duration_seconds || 300) * bitrateMap[networkType] / 8),
      width: content.content_type === 'video' ? 640 : undefined,
      height: content.content_type === 'video' ? 360 : undefined,
      bitrate: bitrateMap[networkType],
      codec: 'h264',
      qualityScore: 40,
      bandwidthEstimateKb: Math.ceil(
        ((content.duration_seconds || 300) * bitrateMap[networkType]) / 8 / 1024
      ),
    };
  }

  private async generateMediumQualityVariant(content: ContentItem) {
    const bitrate = content.content_type === 'video' ? 1500000 : 192000;

    return {
      mimeType: content.content_type === 'video' ? 'video/mp4' : 'audio/mp3',
      fileSizeBytes: Math.ceil((content.duration_seconds || 300) * bitrate / 8),
      width: content.content_type === 'video' ? 854 : undefined,
      height: content.content_type === 'video' ? 480 : undefined,
      bitrate,
      codec: 'h264',
      qualityScore: 70,
      bandwidthEstimateKb: Math.ceil(
        ((content.duration_seconds || 300) * bitrate) / 8 / 1024
      ),
    };
  }

  private async generateHighQualityVariant(content: ContentItem) {
    const bitrate = content.content_type === 'video' ? 3000000 : 320000;

    return {
      mimeType: content.content_type === 'video' ? 'video/mp4' : 'audio/mp3',
      fileSizeBytes: Math.ceil((content.duration_seconds || 300) * bitrate / 8),
      width: content.content_type === 'video' ? 1280 : undefined,
      height: content.content_type === 'video' ? 720 : undefined,
      bitrate,
      codec: 'h264',
      qualityScore: 90,
      bandwidthEstimateKb: Math.ceil(
        ((content.duration_seconds || 300) * bitrate) / 8 / 1024
      ),
    };
  }

  private async generateAudioOnlyVariant(content: ContentItem) {
    const bitrate = 128000; // 128 kbps

    return {
      mimeType: 'audio/mp3',
      fileSizeBytes: Math.ceil((content.duration_seconds || 300) * bitrate / 8),
      bitrate,
      codec: 'mp3',
      qualityScore: 50,
      bandwidthEstimateKb: Math.ceil(
        ((content.duration_seconds || 300) * bitrate) / 8 / 1024
      ),
    };
  }

  private async generateCompressedVariant(content: ContentItem) {
    const originalSize = content.file_size_bytes || 1000000;
    const compressedSize = Math.ceil(originalSize * 0.4); // 60% compression

    return {
      fileSizeBytes: compressedSize,
      qualityScore: 60,
      bandwidthEstimateKb: Math.ceil(compressedSize / 1024),
    };
  }

  private async generatePreviewVariant(content: ContentItem) {
    // Preview is first 30 seconds at low quality
    const duration = Math.min(content.duration_seconds || 30, 30);
    const bitrate = 500000;

    return {
      mimeType: 'video/mp4',
      fileSizeBytes: Math.ceil(duration * bitrate / 8),
      width: 640,
      height: 360,
      bitrate,
      codec: 'h264',
      qualityScore: 50,
      bandwidthEstimateKb: Math.ceil((duration * bitrate) / 8 / 1024),
    };
  }

  private async generateOriginalVariant(content: ContentItem) {
    return {
      fileId: content.content_file_id || undefined,
      fileSizeBytes: content.file_size_bytes || 0,
      qualityScore: 100,
      bandwidthEstimateKb: Math.ceil((content.file_size_bytes || 0) / 1024),
    };
  }

  // ========== Bandwidth Estimation ==========

  /**
   * Estimate bandwidth savings for content
   */
  async estimateBandwidthSavings(
    contentItemId: string,
    targetNetwork: NetworkType
  ): Promise<BandwidthEstimate> {
    const content = await this.db('content_items')
      .where({ id: contentItemId })
      .first();

    if (!content) {
      throw new Error('Content item not found');
    }

    const handler = getContentHandler(content.content_type);
    const originalKb = handler.estimateBandwidth(content);

    // Get optimal variant for network
    const variant = await this.db('content_variants')
      .where({
        content_item_id: contentItemId,
        optimized_for_network: targetNetwork,
        status: 'ready',
      })
      .first();

    let optimizedKb = originalKb;
    let recommendedVariant: VariantType = 'original';

    if (variant) {
      optimizedKb = variant.bandwidth_estimate_kb || originalKb;
      recommendedVariant = variant.variant_type;
    } else {
      // Estimate based on network type
      const estimatedReduction = this.getEstimatedReduction(targetNetwork);
      optimizedKb = Math.ceil(originalKb * estimatedReduction);
      recommendedVariant = this.getRecommendedVariant(targetNetwork);
    }

    const savingsPercent = Math.round((1 - optimizedKb / originalKb) * 100);

    return {
      original_kb: originalKb,
      optimized_kb: optimizedKb,
      savings_percent: Math.max(0, savingsPercent),
      recommended_variant: recommendedVariant,
    };
  }

  /**
   * Get recommended variant type for network
   */
  getRecommendedVariant(networkType: NetworkType): VariantType {
    switch (networkType) {
      case '2g':
        return 'text_only';
      case '3g':
        return 'low_quality';
      case '4g':
        return 'medium_quality';
      case '5g':
      case 'wifi':
        return 'high_quality';
      default:
        return 'medium_quality';
    }
  }

  /**
   * Get estimated bandwidth reduction for network type
   */
  private getEstimatedReduction(networkType: NetworkType): number {
    switch (networkType) {
      case '2g':
        return 0.05; // 95% reduction
      case '3g':
        return 0.15; // 85% reduction
      case '4g':
        return 0.4; // 60% reduction
      case '5g':
      case 'wifi':
        return 0.8; // 20% reduction
      default:
        return 0.5;
    }
  }

  // ========== Variant Selection ==========

  /**
   * Select optimal variant for delivery
   */
  async selectOptimalVariant(
    contentItemId: string,
    networkType: NetworkType,
    maxBandwidthKb?: number
  ): Promise<ContentVariant | null> {
    const content = await this.db('content_items')
      .where({ id: contentItemId })
      .first();

    if (!content) return null;

    // Get all ready variants
    const variants = await this.db('content_variants')
      .where({
        content_item_id: contentItemId,
        status: 'ready',
      })
      .orderBy('quality_score', 'desc');

    if (variants.length === 0) return null;

    // Find best variant for network
    const preferredTypes = this.getVariantPreference(networkType);

    for (const type of preferredTypes) {
      // Try network-specific first
      let variant = variants.find(
        (v: ContentVariant) => v.variant_type === type && v.optimized_for_network === networkType
      );

      if (!variant) {
        // Fall back to 'any'
        variant = variants.find(
          (v: ContentVariant) => v.variant_type === type && v.optimized_for_network === 'any'
        );
      }

      if (variant) {
        // Check bandwidth constraint
        if (!maxBandwidthKb || (variant.bandwidth_estimate_kb || 0) <= maxBandwidthKb) {
          return variant;
        }
      }
    }

    // Return lowest bandwidth option if nothing else fits
    return variants.reduce((lowest: ContentVariant, current: ContentVariant) =>
      (current.bandwidth_estimate_kb || Infinity) < (lowest.bandwidth_estimate_kb || Infinity)
        ? current
        : lowest
    );
  }

  /**
   * Get variant preference order for network
   */
  private getVariantPreference(networkType: NetworkType): VariantType[] {
    switch (networkType) {
      case '2g':
        return ['text_only', 'compressed', 'low_quality', 'thumbnail'];
      case '3g':
        return ['low_quality', 'compressed', 'medium_quality', 'text_only'];
      case '4g':
        return ['medium_quality', 'high_quality', 'low_quality', 'original'];
      case '5g':
      case 'wifi':
        return ['high_quality', 'original', 'medium_quality'];
      default:
        return ['medium_quality', 'low_quality', 'high_quality', 'original'];
    }
  }

  // ========== Utility Methods ==========

  private getPriorityValue(level: 'low' | 'normal' | 'high'): number {
    switch (level) {
      case 'high':
        return 1;
      case 'normal':
        return 5;
      case 'low':
        return 10;
    }
  }

  /**
   * Get transcoding status for content
   */
  async getTranscodingStatus(contentItemId: string): Promise<{
    total_variants: number;
    ready_variants: number;
    pending_variants: number;
    processing_variants: number;
    failed_variants: number;
    variants: ContentVariant[];
  }> {
    const variants = await this.db('content_variants')
      .where({ content_item_id: contentItemId });

    const statusCounts = variants.reduce(
      (acc: Record<string, number>, v: ContentVariant) => {
        acc[v.status] = (acc[v.status] || 0) + 1;
        return acc;
      },
      {}
    );

    return {
      total_variants: variants.length,
      ready_variants: statusCounts['ready'] || 0,
      pending_variants: statusCounts['pending'] || 0,
      processing_variants: statusCounts['processing'] || 0,
      failed_variants: statusCounts['failed'] || 0,
      variants,
    };
  }

  /**
   * Retry failed transcoding jobs
   */
  async retryFailedJobs(contentItemId: string): Promise<number> {
    const result = await this.db('content_variants')
      .where({
        content_item_id: contentItemId,
        status: 'failed',
      })
      .update({
        status: 'pending',
        processing_error: null,
      });

    return result;
  }

  /**
   * Clean up old/unused variants
   */
  async cleanupVariants(
    contentItemId: string,
    keepTypes: VariantType[]
  ): Promise<number> {
    const result = await this.db('content_variants')
      .where({ content_item_id: contentItemId })
      .whereNotIn('variant_type', keepTypes)
      .delete();

    return result;
  }
}
