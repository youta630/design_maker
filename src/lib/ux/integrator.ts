/**
 * UX-MEDS Integration Engine
 * 
 * Integrates UX decisions into MEDS structure for perfect 1-copy experience
 * Creates a complete specification that coding agents can use immediately
 */

import type { MEDSSpec } from '../validation/medsSchema';
import type { UXEvaluationResult, UXDecision } from './evaluator';

interface EnhancedMEDSSpec extends MEDSSpec {
  // Enhanced fields that will be seamlessly integrated
  patterns?: {
    navigation?: {
      type: 'hierarchical' | 'flat' | 'contextual';
      depth: number;
      primaryActions: string[];
    };
    interaction?: {
      feedback: 'immediate' | 'delayed' | 'batch';
      errorHandling: 'inline' | 'toast' | 'modal';
      progressIndicators: boolean;
    };
    layout?: {
      contentStrategy: 'single-column' | 'multi-column' | 'grid';
      responsiveBreakpoints: number[];
      densityMode: 'compact' | 'comfortable' | 'spacious';
    };
  };
  accessibility?: {
    keyboardNavigation: boolean;
    screenReaderOptimized: boolean;
    highContrastSupport: boolean;
    minimumTouchTargets: boolean;
  };
  states?: {
    loading: 'skeleton' | 'spinner' | 'progressive';
    empty: 'illustration' | 'message' | 'cta';
    error: 'inline' | 'page' | 'toast';
  };
}

/**
 * Core integration function - transforms MEDS with UX decisions
 */
export function integrateUXIntoMEDS(
  originalMeds: MEDSSpec,
  uxEvaluation: UXEvaluationResult
): EnhancedMEDSSpec {
  // Deep clone to avoid mutation
  const enhanced: EnhancedMEDSSpec = JSON.parse(JSON.stringify(originalMeds));
  
  // Extract insights from UX decisions  
  const targetDecisions = uxEvaluation.decisions.filter(d => d.family === 'Target');
  
  // 1. Enhance Components with UX-driven additions
  enhanced.components = enhanceComponentsWithUX(enhanced.components || [], uxEvaluation.decisions);
  
  // 2. Enhance Foundations with UX color strategy
  enhanced.foundations = enhanceFoundationsWithUX(enhanced.foundations, uxEvaluation);
  
  // 3. Enhance Composition with UX layout patterns
  enhanced.composition = enhanceCompositionWithUX(enhanced.composition, uxEvaluation.decisions);
  
  // 4. Add UX-driven patterns
  enhanced.patterns = deriveUXPatterns(uxEvaluation.decisions, originalMeds);
  
  // 5. Add accessibility enhancements
  enhanced.accessibility = deriveAccessibilityFeatures(targetDecisions, originalMeds);
  
  // 6. Add state management patterns
  enhanced.states = deriveStatePatterns(uxEvaluation.decisions);
  
  return enhanced;
}

/**
 * Enhances components array with UX-recommended additions
 */
function enhanceComponentsWithUX(
  originalComponents: MEDSSpec['components'],
  decisions: UXDecision[]
): MEDSSpec['components'] {
  const enhanced = [...originalComponents];
  
  // Add UX-recommended components based on decisions
  for (const decision of decisions) {
    const uxComponent = mapUXActionToComponent(decision);
    if (uxComponent && !hasComponentType(enhanced, uxComponent.type)) {
      enhanced.push(uxComponent);
    }
  }
  
  // Sort by priority (high priority components first)
  return enhanced.sort((a, b) => {
    const aPriority = getComponentPriority(a.type);
    const bPriority = getComponentPriority(b.type);
    return bPriority - aPriority;
  });
}

/**
 * Maps UX actions to MEDS components
 */
function mapUXActionToComponent(decision: UXDecision): MEDSSpec['components'][0] | null {
  const baseComponent = {
    id: `ux-${decision.ruleId}`,
    confidence: decision.confidence
  };
  
  switch (decision.action) {
    case 'toast':
      return {
        ...baseComponent,
        type: 'Alert',
        id: 'toast-feedback'
      };
    case 'modal':
      return {
        ...baseComponent,
        type: 'Modal',
        id: 'modal-dialog'
      };
    case 'drawer':
      return {
        ...baseComponent,
        type: 'Drawer',
        id: 'navigation-drawer'
      };
    case 'skeleton':
      return {
        ...baseComponent,
        type: 'Card', // Skeleton represented as structured content
        id: 'loading-skeleton'
      };
    case 'progress':
    case 'progressbar':
      return {
        ...baseComponent,
        type: 'Badge', // Progress as status indicator
        id: 'progress-indicator'
      };
    case 'menu':
      return {
        ...baseComponent,
        type: 'ListItem',
        id: 'context-menu'
      };
    default:
      return null;
  }
}

/**
 * Enhances foundations with UX color strategy
 */
