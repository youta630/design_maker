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
    const languageNames = {
      ja: 'Japanese',
      en: 'English', 
      ko: 'Korean',
      zh: 'Chinese'
    };
    
    const selectedLanguage = languageNames[language as keyof typeof languageNames] || 'Japanese';
    
    const prompt = `Analyze the following UI design ${isVideo ? 'video' : 'image'} in detail and create a comprehensive specification document in Markdown format that developers can use to faithfully recreate the design.

# Analysis Areas
1. **Overall Structure**: Basic layout composition (header, main content, sidebar, footer, etc.)
2. **UI Components**: All components visible in the ${isVideo ? 'video frames' : 'image'} (buttons, forms, cards, navigation, etc.)
3. **Visual Properties**: Colors, fonts, sizes, spacing, border radius, shadows, and other styling details
4. **Layout Information**: Positioning relationships between elements and responsive design considerations
5. **Interactive Elements**: ${isVideo ? 'User interactions, animations, and transitions shown in the video' : 'Inferred click/hover behaviors and user interactions'}
6. **Implementation Technology**: Recommended implementation approaches (CSS, JavaScript, libraries, frameworks)
${isVideo ? '7. **Animation & Interactions**: Describe the animations, transitions, and user flows demonstrated in the video' : ''}

# Output Format Requirements
- Structured in Markdown format with clear headings
- Use tables and bullet points for organization
- Include implementation priority levels (High/Medium/Low)
- Provide implementation guidance without writing actual code
- Focus on describing HOW to implement rather than providing code samples
${isVideo ? '- For videos: Describe the temporal sequence of interactions and animations' : ''}

# Instructions
- Base analysis strictly on what is visible in the ${isVideo ? 'video' : 'image'}
- Minimize speculation and assumptions
- Provide specific measurements and values when identifiable
- Consider modern web development best practices
- Exclude any references to Three.js or 3D elements unless explicitly shown
- Use professional, technical language suitable for developers
- **IMPORTANT: Output the entire specification document in ${selectedLanguage}**
${isVideo ? '- For videos: Analyze the full sequence of interactions and describe the user flow' : ''}

Please analyze the ${isVideo ? 'video' : 'image'} and generate a comprehensive specification document.
`;

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