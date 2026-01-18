/**
 * UI Issue Detector
 * Analyzes user behavior events to detect UI/UX problems
 * and generate actionable issues for LLM-powered fixes.
 */

import { UIIssue, PatternRule, IssueCategory, IssueSeverity } from './types';
import { AnalyticsEvent } from '../types/events';
import { resolveComponent, getComponentContext } from './component-registry';
import { readEvents } from './db';

/**
 * Pattern rules for detecting UI issues
 */
const PATTERN_RULES: PatternRule[] = [
  // Dead clicks on images - users expect them to be interactive
  {
    id: 'dead_click_image',
    name: 'Non-Interactive Image',
    category: 'frustration',
    eventTypes: ['dead_click', 'double_click'],
    groupBy: 'elementSelector',
    timeWindowHours: 24,
    minOccurrences: 2,
    minUniqueSessions: 1,
    severityThresholds: { low: 2, medium: 5, high: 10, critical: 25 },
    problemTemplate: 'Users are clicking on images expecting them to be interactive',
    intentTemplate: 'View larger image or see more details',
    outcomeTemplate: 'Nothing happens - the image is not clickable',
    fixTemplate: 'Make images clickable - either open a lightbox/modal or navigate to product details',
  },

  // Rage clicks on any element - likely missing loading state
  {
    id: 'rage_click_hotspot',
    name: 'Rage Click Hotspot (Missing Loading State?)',
    category: 'frustration',
    eventTypes: ['rage_click'],
    groupBy: 'elementSelector',
    timeWindowHours: 24,
    minOccurrences: 2,
    minUniqueSessions: 1,
    severityThresholds: { low: 2, medium: 4, high: 8, critical: 15 },
    problemTemplate: 'Users are rage-clicking on this element out of frustration',
    intentTemplate: 'Expecting the element to respond or do something',
    outcomeTemplate: 'Element is not responding as expected - likely missing loading animation or feedback',
    fixTemplate: 'Add a loading spinner/animation on click, disable button while processing, show visual feedback immediately',
  },

  // Rage clicks specifically on buttons - NO LOADING ANIMATION
  {
    id: 'button_no_loading_feedback',
    name: 'Button Missing Loading Feedback',
    category: 'frustration',
    eventTypes: ['rage_click'],
    groupBy: 'elementSelector',
    timeWindowHours: 24,
    minOccurrences: 1,
    minUniqueSessions: 1,
    severityThresholds: { low: 1, medium: 3, high: 6, critical: 12 },
    problemTemplate: 'Users are rage-clicking buttons - no loading feedback when clicked',
    intentTemplate: 'Clicked button and expected immediate visual response',
    outcomeTemplate: 'Button appears unresponsive - no loading spinner or disabled state',
    fixTemplate: 'Add loading spinner inside button, disable button while processing, change button text to "Processing..."',
  },

  // Dead clicks on non-interactive elements (general)
  {
    id: 'dead_click_general',
    name: 'Dead Click Zone',
    category: 'frustration',
    eventTypes: ['dead_click'],
    groupBy: 'elementSelector',
    timeWindowHours: 24,
    minOccurrences: 8,
    minUniqueSessions: 4,
    severityThresholds: { low: 8, medium: 15, high: 30, critical: 60 },
    problemTemplate: 'Users are clicking on non-interactive elements',
    intentTemplate: 'Expecting the element to be clickable or do something',
    outcomeTemplate: 'Nothing happens because the element is not interactive',
    fixTemplate: 'Consider making this element interactive or adding visual cues that it is not clickable',
  },

  // Scroll confusion - users scrolling up and down looking for something
  {
    id: 'scroll_confusion',
    name: 'Scroll Confusion',
    category: 'missing_feature',
    eventTypes: ['scroll_reversal'],
    groupBy: 'sectionId',
    timeWindowHours: 24,
    minOccurrences: 10,
    minUniqueSessions: 5,
    severityThresholds: { low: 10, medium: 20, high: 40, critical: 80 },
    problemTemplate: 'Users are scrolling up and down repeatedly, appearing lost or searching for something',
    intentTemplate: 'Looking for specific content or navigation',
    outcomeTemplate: 'Cannot find what they are looking for easily',
    fixTemplate: 'Consider adding better navigation, search functionality, or reorganizing content',
  },

  // Price comparison behavior - viewing multiple products quickly
  {
    id: 'price_comparison',
    name: 'Price Comparison Intent',
    category: 'missing_feature',
    eventTypes: ['product_compare', 'price_check'],
    groupBy: 'sectionId',
    timeWindowHours: 24,
    minOccurrences: 15,
    minUniqueSessions: 8,
    severityThresholds: { low: 15, medium: 30, high: 50, critical: 100 },
    problemTemplate: 'Users are frequently comparing products and checking prices',
    intentTemplate: 'Want to compare products side-by-side before making a decision',
    outcomeTemplate: 'Have to manually switch between products to compare',
    fixTemplate: 'Add a product comparison feature or quick-view modal to help users compare easily',
  },

  // Form abandonment - users starting forms but leaving them empty
  {
    id: 'form_abandonment',
    name: 'Form Field Friction',
    category: 'conversion_blocker',
    eventTypes: ['form_focus', 'form_blur'],
    groupBy: 'elementSelector',
    timeWindowHours: 24,
    minOccurrences: 10,
    minUniqueSessions: 5,
    severityThresholds: { low: 10, medium: 20, high: 40, critical: 80 },
    problemTemplate: 'Users are focusing on form fields but leaving them empty',
    intentTemplate: 'Want to complete the form but encountering friction',
    outcomeTemplate: 'Abandoning the form without completing it',
    fixTemplate: 'Simplify form fields, add helpful placeholders, or break into smaller steps',
  },

  // Exit intent after specific actions
  {
    id: 'exit_after_price',
    name: 'Price Shock Exit',
    category: 'conversion_blocker',
    eventTypes: ['exit_intent'],
    groupBy: 'sectionId',
    timeWindowHours: 24,
    minOccurrences: 10,
    minUniqueSessions: 5,
    severityThresholds: { low: 10, medium: 20, high: 35, critical: 70 },
    problemTemplate: 'Users are showing exit intent frequently',
    intentTemplate: 'Were interested but something changed their mind',
    outcomeTemplate: 'Leaving the site without converting',
    fixTemplate: 'Consider exit-intent popup with discount, or review pricing presentation',
  },

  // ============ NEW PATTERNS FROM USER FEEDBACK ============

  // SHIPPING COST REVEALED TOO LATE - exit during checkout
  {
    id: 'shipping_cost_surprise',
    name: 'Shipping Cost Revealed Too Late',
    category: 'conversion_blocker',
    eventTypes: ['exit_intent', 'checkout_abandon'],
    groupBy: 'sectionId',
    timeWindowHours: 24,
    minOccurrences: 5,
    minUniqueSessions: 3,
    severityThresholds: { low: 5, medium: 10, high: 20, critical: 40 },
    problemTemplate: 'Users are abandoning checkout - possibly due to unexpected shipping costs',
    intentTemplate: 'Complete purchase but surprised by final total',
    outcomeTemplate: 'Abandoning cart at shipping/payment step',
    fixTemplate: 'Show shipping cost estimate earlier (product page or cart), offer free shipping threshold, be transparent about costs upfront',
  },

  // CHECKOUT AUTOFILL DISABLED - slow form completion
  {
    id: 'checkout_autofill_disabled',
    name: 'Checkout Form Not Autofill-Friendly',
    category: 'frustration',
    eventTypes: ['form_focus', 'form_blur', 'slow_form_fill'],
    groupBy: 'elementSelector',
    timeWindowHours: 24,
    minOccurrences: 8,
    minUniqueSessions: 4,
    severityThresholds: { low: 8, medium: 15, high: 25, critical: 50 },
    problemTemplate: 'Users are spending too long filling out checkout forms',
    intentTemplate: 'Quickly complete checkout using browser autofill',
    outcomeTemplate: 'Having to manually type everything - autofill not working',
    fixTemplate: 'Add proper autocomplete attributes (autocomplete="name", "email", "address-line1", "postal-code", etc.)',
  },

  // ADDRESS NOT AUTOCOMPLETE - multiple focus/blur on address fields
  {
    id: 'address_no_autocomplete',
    name: 'Address Fields Missing Autocomplete',
    category: 'frustration',
    eventTypes: ['form_focus', 'form_blur'],
    groupBy: 'elementSelector',
    timeWindowHours: 24,
    minOccurrences: 10,
    minUniqueSessions: 5,
    severityThresholds: { low: 10, medium: 20, high: 35, critical: 60 },
    problemTemplate: 'Users are struggling with address entry - no autocomplete suggestions',
    intentTemplate: 'Quickly enter address using autocomplete/autofill',
    outcomeTemplate: 'Manually typing full address, prone to errors',
    fixTemplate: 'Add Google Places Autocomplete or similar address lookup, add proper autocomplete="address-line1" attributes',
  },

  // NO MOST POPULAR TAGS - users comparing many products
  {
    id: 'no_popular_indicators',
    name: 'No "Most Popular" or Social Proof Tags',
    category: 'missing_feature',
    eventTypes: ['product_compare', 'product_view'],
    groupBy: 'sectionId',
    timeWindowHours: 24,
    minOccurrences: 20,
    minUniqueSessions: 8,
    severityThresholds: { low: 20, medium: 40, high: 60, critical: 100 },
    problemTemplate: 'Users are comparing many products - struggling to decide without social proof',
    intentTemplate: 'Find the best/most popular option quickly',
    outcomeTemplate: 'No indicators of which products are bestsellers or most popular',
    fixTemplate: 'Add "Best Seller", "Most Popular", "Customer Favorite" badges to top products, show review counts/ratings',
  },

  // NO URGENCY CUES - cart abandonment without urgency
  {
    id: 'no_urgency_cues',
    name: 'No Urgency Cues (Low Stock, Shipping Cutoff)',
    category: 'conversion_blocker',
    eventTypes: ['cart_review', 'add_to_cart', 'checkout_abandon'],
    groupBy: 'sectionId',
    timeWindowHours: 24,
    minOccurrences: 10,
    minUniqueSessions: 5,
    severityThresholds: { low: 10, medium: 20, high: 35, critical: 60 },
    problemTemplate: 'Users adding to cart but not completing purchase - no urgency to act now',
    intentTemplate: 'Decide whether to buy now or later',
    outcomeTemplate: 'Leaving to "think about it" with no reason to return',
    fixTemplate: 'Add "Only X left in stock", "Order in next 2 hours for next-day delivery", limited-time offers, or countdown timers',
  },

  // TEXT SELECTION ON LONG CONTENT - information in paragraphs not bullets
  {
    id: 'info_not_scannable',
    name: 'Product Info Not Scannable (Walls of Text)',
    category: 'frustration',
    eventTypes: ['text_selection', 'scroll_reversal'],
    groupBy: 'sectionId',
    timeWindowHours: 24,
    minOccurrences: 8,
    minUniqueSessions: 4,
    severityThresholds: { low: 8, medium: 15, high: 25, critical: 45 },
    problemTemplate: 'Users selecting text and scrolling back - content is hard to scan',
    intentTemplate: 'Quickly find key product benefits and features',
    outcomeTemplate: 'Having to read long paragraphs to find information',
    fixTemplate: 'Convert product descriptions to bullet points, use icons for key features, add TL;DR summary at top',
  },

  // VISUAL HIERARCHY - dead clicks on non-primary elements
  {
    id: 'poor_visual_hierarchy',
    name: 'Poor Visual Hierarchy in Product Cards',
    category: 'frustration',
    eventTypes: ['dead_click', 'hover_intent'],
    groupBy: 'elementSelector',
    timeWindowHours: 24,
    minOccurrences: 10,
    minUniqueSessions: 5,
    severityThresholds: { low: 10, medium: 20, high: 35, critical: 60 },
    problemTemplate: 'Users clicking on non-interactive parts of product cards',
    intentTemplate: 'Click the most prominent element to take action',
    outcomeTemplate: 'Visual hierarchy is confusing - unclear what is clickable',
    fixTemplate: 'Make CTA buttons more prominent, increase contrast, add hover states to clickable areas, make entire card clickable',
  },
];

