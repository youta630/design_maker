import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { processMedia, validateMediaFile } from '@/lib/mediaProcessor';
import { uploadFile, generateAndUploadThumbnail } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

// Validate API key on startup
console.log('Environment check:', {
  hasGeminiKey: !!process.env.GEMINI_API_KEY,
  nodeEnv: process.env.NODE_ENV
});

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY environment variable is not set');
}

const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
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
  return `SYSTEM: You MUST output entirely in ${outputLanguage}. If you start in another language, immediately restate in ${outputLanguage} only. The response MUST be comprehensive and detailed, not a short summary.

Analyze the following UI design video in detail and create a comprehensive specification document in Markdown format that developers can use to faithfully recreate the design shown in the video.

# Analysis Areas
1. **Overall Structure**: Basic layout composition (header, main content, sidebar, footer, etc.) as seen throughout the video
2. **UI Components**: All components visible in the video frames (buttons, forms, cards, navigation, etc.)
3. **Visual Properties**: Colors, fonts, sizes, spacing, border radius, shadows, and other styling details
4. **Layout Information**: Positioning relationships between elements and responsive design considerations
5. **Interactive Elements**: User interactions, animations, and transitions shown in the video
6. **Motion & Animation**: Detailed breakdown of all moving elements, their timing, and animation patterns
7. **Implementation Technology**: Recommended implementation approaches (CSS, JavaScript, libraries, frameworks)

# Output Format Requirements
- Structured in Markdown format with clear headings
- Use tables and bullet points for organization
- Include implementation priority levels (High/Medium/Low)
- Provide implementation guidance without writing actual code
- Focus on describing HOW to implement rather than providing code samples
- Emphasize dynamic elements and animations unique to video content

# Instructions
- Base analysis strictly on what is visible in the video
- Minimize speculation and assumptions
- Provide specific measurements and values when identifiable
- Consider modern web development best practices
- Include references to animation libraries when 3D elements or complex animations are visible
- Use professional, technical language suitable for developers
- **CRITICAL: You MUST output the entire specification document in ${outputLanguage}. Do not use any other language.**

Please analyze the video and generate a comprehensive specification document focused on design recreation.

IMPORTANT: Respond entirely in ${outputLanguage}.`;
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

  // 一時的に認証チェックを無効化（テスト用）
  const user = { id: '00000000-0000-0000-0000-000000000000' }; // テスト用のダミーユーザー
  
  /* 
  // Check user authentication
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Authentication required' }, 
      { status: 401 }
    );
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Invalid authentication' }, 
      { status: 401 }
    );
  }
  */

  // 一時的に使用制限チェックを無効化（テスト用）
  const currentUsage = 0; // テスト用デフォルト値
  const monthlyLimit = 7; // テスト用デフォルト値

  /*
  // Check user usage limits
  const { data: userUsage, error: usageError } = await supabase
    .from('user_usage')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (usageError && usageError.code !== 'PGRST116') { // PGRST116 is "not found" error
    console.error('Usage check error:', usageError);
    return NextResponse.json(
      { error: 'Failed to check usage limits' }, 
      { status: 500 }
    );
  }

  // Create user usage record if it doesn't exist
  if (!userUsage) {
    const { error: createError } = await supabase
      .from('user_usage')
      .insert({
        user_id: user.id,
        usage_count: 0,
        monthly_limit: 7,
        subscription_status: 'free'
      });

    if (createError) {
      console.error('Failed to create user usage record:', createError);
      return NextResponse.json(
        { error: 'Failed to initialize user account' }, 
        { status: 500 }
      );
    }
  }

  // Check if user has exceeded their limit
  const currentUsage = userUsage?.usage_count || 0;
  const monthlyLimit = userUsage?.monthly_limit || 7;
  
  if (currentUsage >= monthlyLimit) {
    return NextResponse.json(
      { error: `You have reached your monthly limit of ${monthlyLimit} analyses. Please upgrade your plan.` }, 
      { status: 429 }
    );
  }
  */
  
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
  console.log('API Request:', {
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent'),
    ip: ip
  });

  try {
    console.log('Processing request...');
    const formData = await request.formData();
    const mediaEntry = formData.get('media') || formData.get('image');
    const language = formData.get('language') as string || 'ja';
    file = mediaEntry as File;
    
    console.log('FormData received:', {
      mediaEntryExists: !!mediaEntry,
      language,
      fileType: file?.type,
      fileSize: file?.size
    });
    
    if (!file) {
      return NextResponse.json({ error: 'No media file provided' }, { status: 400 });
    }

    // Validate file using our media processor
    const validation = validateMediaFile(file);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Process media file (auto-optimization for Gemini 2.5 Flash)
    const bytes = await file.arrayBuffer();
    const inputBuffer = Buffer.from(bytes);
    
    console.log('Processing media:', {
      originalSize: file.size,
      mimeType: file.type,
      fileName: file.name
    });
    
    let processedMedia;
    try {
      processedMedia = await processMedia(inputBuffer, file.type);
      console.log('Media processing successful');
    } catch (mediaError) {
      console.error('Media processing failed:', mediaError);
      return NextResponse.json(
        { error: 'Failed to process media file. Please try a different format.' }, 
        { status: 400 }
      );
    }
    const base64 = processedMedia.buffer.toString('base64');
    
    console.log('Media processed:', {
      originalSize: file.size,
      processedSize: processedMedia.buffer.length,
      finalMimeType: processedMedia.mimeType,
      dimensions: processedMedia.width && processedMedia.height ? 
        `${processedMedia.width}x${processedMedia.height}` : 'N/A'
    });

    const model = genAI.getGenerativeModel({ 
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
    });

    const isVideo = file.type.startsWith('video/');
    
    // Language names for output instruction
    
    // Get language name in the target language for stronger instruction
    const outputLanguage = language === 'ja' ? '日本語' : 
                          language === 'en' ? 'English' : 
                          language === 'ko' ? '한국어' : 
                          language === 'zh' ? '中文' : '日本語';
    
    // Get appropriate prompt based on media type
    const prompt = isVideo ? getVideoAnalysisPrompt(outputLanguage) : getImageAnalysisPrompt(outputLanguage);

    const mediaPart = {
      inlineData: {
        data: base64,
        mimeType: processedMedia.mimeType,
      },
    };

    const result = await model.generateContent([prompt, mediaPart]);
    const response = result.response;
    const text = response.text();

    // Debug: Log actual API response for video analysis
    if (isVideo) {
      console.log('=== VIDEO ANALYSIS DEBUG ===');
      console.log('Response length:', text.length);
      console.log('First 500 chars:', text.substring(0, 500));
      console.log('Last 500 chars:', text.substring(Math.max(0, text.length - 500)));
      console.log('Full response preview:', text.substring(0, 1000));
      console.log('============================');
    }

    // 一時的にファイル保存とデータベース操作を無効化（テスト用）
    const fileUrl = '';
    const thumbnailUrl = '';

    /*
    // Save file to Supabase Storage
    let fileUrl = '';
    let thumbnailUrl = '';
    
    try {
      const uploadResult = await uploadFile(file, user.id);
      if (uploadResult.error) {
        console.error('File upload error:', uploadResult.error);
      } else {
        fileUrl = uploadResult.publicUrl;
        console.log('File uploaded successfully:', fileUrl);
      }

      // Generate thumbnail for videos
      if (isVideo && !uploadResult.error) {
        const thumbnailResult = await generateAndUploadThumbnail(
          processedMedia.buffer, 
          user.id, 
          file.name
        );
        if (thumbnailResult.error) {
          console.error('Thumbnail upload error:', thumbnailResult.error);
        } else {
          thumbnailUrl = thumbnailResult.publicUrl;
          console.log('Thumbnail uploaded successfully:', thumbnailUrl);
        }
      }
    } catch (storageError) {
      console.error('Storage operation failed:', storageError);
      // Continue processing even if storage fails
    }

    // Save analysis to database
    try {
      const { error: historyError } = await supabase
        .from('analysis_history')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          specification: text,
          file_url: fileUrl || null,
          thumbnail_storage_path: thumbnailUrl || null
        });

      if (historyError) {
        console.error('Failed to save analysis history:', historyError);
      } else {
        console.log('Analysis history saved successfully');
      }
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      // Continue processing even if database save fails
    }

    // Increment user usage count
    try {
      const { error: usageUpdateError } = await supabase
        .from('user_usage')
        .update({ 
          usage_count: currentUsage + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (usageUpdateError) {
        console.error('Failed to update usage count:', usageUpdateError);
      } else {
        console.log('Usage count updated successfully');
      }
    } catch (usageError) {
      console.error('Usage update failed:', usageError);
    }
    */

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
    }
    
    return NextResponse.json(
      { error: 'Failed to analyze design. Please try again.' }, 
      { status: 500 }
    );
  }
}