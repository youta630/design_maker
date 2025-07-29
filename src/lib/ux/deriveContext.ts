/**
 * UX Context Derivation
 * 
 * Infers minimal UX context from MEDS specification
 * Provides heuristic analysis of UI patterns for rule evaluation
 */

import type { UXContext } from './evaluator';
import type { MEDSSpec } from '../validation/medsSchema';

/**
 * Derives UX context from MEDS specification using heuristics
 */
export function deriveContextFromMeds(meds: MEDSSpec): UXContext {
  const components = meds.components || [];
  const platform = meds.viewportProfile.type;
  
  // Component analysis
  const hasSidebar = components.some(c => c.type === 'Sidebar' || c.type === 'Drawer');
  const hasTopNav = components.some(c => c.type === 'AppBar' || c.type === 'TopNav');
  const hasTable = components.some(c => c.type === 'Table');
  const hasList = components.some(c => c.type === 'ListItem');
  const hasCards = components.some(c => c.type === 'Card');
  const hasModal = components.some(c => c.type === 'Modal' || c.type === 'Dialog');
  const hasTextField = components.some(c => c.type === 'TextField' || c.type === 'TextArea');
  const hasButton = components.some(c => c.type === 'Button' || c.type === 'IconButton');
  
  // Content type inference
  let contentType: 'list' | 'table' | 'single' = 'single';
  if (hasTable) contentType = 'table';
  else if (hasList || hasCards) contentType = 'list';
  
  // Form analysis
  const formFieldCount = components.filter(c => 
    c.type === 'TextField' || 
    c.type === 'TextArea' || 
    c.type === 'Select' ||
    c.type === 'Checkbox' ||
    c.type === 'RadioGroup'
  ).length;
  
  // Layout analysis
  const density = meds.composition?.density || 'comfortable';
  const isCompact = density === 'compact';
  const contentWidthNarrow = hasSidebar || platform === 'mobile';
  
  // Task complexity inference
  const taskLengthScreens = hasModal ? 1 : (hasSidebar ? 3 : 1);
  
  // Platform-specific defaults
  const deviceHasTouch = platform === 'mobile';
  const keepContext = hasSidebar || hasTopNav;
  
  // Progressive disclosure patterns
  const needsSharableURL = !hasModal && (hasTable || hasList);
  const reversible = !components.some(c => 
    // Look for destructive patterns in component IDs or types
    c.id?.toLowerCase().includes('delete') ||
    c.id?.toLowerCase().includes('remove')
  );
  
  // Error handling context
  const fieldErrors = hasTextField && formFieldCount > 2;
  const globalError = hasButton && !hasTextField; // Action-heavy interfaces
  
  return {
    // Content & Task Context
    needsSharableURL,
    keepContext,
    taskLengthScreens,
    contentWidthNarrow,
    formFields: formFieldCount,
    contentType,
    
    // Interaction Context  
    isDestructive: false, // Would need deeper analysis
    blocking: false,
    globalError,
    reversible,
    progressKnown: false,
    
    // UI Context
    hasFabOnScreen: false, // FAB not in MEDS component types
    deviceHasTouch,
    emptyState: undefined, // Would need content analysis
    fieldErrors,
    
    // Platform Context
    platform: platform as 'desktop' | 'mobile' | 'tablet'
  };
}

/**
 * Enhanced context derivation with custom overrides
 */
export function deriveContextFromMedsWithOverrides(
  meds: MEDSSpec, 
  overrides: Partial<UXContext> = {}
): UXContext {
  const baseContext = deriveContextFromMeds(meds);
  return { ...baseContext, ...overrides };
}

/**
 * Analyzes component patterns for specific UX decisions
 */
export function analyzeComponentPatterns(meds: MEDSSpec) {
  const components = meds.components || [];
  
  return {
    hasDataVisualization: components.some(c => c.type === 'Table' || c.id?.includes('chart')),
    hasAuthentication: components.some(c => 
      c.type === 'TextField' && 
      (c.id?.includes('password') || c.id?.includes('email'))
    ),
    hasSearch: components.some(c => c.id?.includes('search')),
    hasFiltering: components.some(c => 
      c.type === 'Select' || 
      c.type === 'Checkbox' ||
      c.id?.includes('filter')
    ),
    hasPagination: components.some(c => c.id?.includes('pagination')),
    hasSort: components.some(c => c.id?.includes('sort')),
    navigationDepth: components.filter(c => 
      c.type === 'Sidebar' || 
      c.type === 'TopNav' ||
      c.type === 'Tabs'
    ).length
  };
}

/**
 * Infers user intent categories from component composition
 */
export function inferUserIntentCategories(meds: MEDSSpec): string[] {
  const patterns = analyzeComponentPatterns(meds);
  const intents: string[] = [];
  
  if (patterns.hasAuthentication) intents.push('authentication');
  if (patterns.hasDataVisualization) intents.push('data-analysis');
  if (patterns.hasSearch || patterns.hasFiltering) intents.push('content-discovery');
  if (patterns.navigationDepth > 1) intents.push('multi-section-navigation');
  if (meds.components?.some(c => c.type === 'TextField')) intents.push('data-entry');
  
  return intents;
}