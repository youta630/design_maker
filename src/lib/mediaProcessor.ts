import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import { MEDIA_CONFIG, isImageMimeType } from './config';

/**
 * Process image for Google Gemini 2.5 Flash optimization
 * - Resize to max 3072px (Gemini limit)
 * - Convert to supported formats (PNG/JPEG/WebP)
 * - Optimize for better recognition
 */
export async function processImage(buffer: Buffer, originalMimeType: string): Promise<ProcessedMedia> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    let processedImage = image;
    
    // Resize if image is too large (max 3072px on longest side)
    if (metadata.width && metadata.height) {
      const maxDimension = Math.max(metadata.width, metadata.height);
      if (maxDimension > 3072) {
        const ratio = 3072 / maxDimension;
        const newWidth = Math.round(metadata.width * ratio);
        const newHeight = Math.round(metadata.height * ratio);
        
        processedImage = processedImage.resize(newWidth, newHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }
    }
    
    // Convert to optimal format
    let outputMimeType = originalMimeType;
    let outputBuffer: Buffer;
    
    // For screenshots/UI designs, prefer PNG for lossless quality
    if (originalMimeType === 'image/png' || originalMimeType === 'image/gif') {
      outputBuffer = await processedImage.png({ quality: 95, compressionLevel: 6 }).toBuffer();
      outputMimeType = 'image/png';
    } 
    // For photos, use JPEG with high quality
    else if (originalMimeType === 'image/jpeg' || originalMimeType === 'image/jpg') {
      outputBuffer = await processedImage.jpeg({ quality: 95, progressive: true }).toBuffer();
      outputMimeType = 'image/jpeg';
    }
    // For WebP, maintain format
    else if (originalMimeType === 'image/webp') {
      outputBuffer = await processedImage.webp({ quality: 95 }).toBuffer();
      outputMimeType = 'image/webp';
    }
    // Default fallback to JPEG
    else {
      outputBuffer = await processedImage.jpeg({ quality: 95, progressive: true }).toBuffer();
      outputMimeType = 'image/jpeg';
    }
    
    // Enforce Gemini maximum inline image size
    if (outputBuffer.byteLength > 7 * 1024 * 1024) { // 7 MB
      throw new Error('Processed image exceeds Gemini maximum file size (7 MB)');
    }
    
    const finalMetadata = await sharp(outputBuffer).metadata();
    
    return {
      buffer: outputBuffer,
      mimeType: outputMimeType,
      width: finalMetadata.width,
      height: finalMetadata.height
    };
    
  } catch (error) {
    console.error('Image processing error:', error);
    throw new Error('Failed to process image');
  }
}

/**
 * Enhanced validation result interface
 */
interface ValidationResult {
  isValid: boolean;
  error?: string;
  detectedMime?: string;
  requiresConversion?: boolean;
}

/**
 * Validate file with magic number detection and enhanced security
 */
export async function validateMediaFileSecure(file: File): Promise<ValidationResult> {
  try {
    // Read file header for magic number detection
    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = await fileTypeFromBuffer(buffer.subarray(0, 4100));
    
    // Handle empty MIME type (common with some browsers/extensions)
    const declaredMime = file.type || 'application/octet-stream';
    const actualMime = detected?.mime || declaredMime;
    
    // Security check: Detect MIME type spoofing
    if (detected && detected.mime !== declaredMime && declaredMime !== 'application/octet-stream') {
      return {
        isValid: false,
        error: `File type mismatch: declared ${declaredMime}, detected ${detected.mime}`,
        detectedMime: detected.mime
      };
    }
    
    // Check if format is supported
    const isImage = isImageMimeType(actualMime);
    
    if (!isImage) {
      return {
        isValid: false,
        error: 'Unsupported file type. Please upload PNG, JPEG, WebP, GIF, SVG files.',
        detectedMime: actualMime
      };
    }
    
    // File size validation
    if (isImage && file.size > MEDIA_CONFIG.FILE_SIZE_LIMITS.IMAGE_MAX) {
      return {
        isValid: false,
        error: 'Image too large. Please use an image smaller than 10MB.',
        detectedMime: actualMime
      };
    }
    
    return {
      isValid: true,
      detectedMime: actualMime,
      requiresConversion: false
    };
    
  } catch (error) {
    console.error('File validation error:', error);
    return {
      isValid: false,
      error: 'Failed to validate file. Please try again.',
    };
  }
}

/**
 * Legacy validation function for backward compatibility
 * @deprecated Use validateMediaFileSecure instead
 */
export function validateMediaFile(file: File): { isValid: boolean; error?: string } {
  // Simple validation for existing code compatibility
  if (file.type.startsWith('image/')) {
    if (file.size > MEDIA_CONFIG.FILE_SIZE_LIMITS.IMAGE_MAX) {
      return { isValid: false, error: 'Image too large. Please use an image smaller than 10MB.' };
    }
  }
  
  return { isValid: true };
}

// Alias for backward compatibility
export const processMedia = processImage;

interface ProcessedMedia {
  buffer: Buffer;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
}