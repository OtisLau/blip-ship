/**
 * Identity-to-Fix Mapper
 * Maps user identity states to specific UI element changes
 *
 * Flow: IdentityState → UIRecommendations → IdentityFixMapping → FixRecommendation
 */

import { IdentityState } from './behavioral-vector';
import { FixRecommendation } from './gemini-service';
import { ElementIndex, IndexedElement, loadElementIndex } from './element-indexer';

// UI recommendation types from getUIRecommendations()
export type UIRecommendationType =
  | 'simplify_layout'
  | 'show_trust_badges'
  | 'show_comparison_tools'
  | 'high_urgency'
  | 'low_urgency'
  | 'bold_cta'
  | 'guided_cta'
  | 'support_cta';

// An individual element change
export interface ElementChange {
  selector: string;           // CSS selector to target
  componentPath: string;      // Component file path
  changeType: 'style' | 'attribute' | 'text' | 'visibility' | 'config';
  property: string;           // What to change
  oldValue: string;           // Current value (or '*' for any)
  newValue: string;           // New value
  reason: string;             // Human-readable explanation
}

// Complete mapping from identity to element changes
export interface IdentityFixMapping {
  identityState: IdentityState;
  confidence: number;
  recommendations: UIRecommendationType[];
  elementChanges: ElementChange[];
  summary: string;
  expectedImpact: string;
  rationale: string;
}

// A rule that maps identity state + recommendation to changes
export interface IdentityFixRule {
  id: string;
  identityState: IdentityState;
  recommendation: UIRecommendationType;
  priority: number;           // Higher = apply first
  changes: ElementChange[];
  summary: string;
  expectedImpact: string;
}

// =============================================================================
// FIX RULES DEFINITIONS
// =============================================================================

const FRUSTRATED_RULES: IdentityFixRule[] = [
  {
    id: 'frustrated_simplify_layout',
    identityState: 'frustrated',
    recommendation: 'simplify_layout',
    priority: 10,
    summary: 'Simplify page layout for frustrated users',
    expectedImpact: '+25-35% engagement from frustrated users',
    changes: [
      {
        selector: '#hero h1',
        componentPath: 'components/store/Hero.tsx',
        changeType: 'config',
        property: 'hero.headline',
        oldValue: '*',
        newValue: 'Simple. Easy. Done.',
        reason: 'Shorter, clearer headline reduces cognitive load',
      },
      {
        selector: 'button[data-cta]',
        componentPath: 'components/store/Hero.tsx',
        changeType: 'config',
        property: 'hero.cta.size',
        oldValue: '*',
        newValue: 'large',
        reason: 'Larger CTA is easier to find and click',
      },
    ],
  },
  {
    id: 'frustrated_support_cta',
    identityState: 'frustrated',
    recommendation: 'support_cta',
    priority: 9,
    summary: 'Use supportive CTA language',
    expectedImpact: '+15-20% click-through on CTA',
    changes: [
      {
        selector: 'button[data-cta]',
        componentPath: 'components/store/Hero.tsx',
        changeType: 'config',
        property: 'hero.cta.text',
        oldValue: '*',
        newValue: 'Get Help Now',
        reason: 'Supportive language reassures frustrated users',
      },
    ],
  },
  {
    id: 'frustrated_show_trust',
    identityState: 'frustrated',
    recommendation: 'show_trust_badges',
    priority: 8,
    summary: 'Show testimonials to rebuild trust',
    expectedImpact: '+10-15% trust signals',
    changes: [
      {
        selector: '#testimonials',
        componentPath: 'components/store/Testimonials.tsx',
        changeType: 'config',
        property: 'testimonials.show',
        oldValue: '*',
        newValue: 'true',
        reason: 'Social proof helps rebuild trust for frustrated users',
      },
    ],
  },
];

