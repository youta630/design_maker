import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { processMedia, validateMediaFile } from '@/lib/mediaProcessor';

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
  return `Analyze the following UI design image in detail and create a comprehensive specification document in Markdown format that developers can use to faithfully recreate the design.

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

// Video analysis prompt - focused on motion, animation, and 3D elements
function getVideoAnalysisPrompt(outputLanguage: string, language: string): string {
  const intro = language === 'ja' 
    ? 'この動画で見られる画面を再現するために必要な実装詳細を分析し、開発者が忠実に再現できる包括的な仕様書をMarkdown形式で作成してください。'
    : 'Analyze the following UI design video in detail and create a comprehensive specification document in Markdown format that developers can use to faithfully recreate the design shown in the video.';

  return `${intro}

# Analysis Areas
1. **Overall Structure**: Basic layout composition (header, main content, sidebar, footer, etc.)
2. **UI Components**: All components visible in the video frames (buttons, forms, cards, navigation, etc.)
3. **Visual Properties**: Colors, fonts, sizes, spacing, border radius, shadows, and other styling details - Provide specific pixel values for margins, padding, and positioning
4. **Layout Information**: Positioning relationships between elements and responsive design considerations
5. **Interactive Elements**: User interactions, animations, and transitions shown in the video
6. **Implementation Technology**: Recommended implementation approaches (CSS, JavaScript, libraries, frameworks) - Specify exact libraries like Three.js for 3D elements
7. **Motion & Animation Analysis**: Detailed breakdown of all moving elements, their trajectories, timing, easing functions, and animation types (CSS transitions, keyframes, JavaScript animations)
8. **3D Elements & Spatial Dynamics**: If 3D elements are present, describe their geometry, materials, lighting, camera movements, and spatial relationships. Specify implementation using Three.js, WebGL, or similar technologies
9. **Camera/Viewport Changes**: Document any changes in viewing angle, zoom levels, perspective shifts, or camera movements throughout the video
10. **Temporal Sequence**: Frame-by-frame analysis of key animation moments, describing what moves, when, and how (duration, delay, sequence)

# Output Format Requirements
- Structured in Markdown format with clear headings
- Use tables and bullet points for organization
- Include implementation priority levels (High/Medium/Low)
- Provide implementation guidance without writing actual code
- Focus on describing HOW to implement rather than providing code samples
- For videos: Focus on MOTION and CHANGE rather than static descriptions
- Document animation timing: start/end frames, duration, easing curves
- Describe movement patterns: linear, curved, rotational, scaling, morphing
- Identify keyframes and transition states for complex animations
- Specify 3D properties: rotation angles, camera positions, lighting changes
- Note performance considerations for animations (GPU acceleration, frame rates)

# Instructions
- Base analysis strictly on what is visible in the video
- Minimize speculation and assumptions
- Provide specific measurements and values when identifiable
- Consider modern web development best practices
- INCLUDE references to Three.js or other 3D libraries when 3D elements are visible
- Use professional, technical language suitable for developers
- **CRITICAL: You MUST output the entire specification document in ${outputLanguage}. Do not use any other language.**
- For videos: Prioritize DYNAMIC ELEMENTS over static UI components
- Track element transformations: position changes, size variations, opacity shifts
- Document camera/viewport movements: panning, zooming, rotating, perspective changes
- Identify animation triggers: user interactions, time-based, scroll-based, or automatic
- Describe 3D scene composition: object placement, lighting setup, material properties
- Note any physics simulations: gravity, collision, particle systems, fluid dynamics
- Focus on the TECHNICAL RECREATION of movements rather than describing user actions

Please analyze the video and generate a comprehensive specification document focused on implementation recreation.

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

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const isVideo = file.type.startsWith('video/');
    
    // Language names for output instruction
    
    // Get language name in the target language for stronger instruction
    const outputLanguage = language === 'ja' ? '日本語' : 
                          language === 'en' ? 'English' : 
                          language === 'ko' ? '한국어' : 
                          language === 'zh' ? '中文' : '日本語';
    
    // Get appropriate prompt based on media type
    const prompt = isVideo ? getVideoAnalysisPrompt(outputLanguage, language) : getImageAnalysisPrompt(outputLanguage);

    const mediaPart = {
      inlineData: {
        data: base64,
        mimeType: processedMedia.mimeType,
      },
    };

    const result = await model.generateContent([prompt, mediaPart]);
    const response = result.response;
    const text = response.text();

    // Log successful API usage
    const processingTime = Date.now() - startTime;
    console.log('API Success:', {
      timestamp: new Date().toISOString(),
      processingTime: `${processingTime}ms`,
      fileSize: file.size,
      outputLength: text.length
    });

    return NextResponse.json({ 
      specification: text,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      processedSize: processedMedia.buffer.length,
      processedMimeType: processedMedia.mimeType,
      mediaType: isVideo ? 'video' : 'image'
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