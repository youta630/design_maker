import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, createUserContent, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { createClient } from '@/lib/supabase/server';
import { uploadFile } from '@/lib/storage';
import { validateMediaFileSecure } from '@/lib/mediaProcessor';
import type { EmotionExtraction, UIGeneration, ScreenType } from '@/lib/emotion/types';
import emotionSchema from '@/schemas/emotion.schema.json';
import uiGenerationSchema from '@/schemas/ui-generation.schema.json';

export const runtime = 'nodejs';
export const maxDuration = 120; // Extended timeout for full pipeline

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY environment variable is not set');
}

const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

// Rate limiting (60s per user for full pipeline)
const rateLimitMap = new Map<string, number>();

function checkUserRateLimit(userId: string): boolean {
  const now = Date.now();
  const lastRequest = rateLimitMap.get(userId);
  
  if (!lastRequest || (now - lastRequest) > 60000) { // 60 seconds
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
  let uploadedImagePath: string | null = null;
  
  try {
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
        { error: 'Rate limit exceeded. Please wait 60 seconds between requests.' }, 
        { status: 429 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const fileEntry = formData.get('file');
    const screenType = formData.get('screenType') as string;

    if (!fileEntry || !(fileEntry instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!screenType || typeof screenType !== 'string') {
      return NextResponse.json({ error: 'Screen type is required' }, { status: 400 });
    }

    const file = fileEntry;

    // File validation
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image uploads are supported' }, { status: 400 });
    }

    const validation = await validateMediaFileSecure(file);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Check usage limit before processing
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: monthlyUsage } = await supabase
      .from('usage_monthly')
      .select('count, limit_count')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .single();

    const usageCount = monthlyUsage?.count || 0;
    const monthlyLimit = monthlyUsage?.limit_count || 50;

    if (usageCount >= monthlyLimit) {
      return NextResponse.json(
        { error: `Monthly usage limit reached (${usageCount}/${monthlyLimit}). Please upgrade for unlimited access.` }, 
        { status: 429 }
      );
    }

   
    // Step 1: Upload image to Supabase Storage
    const uploadResult = await uploadFile(file, user.id);
    
    if (uploadResult.error) {
      return NextResponse.json({ error: `Image upload failed: ${uploadResult.error}` }, { status: 500 });
    }

    uploadedImagePath = uploadResult.path;
    const imageUrl = uploadResult.publicUrl;
    
   

    // Step 2: Extract emotions from image
   
    const bytes = await file.arrayBuffer();
    const inputBuffer = Buffer.from(bytes);
    const base64 = inputBuffer.toString('base64');
    
    const emotionModelConfig = {
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
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      ],
    };

    const emotionPrompt = getEmotionExtractionPrompt();
    const mediaPart = {
      inlineData: {
        data: base64,
        mimeType: file.type
      }
    };

    const emotionResponse = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      ...emotionModelConfig,
      contents: createUserContent([emotionPrompt, mediaPart])
    });

    let emotionText = emotionResponse?.text?.trim() ?? '';
    const emotionFenceMatch = emotionText.match(/```json\s*([\s\S]*?)```/i) || emotionText.match(/```\s*([\s\S]*?)```/i);
    if (emotionFenceMatch && emotionFenceMatch[1]) {
      emotionText = emotionFenceMatch[1].trim();
    }

    let emotionResult: EmotionExtraction;
    try {
      emotionResult = JSON.parse(emotionText);
      if (!emotionResult.version) {
        emotionResult.version = '1.0';
      }
    } catch (parseError) {
      console.error('Emotion JSON parse failed:', parseError);
      // Cleanup uploaded image on error
      if (uploadedImagePath) {
        await supabase.storage.from('design-files').remove([uploadedImagePath]);
      }
      return NextResponse.json(
        { error: 'Invalid emotion extraction response. Please try again.' },
        { status: 500 }
      );
    }

    console.log('✨ Emotion extracted:', emotionResult);

    // Step 3: Generate UI from emotions
    console.log('🏗️ Step 3: Generating UI...');
    const uiModelConfig = {
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
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      ],
    };

    const uiPrompt = getUIGenerationPrompt(screenType as ScreenType);
    const inputData = {
      screen_type: screenType,
      emotion_input: emotionResult
    };

    const uiResponse = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      ...uiModelConfig,
      contents: createUserContent([
        uiPrompt,
        `Input data: ${JSON.stringify(inputData, null, 2)}`
      ])
    });

    let uiText = uiResponse?.text?.trim() ?? '';
    const uiFenceMatch = uiText.match(/```json\s*([\s\S]*?)```/i) || uiText.match(/```\s*([\s\S]*?)```/i);
    if (uiFenceMatch && uiFenceMatch[1]) {
      uiText = uiFenceMatch[1].trim();
    }

    let uiResult: UIGeneration;
    try {
      uiResult = JSON.parse(uiText);
      if (!uiResult.version) uiResult.version = '1.0';
      if (!uiResult.screen_type) uiResult.screen_type = screenType as ScreenType;
      if (!uiResult.emotion_input) uiResult.emotion_input = emotionResult;
    } catch (parseError) {
      console.error('UI JSON parse failed:', parseError);
      // Cleanup uploaded image on error
      if (uploadedImagePath) {
        await supabase.storage.from('design-files').remove([uploadedImagePath]);
      }
      return NextResponse.json(
        { error: 'Invalid UI generation response. Please try again.' },
        { status: 500 }
      );
    }

   

    // Step 4: Save complete result to database
    const completeSpec = {
      emotion: emotionResult,
      ui: uiResult
    };

    const { data: savedSpec, error: dbError } = await supabase
      .from('specs')
      .insert({
        user_id: user.id,
        source_meta: {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          imageUrl: imageUrl
        },
        spec: completeSpec
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database save failed:', dbError);
      // Cleanup uploaded image on error
      if (uploadedImagePath) {
        await supabase.storage.from('design-files').remove([uploadedImagePath]);
      }
      return NextResponse.json({ error: 'Failed to save results' }, { status: 500 });
    }

    // Step 5: Increment usage count (only on full success)
    
    try {
      const { error: incrementError } = await supabase
        .rpc('increment_monthly_usage', {
          p_user_id: user.id,
          p_month: currentMonth
        });

      if (incrementError) {
        console.error('Usage increment failed (non-critical):', incrementError);
        // Don't fail the entire request for usage counting errors
      }
    } catch (usageError) {
      console.error('Usage count error (non-critical):', usageError);
    }

   

    // Return complete result
    return NextResponse.json({
      id: savedSpec.id,
      imageUrl: imageUrl,
      emotion: emotionResult,
      ui: uiResult
    });

  } catch (error) {
    console.error('Design generation pipeline error:', error);
    
    // Cleanup uploaded image on any error
    if (uploadedImagePath) {
      try {
        const supabase = await createClient();
        await supabase.storage.from('design-files').remove([uploadedImagePath]);
        console.log('🧹 Cleaned up uploaded image after error');
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded image:', cleanupError);
      }
    }
    
    return NextResponse.json(
      { error: 'Design generation failed' },
      { status: 500 }
    );
  }
}