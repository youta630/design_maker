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
  const quantize8 = (value: any): any => {
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
      normalized.foundations.spacing.scalePx = normalized.foundations.spacing.scalePx.map(quantize8);
    }
  }

  // Apply quantization to radius
  if (Array.isArray(normalized?.foundations?.radius)) {
    normalized.foundations.radius = normalized.foundations.radius.map(quantize8);
  }

  // Apply quantization to grid
  if (normalized?.foundations?.grid) {
    normalized.foundations.grid.gapPx = quantize8(normalized.foundations.grid.gapPx);
    normalized.foundations.grid.containerMaxWidthPx = quantize8(normalized.foundations.grid.containerMaxWidthPx);
  }

  // 5. Typography weights clamping (300-800 range)
  if (Array.isArray(normalized?.foundations?.typography?.weights)) {
    normalized.foundations.typography.weights = normalized.foundations.typography.weights
      .map((w: any) => typeof w === 'number' ? Math.max(300, Math.min(800, w)) : w)
      .filter((w: any) => typeof w === 'number' && w >= 300 && w <= 800);
    
    // Ensure at least one weight
    if (normalized.foundations.typography.weights.length === 0) {
      normalized.foundations.typography.weights = [400];
    }
  }

  // 6. Typography scale px validation (minimum 8px)
  if (Array.isArray(normalized?.foundations?.typography?.scalePx)) {
    normalized.foundations.typography.scalePx = normalized.foundations.typography.scalePx
      .map(quantize8)
      .filter((size: any) => typeof size === 'number' && size >= 8);
    
    // Ensure at least 3 sizes
    if (normalized.foundations.typography.scalePx.length < 3) {
      normalized.foundations.typography.scalePx = [14, 16, 18];
    }
  }

  // 7. A11y hitAreaPx minimum 40px
  if (normalized?.foundations?.a11y?.hitAreaPx) {
    normalized.foundations.a11y.hitAreaPx = Math.max(40, quantize8(normalized.foundations.a11y.hitAreaPx));
  }

  return normalized;
}

// Export quantize8 helper for testing
export const quantize8 = (value: any): any => {
  if (typeof value === 'number' && value > 0) {
    return Math.round(value / 8) * 8;
  }
  return value;
};