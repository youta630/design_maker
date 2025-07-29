/**
 * Media processing configuration
 * Image-only configuration for MEDS UI specification generation
 */

export const MEDIA_CONFIG = {
  // File size limits
  FILE_SIZE_LIMITS: {
    IMAGE_MAX: 10 * 1024 * 1024,    // 10MB for images
    GEMINI_INLINE_MAX: 7 * 1024 * 1024   // 7MB (Gemini inline limit)
  },

  // Supported image formats (based on Gemini 2.5 Flash documentation)
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
        'image/gif'       // GIF → PNG (first frame)
      ] as const
    }
  },

  // File extensions mapping
  EXTENSIONS: {
    IMAGES: ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'] as const
  },

  // Processing settings
  PROCESSING: {
    MAX_DIMENSION: 3072       // Maximum image dimension (Gemini limit)
  }
} as const;

// Type definitions for better TypeScript support
export type SupportedImageMime = typeof MEDIA_CONFIG.SUPPORTED_FORMATS.IMAGES.NATIVE[number] | typeof MEDIA_CONFIG.SUPPORTED_FORMATS.IMAGES.CONVERT[number];
export type SupportedExtension = typeof MEDIA_CONFIG.EXTENSIONS.IMAGES[number];

// Helper functions
export function isImageMimeType(mimeType: string): boolean {
  const allImageTypes = [...MEDIA_CONFIG.SUPPORTED_FORMATS.IMAGES.NATIVE, ...MEDIA_CONFIG.SUPPORTED_FORMATS.IMAGES.CONVERT];
  return allImageTypes.includes(mimeType as SupportedImageMime);
}

export function requiresConversion(mimeType: string): boolean {
  return MEDIA_CONFIG.SUPPORTED_FORMATS.IMAGES.CONVERT.includes(mimeType as typeof MEDIA_CONFIG.SUPPORTED_FORMATS.IMAGES.CONVERT[number]);
}

export function isNativelySupported(mimeType: string): boolean {
  return MEDIA_CONFIG.SUPPORTED_FORMATS.IMAGES.NATIVE.includes(mimeType as typeof MEDIA_CONFIG.SUPPORTED_FORMATS.IMAGES.NATIVE[number]);
}