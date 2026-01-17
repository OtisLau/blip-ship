import {
  Recommendation,
  Pattern,
  PatternType,
  SpatialLocation,
  EffortLevel,
  ViewportAnalysis,
  PageZone,
  BusinessImpact,
} from './types';
import { getAboveFoldTargetLocation } from './spatialAnalyzer';

/**
 * Pattern-specific recommendation templates
 */
const PATTERN_RECOMMENDATIONS: Record<PatternType, {
  actions: string[];
  metric: string;
  baseImprovement: number;
  effort: EffortLevel;
}> = {
  rage_cluster: {
    actions: [
      'Add loading indicators or visual feedback when clicked',
      'Increase click target size and add hover states',
      'Ensure the element responds within 100ms',
    ],
    metric: 'User frustration rate',
    baseImprovement: 60,
    effort: 'small',
  },
  dead_click_hotspot: {
    actions: [
      'Make the element interactive (add click handler)',
      'Change styling to not appear clickable (remove hover effects, change cursor)',
      'Add visual boundaries to clarify what is/isn\'t clickable',
    ],
    metric: 'Click success rate',
    baseImprovement: 40,
    effort: 'small',
  },
  cta_invisibility: {
    actions: [
      'Move CTA above the fold',
      'Increase CTA contrast and size',
      'Add visual indicators pointing to CTA',
    ],
    metric: 'CTA click rate',
    baseImprovement: 140,
    effort: 'small',
  },
  checkout_friction: {
    actions: [
      'Simplify checkout form fields',
      'Add progress indicators',
      'Show security badges and trust signals',
    ],
    metric: 'Checkout completion rate',
    baseImprovement: 25,
    effort: 'medium',
  },
  scroll_abandonment: {
    actions: [
      'Add scroll indicators or visual cues',
      'Move important content above the fold',
      'Make hero section more compelling to encourage exploration',
    ],
    metric: 'Content visibility rate',
    baseImprovement: 35,
    effort: 'small',
  },
  element_confusion: {
    actions: [
      'Add clear visual affordances (buttons look like buttons)',
      'Use consistent interactive element styling',
      'Add tooltips explaining element functionality',
    ],
    metric: 'Interaction success rate',
    baseImprovement: 45,
    effort: 'small',
  },
  price_anxiety: {
    actions: [
      'Add value justification near prices',
      'Show competitor price comparisons',
      'Display savings, discounts, or payment plans',
    ],
    metric: 'Add-to-cart rate',
    baseImprovement: 20,
    effort: 'medium',
  },
};

/**
 * Generate a recommendation for a pattern
 */
export function generatePatternRecommendation(
  pattern: Pattern,
  location: SpatialLocation | null,
  impact: BusinessImpact,
  viewport: ViewportAnalysis
): Recommendation {
  const template = PATTERN_RECOMMENDATIONS[pattern.type];

  // Select most appropriate action based on context
  let action = template.actions[0];

  // Customize action based on pattern specifics
  if (pattern.type === 'dead_click_hotspot') {
    // If it's a text element or product card, suggest making it interactive
    const elementText = pattern.elementTexts[0] || '';
    if (elementText.includes('$') || elementText.toLowerCase().includes('product')) {
      action = 'Make entire card/row clickable to navigate to product details';
    } else if (pattern.elementSelectors.some(s => s.includes('div') || s.includes('span'))) {
      action = 'Make element interactive OR add clear visual boundaries around interactive buttons';
    }
  }

  if (pattern.type === 'rage_cluster') {
    action = `Investigate why "${pattern.elementTexts[0] || pattern.elementSelectors[0] || 'this area'}" is frustrating users. Add immediate visual feedback on click.`;
  }

  // Calculate target location if element is below fold
  let targetLocation = undefined;
  if (location && !location.isAboveFold && ['cta_invisibility', 'dead_click_hotspot'].includes(pattern.type)) {
    targetLocation = getAboveFoldTargetLocation(location, viewport);
  }

  // Calculate expected improvement
  let improvement = template.baseImprovement;

  // Adjust based on session coverage - higher coverage = more potential improvement
  if (pattern.sessionsAffectedPercent >= 50) {
    improvement *= 1.2;
  } else if (pattern.sessionsAffectedPercent < 10) {
    improvement *= 0.8;
  }

  return {
    action,
    currentLocation: location || undefined,
    targetLocation,
    expectedOutcome: {
      metric: template.metric,
      improvementPercent: Math.round(improvement),
    },
    effort: template.effort,
    priority: impact.urgencyScore,
  };
}

/**
 * Generate a title for an insight based on pattern
 */
