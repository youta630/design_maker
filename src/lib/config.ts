/**
 * Media processing configuration
 * Centralized configuration for file formats, size limits, and processing settings
 */

export const MEDIA_CONFIG = {
  // File size limits
  FILE_SIZE_LIMITS: {
    IMAGE_MAX: 10 * 1024 * 1024,    // 10MB for images
    VIDEO_MAX: 50 * 1024 * 1024,    // 50MB for videos
    GEMINI_INLINE_MAX: 20 * 1024 * 1024  // 20MB (Files API threshold)
  },

  // Supported file formats (based on official Gemini 2.5 Flash documentation)
  SUPPORTED_FORMATS: {
    IMAGES: {
      // Natively supported by Gemini
      NATIVE: [
        'image/png',
        'image/jpeg', 
        'image/webp'
      ] as const,
      // Require conversion to supported format
      CONVERT: [
        'image/svg+xml',  // SVG → PNG
        'image/gif'       // GIF → PNG (first frame) or MP4
      ] as const
    },
    VIDEOS: {
      // Natively supported by Gemini
      NATIVE: [
        'video/mp4',
        'video/webm',
        'video/quicktime',  // .mov
        'video/mpeg',
        'video/3gpp',
        'video/x-flv'
      ] as const,
      // Not supported - show error or convert
      UNSUPPORTED: [
        'video/avi',        // Often contains unsupported codecs
        'video/wmv',        // Windows-specific format
        'video/x-msvideo'   // Legacy AVI MIME
      ] as const
    }
  },

  // File extensions mapping
  EXTENSIONS: {
    IMAGES: ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'] as const,
    VIDEOS: ['.mp4', '.mov', '.webm', '.mpeg', '.3gp', '.flv'] as const
  },

  // Processing settings
  PROCESSING: {
    MAX_WAIT_TIME: 60000,     // 60 seconds for Files API processing
    MAX_RETRIES: 8,           // Maximum retry attempts
    BACKOFF_BASE: 1000,       // Base delay for exponential backoff (ms)
    MAX_DIMENSION: 3072       // Maximum image dimension (Gemini limit)
  }
} as const;

// Type definitions for better TypeScript support
export type SupportedImageMime = typeof MEDIA_CONFIG.SUPPORTED_FORMATS.IMAGES.NATIVE[number] | typeof MEDIA_CONFIG.SUPPORTED_FORMATS.IMAGES.CONVERT[number];
export type SupportedVideoMime = typeof MEDIA_CONFIG.SUPPORTED_FORMATS.VIDEOS.NATIVE[number];
export type SupportedExtension = typeof MEDIA_CONFIG.EXTENSIONS.IMAGES[number] | typeof MEDIA_CONFIG.EXTENSIONS.VIDEOS[number];

// Helper functions
export function isImageMimeType(mimeType: string): boolean {
  const allImageTypes = [...MEDIA_CONFIG.SUPPORTED_FORMATS.IMAGES.NATIVE, ...MEDIA_CONFIG.SUPPORTED_FORMATS.IMAGES.CONVERT];
  return allImageTypes.includes(mimeType as SupportedImageMime);
}

export function isVideoMimeType(mimeType: string): boolean {
  return MEDIA_CONFIG.SUPPORTED_FORMATS.VIDEOS.NATIVE.includes(mimeType as SupportedVideoMime);
}

export function requiresConversion(mimeType: string): boolean {
  return MEDIA_CONFIG.SUPPORTED_FORMATS.IMAGES.CONVERT.includes(mimeType as typeof MEDIA_CONFIG.SUPPORTED_FORMATS.IMAGES.CONVERT[number]);
}

export function isNativelySupported(mimeType: string): boolean {
  const allNativeTypes = [...MEDIA_CONFIG.SUPPORTED_FORMATS.IMAGES.NATIVE, ...MEDIA_CONFIG.SUPPORTED_FORMATS.VIDEOS.NATIVE];
  return allNativeTypes.includes(mimeType as (typeof MEDIA_CONFIG.SUPPORTED_FORMATS.IMAGES.NATIVE[number] | typeof MEDIA_CONFIG.SUPPORTED_FORMATS.VIDEOS.NATIVE[number]));
}