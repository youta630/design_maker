import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, createUserContent, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { validateMediaFileSecure } from '@/lib/mediaProcessor';
import { createClient } from '@/lib/supabase/server';
import { validateAndFillMEDS, medsSchema } from '@/lib/validation/medsSchema';
import { normalizeMeds } from '@/lib/spec/normalizeMeds';
import { deriveContextFromMeds } from '@/lib/ux/deriveContext';
import { evaluateRules, loadUXRulebook } from '@/lib/ux/evaluator';
import { integrateUXIntoMEDS } from '@/lib/ux/integrator';
import { ensureDesignFilesBucket } from '@/lib/supabase/setup';

export const runtime = 'nodejs';
export const maxDuration = 120;

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

function getMEDSPrompt(): string {
  return [
    '🎯 FOCUS: Extract core visual design elements from the IMAGE. UX patterns will be enhanced automatically.',
    'OUTPUT: Return ONLY a valid JSON object matching the responseSchema.',
    '',
    '🔥 PRIORITIES (in order):',
    '1. COLORS: Extract 5-8 semantic color tokens with accurate hex values',
    '2. TYPOGRAPHY: Identify font families, sizes (multiples of 8), and weights', 
    '3. COMPONENTS: List visible UI elements with high confidence scores',
    '4. LAYOUT: Analyze spacing, padding, and viewport characteristics',
    '',
    '✅ COMPONENT TYPES (use exact names):',
    'AppBar, TopNav, Sidebar, Drawer, Tabs, Button, IconButton, TextField, TextArea, Select, Checkbox, RadioGroup, Switch, Card, ListItem, Table, Badge, Avatar, Modal, Dialog, Alert',
    '',
    '🎨 COLOR TOKENS (choose 5-8 from these):',
    'bg, surface, border, text-primary, text-secondary, text-inverse, brand, accent, error, success, warning, overlay',
    '',
    '📏 MEASUREMENT RULES:',
    '- All sizes: multiples of 8 (8, 16, 24, 32, 48, 64)',
    '- Viewport: mobile<768, tablet<1024, desktop≥1024',
    '- Confidence: decimal 0.0-1.0 (not strings)',
    '',
    '⚡ OPTIMIZATIONS:',
    '- Focus on what you can clearly see',
    '- Use "unknown" for unclear measurements', 
    '- Skip complex UX states (handled automatically)',
    '- Prefer specific over generic',
    '',
    '🚫 NEVER:',
    '- Generic categories ("Form", "Navigation")',
    '- Non-8-multiple measurements (15, 25, 30)',
    '- Invented color tokens',
    '- String confidence values',
    '',
    'Extract the core design now:'
  ].join('\n');
}

// Legacy UX rules removed - now handled by sophisticated ux_rule.json evaluation

// Legacy uxSignals generation removed - context is now derived by deriveContextFromMeds

