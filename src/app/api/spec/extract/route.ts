import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, createUserContent, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { validateMediaFileSecure } from '@/lib/mediaProcessor';
import { createClient } from '@/lib/supabase/server';
import { validateAndFillMEDS, medsSchema } from '@/lib/validation/medsSchema';
import { normalizeMeds } from '@/lib/spec/normalizeMeds';
import { deriveContextFromMeds } from '@/lib/ux/deriveContext';
import { evaluateRules, loadUXRulebook } from '@/lib/ux/evaluator';

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
    'You are a UI design system expert. Analyze this image and extract a structured design specification.',
    'Return ONLY valid JSON that strictly conforms to the provided responseSchema.',
    '',
    'EXAMPLE OUTPUT (simplified structure):',
    '{',
    '  "version": "1.1",',
    '  "modality": "image",',
    '  "viewportProfile": {"type": "desktop", "widthPx": 1200, "confidence": 0.9},',
    '  "foundations": {',
    '    "color": [{"token": "bg", "hex": "#ffffff"}, {"token": "text-primary", "hex": "#000000"}],',
    '    "typography": {"primaryFamily": "Inter", "familyCandidates": [{"family": "Inter", "confidence": 0.9}], "scalePx": [14,16,18], "weights": [400,600]},',
    '    "spacing": {"basePx": 8, "scalePx": [8,16,24]},',
    '    "radius": [0,4,8], "shadow": {"sm": "0 1px 2px rgba(0,0,0,0.1)"}, "motion": {"durationsMs": {"fast": 150, "standard": 300, "slow": 500}, "easings": ["ease-in-out"]},',
    '    "grid": {"columns": 12, "gapPx": 16, "containerMaxWidthPx": 1200}, "a11y": {"hitAreaPx": 44, "focusRing": {"widthPx": 2, "colorToken": "brand"}, "minContrast": "AA"}',
    '  },',
    '  "components": [{"type": "Button", "confidence": 0.8}, {"type": "TextField", "confidence": 0.9}],',
    '  "composition": {"pagePaddingPx": 24, "sectionGapPx": 32, "cardInnerPaddingPx": 16, "density": "comfortable"}',
    '}',
    '',
    'ANALYSIS RULES:',
    '• Use EXACT component types: AppBar,TopNav,Sidebar,Drawer,Tabs,Button,IconButton,TextField,TextArea,Select,Checkbox,RadioGroup,Switch,Card,ListItem,Table,Badge,Avatar,Modal,Dialog,Alert',
    '• NEVER use categories like "Navigation", "Form", "Input" - only specific types above',
    '• Color tokens MUST be: bg, surface, border, text-primary, text-secondary, brand, accent, error, success, warning',
    '• Motion easings MUST be: linear, ease-in, ease-out, ease-in-out (NEVER "unknown")',
    '• Shadow MUST be object with properties, NEVER null',
    '• Quantize measurements to 8px multiples (8,16,24,32...)',
    '• Platform: mobile<768px, tablet<1024px, desktop≥1024px',
    '• Use "unknown" ONLY for numeric values, not for enums',
    '• Include 5+ color tokens, 3+ typography sizes, 3+ spacing values',
    '• Set confidence 0.0-1.0 based on visual clarity',
    '',
    'CRITICAL: Follow the exact JSON schema structure. No deviation allowed.'
  ].join('\n');
}

// Default UX rules (12 rules as mentioned in requirements)
function getDefaultUxRules() {
  return [
    {
      id: 'nav-01',
      family: 'Navigation',
      event: 'click',
      selector: { location: 'TopNav', labelIncludes: ['home', 'dashboard'] },
      action: 'route',
      destination: { screen: 'home' },
      priority: 'high',
      confidence: 0.9,
      origin: 'global-default',
      rationale: ['Standard navigation pattern']
    },
    {
      id: 'nav-02',
      family: 'Navigation',
      event: 'click',
      selector: { location: 'Sidebar', icon: 'chevron-right' },
      action: 'route',
      priority: 'medium',
      confidence: 0.8,
      origin: 'global-default',
      rationale: ['Sidebar navigation expansion']
    },
    {
      id: 'detail-01',
      family: 'Details',
      event: 'click',
      selector: { location: 'Card', labelIncludes: ['view', 'details'] },
      action: 'modal',
      alternatives: ['sheet', 'route'],
      priority: 'high',
      confidence: 0.9,
      origin: 'global-default',
      rationale: ['Card detail view pattern']
    },
    {
      id: 'detail-02',
      family: 'Details',
      event: 'click',
      selector: { location: 'TableRow' },
      action: 'modal',
      alternatives: ['route'],
      priority: 'medium',
      confidence: 0.7,
      origin: 'global-default',
      rationale: ['Table row expansion']
    },
    {
      id: 'edit-01',
      family: 'Edit',
      event: 'click',
      selector: { location: 'Content', labelIncludes: ['edit', 'modify'] },
      action: 'modal',
      alternatives: ['sheet', 'inline'],
      priority: 'high',
      confidence: 0.8,
      origin: 'global-default',
      rationale: ['Edit action pattern']
    },
    {
      id: 'edit-02',
      family: 'Edit',
      event: 'click',
      selector: { icon: 'plus' },
      action: 'modal',
      alternatives: ['route'],
      priority: 'medium',
      confidence: 0.8,
      origin: 'global-default',
      rationale: ['Create new item pattern']
    },
    {
      id: 'menu-01',
      family: 'Menus',
      event: 'click',
      selector: { icon: 'ellipsis' },
      action: 'dropdown',
      alternatives: ['popover'],
      priority: 'high',
      confidence: 0.9,
      origin: 'global-default',
      rationale: ['Context menu pattern']
    },
    {
      id: 'menu-02',
      family: 'Menus',
      event: 'hover',
      selector: { location: 'TopNav' },
      action: 'dropdown',
      priority: 'medium',
      confidence: 0.7,
      origin: 'global-default',
      rationale: ['Navigation dropdown on hover']
    },
    {
      id: 'confirm-01',
      family: 'Confirm',
      event: 'click',
      selector: { labelIncludes: ['delete', 'remove'] },
      action: 'modal',
      alternatives: ['banner'],
      priority: 'high',
      confidence: 0.9,
      origin: 'global-default',
      rationale: ['Destructive action confirmation']
    },
    {
      id: 'feedback-01',
      family: 'Feedback',
      event: 'submit',
      action: 'toast',
      alternatives: ['banner'],
      priority: 'medium',
      confidence: 0.8,
      origin: 'global-default',
      rationale: ['Form submission feedback']
    },
    {
      id: 'target-01',
      family: 'Target',
      event: 'click',
      selector: { icon: 'external' },
      action: 'external',
      priority: 'medium',
      confidence: 0.9,
      origin: 'global-default',
      rationale: ['External link pattern']
    },
    {
      id: 'target-02',
      family: 'Target',
      event: 'click',
      selector: { icon: 'download' },
      action: 'download',
      priority: 'medium',
      confidence: 0.9,
      origin: 'global-default',
      rationale: ['Download action pattern']
    }
  ];
}