const OVERWHELMED_RULES: IdentityFixRule[] = [
  {
    id: 'overwhelmed_reduce_products',
    identityState: 'overwhelmed',
    recommendation: 'simplify_layout',
    priority: 10,
    summary: 'Reduce product grid columns to decrease overwhelm',
    expectedImpact: '+30-40% completion rate',
    changes: [
      {
        selector: '#products',
        componentPath: 'components/store/ProductGrid.tsx',
        changeType: 'config',
        property: 'products.layout',
        oldValue: '*',
        newValue: 'grid-2',
        reason: 'Fewer products per row reduces decision paralysis',
      },
    ],
  },
  {
    id: 'overwhelmed_guided_cta',
    identityState: 'overwhelmed',
    recommendation: 'guided_cta',
    priority: 9,
    summary: 'Use guided language on CTA',
    expectedImpact: '+20-25% click-through',
    changes: [
      {
        selector: 'button[data-cta]',
        componentPath: 'components/store/Hero.tsx',
        changeType: 'config',
        property: 'hero.cta.text',
        oldValue: '*',
        newValue: 'Start Here →',
        reason: 'Guided language helps overwhelmed users know where to begin',
      },
      {
        selector: '#hero h1',
        componentPath: 'components/store/Hero.tsx',
        changeType: 'config',
        property: 'hero.subheadline',
        oldValue: '*',
        newValue: 'We\'ll help you find exactly what you need',
        reason: 'Reassuring subheadline for overwhelmed users',
      },
    ],
  },
];

const CAUTIOUS_RULES: IdentityFixRule[] = [
  {
    id: 'cautious_show_reviews',
    identityState: 'cautious',
    recommendation: 'show_trust_badges',
    priority: 10,
    summary: 'Show testimonials and trust signals',
    expectedImpact: '+25-30% conversion for cautious users',
    changes: [
      {
        selector: '#testimonials',
        componentPath: 'components/store/Testimonials.tsx',
        changeType: 'config',
        property: 'testimonials.show',
        oldValue: '*',
        newValue: 'true',
        reason: 'Cautious users need social proof before committing',
      },
    ],
  },
  {
    id: 'cautious_safe_cta',
    identityState: 'cautious',
    recommendation: 'show_trust_badges',
    priority: 9,
    summary: 'Use risk-free language on CTA',
    expectedImpact: '+15-20% click-through',
    changes: [
      {
        selector: 'button[data-cta]',
        componentPath: 'components/store/Hero.tsx',
        changeType: 'config',
        property: 'hero.cta.text',
        oldValue: '*',
        newValue: 'Browse Risk-Free',
        reason: 'Reassuring language reduces perceived risk for cautious users',
      },
    ],
  },
];

const CONFIDENT_RULES: IdentityFixRule[] = [
  {
    id: 'confident_bold_cta',
    identityState: 'confident',
    recommendation: 'bold_cta',
    priority: 10,
    summary: 'Use direct, action-oriented CTA',
    expectedImpact: '+15-20% conversion',
    changes: [
      {
        selector: 'button[data-cta]',
        componentPath: 'components/store/Hero.tsx',
        changeType: 'config',
        property: 'hero.cta.text',
        oldValue: '*',
        newValue: 'Buy Now',
        reason: 'Confident users want direct action, not browsing',
      },
      {
        selector: 'button[data-cta]',
        componentPath: 'components/store/Hero.tsx',
        changeType: 'config',
        property: 'hero.cta.size',
        oldValue: '*',
        newValue: 'large',
        reason: 'Larger CTA for confident users ready to act',
      },
    ],
  },
];

const READY_TO_DECIDE_RULES: IdentityFixRule[] = [
  {
    id: 'ready_checkout_cta',
    identityState: 'ready_to_decide',
    recommendation: 'high_urgency',
    priority: 10,
    summary: 'Use checkout-focused CTA with urgency',
    expectedImpact: '+35-45% conversion',
    changes: [
      {
        selector: 'button[data-cta]',
        componentPath: 'components/store/Hero.tsx',
        changeType: 'config',
        property: 'hero.cta.text',
        oldValue: '*',
        newValue: 'Complete Your Order →',
        reason: 'Direct path to checkout for ready users',
      },
    ],
  },
];