function enhanceFoundationsWithUX(
  originalFoundations: MEDSSpec['foundations'],
  uxEvaluation: UXEvaluationResult
): MEDSSpec['foundations'] {
  const enhanced = { ...originalFoundations };
  
  // Add UX-recommended color tokens based on policy
  const policy = uxEvaluation.policyMeta;
  if (policy.policyId.includes('desktop')) {
    // Desktop-specific color enhancements
    enhanced.color = [
      ...enhanced.color,
      ...getDesktopColorEnhancements(enhanced.color)
    ].filter((color, index, self) => 
      self.findIndex(c => c.token === color.token) === index
    ); // Deduplicate
  }
  
  // Add semantic color tokens for UX states
  const stateColors = [
    { token: 'warning' as const, hex: '#f59e0b', usage: 'Warning states and cautionary actions' },
    { token: 'overlay' as const, hex: '#00000080', usage: 'Modal and drawer overlays' }
  ];
  
  for (const stateColor of stateColors) {
    if (!enhanced.color.some(c => c.token === stateColor.token)) {
      enhanced.color.push(stateColor);
    }
  }
  
  return enhanced;
}

/**
 * Gets desktop-specific color enhancements
 */
function getDesktopColorEnhancements(existingColors: MEDSSpec['foundations']['color']) {
  const enhancements = [];
  
  // Add hover states if missing
  const hasAccent = existingColors.some(c => c.token === 'accent');
  if (!hasAccent) {
    enhancements.push({
      token: 'accent' as const,
      hex: '#6366f1',
      usage: 'Interactive element hover and focus states'
    });
  }
  
  // Add surface if missing
  const hasSurface = existingColors.some(c => c.token === 'surface');
  if (!hasSurface) {
    enhancements.push({
      token: 'surface' as const,
      hex: '#f8fafc',
      usage: 'Card backgrounds and elevated surfaces'
    });
  }
  
  return enhancements;
}

/**
 * Enhances composition with UX layout patterns
 */
function enhanceCompositionWithUX(
  originalComposition: MEDSSpec['composition'],
  decisions: UXDecision[]
): MEDSSpec['composition'] {
  const enhanced = { ...originalComposition };
  
  // Adjust density based on UX decisions
  const hasComplexInteractions = decisions.some(d => 
    d.family === 'Edit' || d.family === 'Confirm'
  );
  
  if (hasComplexInteractions && enhanced.density === 'compact') {
    enhanced.density = 'comfortable'; // More space for complex interactions
  }
  
  // Adjust spacing based on target size requirements
  const hasTargetSizeRequirements = decisions.some(d => 
    d.action === 'ensure-target-size'
  );
  
  if (hasTargetSizeRequirements) {
    enhanced.sectionGapPx = Math.max((enhanced.sectionGapPx as number) || 24, 32);
    enhanced.pagePaddingPx = Math.max((enhanced.pagePaddingPx as number) || 16, 24);
  }
  
  return enhanced;
}

/**
 * Derives UX patterns from decisions
 */
function deriveUXPatterns(decisions: UXDecision[], originalMeds: MEDSSpec) {
  const navigationDecisions = decisions.filter(d => d.family === 'Navigation');
  const hasRouting = navigationDecisions.some(d => d.action === 'route');
  const hasModal = navigationDecisions.some(d => d.action === 'modal');
  
  return {
    navigation: {
      type: hasRouting ? 'hierarchical' as const : (hasModal ? 'contextual' as const : 'flat' as const),
      depth: navigationDecisions.length,
      primaryActions: navigationDecisions.map(d => d.action)
    },
    interaction: {
      feedback: decisions.some(d => d.action === 'toast') ? 'immediate' as const : 'delayed' as const,
      errorHandling: decisions.some(d => d.action === 'inline-errors') ? 'inline' as const : 'toast' as const,
      progressIndicators: decisions.some(d => d.action === 'progress' || d.action === 'progressbar')
    },
    layout: {
      contentStrategy: originalMeds.viewportProfile.type === 'mobile' ? 'single-column' as const : 'multi-column' as const,
      responsiveBreakpoints: [768, 1024, 1280],
      densityMode: originalMeds.composition?.density || 'comfortable' as const
    }
  };
}

/**
 * Derives accessibility features from target decisions
 */
function deriveAccessibilityFeatures(targetDecisions: UXDecision[], originalMeds: MEDSSpec) {
  return {
    keyboardNavigation: true, // Always enable for desktop
    screenReaderOptimized: originalMeds.components.length > 5, // Complex interfaces need SR optimization
    highContrastSupport: true, // Modern standard
    minimumTouchTargets: targetDecisions.some(d => d.action === 'ensure-target-size')
  };
}

/**
 * Derives state management patterns
 */
function deriveStatePatterns(decisions: UXDecision[]) {
  return {
    loading: decisions.some(d => d.action === 'skeleton') ? 'skeleton' as const : 'spinner' as const,
    empty: decisions.some(d => d.action === 'empty-state') ? 'illustration' as const : 'message' as const,
    error: decisions.some(d => d.action === 'inline-errors') ? 'inline' as const : 'toast' as const
  };
}

/**
 * Helper functions
 */
function hasComponentType(components: MEDSSpec['components'], type: string): boolean {
  return components.some(c => c.type === type);
}

function getComponentPriority(type: string): number {
  const priorities: Record<string, number> = {
    'AppBar': 10,
    'TopNav': 10,
    'Sidebar': 9,
    'Modal': 8,
    'Dialog': 8,
    'Button': 7,
    'TextField': 6,
    'Card': 5,
    'ListItem': 4,
    'Table': 4,
    'Alert': 3,
    'Badge': 2
  };
  return priorities[type] || 1;
}