import { NextRequest, NextResponse } from 'next/server';

// Runtime configuration for Node.js environment (required for sharp, ffmpeg, file processing)
export const runtime = 'nodejs';
export const maxDuration = 120; // 120 seconds for Files API processing
import { GoogleGenAI, createUserContent, createPartFromUri, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { processMedia, validateMediaFileSecure } from '@/lib/mediaProcessor';
import { uploadFile, generateAndUploadThumbnail } from '@/lib/storage';
import { createClient } from '@/lib/supabase/server';
import { MEDIA_CONFIG } from '@/lib/config';
import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

// Validate API key on startup

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY environment variable is not set');
}

const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

// Simple in-memory rate limiting (for production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Image analysis prompt - focused on static design recreation
function getImageAnalysisPrompt(outputLanguage: string): string {
  return `SYSTEM: You MUST output entirely in ${outputLanguage}. If you start in another language, immediately restate in ${outputLanguage} only. The response MUST be comprehensive and detailed, not a short summary.

Analyze the following UI design image in detail and create a comprehensive specification document in Markdown format that developers can use to faithfully recreate the design.

# Analysis Areas
1. **Overall Structure**: Basic layout composition (header, main content, sidebar, footer, etc.)
2. **UI Components**: All components visible in the image (buttons, forms, cards, navigation, etc.)
3. **Visual Properties**: Colors, fonts, sizes, spacing, border radius, shadows, and other styling details
4. **Layout Information**: Positioning relationships between elements and responsive design considerations
5. **Interactive Elements**: Inferred click/hover behaviors and user interactions based on visual cues
6. **Implementation Technology**: Recommended implementation approaches (CSS, JavaScript, libraries, frameworks)

# Output Format Requirements
- Structured in Markdown format with clear headings
- Use tables and bullet points for organization
- Include implementation priority levels (High/Medium/Low)
- Provide implementation guidance without writing actual code
- Focus on describing HOW to implement rather than providing code samples

# Instructions
- Base analysis strictly on what is visible in the image
- Minimize speculation and assumptions
- Provide specific measurements and values when identifiable
- Consider modern web development best practices
- Exclude any references to Three.js or 3D elements unless explicitly shown
- Use professional, technical language suitable for developers
- **CRITICAL: You MUST output the entire specification document in ${outputLanguage}. Do not use any other language.**

Please analyze the image and generate a comprehensive specification document focused on design recreation.

IMPORTANT: Respond entirely in ${outputLanguage}.`;
}

// Video analysis prompt - using successful image prompt pattern
function getVideoAnalysisPrompt(outputLanguage: string): string {
  return `**ALL OUTPUT MUST BE IN ${outputLanguage}. DO NOT USE ANY OTHER LANGUAGE.**

  SYSTEM: You are an expert UI/UX designer and web developer. Your task is to analyze the provided UI design video in extreme detail and generate a comprehensive, actionable design specification document for developers to faithfully recreate the UI.
  
  # Analysis Areas
  1. **Overall Structure**: Basic layout composition (header, main content, sidebar, footer, etc.) as seen throughout the video.
  2. **UI Components**: All components visible in the video frames (buttons, forms, cards, navigation, etc.), including their states.
  3. **Visual Properties**: Precise details on colors (use hex codes where identifiable), fonts (family, weight, size), exact sizes of elements, spacing (padding, margin, gap), border radius, shadows, and other styling details. Quantify as much as possible.
  4. **Layout Information**: Positioning relationships between elements (flexbox, grid, absolute), alignment, and responsive design considerations (how elements adapt to different viewports, even if only implied).
  5. **Interactive Elements**: Detailed description of user interactions (hover, click, drag, input focus), including specific state changes (e.g., button text color changes from X to Y on hover).
  6. **Motion & Animation**: Granular breakdown of all moving elements. Describe animation patterns (fade, slide, scale, rotate, transform), easing functions (linear, ease-in-out), duration, and triggers. For 3D elements, describe their perceived behavior (e.g., floating, rotating based on cursor) and suggest relevant libraries/techniques.
  7. **Implementation Technology**: Recommended implementation approaches (CSS techniques, JavaScript APIs, specific libraries like Three.js for 3D, GSAP for complex animations, React/Vue/Angular for framework considerations).
  
  # Output Format Requirements
  - Structured in Markdown format with clear, hierarchical headings (e.g., #, ##, ###).
  - Use tables and detailed bullet points for organization and clarity.
  - Include implementation priority levels (High/Medium/Low) for each major section or component.
  - Provide clear, actionable implementation guidance focusing on "HOW to implement" the visual and interactive aspects, without writing actual code snippets.
  - Emphasize dynamic elements, animations, and the unique interactive behaviors shown in the video.
  - **Strictly adhere to the specified output language throughout the entire document.**
  
  # Instructions
  - Base analysis strictly on what is visible and discernible in the *entire duration* of the video. Observe subtle details.
  - Minimize speculation and assumptions. If a detail is unclear, state that it is "unclear" or "appears to be X".
  - Provide specific measurements, hex codes, font names, animation durations, and easing types when identifiable or inferable from typical web standards.
  - Consider modern web development best practices and suggest common patterns.
  - Include specific references to well-known animation or 3D rendering libraries (e.g., Three.js, GSAP, Framer Motion) when complex 3D elements, physics-based motion, or intricate animation sequences are observed.
  - Use professional, precise, and technical language suitable for experienced web developers.
  
  **CRITICAL: The entire response MUST be in ${outputLanguage}. Absolutely no other languages are permitted in the output.**`;
  }

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 8; // Conservative limit for free tier (10 RPM)
  
  const current = rateLimitMap.get(ip);
  
  if (!current || now > current.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false;
  }
  
  current.count++;
  return true;
}