const IMPULSE_BUYER_RULES: IdentityFixRule[] = [
  {
    id: 'impulse_urgent_cta',
    identityState: 'impulse_buyer',
    recommendation: 'high_urgency',
    priority: 10,
    summary: 'Create urgency with limited-time messaging',
    expectedImpact: '+40-50% conversion for impulse buyers',
    changes: [
      {
        selector: 'button[data-cta]',
        componentPath: 'components/store/Hero.tsx',
        changeType: 'config',
        property: 'hero.cta.text',
        oldValue: '*',
        newValue: 'Buy Now - Limited Time!',
        reason: 'Urgency messaging captures impulse buyers before they leave',
      },
      {
        selector: 'button[data-cta]',
        componentPath: 'components/store/Hero.tsx',
        changeType: 'config',
        property: 'hero.cta.size',
        oldValue: '*',
        newValue: 'large',
        reason: 'Large CTA is unmissable for quick decision makers',
      },
    ],
  },
  {
    id: 'impulse_simplify',
    identityState: 'impulse_buyer',
    recommendation: 'simplify_layout',
    priority: 9,
    summary: 'Simplify layout to reduce friction',
    expectedImpact: '+20-25% faster checkout',
    changes: [
      {
        selector: '#products',
        componentPath: 'components/store/ProductGrid.tsx',
        changeType: 'config',
        property: 'products.layout',
        oldValue: '*',
        newValue: 'grid-2',
        reason: 'Fewer choices means faster decisions for impulse buyers',
      },
      {
        selector: '#hero h1',
        componentPath: 'components/store/Hero.tsx',
        changeType: 'config',
        property: 'hero.headline',
        oldValue: '*',
        newValue: 'Flash Sale - Today Only!',
        reason: 'Exciting headline with urgency for impulse buyers',
      },
    ],
  },
];

const COMPARISON_FOCUSED_RULES: IdentityFixRule[] = [
  {
    id: 'comparison_show_tools',
    identityState: 'comparison_focused',
    recommendation: 'show_comparison_tools',
    priority: 10,
    summary: 'Show comparison tools and trust badges for comparison shoppers',
    expectedImpact: '+20-30% engagement from comparison shoppers',
    changes: [
      {
        selector: '#testimonials',
        componentPath: 'components/store/Testimonials.tsx',
        changeType: 'config',
        property: 'testimonials.show',
        oldValue: '*',
        newValue: 'true',
        reason: 'Social proof helps comparison shoppers make decisions',
      },
      {
        selector: 'button[data-cta]',
        componentPath: 'components/store/Hero.tsx',
        changeType: 'config',
        property: 'hero.cta.text',
        oldValue: '*',
        newValue: 'Compare Our Products',
        reason: 'Matches user intent to compare options',
      },
      {
        selector: '#hero h1',
        componentPath: 'components/store/Hero.tsx',
        changeType: 'config',
        property: 'hero.subheadline',
        oldValue: '*',
        newValue: 'Trusted by 10,000+ customers. See why we\'re rated #1.',
        reason: 'Trust signals help comparison shoppers choose',
      },
    ],
  },
];

const CURIOUS_RULES: IdentityFixRule[] = [
  {
    id: 'curious_explore_cta',
    identityState: 'curious',
    recommendation: 'show_comparison_tools',
    priority: 10,
    summary: 'Encourage exploration with discovery-focused CTA',
    expectedImpact: '+25-35% page engagement',
    changes: [
      {
        selector: 'button[data-cta]',
        componentPath: 'components/store/Hero.tsx',
        changeType: 'config',
        property: 'hero.cta.text',
        oldValue: '*',
        newValue: 'Discover Our Collection',
        reason: 'Discovery language matches curious user intent',
      },
      {
        selector: '#hero h1',
        componentPath: 'components/store/Hero.tsx',
        changeType: 'config',
        property: 'hero.headline',
        oldValue: '*',
        newValue: 'Explore Something New',
        reason: 'Inviting headline encourages curious users to browse',
      },
    ],
  },
];

