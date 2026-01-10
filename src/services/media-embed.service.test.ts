/**
 * Media Embed Service Tests
 *
 * Tests for media upload and embedding capabilities:
 * - File upload and validation
 * - File management (CRUD)
 * - Media embed management
 * - External URL parsing
 * - Embed code generation
 */

import { MediaEmbedService } from './media-embed.service';
import { getDatabase } from '../database';
import { storageConfig } from '../config/storage';
import crypto from 'crypto';
import fs from 'fs/promises';

jest.mock('../database', () => ({
  getDatabase: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../config/storage', () => ({
  storageConfig: {
    backend: 'local',
    uploadDir: '/tmp/uploads',
    cdn: {
      enabled: false,
      baseUrl: '',
    },
    limits: {
      maxFileSize: 50 * 1024 * 1024,
      maxImageSize: 10 * 1024 * 1024,
      maxVideoSize: 100 * 1024 * 1024,
      maxAudioSize: 50 * 1024 * 1024,
      maxDocumentSize: 20 * 1024 * 1024,
    },
    allowedTypes: {
      images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      videos: ['video/mp4', 'video/webm'],
      audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
      documents: ['application/pdf', 'application/msword'],
    },
  },
}));

describe('MediaEmbedService', () => {
  let service: MediaEmbedService;
  let mockDb: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueryBuilder = {
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereNull: jest.fn().mockReturnThis(),
      first: jest.fn(),
      returning: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
    };

    mockDb = jest.fn(() => mockQueryBuilder);
    mockDb.fn = { now: jest.fn().mockReturnValue('NOW()') };

    (getDatabase as jest.Mock).mockReturnValue(mockDb);

    service = new MediaEmbedService();
  });

  describe('File Upload', () => {
    const mockFileRow = {
      id: 'file-123',
      original_filename: 'test.jpg',
      storage_key: 'uploads/user-123/123456-abc123.jpg',
      mime_type: 'image/jpeg',
      file_size: 1024,
      file_hash: 'sha256hash',
      file_type: 'image',
      uploaded_by: 'user-123',
      community_id: null,
      content_context: 'resource',
      cdn_url: null,
      is_public: false,
      processing_status: 'pending',
      metadata: '{}',
      created_at: new Date(),
      updated_at: new Date(),
    };

    describe('uploadFile', () => {
      it('should upload a new image file', async () => {
        mockQueryBuilder.first.mockResolvedValue(null); // No duplicate
        mockQueryBuilder.returning.mockResolvedValue([mockFileRow]);

        const buffer = Buffer.from('test image data');
        const result = await service.uploadFile('user-123', {
          filename: 'test.jpg',
          mime_type: 'image/jpeg',
          file_size: 1024,
          buffer,
        });

        expect(mockDb).toHaveBeenCalledWith('content_files');
        expect(result.id).toBe('file-123');
        expect(result.file_type).toBe('image');
        expect(fs.mkdir).toHaveBeenCalled();
        expect(fs.writeFile).toHaveBeenCalled();
      });

      it('should return existing file for duplicate hash', async () => {
        mockQueryBuilder.first.mockResolvedValue(mockFileRow);

        const buffer = Buffer.from('test image data');
        const result = await service.uploadFile('user-123', {
          filename: 'test.jpg',
          mime_type: 'image/jpeg',
          file_size: 1024,
          buffer,
        });

        expect(result.id).toBe('file-123');
        expect(mockQueryBuilder.insert).not.toHaveBeenCalled();
      });

      it('should reject oversized image file', async () => {
        const buffer = Buffer.alloc(20 * 1024 * 1024); // 20MB - exceeds 10MB limit

        await expect(service.uploadFile('user-123', {
          filename: 'large.jpg',
          mime_type: 'image/jpeg',
          file_size: 20 * 1024 * 1024,
          buffer,
        })).rejects.toThrow('File size exceeds maximum allowed');
      });

      it('should reject disallowed MIME type', async () => {
        const buffer = Buffer.from('test data');

        await expect(service.uploadFile('user-123', {
          filename: 'test.exe',
          mime_type: 'application/x-msdownload',
          file_size: 1024,
          buffer,
        })).rejects.toThrow('Unsupported file type');
      });

      it('should upload video file', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockFileRow,
          original_filename: 'test.mp4',
          mime_type: 'video/mp4',
          file_type: 'video',
        }]);

        const buffer = Buffer.from('test video data');
        const result = await service.uploadFile('user-123', {
          filename: 'test.mp4',
          mime_type: 'video/mp4',
          file_size: 1024,
          buffer,
        });

        expect(result.file_type).toBe('video');
      });

      it('should upload audio file', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockFileRow,
          original_filename: 'test.mp3',
          mime_type: 'audio/mpeg',
          file_type: 'audio',
        }]);

        const buffer = Buffer.from('test audio data');
        const result = await service.uploadFile('user-123', {
          filename: 'test.mp3',
          mime_type: 'audio/mpeg',
          file_size: 1024,
          buffer,
        });

        expect(result.file_type).toBe('audio');
      });

      it('should upload document file', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockFileRow,
          original_filename: 'test.pdf',
          mime_type: 'application/pdf',
          file_type: 'document',
        }]);

        const buffer = Buffer.from('test pdf data');
        const result = await service.uploadFile('user-123', {
          filename: 'test.pdf',
          mime_type: 'application/pdf',
          file_size: 1024,
          buffer,
        });

        expect(result.file_type).toBe('document');
      });
    });

    describe('getFileById', () => {
      it('should return file by ID', async () => {
        mockQueryBuilder.first.mockResolvedValue(mockFileRow);

        const result = await service.getFileById('file-123');

        expect(result).not.toBeNull();
        expect(result?.id).toBe('file-123');
      });

      it('should return null for non-existent file', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);

        const result = await service.getFileById('non-existent');

        expect(result).toBeNull();
      });

      it('should not return archived files', async () => {
        mockQueryBuilder.first.mockResolvedValue(null); // archived files filtered out

        const result = await service.getFileById('archived-file');

        expect(result).toBeNull();
        expect(mockQueryBuilder.whereNull).toHaveBeenCalledWith('archived_at');
      });
    });

    describe('getUserFiles', () => {
      it('should return user files with pagination', async () => {
        mockQueryBuilder.count.mockResolvedValue([{ count: '15' }]);
        mockQueryBuilder.orderBy.mockResolvedValue([mockFileRow]);
        mockQueryBuilder.clone.mockReturnThis();

        const result = await service.getUserFiles('user-123', {
          limit: 10,
          offset: 0,
        });

        expect(result.total).toBe(15);
        expect(result.files).toHaveLength(1);
      });

      it('should filter by file type', async () => {
        mockQueryBuilder.count.mockResolvedValue([{ count: '5' }]);
        mockQueryBuilder.orderBy.mockResolvedValue([mockFileRow]);
        mockQueryBuilder.clone.mockReturnThis();

        const result = await service.getUserFiles('user-123', {
          file_type: 'image',
        });

        expect(mockQueryBuilder.where).toHaveBeenCalled();
        expect(result.total).toBe(5);
      });

      it('should filter by community', async () => {
        mockQueryBuilder.count.mockResolvedValue([{ count: '3' }]);
        mockQueryBuilder.orderBy.mockResolvedValue([]);
        mockQueryBuilder.clone.mockReturnThis();

        await service.getUserFiles('user-123', {
          community_id: 'comm-123',
        });

        expect(mockQueryBuilder.where).toHaveBeenCalled();
      });
    });

    describe('updateFile', () => {
      it('should update file metadata', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockFileRow,
          alt_text: 'Updated alt text',
          description: 'New description',
        }]);

        const result = await service.updateFile('file-123', {
          alt_text: 'Updated alt text',
          description: 'New description',
        });

        expect(result.alt_text).toBe('Updated alt text');
        expect(mockQueryBuilder.update).toHaveBeenCalled();
      });

      it('should update transcript', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockFileRow,
          transcript: 'Full transcript of audio',
        }]);

        const result = await service.updateFile('file-123', {
          transcript: 'Full transcript of audio',
        });

        expect(result.transcript).toBe('Full transcript of audio');
      });

      it('should update public status', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockFileRow,
          is_public: true,
        }]);

        const result = await service.updateFile('file-123', {
          is_public: true,
        });

        expect(result.is_public).toBe(true);
      });
    });

    describe('deleteFile', () => {
      it('should archive file instead of deleting', async () => {
        mockQueryBuilder.update.mockResolvedValue(1);

        await service.deleteFile('file-123');

        expect(mockQueryBuilder.update).toHaveBeenCalledWith(
          expect.objectContaining({
            processing_status: 'archived',
          })
        );
      });
    });

    describe('markProcessingComplete', () => {
      it('should mark file as ready', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockFileRow,
          processing_status: 'ready',
        }]);

        const result = await service.markProcessingComplete('file-123');

        expect(result.processing_status).toBe('ready');
      });

      it('should update metadata on completion', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockFileRow,
          processing_status: 'ready',
          metadata: JSON.stringify({ width: 1920, height: 1080 }),
        }]);

        const result = await service.markProcessingComplete('file-123', {
          width: 1920,
          height: 1080,
        });

        expect(result.metadata).toEqual({ width: 1920, height: 1080 });
      });
    });

    describe('markProcessingFailed', () => {
      it('should mark file as failed with error', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockFileRow,
          processing_status: 'failed',
          processing_error: 'Invalid file format',
        }]);

        const result = await service.markProcessingFailed('file-123', 'Invalid file format');

        expect(result.processing_status).toBe('failed');
        expect(result.processing_error).toBe('Invalid file format');
      });
    });
  });

  describe('Media Embed Management', () => {
    const mockEmbedRow = {
      id: 'embed-123',
      draft_id: 'draft-123',
      block_id: 'block-123',
      file_id: 'file-123',
      media_type: 'image',
      external_url: null,
      embed_code: null,
      display_settings: '{}',
      alignment: 'center',
      is_inline: false,
      alt_text: 'Test image',
      caption: 'Image caption',
      transcript: null,
      has_captions: false,
      text_fallback: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    describe('createMediaEmbed', () => {
      it('should create a media embed for internal file', async () => {
        mockQueryBuilder.returning.mockResolvedValue([mockEmbedRow]);

        const result = await service.createMediaEmbed({
          draft_id: 'draft-123',
          block_id: 'block-123',
          file_id: 'file-123',
          media_type: 'image',
          alt_text: 'Test image',
        });

        expect(mockDb).toHaveBeenCalledWith('content_media_embeds');
        expect(result.id).toBe('embed-123');
        expect(result.alignment).toBe('center');
      });

      it('should create a media embed for external URL', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockEmbedRow,
          file_id: null,
          external_url: 'https://youtube.com/watch?v=abc123',
          media_type: 'video',
        }]);

        const result = await service.createMediaEmbed({
          draft_id: 'draft-123',
          media_type: 'video',
          external_url: 'https://youtube.com/watch?v=abc123',
        });

        expect(result.external_url).toBe('https://youtube.com/watch?v=abc123');
      });

      it('should set custom alignment', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockEmbedRow,
          alignment: 'left',
        }]);

        const result = await service.createMediaEmbed({
          draft_id: 'draft-123',
          media_type: 'image',
          file_id: 'file-123',
          alignment: 'left',
        });

        expect(result.alignment).toBe('left');
      });

      it('should create inline embed', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockEmbedRow,
          is_inline: true,
        }]);

        const result = await service.createMediaEmbed({
          draft_id: 'draft-123',
          media_type: 'image',
          file_id: 'file-123',
          is_inline: true,
        });

        expect(result.is_inline).toBe(true);
      });
    });

    describe('getMediaEmbed', () => {
      it('should return embed by ID', async () => {
        mockQueryBuilder.first.mockResolvedValue(mockEmbedRow);

        const result = await service.getMediaEmbed('embed-123');

        expect(result).not.toBeNull();
        expect(result?.id).toBe('embed-123');
      });

      it('should return null for non-existent embed', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);

        const result = await service.getMediaEmbed('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('getDraftEmbeds', () => {
      it('should return all embeds for a draft', async () => {
        mockQueryBuilder.orderBy.mockResolvedValue([
          mockEmbedRow,
          { ...mockEmbedRow, id: 'embed-456', media_type: 'video' },
        ]);

        const result = await service.getDraftEmbeds('draft-123');

        expect(result).toHaveLength(2);
      });
    });

    describe('updateMediaEmbed', () => {
      it('should update embed alignment', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockEmbedRow,
          alignment: 'right',
        }]);

        const result = await service.updateMediaEmbed('embed-123', {
          alignment: 'right',
        });

        expect(result.alignment).toBe('right');
      });

      it('should update accessibility metadata', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockEmbedRow,
          alt_text: 'Updated alt',
          caption: 'Updated caption',
          transcript: 'Video transcript',
        }]);

        const result = await service.updateMediaEmbed('embed-123', {
          alt_text: 'Updated alt',
          caption: 'Updated caption',
          transcript: 'Video transcript',
        });

        expect(result.alt_text).toBe('Updated alt');
        expect(result.transcript).toBe('Video transcript');
      });

      it('should update caption settings', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockEmbedRow,
          has_captions: true,
          caption_file_url: '/captions/video.vtt',
        }]);

        const result = await service.updateMediaEmbed('embed-123', {
          has_captions: true,
          caption_file_url: '/captions/video.vtt',
        });

        expect(result.has_captions).toBe(true);
        expect(result.caption_file_url).toBe('/captions/video.vtt');
      });

      it('should update text fallback', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockEmbedRow,
          text_fallback: 'Text description for low bandwidth',
        }]);

        const result = await service.updateMediaEmbed('embed-123', {
          text_fallback: 'Text description for low bandwidth',
        });

        expect(result.text_fallback).toBe('Text description for low bandwidth');
      });
    });

    describe('deleteMediaEmbed', () => {
      it('should delete media embed', async () => {
        mockQueryBuilder.delete.mockResolvedValue(1);

        await service.deleteMediaEmbed('embed-123');

        expect(mockDb).toHaveBeenCalledWith('content_media_embeds');
        expect(mockQueryBuilder.delete).toHaveBeenCalled();
      });
    });
  });

  describe('External URL Parsing', () => {
    describe('parseExternalUrl', () => {
      it('should parse YouTube watch URL', () => {
        const result = service.parseExternalUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

        expect(result).not.toBeNull();
        expect(result?.provider).toBe('youtube');
        expect(result?.type).toBe('video');
        expect(result?.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
        expect(result?.thumbnailUrl).toContain('dQw4w9WgXcQ');
      });

      it('should parse YouTube short URL', () => {
        const result = service.parseExternalUrl('https://youtu.be/dQw4w9WgXcQ');

        expect(result).not.toBeNull();
        expect(result?.provider).toBe('youtube');
      });

      it('should parse YouTube embed URL', () => {
        const result = service.parseExternalUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');

        expect(result).not.toBeNull();
        expect(result?.provider).toBe('youtube');
      });

      it('should parse Vimeo URL', () => {
        const result = service.parseExternalUrl('https://vimeo.com/123456789');

        expect(result).not.toBeNull();
        expect(result?.provider).toBe('vimeo');
        expect(result?.type).toBe('video');
        expect(result?.embedUrl).toBe('https://player.vimeo.com/video/123456789');
      });

      it('should parse SoundCloud URL', () => {
        const result = service.parseExternalUrl('https://soundcloud.com/artist/track');

        expect(result).not.toBeNull();
        expect(result?.provider).toBe('soundcloud');
        expect(result?.type).toBe('audio');
      });

      it('should parse direct video URL', () => {
        const result = service.parseExternalUrl('https://example.com/video.mp4');

        expect(result).not.toBeNull();
        expect(result?.provider).toBe('direct');
        expect(result?.type).toBe('video');
      });

      it('should parse direct audio URL', () => {
        const result = service.parseExternalUrl('https://example.com/audio.mp3');

        expect(result).not.toBeNull();
        expect(result?.provider).toBe('direct');
        expect(result?.type).toBe('audio');
      });

      it('should parse direct image URL', () => {
        const result = service.parseExternalUrl('https://example.com/image.jpg');

        expect(result).not.toBeNull();
        expect(result?.provider).toBe('direct');
        expect(result?.type).toBe('image');
      });

      it('should return null for unknown URL', () => {
        const result = service.parseExternalUrl('https://example.com/page');

        expect(result).toBeNull();
      });
    });
  });

  describe('Embed Code Generation', () => {
    describe('generateEmbedCode', () => {
      it('should generate YouTube embed code', () => {
        const embedData = {
          provider: 'youtube',
          type: 'video' as const,
          embedUrl: 'https://www.youtube.com/embed/abc123',
        };

        const code = service.generateEmbedCode(embedData);

        expect(code).toContain('<iframe');
        expect(code).toContain('https://www.youtube.com/embed/abc123');
        expect(code).toContain('allowfullscreen');
      });

      it('should generate Vimeo embed code', () => {
        const embedData = {
          provider: 'vimeo',
          type: 'video' as const,
          embedUrl: 'https://player.vimeo.com/video/123456',
        };

        const code = service.generateEmbedCode(embedData);

        expect(code).toContain('<iframe');
        expect(code).toContain('https://player.vimeo.com/video/123456');
      });

      it('should generate direct video embed code', () => {
        const embedData = {
          provider: 'direct',
          type: 'video' as const,
          embedUrl: 'https://example.com/video.mp4',
        };

        const code = service.generateEmbedCode(embedData);

        expect(code).toContain('<video');
        expect(code).toContain('controls');
        expect(code).toContain('https://example.com/video.mp4');
      });

      it('should generate direct audio embed code', () => {
        const embedData = {
          provider: 'direct',
          type: 'audio' as const,
          embedUrl: 'https://example.com/audio.mp3',
        };

        const code = service.generateEmbedCode(embedData);

        expect(code).toContain('<audio');
        expect(code).toContain('controls');
      });

      it('should generate direct image embed code', () => {
        const embedData = {
          provider: 'direct',
          type: 'image' as const,
          embedUrl: 'https://example.com/image.jpg',
        };

        const code = service.generateEmbedCode(embedData);

        expect(code).toContain('<img');
        expect(code).toContain('https://example.com/image.jpg');
      });

      it('should use custom dimensions', () => {
        const embedData = {
          provider: 'youtube',
          type: 'video' as const,
          embedUrl: 'https://www.youtube.com/embed/abc123',
        };

        const code = service.generateEmbedCode(embedData, {
          width: 800,
          height: 450,
        });

        expect(code).toContain('width="800"');
        expect(code).toContain('height="450"');
      });
    });
  });

  describe('File URL Generation', () => {
    describe('getFileUrl', () => {
      it('should return local file URL when CDN disabled', () => {
        const url = service.getFileUrl('uploads/user-123/file.jpg');

        expect(url).toBe('/files/uploads/user-123/file.jpg');
      });
    });
  });
});