// Files API integration functions
interface FileMetadata {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  expirationTime: string;
  userId: string;
  fileHash: string;
}

async function uploadToFilesAPI(
  buffer: Buffer, 
  mimeType: string, 
  filename: string
): Promise<{ uri: string; name: string; expirationTime: string }> {
  if (!genAI) {
    throw new Error('Gemini API not initialized');
  }

  const blob = new Blob([buffer], { type: mimeType });
  const file = await genAI.files.upload({
    file: blob
  });

  return {
    uri: file.uri || '',
    name: file.name || filename,
    expirationTime: file.expirationTime || ''
  };
}

async function waitForFileActive(fileName: string, maxWaitTimeMs: number = 60000): Promise<boolean> {
  if (!genAI) {
    throw new Error('Gemini API not initialized');
  }

  const startTime = Date.now();
  let attempt = 0;
  const maxAttempts = 20;

  while (Date.now() - startTime < maxWaitTimeMs && attempt < maxAttempts) {
    try {
      const file = await genAI.files.get({ name: fileName });
      if (file.state === 'ACTIVE') {
        return true;
      }
      
      if (file.state === 'FAILED') {
        throw new Error(`File processing failed: ${fileName}`);
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, etc.
      const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
      
    } catch (error) {
      if (attempt >= maxAttempts - 1) {
        throw error;
      }
      const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }

  throw new Error(`File did not become active within ${maxWaitTimeMs}ms: ${fileName}`);
}

async function checkFileCache(
  fileHash: string, 
  userId: string, 
  supabase: SupabaseClient
): Promise<FileMetadata | null> {
  try {
    const { data, error } = await supabase
      .from('gemini_files')
      .select('*')
      .eq('file_hash', fileHash)
      .eq('user_id', userId)
      .gt('expiration_time', new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    // Verify file still exists in Gemini
    if (genAI) {
      try {
        await genAI.files.get({ name: data.name });
        return {
          uri: data.uri,
          name: data.name,
          mimeType: data.mime_type,
          sizeBytes: data.size_bytes,
          expirationTime: data.expiration_time,
          userId: data.user_id,
          fileHash: data.file_hash
        };
      } catch {
        // File not found in Gemini, remove from cache
        await supabase
          .from('gemini_files')
          .delete()
          .eq('file_hash', fileHash)
          .eq('user_id', userId);
        return null;
      }
    }

    return null;
  } catch (error) {
    console.error('Cache check failed:', error);
    return null;
  }
}

async function saveFileMetadata(
  metadata: Omit<FileMetadata, 'userId'>,
  userId: string,
  supabase: SupabaseClient
): Promise<void> {
  try {
    const { error } = await supabase
      .from('gemini_files')
      .upsert({
        uri: metadata.uri,
        name: metadata.name,
        mime_type: metadata.mimeType,
        size_bytes: metadata.sizeBytes,
        expiration_time: metadata.expirationTime,
        user_id: userId,
        file_hash: metadata.fileHash,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to save file metadata:', error);
    }
  } catch (error) {
    console.error('Metadata save failed:', error);
  }
}

function createFileHash(buffer: Buffer, mimeType: string): string {
  return crypto.createHash('sha256')
    .update(buffer)
    .update(mimeType)
    .digest('hex');
}

interface ModelConfig {
  model: string;
  generationConfig: {
    candidateCount: number;
    maxOutputTokens: number;
    temperature: number;
    responseMimeType: string;
  };
  safetySettings: Array<{
    category: HarmCategory;
    threshold: HarmBlockThreshold;
  }>;
}

async function analyzeWithFilesAPI(
  prompt: string,
  fileUri: string,
  fileMimeType: string,
  modelConfig: ModelConfig
): Promise<string> {
  if (!genAI) {
    throw new Error('Gemini API not initialized');
  }

  const result = await genAI.models.generateContent({
    ...modelConfig,
    contents: createUserContent([
      prompt,
      createPartFromUri(fileUri, fileMimeType)
    ])
  });

  if (!result || !result.text) {
    throw new Error('Invalid response from Gemini API');
  }

  return result.text;
}

async function analyzeWithOptimalMethod(
  buffer: Buffer,
  mimeType: string,
  filename: string,
  prompt: string,
  modelConfig: ModelConfig,
  userId: string,
  supabase: SupabaseClient
): Promise<string> {
  const fileSize = buffer.length;
  const shouldUseFilesAPI = fileSize > MEDIA_CONFIG.FILE_SIZE_LIMITS.GEMINI_INLINE_MAX;

  if (shouldUseFilesAPI) {
    // Check cache first
    const fileHash = createFileHash(buffer, mimeType);
    const cachedFile = await checkFileCache(fileHash, userId, supabase);

    if (cachedFile) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Using cached file:', cachedFile.name);
      }
      return analyzeWithFilesAPI(prompt, cachedFile.uri, cachedFile.mimeType, modelConfig);
    }

    // Upload new file
    const uploadResult = await uploadToFilesAPI(buffer, mimeType, filename);
    
    // Wait for file to become active
    await waitForFileActive(uploadResult.name);

    // Save metadata to cache
    await saveFileMetadata({
      uri: uploadResult.uri,
      name: uploadResult.name,
      mimeType: mimeType,
      sizeBytes: fileSize,
      expirationTime: uploadResult.expirationTime,
      fileHash: fileHash
    }, userId, supabase);

    return analyzeWithFilesAPI(prompt, uploadResult.uri, mimeType, modelConfig);
  } else {
    // Use inline data for small files
    const base64 = buffer.toString('base64');
    const mediaPart = {
      inlineData: {
        data: base64,
        mimeType: mimeType,
      },
    };

    const result = await genAI!.models.generateContent({
      ...modelConfig,
      contents: createUserContent([prompt, mediaPart])
    });

    if (!result || !result.text) {
      throw new Error('Invalid response from Gemini API');
    }

    return result.text;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let file: File | null = null;
  
  // Check if API is properly configured
  if (!genAI) {
    console.error('Gemini API not initialized - missing API key');
    return NextResponse.json(
      { error: 'API configuration error. Please check server logs.' }, 
      { status: 500 }
    );
  }

  // セキュリティ強化: 認証チェックを有効化
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Authentication required' }, 
      { status: 401 }
    );
  }

  const token = authHeader.split(' ')[1];
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Invalid authentication' }, 
      { status: 401 }
    );
  }

  // セキュリティ強化: 使用制限チェックを有効化
  let currentUsage = 0;
  let monthlyLimit = 7;
  
  try {
    const usageResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/usage`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!usageResponse.ok) {
      const usageError = await usageResponse.json();
      return NextResponse.json(
        { error: usageError.error || 'Failed to check usage limits' }, 
        { status: usageResponse.status }
      );
    }

    const usageData = await usageResponse.json();
    currentUsage = usageData.usageCount;
    monthlyLimit = usageData.monthlyLimit;

    // 使用制限チェック
    if (currentUsage >= monthlyLimit) {
      return NextResponse.json(
        { error: `You have reached your monthly limit of ${monthlyLimit} analyses. Please upgrade your plan.` }, 
        { status: 429 }
      );
    }
  } catch (usageCheckError) {
    console.error('Usage check failed:', usageCheckError);
    return NextResponse.json(
      { error: 'Failed to verify usage limits' }, 
      { status: 500 }
    );
  }
  
  // Rate limiting check
  const ip = request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown';
  
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait a moment before trying again.' }, 
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }
  
  // Log API usage for monitoring  
  if (process.env.NODE_ENV === 'development') {
    console.log('API Request:', {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ip: ip
    });
  }

  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('Processing request...');
    }
    const formData = await request.formData();
    const mediaEntry = formData.get('media') || formData.get('image');
    const language = formData.get('language') as string || 'ja';
    file = mediaEntry as File;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('FormData received:', {
        mediaEntryExists: !!mediaEntry,
        language,
        fileType: file?.type,
        fileSize: file?.size
      });
    }
    
    if (!file) {
      return NextResponse.json({ error: 'No media file provided' }, { status: 400 });
    }

    // Validate file using our media processor
    const validation = await validateMediaFileSecure(file);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Process media file (auto-optimization for Gemini 2.5 Flash)
    const bytes = await file.arrayBuffer();
    const inputBuffer = Buffer.from(bytes);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Processing media:', {
        originalSize: file.size,
        mimeType: file.type,
        fileName: file.name
      });
    }
    
    let processedMedia;
    try {
      processedMedia = await processMedia(inputBuffer, file.type);
      if (process.env.NODE_ENV === 'development') {
        console.log('Media processing successful');
      }
    } catch (mediaError) {
      console.error('Media processing failed:', mediaError);
      return NextResponse.json(
        { error: 'Failed to process media file. Please try a different format.' }, 
        { status: 400 }
      );
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Media processed:', {
        originalSize: file.size,
        processedSize: processedMedia.buffer.length,
        finalMimeType: processedMedia.mimeType,
        dimensions: processedMedia.width && processedMedia.height ? 
          `${processedMedia.width}x${processedMedia.height}` : 'N/A'
      });
    }

    // Model configuration for new SDK
    const modelConfig = {
      model: 'gemini-2.5-flash',
      generationConfig: {
        candidateCount: 1,
        maxOutputTokens: 8192,
        temperature: 0.1,
        responseMimeType: "text/plain"
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    };

    const isVideo = file.type.startsWith('video/');
    
    // Get language name in the target language for stronger instruction
    const outputLanguage = language === 'ja' ? '日本語' : 
                          language === 'en' ? 'English' : 
                          language === 'ko' ? '한국어' : 
                          language === 'zh' ? '中文' : '日本語';
    
    // Get appropriate prompt based on media type
    const prompt = isVideo ? getVideoAnalysisPrompt(outputLanguage) : getImageAnalysisPrompt(outputLanguage);

    // Use optimal method (Files API for large files, inline for small files)
    const text = await analyzeWithOptimalMethod(
      processedMedia.buffer,
      processedMedia.mimeType,
      file.name,
      prompt,
      modelConfig,
      user.id,
      supabase
    );

    // Debug: Log actual API response for video analysis
    if (isVideo && process.env.NODE_ENV === 'development') {
      console.log('=== VIDEO ANALYSIS DEBUG ===');
      console.log('Response length:', text.length);
      console.log('First 500 chars:', text.substring(0, 500));
      console.log('Last 500 chars:', text.substring(Math.max(0, text.length - 500)));
      console.log('Full response preview:', text.substring(0, 1000));
      console.log('============================');
    }

    // セキュアなファイル保存とデータベース操作
    let fileUrl = '';
    let thumbnailUrl = '';
    
    try {
      // セキュリティチェック: ファイルサイズとタイプの再検証
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        throw new Error('File size exceeds 50MB limit');
      }

      const uploadResult = await uploadFile(file, user.id);
      if (uploadResult.error) {
        console.error('File upload error:', uploadResult.error);
        // Continue without file URL but still save analysis
      } else {
        fileUrl = uploadResult.publicUrl;
        if (process.env.NODE_ENV === 'development') {
          console.log('File uploaded successfully:', fileUrl);
        }
      }

      // Generate thumbnail for videos with security validation
      if (isVideo && !uploadResult.error && processedMedia.buffer.length > 0) {
        try {
          const thumbnailResult = await generateAndUploadThumbnail(
            processedMedia.buffer, 
            user.id, 
            file.name
          );
          if (thumbnailResult.error) {
            console.error('Thumbnail upload error:', thumbnailResult.error);
          } else {
            thumbnailUrl = thumbnailResult.publicUrl;
            if (process.env.NODE_ENV === 'development') {
              console.log('Thumbnail uploaded successfully:', thumbnailUrl);
            }
          }
        } catch (thumbnailError) {
          console.error('Thumbnail generation failed:', thumbnailError);
          // Continue without thumbnail
        }
      }
    } catch (storageError) {
      console.error('Storage operation failed:', storageError);
      // Continue processing even if storage fails - analysis is more important
    }

    // セキュアなデータベース保存
    try {
      const { error: historyError } = await supabase
        .from('analysis_history')
        .insert({
          user_id: user.id,
          file_name: file.name.substring(0, 255), // Limit filename length
          file_size: file.size,
          mime_type: file.type.substring(0, 100), // Limit mime type length
          specification: text,
          file_url: fileUrl || null,
          thumbnail_storage_path: thumbnailUrl || null,
          created_at: new Date().toISOString()
        });

      if (historyError) {
        console.error('Failed to save analysis history:', historyError);
        // Don't fail the entire request if history save fails
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('Analysis history saved successfully');
        }
      }
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      // Continue processing even if database save fails
    }

    // セキュリティ強化: 使用量更新を secure API 経由で実行
    try {
      const usageUpdateResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/usage`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (usageUpdateResponse.ok) {
        const updatedUsage = await usageUpdateResponse.json();
        currentUsage = updatedUsage.usageCount;
        monthlyLimit = updatedUsage.monthlyLimit;
        console.log('Usage count updated successfully');
      } else {
        console.error('Failed to update usage count via API');
      }
    } catch (usageError) {
      console.error('Usage update failed:', usageError);
    }

    // Log successful API usage
    const processingTime = Date.now() - startTime;
    console.log('API Success:', {
      timestamp: new Date().toISOString(),
      processingTime: `${processingTime}ms`,
      fileSize: file.size,
      outputLength: text.length,
      userId: user.id,
      usageCount: currentUsage + 1
    });

    return NextResponse.json({ 
      specification: text,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      processedSize: processedMedia.buffer.length,
      processedMimeType: processedMedia.mimeType,
      mediaType: isVideo ? 'video' : 'image',
      fileUrl: fileUrl || null,
      thumbnailUrl: thumbnailUrl || null,
      usageCount: currentUsage + 1,
      monthlyLimit: monthlyLimit
    });

  } catch (error) {
    // Enhanced error logging with structured data
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      fileInfo: {
        name: file ? file.name : 'unknown',
        size: file ? file.size : 0,
        type: file ? file.type : 'unknown'
      },
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    };
    
    console.error('Design analysis error:', JSON.stringify(errorLog, null, 2));
    
    // Handle specific Gemini API errors
    if (error instanceof Error) {
      if (error.message.includes('API_KEY')) {
        return NextResponse.json(
          { error: 'API key configuration error' }, 
          { status: 500 }
        );
      }
      if (error.message.includes('SAFETY')) {
        return NextResponse.json(
          { error: 'Media content was filtered for safety reasons' }, 
          { status: 400 }
        );
      }
      if (error.message.includes('QUOTA')) {
        return NextResponse.json(
          { error: 'API quota exceeded. Please try again later.' }, 
          { status: 429 }
        );
      }
      if (error.message.includes('RATE_LIMIT')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again in a moment.' }, 
          { status: 429 }
        );
      }
      // Files API specific errors
      if (error.message.includes('File processing failed') || error.message.includes('did not become active')) {
        return NextResponse.json(
          { error: 'Large file processing is taking longer than expected. Please try with a smaller file or try again later.' }, 
          { status: 408 }
        );
      }
      if (error.message.includes('File size exceeds') || error.message.includes('too large')) {
        return NextResponse.json(
          { error: 'File is too large. Please use a smaller file or compress your media.' }, 
          { status: 413 }
        );
      }
      if (error.message.includes('File not found') || error.message.includes('404')) {
        return NextResponse.json(
          { error: 'File processing error. Please upload the file again.' }, 
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to analyze design. Please try again.' }, 
      { status: 500 }
    );
  }
}