// JSON-only analyzeWithRetryLogic (inline, no CSV/video fallback)
async function analyzeWithRetryLogic(
  buffer: Buffer,
  mimeType: string,
  prompt: string,
  modelConfig: Record<string, unknown>
): Promise<string> {
  if (!genAI) throw new Error('Gemini API not initialized');

  // First attempt with responseSchema enforced
  const base64 = buffer.toString('base64');
  const mediaPart = {
    inlineData: {
      data: base64,
      mimeType
    }
  };

  const first = await genAI.models.generateContent({
    model: 'gemini-2.5-flash',
    ...modelConfig,
    contents: createUserContent([prompt, mediaPart])
  });
  let text = first?.text?.trim() ?? '';

  // Try to coerce code-fenced JSON if present
  const fenceMatch = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) text = fenceMatch[1].trim();

  // If valid JSON, return
  try {
    JSON.parse(text);
    return text;
  } catch {}

  // Repair pass: ask to convert to pure JSON only
  const repair = await genAI.models.generateContent({
    model: 'gemini-2.5-flash',
    ...modelConfig,
    contents: createUserContent([
      'Convert the following into VALID JSON that conforms exactly to the responseSchema. Output JSON only. Use "unknown" when unsure.',
      text
    ])
  });
  let repaired = repair?.text?.trim() ?? '';
  const rFence = repaired.match(/```json\s*([\s\S]*?)```/i) || repaired.match(/```\s*([\s\S]*?)```/i);
  if (rFence && rFence[1]) repaired = rFence[1].trim();
  JSON.parse(repaired); // throws if invalid
  return repaired;
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

    // Save uploaded image to Supabase Storage for history preview
    let imageUrl: string | undefined;
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Ensure bucket exists (auto-setup if possible)
      const bucketSetup = await ensureDesignFilesBucket();
      if (!bucketSetup.success) {
        console.warn('Bucket setup failed:', bucketSetup.error);
        // Continue anyway - some users might have manual setup
      }

      const { error: storageError } = await supabase.storage
        .from('design-files')
        .upload(filePath, inputBuffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false
        });

      if (storageError) {
        console.warn('Failed to save image to storage:', storageError);
      } else {
        // Get public URL - ensure proper format
        const { data: urlData } = supabase.storage
          .from('design-files')
          .getPublicUrl(filePath);
        
        imageUrl = urlData?.publicUrl;
        console.log('Generated imageUrl:', imageUrl);
        
        // Fallback: construct URL manually if getPublicUrl fails
        if (!imageUrl || imageUrl.includes('undefined')) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          if (supabaseUrl) {
            imageUrl = `${supabaseUrl}/storage/v1/object/public/design-files/${filePath}`;
            console.log('Fallback imageUrl:', imageUrl);
          }
        }
      }
    } catch (storageErr) {
      console.warn('Storage operation failed:', storageErr);
    }

    // Model configuration (responseSchema enforced)
    const modelConfig = {
      systemInstruction: {
        parts: [{
          text: 'You are a UI design system expert specializing in extracting structured specifications from design images. Always output valid JSON that matches the provided schema exactly. Never deviate from the component type enums provided.'
        }]
      },
      generationConfig: {
        candidateCount: 1,
        maxOutputTokens: 4096,
        temperature: 0.05,
        responseMimeType: 'application/json',
        responseSchema: medsSchema
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

    // Generate MEDS spec with enhanced retry pipeline
    const prompt = getMEDSPrompt();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('=== GEMINI CONFIGURATION ===');
      console.log('Model:', modelConfig.generationConfig);
      console.log('ResponseSchema enabled:', !!modelConfig.generationConfig?.responseSchema);
      console.log('Prompt length:', prompt.length);
      console.log('Prompt:', prompt);
    }
    
    let responseText: string | undefined;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        responseText = await analyzeWithRetryLogic(
          inputBuffer,
          file.type,
          prompt,
          modelConfig
        );
        break; // Success, exit retry loop
      } catch (geminiError: unknown) {
        retryCount++;
        console.error(`Gemini generation failed (attempt ${retryCount}):`, geminiError);
        
        if (retryCount > maxRetries) {
          return NextResponse.json(
            { error: 'Failed to generate UI specification after multiple attempts. Please try again.' },
            { status: 500 }
          );
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    if (!responseText) {
      return NextResponse.json(
        { error: 'Failed to get response from AI model.' },
        { status: 500 }
      );
    }

    // Parse and process response with new pipeline
    let rawSpec;
    try {
      // Clean response text if it's wrapped in markdown
      let cleanedResponse = responseText.trim();

      if (process.env.NODE_ENV === 'development') {
        console.log('=== GEMINI RAW RESPONSE ===');
        console.log('Length:', responseText.length);
        console.log('First 500 chars:', responseText.substring(0, 500));
        console.log('Last 200 chars:', responseText.substring(Math.max(0, responseText.length - 200)));
      }

      // Handle text fallback - extract first JSON object
      if (!cleanedResponse.startsWith('{') && !cleanedResponse.startsWith('```')) {
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedResponse = jsonMatch[0];
          console.log('Extracted JSON from text response');
        }
      }

      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('=== CLEANED RESPONSE ===');
        console.log('First 500 chars:', cleanedResponse.substring(0, 500));
      }

      rawSpec = JSON.parse(cleanedResponse);
      
    } catch (parseError) {
      console.error('JSON parse failed:', parseError);
      console.error('Response text (first 1000 chars):', responseText.substring(0, 1000));
      return NextResponse.json(
        { error: 'Invalid JSON response from AI model. Please try again.' },
        { status: 500 }
      );
    }

    // NEW PIPELINE: Normalize → Validate → UX Evaluation
    if (process.env.NODE_ENV === 'development') {
      console.log('=== STARTING NORMALIZATION PIPELINE ===');
    }

    // Step 1: Normalize AI output
    const normalizedSpec = normalizeMeds(rawSpec);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('=== NORMALIZED SPEC ===');
      console.log('Components:', (normalizedSpec as Record<string, unknown>).components);
      console.log('Color tokens:', (normalizedSpec as Record<string, unknown>).foundations);
    }

    // Step 2: Validate and fill defaults
    const validationResult = validateAndFillMEDS(normalizedSpec);
    
    if (!validationResult.ok) {
      console.error('Validation failed after normalization:', validationResult.errors);
      if (process.env.NODE_ENV === 'development') {
        console.log('Full normalized spec:', JSON.stringify(normalizedSpec, null, 2));
      }
      return NextResponse.json(
        { error: 'Generated specification failed validation. Please try again.' },
        { status: 500 }
      );
    }

    let medsSpec = validationResult.spec!;

    // Add source metadata (only if not already present from AI)
    medsSpec.source = medsSpec.source || {
      fileName: file.name,
      fileSize: file.size
    };
    medsSpec.modality = 'image';

    // Step 3: UX Context Derivation and Rule Evaluation
    if (process.env.NODE_ENV === 'development') {
      console.log('=== UX EVALUATION ===');
    }

    const uxContext = deriveContextFromMeds(medsSpec);
    const platform = medsSpec.viewportProfile.type === 'tablet' ? 'mobile' : medsSpec.viewportProfile.type;
    
    try {
      const rulebook = await loadUXRulebook();
      const uxEvaluation = evaluateRules(rulebook, uxContext, platform);
      
      // 🚀 NEW: Integrate UX decisions into MEDS structure
      medsSpec = integrateUXIntoMEDS(medsSpec, uxEvaluation);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('=== UX INTEGRATION SUCCESS ===');
        console.log('UX Context:', JSON.stringify(uxContext, null, 2));
        console.log('UX Decisions integrated:', uxEvaluation.decisions.length);
        console.log('Policy:', uxEvaluation.policyMeta.policyId);
        console.log('Enhanced components count:', medsSpec.components.length);
        console.log('Enhanced patterns:', (medsSpec as unknown as Record<string, unknown>).patterns);
      }
    } catch (uxError) {
      console.error('UX evaluation failed:', uxError);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('UX Context that failed:', JSON.stringify(uxContext, null, 2));
        console.log('Proceeding with base MEDS spec without UX enhancements');
      }
    }

    // Legacy fields are no longer needed - UX evaluation is handled by uxDecisions/uxPolicy
    // which are generated in the UX evaluation pipeline above

    // Save to database
    const { data: savedSpec, error: dbError } = await supabase
      .from('specs')
      .insert({
        user_id: user.id,
        modality: 'image',
        source_meta: {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          imageUrl
        },
        spec: medsSpec
      })
      .select()
      .single();

    if (dbError || !savedSpec) {
      console.error('Database save failed:', dbError);
      return NextResponse.json(
        { error: 'Failed to save specification' },
        { status: 500 }
      );
    }

    // Increment usage count only on successful extraction
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const usageResponse = await fetch(new URL('/api/usage', request.url), {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!usageResponse.ok) {
          console.error('Failed to increment usage count:', await usageResponse.text());
          // Don't fail the entire request for usage count failure
        }
      }
    } catch (usageError) {
      console.error('Usage increment error:', usageError);
      // Don't fail the entire request for usage count failure
    }

    // Return the generated spec
    return NextResponse.json({
      id: savedSpec.id,
      spec: medsSpec
    });

  } catch (error) {
    console.error('Spec extraction error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}