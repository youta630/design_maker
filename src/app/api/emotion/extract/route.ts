import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, createUserContent, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { validateMediaFileSecure } from '@/lib/mediaProcessor';
import { createClient } from '@/lib/supabase/server';
import type { EmotionExtraction } from '@/lib/emotion/types';
import emotionSchema from '@/schemas/emotion.schema.json';

export const runtime = 'nodejs';
export const maxDuration = 60;

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY environment variable is not set');
}

const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

// Simple rate limiting (30s per user)
const rateLimitMap = new Map<string, number>();

function checkUserRateLimit(userId: string): boolean {
  const now = Date.now();
  const lastRequest = rateLimitMap.get(userId);
  
  if (!lastRequest || (now - lastRequest) > 30000) { // 30 seconds
    rateLimitMap.set(userId, now);
    return true;
  }
  
  return false;
}

function getEmotionExtractionPrompt(): string {
  return [
    '🎨 You are an abstract, artistic UI designer specializing in emotional interpretation.',
    '',
    'Look at the given image and extract the emotional atmosphere in poetic but functional language.',
    'Focus on feelings that could translate into UI design decisions.',
    '',
    '✨ IMPORTANT: Use creative, metaphorical language that captures the ineffable qualities.',
    'Avoid generic phrases like "simple" or "clean".',
    'You can invent new visual metaphors.',
    '',
    '🎯 Extract these 4 dimensions:',
    '1. inner_mood: The internal emotional atmosphere (like "writing a secret letter in quietude")',
    '2. visual_texture: Quality of light, color, surface feelings (like "muted pink with morning rays filtering through")', 
    '3. tempo: Time flow and rhythm (like "slowly flowing with emotional waves")',
    '4. distance_to_user: Emotional distance and intimacy (like "gently approaching but keeping one step back")',
    '',
    '📝 Output ONLY valid JSON matching the schema. Be poetic but precise.',
    '',
    'Extract the emotional essence now:'
  ].join('\n');
}

export async function POST(request: NextRequest) {
  // Check if API is properly configured
  if (!genAI) {
    console.error('Gemini API not initialized - missing API key');
    return NextResponse.json(
      { error: 'API configuration error. Please check server logs.' }, 
      { status: 500 }
    );
  }

  // Auth check
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
  }

  // Rate limiting
  if (!checkUserRateLimit(user.id)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait 30 seconds between requests.' }, 
      { status: 429 }
    );
  }

  try {
    // Parse form data
    const formData = await request.formData();
    const fileEntry = formData.get('file');

    if (!fileEntry || !(fileEntry instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const file = fileEntry;
    // Only image uploads are supported
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image uploads are supported' }, { status: 400 });
    }

    // Validate file
    const validation = await validateMediaFileSecure(file);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const inputBuffer = Buffer.from(bytes);

    // Model configuration with higher temperature for creativity
    const modelConfig = {
      systemInstruction: {
        parts: [{
          text: 'You are a poetic UI designer who translates visual emotions into design concepts. Always output valid JSON that captures the emotional essence of images in creative, metaphorical language.'
        }]
      },
      generationConfig: {
        candidateCount: 1,
        maxOutputTokens: 1024,
        temperature: 1.0, // Higher temperature for creativity
        responseMimeType: 'application/json',
        responseSchema: emotionSchema
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

    // Generate emotion extraction
    const prompt = getEmotionExtractionPrompt();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('=== EMOTION EXTRACTION ===');
      console.log('Temperature:', modelConfig.generationConfig.temperature);
      console.log('Prompt:', prompt);
    }
    
    const base64 = inputBuffer.toString('base64');
    const mediaPart = {
      inlineData: {
        data: base64,
        mimeType: file.type
      }
    };

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      ...modelConfig,
      contents: createUserContent([prompt, mediaPart])
    });

    let responseText = response?.text?.trim() ?? '';

    if (process.env.NODE_ENV === 'development') {
      console.log('=== GEMINI RESPONSE ===');
      console.log('Raw response:', responseText);
    }

    // Clean and parse response
    const fenceMatch = responseText.match(/```json\s*([\s\S]*?)```/i) || responseText.match(/```\s*([\s\S]*?)```/i);
    if (fenceMatch && fenceMatch[1]) {
      responseText = fenceMatch[1].trim();
    }

    let emotionResult: EmotionExtraction;
    try {
      emotionResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse failed:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON response from AI model. Please try again.' },
        { status: 500 }
      );
    }

    // Add version if missing
    if (!emotionResult.version) {
      emotionResult.version = '1.0';
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('=== EMOTION EXTRACTION SUCCESS ===');
      console.log('Result:', JSON.stringify(emotionResult, null, 2));
    }

    // Return the emotion extraction
    return NextResponse.json({
      emotion: emotionResult
    });

  } catch (error) {
    console.error('Emotion extraction error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}