// Generate uxSignals based on the MEDS spec
function generateUxSignals(medsSpec: any) {
  const viewportProfile = medsSpec.viewportProfile || {};
  const platform = viewportProfile.type || 'desktop';
  
  // Infer UI patterns from components
  const components = Array.isArray(medsSpec.components) ? medsSpec.components : [];
  const hasTopNav = components.some((c: any) => 
    c.type === 'AppBar' || c.type === 'TopNav'
  );
  
  const hasSidebar = components.some((c: any) => 
    c.type === 'Sidebar' || c.type === 'Drawer'
  );
  
  // Infer density from spacing
  const foundations = medsSpec.foundations || {};
  const spacing = foundations.spacing || {};
  const scalePx = Array.isArray(spacing.scalePx) ? spacing.scalePx as number[] : [];
  const avgSpacing = scalePx.length > 0 
    ? scalePx.reduce((a, b) => a + b, 0) / scalePx.length 
    : 16;
  const density = avgSpacing < 12 ? 'compact' : 'comfortable';
  
  // Infer common icons from component types
  const icons = [];
  if (components.some((c: any) => c.type === 'Dropdown' || c.type === 'DropdownMenu')) {
    icons.push('chevron-right');
  }
  if (components.some((c: any) => c.type === 'Modal' || c.type === 'Dialog')) {
    icons.push('ellipsis');
  }
  
  // Infer CTA labels from common patterns
  const ctaLabels = ['Save', 'Cancel', 'Submit', 'Continue'];
  
  return {
    platform: platform as 'mobile' | 'tablet' | 'desktop',
    layout: {
      topNav: hasTopNav,
      sidebar: hasSidebar,
      density: density as 'comfortable' | 'compact'
    },
    icons,
    ctaLabels
  };
}

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

      // Check if bucket exists, create if needed
      const { error: bucketError } = await supabase.storage
        .createBucket('images', { public: true });
      
      if (bucketError && !bucketError.message.includes('already exists')) {
        console.warn('Failed to create bucket:', bucketError);
      }

      const { error: storageError } = await supabase.storage
        .from('images')
        .upload(filePath, inputBuffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false
        });

      if (storageError) {
        console.warn('Failed to save image to storage:', storageError);
      } else {
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);
        
        imageUrl = urlData?.publicUrl;
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
      } catch (geminiError: any) {
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
      console.log('Components:', (normalizedSpec as any).components?.map((c: any) => c.type));
      console.log('Color tokens:', ((normalizedSpec as any).foundations?.color as any[])?.map((c: any) => c.token));
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

    const medsSpec = validationResult.spec!;

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
      
      // Add UX decisions to the spec
      (medsSpec as any).uxDecisions = uxEvaluation.decisions;
      (medsSpec as any).uxPolicy = uxEvaluation.policyMeta;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('UX Decisions:', uxEvaluation.decisions.length);
        console.log('Policy:', uxEvaluation.policyMeta.policyId);
      }
    } catch (uxError) {
      console.warn('UX evaluation failed, continuing without UX decisions:', uxError);
    }

    // Inject default uxRulebook if not provided by AI (legacy support)
    if (!medsSpec.uxRulebook || !medsSpec.uxRulebook.rules || medsSpec.uxRulebook.rules.length === 0) {
      medsSpec.uxRulebook = {
        version: '0.1',
        platform: medsSpec.viewportProfile?.type || 'desktop',
        rules: getDefaultUxRules() as any,
        defaults: {
          detailOpen: { desktop: 'modal', mobile: 'sheet' },
          editOpen: { desktop: 'modal', mobile: 'sheet' },
          settingsOpen: 'drawer'
        }
      };
    }

    // Generate uxSignals if not provided (legacy support)
    if (!medsSpec.uxSignals) {
      medsSpec.uxSignals = generateUxSignals(medsSpec);
    }

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