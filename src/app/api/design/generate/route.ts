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

function getEmotionExtractionPrompt(screenType: ScreenType): string {
  return [
    '🎨 You are a visionary design strategist who thinks through visual association chains.',
    '',
    'Transform the given image into creative UI concepts through structured associative thinking.',
    '',
    '🧠 THINKING PROCESS:',
    '',
    '**Phase 1: Visual Trigger Extraction**',
    '- Identify 2-5 key visual elements that catch attention',
    '- Focus on: colors, shapes, textures, spatial relationships, lighting, emotions',
    '',
    '**Phase 2: Associative Chain Development**',
    '- For each trigger, develop 2-4 association paths in parallel',
    '- Each chain should have 2-5 steps of connected concepts',
    '- Vary conceptual depth: surface → metaphorical → abstract → philosophical',
    '- Think like: "Red apple → gravity → Newton → discovery moment"',
    '',
    `**Phase 3: Screen-Type Contextual Selection (Target: ${screenType})**`,
    '- Consider which association path best serves the screen\'s purpose:',
    '  * home: First impression, attention, memorable impact',
    '  * browse: Content exploration, visual hierarchy, flow',
    '  * detail: Focus, clarity, information architecture',
    '  * input: Usability, trust, completion motivation',
    '  * dashboard: Efficiency, overview, data comprehension',
    '  * compare: Decision support, clear differentiation',
    `- Select the most contextually appropriate concept for a ${screenType} screen`,
    '',
    '🎯 OUTPUT REQUIREMENTS:',
    '- Generate multiple creative paths, then converge on the best fit',
    '- Ensure the final metaphor is UI-implementable',
    '- Balance creativity with practical design constraints',
    '',
    '📝 Output ONLY valid JSON matching the schema.',
    '',
    'Extract and develop visual associations now:'
  ].join('\n');
}

function getUIGenerationPrompt(screenType: ScreenType): string {
  const commonInstructions = [
    '🎨 You are a visionary UX choreographer and master of kinetic design.',
    '',
    'Transform the given associative concept into a breathtaking, dynamic UI experience.',
    'Your design should feel alive, translating the core metaphor into functional beauty.',
    '',
    '📝 INPUT: You will receive associative thinking results with:',
    '- Core metaphor (e.g., "red objects falling by gravity")',
    '- Emotional direction (e.g., "discovery and surprise")', 
    '- Interaction essence (e.g., "moment of revelation")',
    ''
  ];

  const specificGuidance = getScreenSpecificGuidance(screenType);
  
  const commonOutput = [
    '',
    '📐 STRUCTURE YOUR RESPONSE:',
    '1. layout_description: How the metaphor translates to overall space, flow, and visual hierarchy',
    '2. components: 2-8 key UI elements, each with:',
    '   - name: Component name (e.g., "Hero Title", "Primary CTA")',
    '   - metaphor: How this element embodies the core metaphor',
    '   - style_and_texture: Visual style, lighting, texture, animation details',
    '   - function_and_interaction: Purpose and user interaction behavior',
    '',
    '📝 Output ONLY valid JSON matching the schema.',
    '',
    'Design the metaphor-driven UI now:'
  ];

  return [...commonInstructions, specificGuidance, ...commonOutput].join('\n');
}

function getScreenSpecificGuidance(screenType: ScreenType): string {
  switch(screenType) {
    case 'home':
      return getVisualImpactGuidance();
    case 'browse':
    case 'dashboard':
      return getEfficiencyGuidance();
    case 'detail':
      return getEngagementGuidance();
    case 'input':
    case 'compare':
      return getUsabilityGuidance();
    default:
      return getVisualImpactGuidance();
  }
}

