/**
 * Content Handler Factory
 *
 * Factory class for creating appropriate content handlers based on content type.
 * Implements the Factory pattern to abstract handler instantiation.
 */

import { ContentType } from '../../types/content.types';
import { BaseContentHandler } from './base-handler';
import { TextContentHandler } from './text-handler';
import { VideoContentHandler } from './video-handler';
import { AudioContentHandler } from './audio-handler';
import { ImageContentHandler } from './image-handler';
import { DocumentContentHandler } from './document-handler';
import { CodeContentHandler } from './code-handler';
import { InteractiveContentHandler } from './interactive-handler';

// Singleton instances of handlers
const handlers: Map<ContentType, BaseContentHandler> = new Map();

/**
 * Get the appropriate content handler for a given content type
 */
export function getContentHandler(contentType: ContentType): BaseContentHandler {
  // Check cache
  let handler = handlers.get(contentType);
  if (handler) {
    return handler;
  }

  // Create new handler
  switch (contentType) {
    case 'text':
      handler = new TextContentHandler();
      break;
    case 'video':
      handler = new VideoContentHandler();
      break;
    case 'audio':
      handler = new AudioContentHandler();
      break;
    case 'image':
      handler = new ImageContentHandler();
      break;
    case 'document':
      handler = new DocumentContentHandler();
      break;
    case 'code':
      handler = new CodeContentHandler();
      break;
    case 'interactive':
    case 'quiz':
      handler = new InteractiveContentHandler();
      break;
    case 'mixed':
      // Mixed content uses text handler as default
      handler = new TextContentHandler();
      break;
    default:
      handler = new TextContentHandler();
  }

  // Cache for reuse
  handlers.set(contentType, handler);
  return handler;
}

/**
 * Get handler by MIME type
 */
export function getHandlerByMimeType(mimeType: string): BaseContentHandler | null {
  // Check each handler for MIME type support
  const allHandlers: BaseContentHandler[] = [
    new TextContentHandler(),
    new VideoContentHandler(),
    new AudioContentHandler(),
    new ImageContentHandler(),
    new DocumentContentHandler(),
    new CodeContentHandler(),
    new InteractiveContentHandler(),
  ];

  for (const handler of allHandlers) {
    if (handler.isMimeTypeSupported(mimeType)) {
      return handler;
    }
  }

  return null;
}

/**
 * Get all available handlers
 */
export function getAllHandlers(): Map<ContentType, BaseContentHandler> {
  const allTypes: ContentType[] = [
    'text',
    'video',
    'audio',
    'image',
    'document',
    'code',
    'interactive',
    'quiz',
  ];

  for (const type of allTypes) {
    if (!handlers.has(type)) {
      getContentHandler(type);
    }
  }

  return handlers;
}

/**
 * Determine content type from MIME type
 */
export function getContentTypeFromMimeType(mimeType: string): ContentType {
  const mimePrefix = mimeType.split('/')[0];

  switch (mimePrefix) {
    case 'text':
      if (mimeType === 'text/html') return 'text';
      if (mimeType === 'text/markdown') return 'text';
      return 'text';
    case 'video':
      return 'video';
    case 'audio':
      return 'audio';
    case 'image':
      return 'image';
    case 'application':
      if (mimeType.includes('pdf') || mimeType.includes('epub') || mimeType.includes('word') || mimeType.includes('document')) {
        return 'document';
      }
      if (mimeType === 'application/json') {
        // Could be code exercise or interactive element
        return 'interactive';
      }
      return 'document';
    default:
      return 'text';
  }
}

/**
 * Check if a content type supports offline access
 */
export function supportsOffline(contentType: ContentType): boolean {
  const handler = getContentHandler(contentType);
  return handler.supportsOffline;
}

/**
 * Check if a content type can have text alternative
 */
export function supportsTextAlternative(contentType: ContentType): boolean {
  const handler = getContentHandler(contentType);
  return handler.supportsTextAlternative;
}

/**
 * Get required variants for a content type
 */
export function getRequiredVariants(contentType: ContentType): string[] {
  const handler = getContentHandler(contentType);
  return handler.getRequiredVariants();
}

/**
 * ContentHandlerFactory class for dependency injection
 */
export class ContentHandlerFactory {
  private static instance: ContentHandlerFactory;

  private constructor() {}

  static getInstance(): ContentHandlerFactory {
    if (!ContentHandlerFactory.instance) {
      ContentHandlerFactory.instance = new ContentHandlerFactory();
    }
    return ContentHandlerFactory.instance;
  }

  getHandler(contentType: ContentType): BaseContentHandler {
    return getContentHandler(contentType);
  }

  getHandlerByMime(mimeType: string): BaseContentHandler | null {
    return getHandlerByMimeType(mimeType);
  }

  getContentType(mimeType: string): ContentType {
    return getContentTypeFromMimeType(mimeType);
  }

  isOfflineSupported(contentType: ContentType): boolean {
    return supportsOffline(contentType);
  }

  isTextAlternativeSupported(contentType: ContentType): boolean {
    return supportsTextAlternative(contentType);
  }
}