export function generateInsightTitle(
  pattern: Pattern,
  location: SpatialLocation | null
): string {
  const elementName = pattern.elementTexts[0]?.slice(0, 30) ||
    pattern.elementSelectors[0]?.slice(0, 30) ||
    'Element';

  const sessionWord = pattern.sessionsAffectedPercent >= 50 ? 'Most' :
    pattern.sessionsAffectedPercent >= 25 ? 'Many' : 'Some';

  switch (pattern.type) {
    case 'rage_cluster':
      return `${sessionWord} Users Frustrated by "${elementName}"`;

    case 'dead_click_hotspot':
      if (pattern.sessionsAffectedPercent >= 80) {
        return `"${elementName}" Confusing 100% of Users`;
      }
      return `Users Expect "${elementName}" to be Clickable`;

    case 'cta_invisibility':
      return `CTA Not Visible - Below Fold at Y=${location?.coordinates.y || '?'}px`;

    case 'checkout_friction':
      return `Checkout Friction Losing ${pattern.sessionsAffectedPercent.toFixed(0)}% of Customers`;

    case 'scroll_abandonment':
      return `${pattern.sessionsAffectedPercent.toFixed(0)}% of Users Never See Below-Fold Content`;

    case 'element_confusion':
      return `Users Confused About "${elementName}" Interactivity`;

    case 'price_anxiety':
      return `Price-Checking Behavior Detected in ${pattern.sessionsAffectedPercent.toFixed(0)}% of Sessions`;

    default:
      return `Issue Detected with "${elementName}"`;
  }
}

/**
 * Generate a summary for an insight based on pattern
 */
export function generateInsightSummary(
  pattern: Pattern,
  location: SpatialLocation | null,
  impact: BusinessImpact
): string {
  const locationDesc = location ? ` at ${location.description}` : '';
  const elementName = pattern.elementTexts[0] || pattern.elementSelectors[0] || 'this element';

  switch (pattern.type) {
    case 'rage_cluster':
      return `Users are rapidly clicking on "${elementName}"${locationDesc}, ` +
        `indicating severe frustration. This affects ${pattern.sessionsAffectedPercent.toFixed(0)}% of sessions ` +
        `and may be causing an estimated ${impact.estimatedConversionLoss}% conversion loss.`;

    case 'dead_click_hotspot':
      return `${pattern.occurrences} clicks on "${elementName}"${locationDesc} resulted in no action. ` +
        `Users expect this element to be interactive. ` +
        `Estimated conversion impact: ${impact.estimatedConversionLoss}%.`;

    case 'cta_invisibility':
      return `Your call-to-action is positioned${locationDesc}, ` +
        `which ${location?.isAboveFold ? 'is good visibility' : 'requires scrolling to see'}. ` +
        `Only ${100 - pattern.sessionsAffectedPercent}% of users interact with it.`;

    case 'checkout_friction':
      return `Checkout process is losing ${pattern.sessionsAffectedPercent.toFixed(0)}% of users who add items to cart. ` +
        `Friction signals detected including ${pattern.occurrences} frustration events. ` +
        `Potential monthly revenue impact: $${impact.estimatedRevenueLossPerMonth}.`;

    case 'scroll_abandonment':
      return `${pattern.sessionsAffectedPercent.toFixed(0)}% of users don't scroll past the initial viewport. ` +
        `Content below Y=${location?.foldLine || 800}px is not being seen. ` +
        `Consider moving important elements above the fold or adding scroll encouragement.`;

    case 'element_confusion':
      return `Users are confused about whether "${elementName}" is interactive${locationDesc}. ` +
        `${pattern.occurrences} dead clicks and double-clicks detected, suggesting unclear UI affordances.`;

    case 'price_anxiety':
      return `${pattern.sessionsAffectedPercent.toFixed(0)}% of sessions show excessive price-checking behavior ` +
        `(${pattern.occurrences} price interactions). Users may find prices too high or need more value justification.`;

    default:
      return `Issue detected with "${elementName}"${locationDesc}. ` +
        `Affects ${pattern.sessionsAffectedPercent.toFixed(0)}% of sessions with ${pattern.occurrences} occurrences.`;
  }
}

/**
 * Get effort level description
 */
export function getEffortDescription(effort: EffortLevel): string {
  switch (effort) {
    case 'trivial':
      return 'Quick fix (< 1 hour)';
    case 'small':
      return 'Small change (1-4 hours)';
    case 'medium':
      return 'Moderate effort (1-2 days)';
    case 'large':
      return 'Significant work (3+ days)';
  }
}

/**
 * Generate improvement projection text
 */
export function getImprovementProjection(recommendation: Recommendation): string {
  const { expectedOutcome } = recommendation;

  return `${expectedOutcome.metric}: +${expectedOutcome.improvementPercent}% improvement expected`;
}

/**
 * Get priority label
 */
export function getPriorityLabel(priority: number): string {
  if (priority >= 80) return 'Critical Priority';
  if (priority >= 60) return 'High Priority';
  if (priority >= 40) return 'Medium Priority';
  return 'Low Priority';
}