function getVisualImpactGuidance(): string {
  return [
    '✨ VISUAL IMPACT FOCUS (Home Screen):',
    '- Prioritize memorable first impression and emotional engagement',
    '- Create a Hero section that dramatically embodies the core metaphor',
    '- Use bold visual elements that immediately communicate brand essence',
    '',
    '🎭 AVAILABLE EXPRESSION TECHNIQUES:',
    '- **Scroll-driven effects**: Parallax layers, step reveals, sticky storytelling',
    '- **Advanced typography**: Variable font animations, morphing text, gradient text',
    '- **Spatial depth**: CSS 3D transforms, masking/clipping (waves, circles), layer blur',
    '- **Dynamic elements**: Particle fields, custom cursors, magnetic attraction',
    '- **Light & color**: Environmental glow, blend modes, breathing highlights',
    '- **Procedural**: Generative backgrounds, noise patterns, organic shapes',
    '',
    '🎯 LAYOUT PRIORITIES:',
    '- Hero section (60-80% viewport) with metaphor embodiment',
    '- Clear value proposition integrated with visual concept',
    '- Strong call-to-action that feels part of the metaphor',
    '- Secondary sections that extend the narrative'
  ].join('\n');
}

function getEfficiencyGuidance(): string {
  return [
    '🔧 EFFICIENCY FOCUS (Browse/Dashboard):',
    '- Prioritize information findability and task completion',
    '- Ensure the metaphor enhances rather than hinders functionality',
    '- Create clear visual hierarchy and intuitive navigation patterns',
    '',
    '⚡ AVAILABLE EXPRESSION TECHNIQUES:',
    '- **Micro-interactions**: Hover ripples, snap/bounce toggles, loading shimmers',
    '- **Smart layouts**: Container queries, responsive card grids, anchor positioning',
    '- **Data visualization**: Animated charts, tooltip delays, filter morphing',
    '- **Performance**: Skeleton loading, optimistic UI, smooth transitions',
    '- **Feedback**: Toast notifications, validation states, progress indicators',
    '',
    '🗂️ LAYOUT PRIORITIES:',
    '- Header with search/filters prominently placed',
    '- Grid or list view with clear item hierarchy',
    '- Pagination or infinite scroll with loading states',
    '- Sidebar or secondary navigation if needed',
    '- Empty states that maintain engagement'
  ].join('\n');
}

function getEngagementGuidance(): string {
  return [
    '🎪 ENGAGEMENT FOCUS (Detail Screen):',
    '- Create immersive experience that draws users deeper',
    '- Use metaphor to enhance content consumption and emotional connection',
    '- Balance rich visuals with content readability',
    '',
    '🌟 AVAILABLE EXPRESSION TECHNIQUES:',
    '- **Content transitions**: View transitions, layout morphing, element inheritance',
    '- **Interactive media**: Hover zoom, gesture-based navigation, 3D product views',
    '- **Storytelling**: Kinetic typography, Lottie animations, scroll-triggered reveals',
    '- **Spatial interaction**: Device motion effects, cursor trails, magnetic elements',
    '- **Rich feedback**: Physical UI responses, spring animations, haptic suggestions',
    '',
    '📖 LAYOUT PRIORITIES:',
    '- Compelling header/hero showcasing main content',
    '- Structured content sections with clear information hierarchy',
    '- Related content or recommendations seamlessly integrated',
    '- Action buttons (share, save, purchase) contextually placed',
    '- Breadcrumb or back navigation that maintains context'
  ].join('\n');
}

function getUsabilityGuidance(): string {
  return [
    '🛡️ USABILITY FOCUS (Input/Compare):',
    '- Prioritize clarity, accessibility, and error prevention',
    '- Apply metaphor subtly to support rather than distract from tasks',
    '- Ensure excellent form usability and clear comparison logic',
    '',
    '🎯 AVAILABLE EXPRESSION TECHNIQUES:',
    '- **Form enhancement**: Live validation, smooth error states, progress breathing',
    '- **Feedback systems**: Success confirmations, gentle error recovery, status updates',
    '- **Accessibility**: Focus indicators, reduced motion alternatives, screen reader support',
    '- **Trust building**: Professional micro-animations, consistent visual language',
    '- **Completion support**: Step indicators, auto-save feedback, clear next actions',
    '',
    '📋 LAYOUT PRIORITIES:',
    '- Clear form structure with logical field grouping',
    '- Prominent labels and helpful placeholder text',
    '- Error messages positioned for easy scanning',
    '- Progress indicators for multi-step processes',
    '- Clear submission/comparison actions with loading states'
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

    const emotionPrompt = getEmotionExtractionPrompt(screenType as ScreenType);
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
        emotionResult.version = '2.0';
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