/**
 * Group events by a specific field
 */
function groupEventsBy(
  events: AnalyticsEvent[],
  field: 'elementSelector' | 'sectionId' | 'componentPath'
): Map<string, AnalyticsEvent[]> {
  const groups = new Map<string, AnalyticsEvent[]>();

  for (const event of events) {
    let key: string | undefined;

    if (field === 'elementSelector') {
      key = event.elementSelector;
    } else if (field === 'sectionId') {
      // Extract section from various sources
      key = event.pageUrl || 'unknown';
    } else if (field === 'componentPath') {
      const component = resolveComponent(event.elementSelector || '', event.elementText);
      key = component?.componentPath;
    }

    if (key) {
      const existing = groups.get(key) || [];
      existing.push(event);
      groups.set(key, existing);
    }
  }

  return groups;
}

/**
 * Count unique sessions in a list of events
 */
function countUniqueSessions(events: AnalyticsEvent[]): number {
  const sessions = new Set(events.map(e => e.sessionId));
  return sessions.size;
}

/**
 * Calculate severity based on occurrence count and thresholds
 */
function calculateSeverity(
  count: number,
  thresholds: PatternRule['severityThresholds']
): IssueSeverity {
  if (count >= thresholds.critical) return 'critical';
  if (count >= thresholds.high) return 'high';
  if (count >= thresholds.medium) return 'medium';
  return 'low';
}

