import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, createUserContent, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { createClient } from '@/lib/supabase/server';
import type { UIGeneration, ScreenType } from '@/lib/emotion/types';
import { validateEmotionExtraction } from '@/lib/emotion/validator';
import uiGenerationSchema from '@/schemas/ui-generation.schema.json';

export const runtime = 'nodejs';
export const maxDuration = 60;

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY environment variable is not set');
}

const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

// Simple rate limiting (15s per user for UI generation)
const rateLimitMap = new Map<string, number>();

function checkUserRateLimit(userId: string): boolean {
  const now = Date.now();
  const lastRequest = rateLimitMap.get(userId);
  
  if (!lastRequest || (now - lastRequest) > 15000) { // 15 seconds
    rateLimitMap.set(userId, now);
    return true;
  }
  
  return false;
}

function getUIGenerationPrompt(screenType: ScreenType): string {
  return [
    '🎨 You are a poetic yet practical UI designer.',
    '',
    'Transform the given emotional expressions into a concrete UI structure.',
    'Create layouts that embody the emotional atmosphere while remaining functional.',
    '',
    '✨ DESIGN PHILOSOPHY:',
    '- Translate emotions into spatial relationships, breathing room, visual hierarchy',
    '- Consider how emotions affect user interaction patterns and visual flow',
    '- Balance poetic intention with usability',
    '',
    `🎯 TARGET: Design a ${screenType} screen that captures the emotional essence.`,
    '',
    '📐 STRUCTURE YOUR RESPONSE:',
    '1. layout_description: How the emotion translates to overall space and flow',
    '2. components: 2-8 key UI elements with their emotional purpose',
    '',
    '💡 EXAMPLES of emotional translation:',
    '- "Quietude" → generous whitespace, soft typography, gentle transitions',
    '- "Morning light" → subtle gradients, warm color temperature',
    '- "Distance but warmth" → accessible but not overwhelming CTAs',
    '',
    '📝 Output ONLY valid JSON matching the schema.',
    '',
    'Design the emotionally-driven UI now:'
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
      { error: 'Rate limit exceeded. Please wait 15 seconds between requests.' }, 
      { status: 429 }
    );
  }

  try {
    // Parse JSON body
    const body = await request.json();
    const { emotion, screenType } = body;

    if (!emotion || !validateEmotionExtraction(emotion)) {
      return NextResponse.json({ error: 'Invalid emotion data provided' }, { status: 400 });
    }

    if (!screenType || typeof screenType !== 'string') {
      return NextResponse.json({ error: 'Screen type is required' }, { status: 400 });
    }

    // Model configuration with balanced temperature
    const modelConfig = {
      systemInstruction: {
        parts: [{
          text: 'You are a UI designer who specializes in translating emotional concepts into functional, beautiful interfaces. Balance creativity with usability. Always output valid JSON.'
        }]
      },
      generationConfig: {
        candidateCount: 1,
        maxOutputTokens: 2048,
        temperature: 0.8, // Balanced temperature for structured creativity
        responseMimeType: 'application/json',
        responseSchema: uiGenerationSchema
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

    // Generate UI structure
    const prompt = getUIGenerationPrompt(screenType as ScreenType);
    const inputData = {
      screen_type: screenType,
      emotion_input: emotion
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.log('=== UI GENERATION ===');
      console.log('Screen Type:', screenType);
      console.log('Emotion Input:', emotion);
      console.log('Temperature:', modelConfig.generationConfig.temperature);
    }

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      ...modelConfig,
      contents: createUserContent([
        prompt,
        `Input data: ${JSON.stringify(inputData, null, 2)}`
      ])
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

    let uiResult: UIGeneration;
    try {
      uiResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse failed:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON response from AI model. Please try again.' },
        { status: 500 }
      );
    }

    // Fill in missing fields
    if (!uiResult.version) {
      uiResult.version = '1.0';
    }
    if (!uiResult.screen_type) {
      uiResult.screen_type = screenType as ScreenType;
    }
    if (!uiResult.emotion_input) {
      uiResult.emotion_input = emotion;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('=== UI GENERATION SUCCESS ===');
      console.log('Result:', JSON.stringify(uiResult, null, 2));
    }

    // Save to database
    const { data: savedSpec, error: dbError } = await supabase
      .from('specs')
      .insert({
        user_id: user.id,
        modality: 'emotion-ui',
        source_meta: {
          screenType: screenType,
          emotion: emotion
        },
        spec: uiResult
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database save failed:', dbError);
      // Continue anyway, don't fail the entire request
    }

    // Return the UI generation
    return NextResponse.json({
      id: savedSpec?.id,
      ui: uiResult
    });

  } catch (error) {
    console.error('UI generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}