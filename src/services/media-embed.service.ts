import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { Knex } from 'knex';
import { getDatabase } from '../database';
import { storageConfig } from '../config/storage';

/**
 * Media Embed Service
 *
 * Handles media upload and embedding within content:
 * - File upload and validation
 * - Media embedding in content
 * - Accessibility metadata (alt text, captions, transcripts)
 * - Low-bandwidth fallback content
 */

// ========== Types ==========

export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'embed' | 'interactive';
export type MediaAlignment = 'left' | 'center' | 'right' | 'full';
export type FileType = 'image' | 'video' | 'audio' | 'document' | 'interactive' | 'other';
export type ProcessingStatus = 'pending' | 'processing' | 'ready' | 'failed' | 'archived';

export interface ContentFile {
  id: string;
  original_filename: string;
  storage_key: string;
  mime_type: string;
  file_size: number;
  file_hash: string;
  file_type: FileType;
  uploaded_by: string;
  community_id?: string;
  content_context: string;
  cdn_url?: string;
  is_public: boolean;
  cache_ttl?: number;
  metadata?: Record<string, any>;
  alt_text?: string;
  description?: string;
  transcript?: string;
  downloadable: boolean;
  estimated_bandwidth?: number;
  processing_status: ProcessingStatus;
  processing_error?: string;
  archived_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface MediaEmbed {
  id: string;
  draft_id: string;
  block_id?: string;
  file_id?: string;
  media_type: MediaType;
  external_url?: string;
  embed_code?: string;
  display_settings: Record<string, any>;
  alignment: MediaAlignment;
  is_inline: boolean;
  alt_text?: string;
  caption?: string;
  transcript?: string;
  has_captions: boolean;
  caption_file_url?: string;
  text_fallback?: string;
  thumbnail_file_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UploadFileData {
  filename: string;
  mime_type: string;
  file_size: number;
  buffer: Buffer;
  community_id?: string;
  content_context?: string;
  alt_text?: string;
  description?: string;
}

export interface CreateMediaEmbedData {
  draft_id: string;
  block_id?: string;
  file_id?: string;
  media_type: MediaType;
  external_url?: string;
  embed_code?: string;
  alignment?: MediaAlignment;
  is_inline?: boolean;
  alt_text?: string;
  caption?: string;
  text_fallback?: string;
}

export interface UpdateMediaEmbedData {
  display_settings?: Record<string, any>;
  alignment?: MediaAlignment;
  is_inline?: boolean;
  alt_text?: string;
  caption?: string;
  transcript?: string;
  has_captions?: boolean;
  caption_file_url?: string;
  text_fallback?: string;
}

export class MediaEmbedService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  // ========== File Upload ==========

  /**
   * Upload a file
   */
  async uploadFile(userId: string, data: UploadFileData): Promise<ContentFile> {
    // Validate file type
    const fileType = this.determineFileType(data.mime_type);
    this.validateFileSize(fileType, data.file_size);
    this.validateMimeType(fileType, data.mime_type);

    // Calculate file hash for deduplication
    const fileHash = crypto.createHash('sha256').update(data.buffer).digest('hex');

    // Check for duplicate file
    const existingFile = await this.findFileByHash(fileHash, userId);
    if (existingFile) {
      return existingFile;
    }

    // Generate storage key
    const storageKey = this.generateStorageKey(data.filename, userId);

    // Save file to storage
    await this.saveToStorage(storageKey, data.buffer);

    // Create database record
    const [file] = await this.db('content_files')
      .insert({
        original_filename: data.filename,
        storage_key: storageKey,
        mime_type: data.mime_type,
        file_size: data.file_size,
        file_hash: fileHash,
        file_type: fileType,
        uploaded_by: userId,
        community_id: data.community_id,
        content_context: data.content_context || 'resource',
        alt_text: data.alt_text,
        description: data.description,
        processing_status: 'pending',
        metadata: JSON.stringify({}),
      })
      .returning('*');

    return this.formatFile(file);
  }

  /**
   * Find file by hash (for deduplication)
   */
  async findFileByHash(hash: string, userId: string): Promise<ContentFile | null> {
    const file = await this.db('content_files')
      .where({ file_hash: hash, uploaded_by: userId })
      .whereNull('archived_at')
      .first();

    if (!file) return null;
    return this.formatFile(file);
  }

  /**
   * Get file by ID
   */
  async getFileById(fileId: string): Promise<ContentFile | null> {
    const file = await this.db('content_files')
      .where({ id: fileId })
      .whereNull('archived_at')
      .first();

    if (!file) return null;
    return this.formatFile(file);
  }

  /**
   * Get files by user
   */
  async getUserFiles(
    userId: string,
    options: {
      file_type?: FileType;
      community_id?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ files: ContentFile[]; total: number }> {
    const { file_type, community_id, limit = 20, offset = 0 } = options;

    let query = this.db('content_files')
      .where({ uploaded_by: userId })
      .whereNull('archived_at');

    if (file_type) {
      query = query.where({ file_type });
    }

    if (community_id) {
      query = query.where({ community_id });
    }

    const [{ count }] = await query.clone().count('* as count');
    const files = await query
      .limit(limit)
      .offset(offset)
      .orderBy('created_at', 'desc');

    return {
      files: files.map((f: any) => this.formatFile(f)),
      total: Number(count),
    };
  }

  /**
   * Update file metadata
   */
  async updateFile(
    fileId: string,
    data: {
      alt_text?: string;
      description?: string;
      transcript?: string;
      is_public?: boolean;
      metadata?: Record<string, any>;
    }
  ): Promise<ContentFile> {
    const updateData: Record<string, any> = {};

    if (data.alt_text !== undefined) updateData.alt_text = data.alt_text;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.transcript !== undefined) updateData.transcript = data.transcript;
    if (data.is_public !== undefined) updateData.is_public = data.is_public;
    if (data.metadata !== undefined) updateData.metadata = JSON.stringify(data.metadata);

    const [file] = await this.db('content_files')
      .where({ id: fileId })
      .update(updateData)
      .returning('*');

    return this.formatFile(file);
  }

  /**
   * Delete (archive) a file
   */
  async deleteFile(fileId: string): Promise<void> {
    await this.db('content_files')
      .where({ id: fileId })
      .update({
        archived_at: this.db.fn.now(),
        processing_status: 'archived',
      });
  }

  /**
   * Mark file processing complete
   */
  async markProcessingComplete(
    fileId: string,
    metadata?: Record<string, any>
  ): Promise<ContentFile> {
    const updateData: Record<string, any> = {
      processing_status: 'ready',
    };

    if (metadata) {
      updateData.metadata = JSON.stringify(metadata);
    }

    const [file] = await this.db('content_files')
      .where({ id: fileId })
      .update(updateData)
      .returning('*');

    return this.formatFile(file);
  }

  /**
   * Mark file processing failed
   */
  async markProcessingFailed(fileId: string, error: string): Promise<ContentFile> {
    const [file] = await this.db('content_files')
      .where({ id: fileId })
      .update({
        processing_status: 'failed',
        processing_error: error,
      })
      .returning('*');

    return this.formatFile(file);
  }

  // ========== Media Embed Management ==========

  /**
   * Create a media embed
   */
  async createMediaEmbed(data: CreateMediaEmbedData): Promise<MediaEmbed> {
    const [embed] = await this.db('content_media_embeds')
      .insert({
        draft_id: data.draft_id,
        block_id: data.block_id,
        file_id: data.file_id,
        media_type: data.media_type,
        external_url: data.external_url,
        embed_code: data.embed_code,
        alignment: data.alignment || 'center',
        is_inline: data.is_inline || false,
        alt_text: data.alt_text,
        caption: data.caption,
        text_fallback: data.text_fallback,
        display_settings: JSON.stringify({}),
      })
      .returning('*');

    return this.formatEmbed(embed);
  }

  /**
   * Get media embed by ID
   */
  async getMediaEmbed(embedId: string): Promise<MediaEmbed | null> {
    const embed = await this.db('content_media_embeds')
      .where({ id: embedId })
      .first();

    if (!embed) return null;
    return this.formatEmbed(embed);
  }

  /**
   * Get embeds for a draft
   */
  async getDraftEmbeds(draftId: string): Promise<MediaEmbed[]> {
    const embeds = await this.db('content_media_embeds')
      .where({ draft_id: draftId })
      .orderBy('created_at', 'asc');

    return embeds.map((e: any) => this.formatEmbed(e));
  }

  /**
   * Update media embed
   */
  async updateMediaEmbed(embedId: string, data: UpdateMediaEmbedData): Promise<MediaEmbed> {
    const updateData: Record<string, any> = {};

    if (data.display_settings !== undefined) {
      updateData.display_settings = JSON.stringify(data.display_settings);
    }
    if (data.alignment !== undefined) updateData.alignment = data.alignment;
    if (data.is_inline !== undefined) updateData.is_inline = data.is_inline;
    if (data.alt_text !== undefined) updateData.alt_text = data.alt_text;
    if (data.caption !== undefined) updateData.caption = data.caption;
    if (data.transcript !== undefined) updateData.transcript = data.transcript;
    if (data.has_captions !== undefined) updateData.has_captions = data.has_captions;
    if (data.caption_file_url !== undefined) updateData.caption_file_url = data.caption_file_url;
    if (data.text_fallback !== undefined) updateData.text_fallback = data.text_fallback;

    const [embed] = await this.db('content_media_embeds')
      .where({ id: embedId })
      .update(updateData)
      .returning('*');

    return this.formatEmbed(embed);
  }

  /**
   * Delete media embed
   */
  async deleteMediaEmbed(embedId: string): Promise<void> {
    await this.db('content_media_embeds')
      .where({ id: embedId })
      .delete();
  }

  // ========== External Embed Support ==========

  /**
   * Parse external URL for embedding
   */
  parseExternalUrl(url: string): {
    provider: string;
    type: MediaType;
    embedUrl: string;
    thumbnailUrl?: string;
  } | null {
    // YouTube
    const youtubeMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (youtubeMatch) {
      return {
        provider: 'youtube',
        type: 'video',
        embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}`,
        thumbnailUrl: `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`,
      };
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return {
        provider: 'vimeo',
        type: 'video',
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      };
    }

    // SoundCloud
    if (url.includes('soundcloud.com')) {
      return {
        provider: 'soundcloud',
        type: 'audio',
        embedUrl: url,
      };
    }

    // Generic embed
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return {
        provider: 'direct',
        type: 'video',
        embedUrl: url,
      };
    }

    if (url.match(/\.(mp3|wav|ogg)$/i)) {
      return {
        provider: 'direct',
        type: 'audio',
        embedUrl: url,
      };
    }

    if (url.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/i)) {
      return {
        provider: 'direct',
        type: 'image',
        embedUrl: url,
      };
    }

    return null;
  }

  /**
   * Generate embed code for external URL
   */
  generateEmbedCode(
    embedData: { provider: string; type: MediaType; embedUrl: string },
    options: { width?: number; height?: number } = {}
  ): string {
    const { width = 560, height = 315 } = options;

    switch (embedData.provider) {
      case 'youtube':
        return `<iframe width="${width}" height="${height}" src="${embedData.embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;

      case 'vimeo':
        return `<iframe src="${embedData.embedUrl}" width="${width}" height="${height}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;

      case 'direct':
        if (embedData.type === 'video') {
          return `<video width="${width}" height="${height}" controls><source src="${embedData.embedUrl}" type="video/mp4"></video>`;
        } else if (embedData.type === 'audio') {
          return `<audio controls><source src="${embedData.embedUrl}" type="audio/mpeg"></audio>`;
        } else if (embedData.type === 'image') {
          return `<img src="${embedData.embedUrl}" width="${width}" alt="" />`;
        }
        return '';

      default:
        return `<iframe src="${embedData.embedUrl}" width="${width}" height="${height}" frameborder="0"></iframe>`;
    }
  }

  // ========== File Validation ==========

  /**
   * Determine file type from MIME type
   */
  private determineFileType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (
      mimeType.startsWith('application/pdf') ||
      mimeType.startsWith('application/msword') ||
      mimeType.startsWith('application/vnd.') ||
      mimeType.startsWith('text/')
    ) {
      return 'document';
    }
    return 'other';
  }

  /**
   * Validate file size
   */
  private validateFileSize(fileType: FileType, size: number): void {
    const limits = storageConfig.limits;
    let maxSize: number;

    switch (fileType) {
      case 'image':
        maxSize = limits.maxImageSize;
        break;
      case 'video':
        maxSize = limits.maxVideoSize;
        break;
      case 'audio':
        maxSize = limits.maxAudioSize;
        break;
      case 'document':
        maxSize = limits.maxDocumentSize;
        break;
      default:
        maxSize = limits.maxFileSize;
    }

    if (size > maxSize) {
      throw new Error(`File size exceeds maximum allowed (${Math.round(maxSize / 1024 / 1024)}MB)`);
    }
  }

  /**
   * Validate MIME type
   */
  private validateMimeType(fileType: FileType, mimeType: string): void {
    const allowedTypes = storageConfig.allowedTypes;
    let allowed: string[];

    switch (fileType) {
      case 'image':
        allowed = allowedTypes.images;
        break;
      case 'video':
        allowed = allowedTypes.videos;
        break;
      case 'audio':
        allowed = allowedTypes.audio;
        break;
      case 'document':
        allowed = allowedTypes.documents;
        break;
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }

    if (!allowed.includes(mimeType)) {
      throw new Error(`File type not allowed: ${mimeType}`);
    }
  }

  // ========== Storage Operations ==========

  /**
   * Generate storage key for file
   */
  private generateStorageKey(filename: string, userId: string): string {
    const ext = path.extname(filename);
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString('hex');
    return `uploads/${userId}/${timestamp}-${randomId}${ext}`;
  }

  /**
   * Save file to storage
   */
  private async saveToStorage(storageKey: string, buffer: Buffer): Promise<void> {
    if (storageConfig.backend === 'local') {
      const filePath = path.join(storageConfig.uploadDir, storageKey);
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, buffer);
    }
    // For S3/cloud storage, implement accordingly
  }

  /**
   * Get file URL
   */
  getFileUrl(storageKey: string): string {
    if (storageConfig.cdn.enabled && storageConfig.cdn.baseUrl) {
      return `${storageConfig.cdn.baseUrl}/${storageKey}`;
    }
    return `/files/${storageKey}`;
  }

  // ========== Utilities ==========

  /**
   * Format file from database row
   */
  private formatFile(row: any): ContentFile {
    return {
      ...row,
      file_size: Number(row.file_size),
      estimated_bandwidth: row.estimated_bandwidth ? Number(row.estimated_bandwidth) : undefined,
      metadata: row.metadata
        ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata)
        : {},
    };
  }

  /**
   * Format embed from database row
   */
  private formatEmbed(row: any): MediaEmbed {
    return {
      ...row,
      display_settings: row.display_settings
        ? (typeof row.display_settings === 'string' ? JSON.parse(row.display_settings) : row.display_settings)
        : {},
    };
  }
}
