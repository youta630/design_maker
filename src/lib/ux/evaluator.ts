/**
 * UX Rule Evaluator
 * 
 * Evaluates ux_rule.json deterministically using first-match-wins logic
 * Provides stable, reproducible UX decisions independent of AI models
 */

export type UXAction =
  | 'route' | 'modal' | 'drawer' | 'sheet'
  | 'toast' | 'banner' | 'popover' | 'dropdown'
  | 'skeleton' | 'spinner' | 'progress' | 'progressbar'
  | 'empty-state' | 'menu' | 'external' | 'download'
  | 'ensure-a11y' | 'constraints' | 'set-color' | 'inline-errors'
  | 'ensure-target-size';

export type UXPriority = 'low' | 'medium' | 'high';
export type UXFamily = 'Navigation' | 'Details' | 'Edit' | 'Menus' | 'Confirm' | 'Feedback' | 'Target' | 'Motion';
export type UXEvent = 'click' | 'hover' | 'focus' | 'submit';

export interface UXRule {
  id: string;
  family: UXFamily;
  event: UXEvent;
  action: UXAction;
  selector?: Record<string, unknown>;
  alternatives?: UXAction[];
  priority?: UXPriority;
  confidence?: number;
  origin?: 'global-default' | 'image-heuristic';
  rationale?: string[];
  meta?: Record<string, unknown>;
  guards?: Array<{
    when: Record<string, unknown>;
    then: Partial<UXRule> & { 
      style?: Record<string, unknown>; 
      placement?: Record<string, unknown>; 
    };
  }>;
}

export interface UXPolicy {
  policyId: string;
  platform: 'desktop' | 'mobile';
  rules: UXRule[];
  defaults?: Record<string, unknown>;
}

export interface UXRulebook {
  version: string;
  evaluation: {
    order: string;
    fallback: string;
  };
  policies: UXPolicy[];
}

export interface UXContext {
  // Content & Task Context
  needsSharableURL?: boolean;
  keepContext?: boolean;
  taskLengthScreens?: number;
  contentWidthNarrow?: boolean;
  formFields?: number;
  contentType?: 'list' | 'table' | 'single';
  
  // Interaction Context
  isDestructive?: boolean;
  blocking?: boolean;
  globalError?: boolean;
  reversible?: boolean;
  progressKnown?: boolean;
  
  // UI Context
  hasFabOnScreen?: boolean;
  deviceHasTouch?: boolean;
  emptyState?: 'firstRun' | 'noResults';
  fieldErrors?: boolean;
  
  // Platform Context
  platform?: 'desktop' | 'mobile' | 'tablet';
}

export interface UXDecision {
  ruleId: string;
  family: UXFamily;
  event: UXEvent;
  action: UXAction;
  priority: UXPriority;
  confidence: number;
  matchedGuardIndex: number; // -1 if no guard matched
  meta: Record<string, unknown>;
}

export interface UXEvaluationResult {
  decisions: UXDecision[];
  policyMeta: {
    policyId: string;
    version: string;
  };
}

/**
 * Evaluates a guard condition against the current context
 */
function matchGuard(when: Record<string, unknown>, ctx: UXContext): boolean {
  return Object.entries(when).every(([key, expectedValue]) => {
    const contextValue = (ctx as Record<string, unknown>)[key];
    
    // Handle numeric comparisons (e.g., ">5", ">=3")
    if (typeof expectedValue === 'string' && /^>={0,1}\d+$/.test(expectedValue)) {
      const isGTE = expectedValue.includes('>=');
      const numValue = Number(expectedValue.replace(/[^0-9]/g, ''));
      const contextNum = Number(contextValue);
      
      if (isNaN(contextNum)) return false;
      return isGTE ? contextNum >= numValue : contextNum > numValue;
    }
    
    // Handle array contains (e.g., when context value should be in array)
    if (Array.isArray(expectedValue)) {
      return expectedValue.includes(contextValue);
    }
    
    // Direct equality check
    return contextValue === expectedValue;
  });
}

/**
 * Main evaluation function - applies rules with guard logic
 */
export function evaluateRules(
  rulebook: UXRulebook,
  ctx: UXContext,
  platform: 'desktop' | 'mobile'
): UXEvaluationResult {
  // Find policy for platform
  const policy = rulebook.policies.find(p => p.platform === platform);
  if (!policy) {
    return {
      decisions: [],
      policyMeta: {
        policyId: 'none',
        version: rulebook.version
      }
    };
  }

  // Evaluate each rule
  const decisions: UXDecision[] = policy.rules.map(rule => {
    // Find first matching guard (if any)
    let matchedGuard: NonNullable<UXRule['guards']>[0] | undefined;
    let matchedGuardIndex = -1;

    if (rule.guards && rule.guards.length > 0) {
      for (let i = 0; i < rule.guards.length; i++) {
        const guard = rule.guards[i];
        if (guard && matchGuard(guard.when, ctx)) {
          matchedGuard = guard;
          matchedGuardIndex = i;
          break; // First-match-wins
        }
      }
    }

    // Apply guard overrides or use rule defaults
    const finalAction = (matchedGuard?.then?.action as UXAction) || rule.action;
    const finalPriority = matchedGuard?.then?.priority || rule.priority || 'medium';
    const finalConfidence = matchedGuard?.then?.confidence ?? rule.confidence ?? 1.0;
    
    // Merge metadata
    const baseMeta = rule.meta || {};
    const guardMeta = matchedGuard?.then?.meta || {};
    const guardStyle = matchedGuard?.then?.style;
    const guardPlacement = matchedGuard?.then?.placement;
    
    const finalMeta = {
      ...baseMeta,
      ...guardMeta,
      ...(guardStyle ? { style: guardStyle } : {}),
      ...(guardPlacement ? { placement: guardPlacement } : {})
    };

    return {
      ruleId: rule.id,
      family: rule.family,
      event: rule.event,
      action: finalAction,
      priority: finalPriority,
      confidence: finalConfidence,
      matchedGuardIndex,
      meta: finalMeta
    };
  });

  return {
    decisions,
    policyMeta: {
      policyId: policy.policyId,
      version: rulebook.version
    }
  };
}

/**
 * Helper to load and parse ux_rule.json
 */
export async function loadUXRulebook(): Promise<UXRulebook> {
  const uxRuleData = await import('@/schemas/ux_rule.json');
  return uxRuleData.default as UXRulebook;
}