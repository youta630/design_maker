/**
 * MEDS Specification Normalization
 * 
 * Absorbs AI-specific variations before Ajv validation:
 * - 8px quantization for measurements  
 * - Color token correction
 * - Shadow null handling
 * - Motion easing filtering
 * - Typography weight clamping
 */

export function normalizeMeds(spec: Record<string, unknown>): Record<string, unknown> {
  if (!spec || typeof spec !== 'object') {
    return spec;
  }

  // Deep clone to avoid mutation
  const normalized = JSON.parse(JSON.stringify(spec));

  // Ensure required top-level fields
  normalized.version = normalized.version || '1.1';
  normalized.modality = normalized.modality || 'image';
  
  // Ensure viewportProfile with required confidence
  if (!normalized.viewportProfile) {
    normalized.viewportProfile = {
      type: 'desktop',
      widthPx: 1200,
      heightPx: 800,
      confidence: 0.9
    };
  } else if (!normalized.viewportProfile.confidence) {
    normalized.viewportProfile.confidence = 0.9;
  }
  
  // Ensure composition
  if (!normalized.composition) {
    normalized.composition = {
      density: 'comfortable',
      pagePaddingPx: 24,
      sectionGapPx: 32
    };
  }

  // Ensure foundations structure
  if (!normalized.foundations) {
    normalized.foundations = {};
  }
  
  // Ensure color array
  if (!normalized.foundations.color || !Array.isArray(normalized.foundations.color)) {
    normalized.foundations.color = [
      { token: 'bg', hex: '#ffffff' },
      { token: 'text-primary', hex: '#000000' },
      { token: 'text-secondary', hex: '#666666' },
      { token: 'brand', hex: '#3b82f6' },
      { token: 'accent', hex: '#8b5cf6' },
      { token: 'error', hex: '#ef4444' }
    ];
  }
  
  // Ensure typography structure
  if (!normalized.foundations.typography) {
    normalized.foundations.typography = {};
  }
  
  // Fix typography familyCandidates format (JSON Schema requires family + confidence)
  if (Array.isArray(normalized.foundations.typography.familyCandidates)) {
    normalized.foundations.typography.familyCandidates = normalized.foundations.typography.familyCandidates.map((family: unknown) => {
      if (typeof family === 'string') {
        return { family: family, confidence: 0.8 };
      } else if (typeof family === 'object' && family !== null) {
        const familyObj = family as Record<string, unknown>;
        return {
          family: familyObj.name || familyObj.family || 'system-ui',
          confidence: typeof familyObj.confidence === 'number' ? familyObj.confidence : 0.8
        };
      }
      return { family: 'system-ui', confidence: 0.8 };
    });
  } else {
    normalized.foundations.typography.familyCandidates = [
      { family: 'Inter', confidence: 0.9 },
      { family: 'system-ui', confidence: 0.8 }
    ];
  }
  
  // Ensure typography required fields
  normalized.foundations.typography.primaryFamily = normalized.foundations.typography.primaryFamily || 'Inter';
  normalized.foundations.typography.weights = normalized.foundations.typography.weights || [400, 500, 600, 700];
  normalized.foundations.typography.scalePx = normalized.foundations.typography.scalePx || [12, 14, 16, 18, 20, 24, 32];
  
  // Ensure spacing structure
  if (!normalized.foundations.spacing) {
    normalized.foundations.spacing = {
      basePx: 16,
      scalePx: [8, 16, 24, 32, 48, 64]
    };
  }
  
  // Ensure radius is array (critical fix)
  if (!Array.isArray(normalized.foundations.radius)) {
    normalized.foundations.radius = [4, 8, 12, 16, 24];
  }
  
  // Ensure motion structure
  if (!normalized.foundations.motion) {
    normalized.foundations.motion = {
      durationsMs: {
        fast: 150,
        standard: 300,
        slow: 500
      },
      easings: ['ease-in-out']
    };
  }
  
  // Ensure grid structure  
  if (!normalized.foundations.grid) {
    normalized.foundations.grid = {
      columns: 12,
      gapPx: 16,
      containerMaxWidthPx: 1200
    };
  }
  
  // Ensure a11y structure
  if (!normalized.foundations.a11y) {
    normalized.foundations.a11y = {
      hitAreaPx: 44,
      focusRing: {
        widthPx: 2,
        colorToken: 'brand'
      },
      minContrast: 'AA'
    };
  }

  // 1. Color token mapping
  const mapToken = (token: string): string => {
    const tokenMapping: Record<string, string> = {
      'button-primary-text': 'text-inverse',
      'primary-text': 'text-primary',
      'secondary-text': 'text-secondary',
      'background': 'bg',
      'foreground': 'text-primary',
      'muted': 'text-secondary',
      'destructive': 'error',
      'button-text': 'text-inverse',
      'card-background': 'surface',
      'card-foreground': 'text-primary',
      'input-background': 'surface',
      'input-border': 'border',
      'popover-background': 'surface',
      'popover-foreground': 'text-primary'
    };
    return tokenMapping[token] ?? token;
  };

  if (Array.isArray(normalized?.foundations?.color)) {
    normalized.foundations.color = normalized.foundations.color.map((c: Record<string, unknown>) => ({
      ...c,
      token: mapToken(c.token as string)
    }));
  }

  // 2. Shadow handling - convert null to default object
  if (!normalized?.foundations?.shadow || 
      normalized.foundations.shadow === null || 
      typeof normalized.foundations.shadow !== 'object') {
    if (!normalized.foundations) normalized.foundations = {};
    normalized.foundations.shadow = { none: 'none' };
  }

  // 3. Motion easings filtering
  const okEase = /^(linear|ease-in|ease-out|ease-in-out|cubic-bezier\((?:-?\d*\.?\d+\s*,\s*){3}-?\d*\.?\d+\))$/;
  const easings = normalized?.foundations?.motion?.easings;
  if (Array.isArray(easings)) {
    const filteredEasings = easings.filter((e: string) => 
      typeof e === 'string' && e !== 'unknown' && okEase.test(e)
    );
    normalized.foundations.motion.easings = filteredEasings.length > 0 
      ? filteredEasings 
      : ['ease-in-out'];
  }

  // 4. 8px quantization helper
  const quantize8 = (value: unknown): number | unknown => {
    if (typeof value === 'number' && value > 0) {
      return Math.round(value / 8) * 8;
    }
    return value;
  };

  // Apply quantization to composition
  if (normalized?.composition) {
    normalized.composition.pagePaddingPx = quantize8(normalized.composition.pagePaddingPx);
    normalized.composition.sectionGapPx = quantize8(normalized.composition.sectionGapPx);
    normalized.composition.cardInnerPaddingPx = quantize8(normalized.composition.cardInnerPaddingPx);
  }

  // Apply quantization to spacing
  if (normalized?.foundations?.spacing) {
    normalized.foundations.spacing.basePx = quantize8(normalized.foundations.spacing.basePx);
    if (Array.isArray(normalized.foundations.spacing.scalePx)) {
      // Quantize, deduplicate, and sort ascending
      const quantized = normalized.foundations.spacing.scalePx.map(quantize8);
      normalized.foundations.spacing.scalePx = [...new Set(quantized)].sort((a: unknown, b: unknown) => (a as number) - (b as number));
    }
  }

  // Apply quantization to radius
  if (Array.isArray(normalized?.foundations?.radius)) {
    // Quantize, deduplicate, and sort ascending
    const quantized = normalized.foundations.radius.map(quantize8);
    normalized.foundations.radius = [...new Set(quantized)].sort((a: unknown, b: unknown) => (a as number) - (b as number));
  }

  // Apply quantization to grid
  if (normalized?.foundations?.grid) {
    normalized.foundations.grid.gapPx = quantize8(normalized.foundations.grid.gapPx);
    normalized.foundations.grid.containerMaxWidthPx = quantize8(normalized.foundations.grid.containerMaxWidthPx);
  }

  // 5. Typography weights clamping (300-800 range)
  if (Array.isArray(normalized?.foundations?.typography?.weights)) {
    normalized.foundations.typography.weights = normalized.foundations.typography.weights
      .map((w: unknown) => typeof w === 'number' ? Math.max(300, Math.min(800, w)) : w)
      .filter((w: unknown) => typeof w === 'number' && w >= 300 && w <= 800);
    
    // Ensure at least one weight
    if (normalized.foundations.typography.weights.length === 0) {
      normalized.foundations.typography.weights = [400];
    }
  }

  // 6. Typography scale px validation (minimum 8px)
  if (Array.isArray(normalized?.foundations?.typography?.scalePx)) {
    const quantized = normalized.foundations.typography.scalePx
      .map(quantize8)
      .filter((size: unknown) => typeof size === 'number' && size >= 8);
    
    // Deduplicate and sort ascending
    normalized.foundations.typography.scalePx = [...new Set(quantized)].sort((a: unknown, b: unknown) => (a as number) - (b as number));
    
    // Ensure at least 3 sizes
    if (normalized.foundations.typography.scalePx.length < 3) {
      normalized.foundations.typography.scalePx = [14, 16, 18];
    }
  }

  // 7. A11y hitAreaPx minimum 40px
  if (normalized?.foundations?.a11y?.hitAreaPx) {
    normalized.foundations.a11y.hitAreaPx = Math.max(40, quantize8(normalized.foundations.a11y.hitAreaPx) as number);
  }

  return normalized;
}

// Export quantize8 helper for testing
export const quantize8 = (value: unknown): number | unknown => {
  if (typeof value === 'number' && value > 0) {
    return Math.round(value / 8) * 8;
  }
  return value;
};