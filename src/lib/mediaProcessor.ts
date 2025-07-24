import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';

// Set FFmpeg and FFprobe paths with absolute path resolution
if (ffmpegStatic) {
  let ffmpegPath = ffmpegStatic;
  
  // Handle various path formats that ffmpeg-static might return
  if (ffmpegPath.includes('/ROOT/')) {
    // Replace /ROOT/ with actual project root
    ffmpegPath = ffmpegPath.replace('/ROOT/', process.cwd() + '/');
  }
  
  // Ensure we have an absolute path
  const absoluteFfmpegPath = path.isAbsolute(ffmpegPath) ? ffmpegPath : path.resolve(ffmpegPath);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Setting FFmpeg path:', { 
      original: ffmpegStatic, 
      processed: ffmpegPath,
      resolved: absoluteFfmpegPath 
    });
  }
  
  ffmpeg.setFfmpegPath(absoluteFfmpegPath);
} else {
  console.error('ffmpeg-static not found');
}

// Set FFprobe path with same path resolution logic
if (ffprobeStatic && ffprobeStatic.path) {
  let ffprobePath = ffprobeStatic.path;
  
  // Handle various path formats that ffprobe-static might return
  if (ffprobePath.includes('/ROOT/')) {
    // Replace /ROOT/ with actual project root
    ffprobePath = ffprobePath.replace('/ROOT/', process.cwd() + '/');
  }
  
  // Ensure we have an absolute path
  const absoluteFfprobePath = path.isAbsolute(ffprobePath) ? ffprobePath : path.resolve(ffprobePath);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Setting FFprobe path:', { 
      original: ffprobeStatic.path, 
      processed: ffprobePath,
      resolved: absoluteFfprobePath 
    });
  }
  
  ffmpeg.setFfprobePath(absoluteFfprobePath);
} else {
  console.error('ffprobe-static not found');
}

interface ProcessedMedia {
  buffer: Buffer;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
}

/**
 * Process image for Gemini 2.5 Flash optimization
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
 * Process video for Gemini 2.5 Flash optimization
 * - Convert to MP4 (H.264) for compatibility
 * - Resize to 1080p max for efficiency
 * - Optimize for content recognition
 */
export async function processVideo(buffer: Buffer, _originalMimeType: string): Promise<ProcessedMedia> {
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `input_${Date.now()}.tmp`);
  const outputPath = path.join(tempDir, `output_${Date.now()}.mp4`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Video processing paths:', {
      tempDir,
      inputPath,
      outputPath,
      ffmpegPath: ffmpegStatic
    });
  }
  
  try {
    // Write input buffer to temp file
    await fs.writeFile(inputPath, buffer);
    
    return new Promise((resolve, reject) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Starting ffmpeg processing...');
      }
      const command = ffmpeg(inputPath)
        .outputOptions([
          '-c:v libx264',           // H.264 video codec
          '-preset fast',           // Encoding speed vs compression
          '-crf 23',               // Quality setting (18-28 range, 23 is good)
          '-vf scale=1920:-2',     // Scale to 1080p width, maintain aspect ratio
          '-r 30',                 // Frame rate to 30fps
          '-c:a aac',              // AAC audio codec
          '-b:a 128k',             // Audio bitrate
          '-ac 2',                 // Stereo audio
          '-movflags +faststart',  // Optimize for streaming
          '-max_muxing_queue_size 1024' // Handle large queue sizes
        ]);
      
      // Add progress logging
      command.on('start', (commandLine) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('FFmpeg command:', commandLine);
        }
      });
      
      command.on('progress', (progress) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('Processing progress:', progress.percent + '% done');
        }
      });
      
      command
        .on('end', async () => {
          try {
            const processedBuffer = await fs.readFile(outputPath);
            
            // Get video metadata
            if (process.env.NODE_ENV === 'development') {
              console.log('Running ffprobe on processed video...');
            }
            ffmpeg.ffprobe(outputPath, (err, metadata) => {
              if (err) {
                console.error('FFprobe error details:', {
                  message: err.message,
                  code: err.code,
                  outputPath: outputPath,
                  outputPathExists: existsSync(outputPath)
                });
                
                // Cleanup temp files
                fs.unlink(inputPath).catch(() => {});
                fs.unlink(outputPath).catch(() => {});
                
                reject(new Error(`Failed to get video metadata: ${err.message}`));
                return;
              }
              
              if (process.env.NODE_ENV === 'development') {
                console.log('FFprobe successful, metadata retrieved:', {
                  format: metadata.format.format_name,
                  duration: metadata.format.duration,
                  streams: metadata.streams.length
                });
              }
              
              const videoStream = metadata.streams.find(s => s.codec_type === 'video');
              const duration = metadata.format.duration;
              
              // Cleanup temp files
              fs.unlink(inputPath).catch(() => {});
              fs.unlink(outputPath).catch(() => {});
              
              resolve({
                buffer: processedBuffer,
                mimeType: 'video/mp4',
                width: videoStream?.width,
                height: videoStream?.height,
                duration: duration
              });
            });
            
          } catch (_error) {
            reject(new Error('Failed to read processed video'));
          }
        })
        .on('error', (error) => {
          // Cleanup temp files
          fs.unlink(inputPath).catch(() => {});
          fs.unlink(outputPath).catch(() => {});
          reject(new Error(`Video processing failed: ${error.message}`));
        })
        .save(outputPath);
    });
    
  } catch (error) {
    // Cleanup temp files
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
    console.error('Video processing error:', error);
    throw new Error('Failed to process video');
  }
}

/**
 * Determine if file is an image or video and process accordingly
 */
export async function processMedia(buffer: Buffer, mimeType: string): Promise<ProcessedMedia> {
  if (mimeType.startsWith('image/')) {
    return processImage(buffer, mimeType);
  } else if (mimeType.startsWith('video/')) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Attempting video processing...');
    }
    try {
      return await processVideo(buffer, mimeType);
    } catch (error) {
      console.warn('Video processing failed, using original buffer:', error);
      // Fallback: return original buffer for Gemini
      return {
        buffer,
        mimeType: 'video/mp4', 
        width: undefined,
        height: undefined,
        duration: undefined
      };
    }
  } else {
    throw new Error(`Unsupported media type: ${mimeType}`);
  }
}

/**
 * Validate file size and type before processing
 */
export function validateMediaFile(file: File): { isValid: boolean; error?: string } {
  // File size limits
  const maxImageSize = 10 * 1024 * 1024; // 10MB for images
  const maxVideoSize = 50 * 1024 * 1024; // 50MB for videos
  
  // Supported formats
  const supportedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const supportedVideoTypes = ['video/mp4', 'video/mov', 'video/webm', 'video/wmv', 'video/avi', 'video/x-msvideo', 'video/quicktime'];
  
  if (file.type.startsWith('image/')) {
    if (!supportedImageTypes.includes(file.type)) {
      return { isValid: false, error: 'Unsupported image format. Please use JPEG, PNG, WebP, or GIF.' };
    }
    if (file.size > maxImageSize) {
      return { isValid: false, error: 'Image too large. Please use an image smaller than 10MB.' };
    }
  } else if (file.type.startsWith('video/')) {
    if (!supportedVideoTypes.includes(file.type)) {
      return { isValid: false, error: 'Unsupported video format. Please use MP4, MOV, WebM, WMV, or AVI.' };
    }
    if (file.size > maxVideoSize) {
      return { isValid: false, error: 'Video too large. Please use a video smaller than 50MB.' };
    }
  } else {
    return { isValid: false, error: 'Unsupported file type. Please upload an image or video.' };
  }
  
  return { isValid: true };
}