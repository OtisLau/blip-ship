// Event Types
export type EventType =
  | 'click'
  | 'rage_click'
  | 'dead_click'
  | 'cta_click'
  | 'page_view'
  | 'scroll_depth'
  | 'section_view'
  | 'add_to_cart'
  | 'checkout_start'
  | 'checkout_abandon'    // User left during checkout (frustration signal)
  | 'purchase'
  | 'bounce'
  | 'rapid_scroll'
  // CTA lifecycle events
  | 'cta_visible'         // CTA became visible on screen
  | 'cta_expired'         // CTA expired without interaction
  | 'session_start'       // New session started
  | 'session_end'         // Session ended
  // E-commerce behavior events
  | 'product_view'        // User focused on a specific product
  | 'product_compare'     // User viewing multiple products (comparison shopping)
  | 'price_check'         // User clicked/hovered on price element
  | 'search_intent'       // User clicked search or started typing
  | 'navigation_browse'   // User browsing via navigation
  | 'cart_review'         // User opened/interacted with cart
  | 'exit_intent'         // User showed signs of leaving
  // Engagement & intent signals
  | 'hover_intent'        // User hovered on element for 1.5+ seconds
  | 'text_selection'      // User selected text (research behavior)
  | 'text_copy'           // User copied text
  | 'tab_hidden'          // User switched to another tab
  | 'tab_visible'         // User returned to tab
  | 'scroll_reversal'     // User scrolling up and down (confusion)
  | 'form_focus'          // User focused on a form field
  | 'form_blur'           // User left a form field
  | 'slow_form_fill'      // Form field took too long (user struggling)
  | 'form_error'          // Form validation error shown
  | 'image_click'         // User clicked on an image
  | 'link_hover'          // User hovered on a link
  | 'keyboard_shortcut'   // User used keyboard shortcut
  | 'right_click'         // User right-clicked (context menu)
  | 'double_click';       // User double-clicked

// Inferred user behaviors - what we think the user is trying to do
export type InferredBehavior =
  | 'browsing'            // Just looking around
  | 'product_hunting'     // Looking for a specific product
  | 'comparison_shopping' // Comparing products/prices
  | 'ready_to_buy'        // High purchase intent
  | 'price_sensitive'     // Focused on prices/deals
  | 'confused'            // Lost or frustrated
  | 'abandoning';         // About to leave without converting

export interface AnalyticsEvent {
  id: string;
  type: EventType;
  timestamp: number;
  sessionId: string;
  x?: number;
  y?: number;
  elementSelector?: string;
  elementText?: string;
  scrollDepth?: number;
  clickCount?: number;
  pageUrl: string;
  viewport: {
    width: number;
    height: number;
  };
  // E-commerce specific fields
  productId?: string;
  productName?: string;
  productPrice?: number;
  inferredBehavior?: InferredBehavior;
  behaviorConfidence?: number; // 0-1 confidence score
  behaviorContext?: string;    // Human-readable context
}

// Site Config Types
export interface SiteConfig {
  id: string;
  version: number;
  status: 'live' | 'preview';

  hero: {
    headline: string;
    subheadline: string;
    backgroundColor: string;
    backgroundImage?: string;
    cta: {
      text: string;
      color: string;
      textColor: string;
      position: 'inside-hero' | 'below-hero';
      size: 'small' | 'medium' | 'large';
    };
  };

  products: {
    sectionTitle: string;
    layout: 'grid-2' | 'grid-3' | 'grid-4';
    items: Array<{
      id: string;
      name: string;
      price: number;
      image: string;
      badge?: string;
      description?: string; // Longer product description
      materials?: string; // Materials/fabric information
    }>;
  };

  testimonials: {
    sectionTitle: string;
    show: boolean;
    items: Array<{
      quote: string;
      author: string;
    }>;
  };

  footer: {
    backgroundColor: string;
    showNewsletter: boolean;
    newsletterHeadline?: string;
  };
}

// Suggestion Types
export interface Suggestion {
  id: string;
  createdAt: number;
  status: 'pending' | 'accepted' | 'rejected';

  analysis: {
    summary: string;
    insights: string[];
    dataPoints: Array<{
      metric: string;
      value: number;
      interpretation: string;
    }>;
  };

  recommendation: {
    summary: string;
    rationale: string;
    expectedImpact: string;
  };

  changes: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
    reason: string;
  }>;

  previewConfig: SiteConfig;
}

// Analytics Types
export interface AnalyticsSummary {
  totalSessions: number;
  totalEvents: number;
  bounceRate: number;
  avgTimeOnPage: number;
  ctaClickRate: number;
}

export interface HeatmapPoint {
  x: number;
  y: number;
  count: number;
}

export interface ScrollData {
  reached25: number;
  reached50: number;
  reached75: number;
  reached100: number;
}

export interface AggregatedAnalytics {
  summary: AnalyticsSummary;
  heatmapData: {
    clicks: HeatmapPoint[];
    rageClicks: HeatmapPoint[];
    deadClicks: HeatmapPoint[];
  };
  scrollData: ScrollData;
}

// Re-export AnalyticsEvent from types/events for convenience
import { AnalyticsEvent as EventsAnalyticsEvent } from '../types/events';
export type { EventsAnalyticsEvent };

// UI Issue Types for Self-Healing System
export type IssueStatus =
  | 'detected'
  | 'fix_generated'
  | 'preview_deployed'
  | 'email_sent'
  | 'approved'
  | 'rejected'
  | 'ignored';

export type IssueCategory = 'frustration' | 'missing_feature' | 'conversion_blocker';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface UIIssue {
  id: string;
  status: IssueStatus;
  detectedAt: number;
  lastOccurrence: number;

  // Problem classification
  category: IssueCategory;
  severity: IssueSeverity;
  patternId: string;

  // Location
  elementSelector: string;
  sectionId?: string;
  componentPath: string;
  componentName: string;

  // Evidence
  eventCount: number;
  uniqueSessions: number;
  sampleEvents: EventsAnalyticsEvent[];

  // Human-readable descriptions
  problemStatement: string;
  userIntent: string;
  currentOutcome: string;
  suggestedFix: string;

  // Fix details (populated after LLM generates fix)
  fix?: {
    branch: string;
    previewUrl: string;
    diff: string;
    modifiedFiles: Array<{ path: string; content: string }>;
    explanation: string;
    generatedAt: number;
  };

  // Email tracking
  emailSentAt?: number;
  approvedAt?: number;
  approvedBy?: string;
  ignoredAt?: number;
  ignoreUntil?: number;
}

// Pattern rule for issue detection
export interface PatternRule {
  id: string;
  name: string;
  category: IssueCategory;

  // What events to look for (using string to be compatible with both EventType definitions)
  eventTypes: string[];

  // How to aggregate
  groupBy: 'elementSelector' | 'sectionId' | 'componentPath';
  timeWindowHours: number;
  minOccurrences: number;
  minUniqueSessions: number;

  // Severity calculation
  severityThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };

  // Output templates
  problemTemplate: string;
  intentTemplate: string;
  outcomeTemplate: string;
  fixTemplate: string;
}

// Component mapping for selector → source code resolution
export interface ComponentMapping {
  selector: string;
  componentPath: string;
  componentName: string;
  dataAttributes: string[];
}