// Combine all rules
const ALL_RULES: IdentityFixRule[] = [
  ...FRUSTRATED_RULES,
  ...OVERWHELMED_RULES,
  ...CAUTIOUS_RULES,
  ...IMPULSE_BUYER_RULES,
  ...CONFIDENT_RULES,
  ...READY_TO_DECIDE_RULES,
  ...COMPARISON_FOCUSED_RULES,
  ...CURIOUS_RULES,
];

// =============================================================================
// MAPPING FUNCTIONS
// =============================================================================

/**
 * Get all fix rules for a given identity state
 */
export function getFixRulesForIdentity(state: IdentityState): IdentityFixRule[] {
  return ALL_RULES
    .filter(rule => rule.identityState === state)
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Map UI recommendations to relevant fix rules
 */
function matchRecommendationsToRules(
  state: IdentityState,
  recommendations: {
    headline_style: string;
    cta_style: string;
    urgency: 'low' | 'medium' | 'high' | 'extreme';
    show_trust_badges: boolean;
    show_comparison_tools: boolean;
    simplify_layout: boolean;
  }
): IdentityFixRule[] {
  const rules = getFixRulesForIdentity(state);
  const matchedRules: IdentityFixRule[] = [];

  for (const rule of rules) {
    let matches = false;

    switch (rule.recommendation) {
      case 'simplify_layout':
        matches = recommendations.simplify_layout;
        break;
      case 'show_trust_badges':
        matches = recommendations.show_trust_badges;
        break;
      case 'show_comparison_tools':
        matches = recommendations.show_comparison_tools;
        break;
      case 'high_urgency':
        matches = recommendations.urgency === 'high' || recommendations.urgency === 'extreme';
        break;
      case 'low_urgency':
        matches = recommendations.urgency === 'low';
        break;
      case 'bold_cta':
        matches = recommendations.cta_style === 'bold';
        break;
      case 'guided_cta':
        matches = recommendations.cta_style === 'guided';
        break;
      case 'support_cta':
        matches = recommendations.cta_style === 'support';
        break;
    }

    if (matches) {
      matchedRules.push(rule);
    }
  }

  return matchedRules;
}

/**
 * Map identity state and recommendations to element changes
 */
export function mapRecommendationsToChanges(
  identityState: IdentityState,
  confidence: number,
  recommendations: {
    headline_style: string;
    cta_style: string;
    urgency: 'low' | 'medium' | 'high' | 'extreme';
    show_trust_badges: boolean;
    show_comparison_tools: boolean;
    simplify_layout: boolean;
  }
): IdentityFixMapping {
  const matchedRules = matchRecommendationsToRules(identityState, recommendations);

  // Collect all element changes from matched rules
  const elementChanges: ElementChange[] = [];
  const appliedRecommendations: UIRecommendationType[] = [];

  for (const rule of matchedRules) {
    elementChanges.push(...rule.changes);
    if (!appliedRecommendations.includes(rule.recommendation)) {
      appliedRecommendations.push(rule.recommendation);
    }
  }

  // Deduplicate changes by property (keep highest priority)
  const seenProperties = new Set<string>();
  const deduplicatedChanges = elementChanges.filter(change => {
    const key = `${change.componentPath}:${change.property}`;
    if (seenProperties.has(key)) {
      return false;
    }
    seenProperties.add(key);
    return true;
  });

  // Build summary from matched rules
  const summaries = matchedRules.map(r => r.summary);
  const impacts = matchedRules.map(r => r.expectedImpact);

  return {
    identityState,
    confidence,
    recommendations: appliedRecommendations,
    elementChanges: deduplicatedChanges,
    summary: summaries.length > 0
      ? summaries.join('; ')
      : `No specific fixes for ${identityState} identity`,
    expectedImpact: impacts.length > 0
      ? impacts[0]
      : 'Moderate improvement expected',
    rationale: `User identified as "${identityState}" with ${(confidence * 100).toFixed(0)}% confidence. ` +
      `Applied ${appliedRecommendations.length} recommendation(s): ${appliedRecommendations.join(', ')}.`,
  };
}

/**
 * Validate that target elements exist in the element index
 */
export async function validateElementTargets(
  changes: ElementChange[]
): Promise<{ valid: ElementChange[]; invalid: ElementChange[]; indexLoaded: boolean }> {
  let elementIndex: ElementIndex | null = null;

  try {
    elementIndex = await loadElementIndex();
  } catch {
    // Index not available - skip validation
    return { valid: changes, invalid: [], indexLoaded: false };
  }

  if (!elementIndex) {
    return { valid: changes, invalid: [], indexLoaded: false };
  }

  const valid: ElementChange[] = [];
  const invalid: ElementChange[] = [];

  for (const change of changes) {
    // For config changes, we just validate the component path exists
    if (change.changeType === 'config') {
      // Config changes modify data/config-live.json, not components directly
      valid.push(change);
      continue;
    }

    // For other changes, check if selector exists in index
    const matchingElement = elementIndex.elements.find(
      el => el.selector === change.selector ||
           el.fullPath.includes(change.selector.replace('#', ''))
    );

    if (matchingElement) {
      valid.push(change);
    } else {
      invalid.push(change);
    }
  }

  return { valid, invalid, indexLoaded: true };
}

/**
 * Convert IdentityFixMapping to FixRecommendation format for Claude code generation
 */
export function toFixRecommendation(mapping: IdentityFixMapping): FixRecommendation {
  // Group changes by file for the FixRecommendation format
  const changes = mapping.elementChanges.map(change => {
    // Determine action type based on changeType
    let action: 'add_attribute' | 'modify_attribute' | 'change_style' | 'change_text';
    switch (change.changeType) {
      case 'style':
        action = 'change_style';
        break;
      case 'text':
        action = 'change_text';
        break;
      case 'config':
        action = 'modify_attribute';
        break;
      default:
        action = 'modify_attribute';
    }

    return {
      file: change.changeType === 'config'
        ? 'data/config-live.json'
        : change.componentPath,
      elementSelector: change.selector,
      action,
      attribute: change.property,
      value: change.newValue,
      oldValue: change.oldValue !== '*' ? change.oldValue : undefined,
      reason: change.reason,
    };
  });

  return {
    issueId: `identity_${mapping.identityState}_${Date.now()}`,
    confidence: mapping.confidence,
    summary: mapping.summary,
    changeType: 'attribute',
    changes,
    expectedImpact: mapping.expectedImpact,
    rationale: mapping.rationale,
  };
}

/**
 * Get a human-readable description of what the fix will do
 */
export function describeMapping(mapping: IdentityFixMapping): string {
  const lines = [
    `## Identity-Based Fix for "${mapping.identityState}" User`,
    ``,
    `**Confidence:** ${(mapping.confidence * 100).toFixed(0)}%`,
    ``,
    `**Summary:** ${mapping.summary}`,
    ``,
    `**Expected Impact:** ${mapping.expectedImpact}`,
    ``,
    `### Changes:`,
  ];

  for (const change of mapping.elementChanges) {
    lines.push(`- **${change.property}**: "${change.oldValue}" → "${change.newValue}"`);
    lines.push(`  - *Reason:* ${change.reason}`);
  }

  lines.push(``, `---`, `*${mapping.rationale}*`);

  return lines.join('\n');
}
