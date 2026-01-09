import { z } from 'zod';

/**
 * Storage and CDN Configuration
 *
 * Manages file storage, CDN, and content delivery settings
 * according to mobile/spec.md requirements
 */

// Storage backend types
export type StorageBackend = 'local' | 's3' | 'gcs' | 'azure';

// CDN providers
export type CDNProvider = 'none' | 'cloudflare' | 'cloudfront' | 'fastly' | 'custom';

// Content quality levels for bandwidth optimization
export type QualityLevel = 'ultra_low' | 'low' | 'medium' | 'high' | 'original';

// Network type for content optimization
export type NetworkType = '2g' | '3g' | '4g' | '5g' | 'wifi';

// Storage configuration schema
const storageConfigSchema = z.object({
  // Storage backend
  backend: z.enum(['local', 's3', 'gcs', 'azure']).default('local'),

  // Local storage settings
  uploadDir: z.string().default('./uploads'),
  tempDir: z.string().default('./tmp'),

  // S3/Object storage settings
  s3: z.object({
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    region: z.string().default('us-east-1'),
    bucket: z.string().optional(),
    endpoint: z.string().optional(), // For S3-compatible services
  }).optional(),

  // CDN settings
  cdn: z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(['none', 'cloudflare', 'cloudfront', 'fastly', 'custom']).default('none'),
    baseUrl: z.string().url().optional(),
    cacheTTL: z.number().default(86400), // 24 hours
    distributionId: z.string().optional(),
  }),

  // File size limits (in bytes)
  limits: z.object({
    maxFileSize: z.number().default(10 * 1024 * 1024), // 10MB
    maxImageSize: z.number().default(5 * 1024 * 1024), // 5MB
    maxVideoSize: z.number().default(100 * 1024 * 1024), // 100MB
    maxAudioSize: z.number().default(50 * 1024 * 1024), // 50MB
    maxDocumentSize: z.number().default(10 * 1024 * 1024), // 10MB
  }),

  // Allowed MIME types
  allowedTypes: z.object({
    images: z.array(z.string()).default([
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/avif',
      'image/svg+xml'
    ]),
    videos: z.array(z.string()).default([
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime'
    ]),
    audio: z.array(z.string()).default([
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/webm'
    ]),
    documents: z.array(z.string()).default([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/markdown'
    ]),
  }),

  // Image processing settings
  imageProcessing: z.object({
    generateWebP: z.boolean().default(true),
    generateAVIF: z.boolean().default(true),
    generateThumbnails: z.boolean().default(true),
    thumbnailSizes: z.array(z.number()).default([150, 300, 600]),
    quality: z.object({
      ultra_low: z.number().default(30),
      low: z.number().default(50),
      medium: z.number().default(70),
      high: z.number().default(90),
    }),
  }),

  // Video processing settings
  videoProcessing: z.object({
    enabled: z.boolean().default(true),
    generateThumbnail: z.boolean().default(true),
    adaptiveBitrate: z.boolean().default(true),
    qualities: z.array(z.string()).default(['360p', '480p', '720p']),
    extractAudio: z.boolean().default(true), // For audio-only mode
  }),

  // Bandwidth optimization
  bandwidth: z.object({
    enableCompression: z.boolean().default(true),
    enableProgressiveDownload: z.boolean().default(true),
    enableDeltaSync: z.boolean().default(true),
    networkPresets: z.object({
      '2g': z.object({
        maxBandwidth: z.number().default(50 * 1024), // 50KB/s
        preferredQuality: z.string().default('ultra_low'),
      }),
      '3g': z.object({
        maxBandwidth: z.number().default(200 * 1024), // 200KB/s
        preferredQuality: z.string().default('low'),
      }),
      '4g': z.object({
        maxBandwidth: z.number().default(2 * 1024 * 1024), // 2MB/s
        preferredQuality: z.string().default('medium'),
      }),
      '5g': z.object({
        maxBandwidth: z.number().default(10 * 1024 * 1024), // 10MB/s
        preferredQuality: z.string().default('high'),
      }),
      wifi: z.object({
        maxBandwidth: z.number().default(10 * 1024 * 1024), // 10MB/s
        preferredQuality: z.string().default('high'),
      }),
    }),
  }),

  // Cache settings
  cache: z.object({
    enableEdgeCaching: z.boolean().default(true),
    enableRegionalCaching: z.boolean().default(true),
    staticAssetTTL: z.number().default(31536000), // 1 year
    dynamicContentTTL: z.number().default(3600), // 1 hour
    preWarmPopularContent: z.boolean().default(true),
  }),
});

// Parse storage configuration from environment
export const storageConfig = storageConfigSchema.parse({
  backend: (process.env.STORAGE_BACKEND as StorageBackend) || 'local',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  tempDir: process.env.TEMP_DIR || './tmp',

  s3: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    region: process.env.S3_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET,
    endpoint: process.env.S3_ENDPOINT,
  },

  cdn: {
    enabled: process.env.CDN_ENABLED === 'true',
    provider: (process.env.CDN_PROVIDER as CDNProvider) || 'none',
    baseUrl: process.env.CDN_BASE_URL,
    cacheTTL: process.env.CDN_CACHE_TTL ? parseInt(process.env.CDN_CACHE_TTL) : 86400,
    distributionId: process.env.CDN_DISTRIBUTION_ID,
  },

  limits: {
    maxFileSize: process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE) : 10 * 1024 * 1024,
    maxImageSize: process.env.MAX_IMAGE_SIZE ? parseInt(process.env.MAX_IMAGE_SIZE) : 5 * 1024 * 1024,
    maxVideoSize: process.env.MAX_VIDEO_SIZE ? parseInt(process.env.MAX_VIDEO_SIZE) : 100 * 1024 * 1024,
    maxAudioSize: process.env.MAX_AUDIO_SIZE ? parseInt(process.env.MAX_AUDIO_SIZE) : 50 * 1024 * 1024,
    maxDocumentSize: process.env.MAX_DOCUMENT_SIZE ? parseInt(process.env.MAX_DOCUMENT_SIZE) : 10 * 1024 * 1024,
  },

  allowedTypes: {},
  imageProcessing: {},
  videoProcessing: {},
  bandwidth: {
    networkPresets: {},
  },
  cache: {},
});

export type StorageConfig = z.infer<typeof storageConfigSchema>;