/**
 * Check if selector matches an image element
 */
function isImageSelector(selector: string): boolean {
  return selector.toLowerCase().includes('img') ||
         selector.toLowerCase().includes('image') ||
         selector.toLowerCase().includes('photo');
}

/**
 * Detect issues from events based on pattern rules
 */
export async function detectIssues(
  timeWindowHours: number = 24
): Promise<UIIssue[]> {
  const allEvents = await readEvents();

  // Filter events to time window
  const cutoffTime = Date.now() - (timeWindowHours * 60 * 60 * 1000);
  const recentEvents = allEvents.filter(e => e.timestamp >= cutoffTime);

  if (recentEvents.length === 0) {
    return [];
  }

  const detectedIssues: UIIssue[] = [];

  for (const rule of PATTERN_RULES) {
    // Filter events by type (cast to string for comparison)
    const matchingEvents = recentEvents.filter(e =>
      rule.eventTypes.includes(e.type as string)
    );

    if (matchingEvents.length === 0) continue;

    // Group events
    const groups = groupEventsBy(matchingEvents, rule.groupBy);

    // Check each group against thresholds
    for (const [key, events] of groups) {
      const uniqueSessions = countUniqueSessions(events);

      // Check if meets minimum thresholds
      if (events.length < rule.minOccurrences) continue;
      if (uniqueSessions < rule.minUniqueSessions) continue;

      // Special handling for image-specific rules
      if (rule.id === 'dead_click_image' && !isImageSelector(key)) {
        continue;
      }

      // Skip image selector for general dead click rule (handled by specific rule)
      if (rule.id === 'dead_click_general' && isImageSelector(key)) {
        continue;
      }

      // Resolve component
      const sampleEvent = events[0];
      const component = resolveComponent(key, sampleEvent.elementText);

      // Calculate severity
      const severity = calculateSeverity(events.length, rule.severityThresholds);

      // Build human-readable descriptions
      const problemStatement = rule.problemTemplate
        .replace('{count}', events.length.toString())
        .replace('{selector}', key);

      // Create issue
      const issue: UIIssue = {
        id: `issue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        status: 'detected',
        detectedAt: Date.now(),
        lastOccurrence: Math.max(...events.map(e => e.timestamp)),

        category: rule.category,
        severity,
        patternId: rule.id,

        elementSelector: key,
        sectionId: sampleEvent.pageUrl,
        componentPath: component?.componentPath || 'unknown',
        componentName: component?.componentName || 'Unknown',

        eventCount: events.length,
        uniqueSessions,
        sampleEvents: events.slice(0, 5), // Include up to 5 sample events

        problemStatement,
        userIntent: rule.intentTemplate,
        currentOutcome: rule.outcomeTemplate,
        suggestedFix: rule.fixTemplate,
      };

      detectedIssues.push(issue);
    }
  }

  // Sort by severity and event count
  const severityOrder: Record<IssueSeverity, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  detectedIssues.sort((a, b) => {
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.eventCount - a.eventCount;
  });

  return detectedIssues;
}

/**
 * Enrich issue with component code for LLM consumption
 */
export async function enrichIssueWithCode(issue: UIIssue): Promise<UIIssue> {
  const component = resolveComponent(issue.elementSelector, issue.sampleEvents[0]?.elementText);

  if (component) {
    const context = await getComponentContext(component);
    return {
      ...issue,
      componentPath: context.path,
      componentName: context.name,
    };
  }

  return issue;
}

/**
 * Get a summary of detected issues by category
 */
export function summarizeIssues(issues: UIIssue[]): {
  total: number;
  bySeverity: Record<IssueSeverity, number>;
  byCategory: Record<IssueCategory, number>;
  topAffectedComponents: Array<{ path: string; count: number }>;
} {
  const bySeverity: Record<IssueSeverity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  const byCategory: Record<IssueCategory, number> = {
    frustration: 0,
    missing_feature: 0,
    conversion_blocker: 0,
  };

  const componentCounts = new Map<string, number>();

  for (const issue of issues) {
    bySeverity[issue.severity]++;
    byCategory[issue.category]++;

    const count = componentCounts.get(issue.componentPath) || 0;
    componentCounts.set(issue.componentPath, count + 1);
  }

  const topAffectedComponents = Array.from(componentCounts.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    total: issues.length,
    bySeverity,
    byCategory,
    topAffectedComponents,
  };
}
