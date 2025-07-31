import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import medsSchema from '../../schemas/meds.schema.json';

// MEDS v1.1 Types (generated from schema)
export interface MEDSSpec {
  version: '1.1';
  modality: 'image';
  source?: {
    fileName: string;
    fileSize?: number;
  };
  viewportProfile: {
    type: 'mobile' | 'tablet' | 'desktop';
    widthPx: number | 'unknown';
    heightPx?: number | 'unknown';
    confidence: number;
  };
  foundations: {
    color: Array<{
      token: 'bg' | 'surface' | 'border' | 'text-primary' | 'text-secondary' | 'text-inverse' | 'brand' | 'accent' | 'error' | 'success' | 'warning' | 'overlay';
      hex: string;
      usage?: string;
    }>;
    typography: {
      primaryFamily: string;
      familyCandidates: Array<{
        family: string;
        confidence: number;
      }>;
      scalePx: number[];
      weights: number[];
      lineHeights?: number[];
    };
    spacing: {
      basePx: number;
      scalePx: number[];
    };
    radius: number[];
    shadow?: {
      none?: string;
      sm?: string;
      md?: string;
      lg?: string;
    } | null;
    motion: {
      durationsMs: {
        fast: number | 'unknown';
        standard: number | 'unknown';
        slow: number | 'unknown';
      };
      easings: string[];
    };
    grid: {
      columns: number;
      gapPx: number | 'unknown';
      containerMaxWidthPx: number | 'unknown';
    };
    a11y: {
      hitAreaPx: number;
      focusRing: {
        widthPx: number;
        colorToken: string;
      };
      minContrast: 'AA' | 'AAA';
    };
  };
  components: Array<{
    id?: string;
    type: string;
    variants?: Array<{
      name: string;
      style: ComponentStyle;
    }>;
    states?: Array<{
      name: string;
      style: ComponentStyle;
    }>;
    style?: ComponentStyle;
    confidence?: number;
  }>;
  composition: {
    pagePaddingPx: number | 'unknown';
    sectionGapPx: number | 'unknown';
    cardInnerPaddingPx: number | 'unknown';
    density: 'comfortable' | 'compact';
  };
  motionPatterns?: {
    micro?: string[];
    macro?: string[];
  };
  scene?: Record<string, unknown>;
  screenflow?: Record<string, unknown>;
  uxRulebook?: {
    version: '0.1';
    platform: 'mobile' | 'tablet' | 'desktop';
    rules: Array<{
      id: string;
      family: string;
      event: string;
      selector?: Record<string, unknown>;
      conditions?: string[];
      action: string;
      alternatives?: string[];
      destination?: { screen: string };
      priority: 'high' | 'medium' | 'low';
      confidence?: number;
      origin?: 'global-default' | 'image-heuristic';
      rationale?: string[];
    }>;
    defaults?: Record<string, unknown>;
  };
  uxSignals?: {
    platform: 'mobile' | 'tablet' | 'desktop';
    layout?: {
      topNav?: boolean;
      sidebar?: boolean;
      density?: 'comfortable' | 'compact' | 'unknown';
    };
    icons?: string[];
    ctaLabels?: string[];
  };
  unclear?: string[];
}

interface ComponentStyle {
  colors?: {
    bg?: string;
    text?: string;
    border?: string;
    accent?: string;
  };
  typography?: {
    sizePx?: number | 'unknown';
    weight?: number;
    lineHeight?: number;
  };
  spacing?: {
    paddingPx?: number | 'unknown';
    gapPx?: number | 'unknown';
  };
  radiusPx?: number | 'unknown';
  shadowToken?: 'none' | 'sm' | 'md' | 'lg';
  icon?: {
    sizePx?: number | 'unknown';
    gapPx?: number | 'unknown';
  };
  effects?: {
    opacity?: number;
    scale?: number;
    translateX?: string;
    translateY?: string;
  };
}

export interface ValidationResult {
  ok: boolean;
  errors?: ErrorObject[];
}

// Create Ajv instance with defaults injection and proper error handling
const ajv = new Ajv({ 
  strict: false,
  allErrors: true,
  useDefaults: true,          // ★ default 自動注入
  removeAdditional: 'failing', // ★ 余計キーはエラー化
  allowUnionTypes: true
});
addFormats(ajv);

// Compile schema
const validateMEDS = ajv.compile(medsSchema);

export function validateMEDSJSON(json: unknown): ValidationResult {
  const isValid = validateMEDS(json);
  
  if (isValid) {
    return { ok: true };
  }
  
  return {
    ok: false,
    errors: validateMEDS.errors || []
  };
}

// Enhanced validation with default injection - returns completed spec
export function validateAndFillMEDS(json: unknown): { ok: boolean; spec?: MEDSSpec; errors?: ErrorObject[] } {
  // Deep clone to avoid mutating original
  const clonedData = JSON.parse(JSON.stringify(json));
  const isValid = validateMEDS(clonedData);
  
  if (isValid) {
    return { 
      ok: true, 
      spec: clonedData as unknown as MEDSSpec 
    };
  }
  
  return {
    ok: false,
    errors: validateMEDS.errors || []
  };
}

export { medsSchema };