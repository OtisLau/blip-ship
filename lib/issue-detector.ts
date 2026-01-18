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
 *
 * CONSOLIDATED: Instead of many overlapping click patterns,
 * we have ONE pattern per distinct user intent/problem.
 * The LLM analyzes the evidence to determine the fix.
 */
const PATTERN_RULES: PatternRule[] = [
  // ===========================================
  // CLICK FRUSTRATION (consolidated)
  // ===========================================
  // One pattern for ALL click frustration - grouped by element
  // The evidence (dead_click, rage_click, double_click) tells the story
  // Thresholds aligned with ux-config-guardrails.md: 5 rapid clicks, 3 sessions minimum
  {
    id: 'click_frustration',
    name: 'Click Frustration',
    category: 'frustration',
    eventTypes: ['dead_click', 'rage_click', 'double_click'],
    groupBy: 'elementSelector',
    timeWindowHours: 24,
    minOccurrences: 5,
    minUniqueSessions: 3,
    severityThresholds: { low: 5, medium: 15, high: 30, critical: 50 },
    problemTemplate: 'Users clicking this element are frustrated',
    intentTemplate: 'Expected the element to respond',
    outcomeTemplate: 'Element did not behave as expected',
    fixTemplate: '', // Let LLM decide based on evidence
  },

  // ===========================================
  // MULTI-PRODUCT INTERACTION (no label/bias)
  // ===========================================
  // Detects when users interact with multiple products - LLM decides meaning
  {
    id: 'multi_product_interaction',
    name: 'Multi-Product Interaction',
    category: 'missing_feature',
    eventTypes: ['product_compare', 'product_view', 'add_to_cart', 'cart_remove'],
    groupBy: 'sectionId',
    timeWindowHours: 24,
    minOccurrences: 3,
    minUniqueSessions: 1,
    severityThresholds: { low: 3, medium: 6, high: 10, critical: 20 },
    problemTemplate: 'Users interacting with multiple products',
    intentTemplate: '', // No assumed intent - LLM decides
    outcomeTemplate: '', // No assumed outcome - LLM decides
    fixTemplate: '', // LLM decides based on behavior
  },

  // ===========================================
  // SCROLL & NAVIGATION
  // ===========================================
  {
    id: 'scroll_confusion',
    name: 'User Appears Lost',
    category: 'missing_feature',
    eventTypes: ['scroll_reversal'],
    groupBy: 'sectionId',
    timeWindowHours: 24,
    minOccurrences: 3,  // Lower threshold
    minUniqueSessions: 1,
    severityThresholds: { low: 3, medium: 6, high: 12, critical: 25 },
    problemTemplate: 'Users scrolling up and down repeatedly',
    intentTemplate: 'Looking for something they cannot find',
    outcomeTemplate: 'Content organization may be confusing',
    fixTemplate: '',
  },

  // ===========================================
  // PRICE SENSITIVITY
  // ===========================================
  {
    id: 'price_focused',
    name: 'Price-Focused Behavior',
    category: 'missing_feature',
    eventTypes: ['price_check'],
    groupBy: 'sectionId',
    timeWindowHours: 24,
    minOccurrences: 3,
    minUniqueSessions: 1,
    severityThresholds: { low: 3, medium: 8, high: 15, critical: 30 },
    problemTemplate: 'Users are clicking on prices frequently',
    intentTemplate: 'Want more price information or deals',
    outcomeTemplate: 'Limited price interaction available',
    fixTemplate: '',
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

  // ============ UX AUTO-FIX PATTERNS ============

  // BUTTON NO FEEDBACK - rage/double clicks suggest missing loading state
  {
    id: 'button_no_feedback',
    name: 'Button Missing Loading Feedback',
    category: 'frustration',
    eventTypes: ['rage_click', 'double_click'],
    groupBy: 'elementSelector',
    timeWindowHours: 24,
    minOccurrences: 5,
    minUniqueSessions: 3,
    severityThresholds: { low: 5, medium: 10, high: 20, critical: 35 },
    problemTemplate: 'Users rage/double-clicking buttons - no loading feedback',
    intentTemplate: 'User clicked button and expected immediate feedback or action',
    outcomeTemplate: 'No visual indication that action is processing',
    fixTemplate: 'Add loading spinner to button during async operations',
  },

  // IMAGE GALLERY NEEDED - dead clicks on product images suggest gallery desire
  {
    id: 'image_gallery_needed',
    name: 'Product Image Needs Gallery/Zoom',
    category: 'missing_feature',
    eventTypes: ['dead_click', 'image_click', 'double_click'],
    groupBy: 'elementSelector',
    timeWindowHours: 24,
    minOccurrences: 8,
    minUniqueSessions: 4,
    severityThresholds: { low: 8, medium: 15, high: 25, critical: 40 },
    problemTemplate: 'Users clicking/double-clicking product images expecting to enlarge',
    intentTemplate: 'View larger product image or browse multiple angles',
    outcomeTemplate: 'Image does not open gallery or zoom view',
    fixTemplate: 'Add lightbox gallery with image zoom and navigation',
  },

  // ADDRESS AUTOCOMPLETE NEEDED - slow form fills on address fields
  {
    id: 'address_autocomplete_needed',
    name: 'Address Fields Need Autocomplete',
    category: 'frustration',
    eventTypes: ['slow_form_fill', 'form_focus', 'form_blur'],
    groupBy: 'elementSelector',
    timeWindowHours: 24,
    minOccurrences: 6,
    minUniqueSessions: 3,
    severityThresholds: { low: 6, medium: 12, high: 20, critical: 35 },
    problemTemplate: 'Users spending excessive time on address fields',
    intentTemplate: 'Quickly enter shipping/billing address',
    outcomeTemplate: 'Manual typing without autocomplete suggestions',
    fixTemplate: 'Add address autocomplete with Google Places or similar',
  },

  // COMPARISON FEATURE NEEDED - rapid product views suggest comparison shopping
  {
    id: 'comparison_feature_needed',
    name: 'Product Comparison Feature Needed',
    category: 'missing_feature',
    eventTypes: ['product_compare', 'product_view'],
    groupBy: 'sectionId',
    timeWindowHours: 24,
    minOccurrences: 15,
    minUniqueSessions: 5,
    severityThresholds: { low: 15, medium: 25, high: 40, critical: 60 },
    problemTemplate: 'Users viewing multiple products rapidly - comparison shopping',
    intentTemplate: 'Compare product features, prices, or specifications side-by-side',
    outcomeTemplate: 'No way to compare products without opening each individually',
    fixTemplate: 'Add compare checkbox on product cards with side-by-side comparison drawer',
  },

  // COLOR PREVIEW NEEDED - users open products then check colors
  {
    id: 'color_preview_needed',
    name: 'Color Preview on Grid Needed',
    category: 'missing_feature',
    eventTypes: ['product_view', 'color_select', 'color_hover'],
    groupBy: 'sectionId',
    timeWindowHours: 24,
    minOccurrences: 12,
    minUniqueSessions: 4,
    severityThresholds: { low: 12, medium: 20, high: 35, critical: 55 },
    problemTemplate: 'Users opening products just to check available colors',
    intentTemplate: 'See available color options before clicking through',
    outcomeTemplate: 'Must open product modal to see color variants',
    fixTemplate: 'Add color swatches below product image in grid view',
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

      // Resolve component - try fullPath first, then selector
      const sampleEvent = events[0];
      const eventRecord = sampleEvent as unknown as Record<string, unknown>;
      const fullPath = eventRecord.elementContext
        ? (eventRecord.elementContext as Record<string, unknown>).fullPath as string
        : undefined;
      const component = resolveComponent(fullPath || key, sampleEvent.elementText);

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
        sampleEvents: events.slice(0, 15), // Include up to 15 sample events for rich LLM context

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
