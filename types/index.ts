/**
 * Unified Type Definitions for Blip Ship
 *
 * SINGLE SOURCE OF TRUTH - All types should be imported from '@/types'
 */

// =============================================================================
// VIEWPORT & SESSION
// =============================================================================

export interface Viewport {
  width: number;
  height: number;
}

export interface Session {
  id: string;
  startedAt: number;
  endedAt: number | null;
  isActive: boolean;
  pageUrl: string;
  viewport: Viewport;
  userAgent: string;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

export type EventType =
  // Core click events
  | 'click'
  | 'rage_click'
  | 'dead_click'
  | 'double_click'
  | 'cta_click'
  | 'image_click'
  | 'right_click'
  // Engagement events
  | 'page_view'
  | 'scroll_depth'
  | 'section_view'
  | 'hover_intent'
  | 'link_hover'
  | 'text_selection'
  | 'text_copy'
  | 'keyboard_shortcut'
  // Conversion events
  | 'add_to_cart'
  | 'cart_remove'
  | 'cart_review'
  | 'checkout_start'
  | 'checkout_abandon'
  | 'purchase'
  // Frustration signals
  | 'bounce'
  | 'rapid_scroll'
  | 'scroll_reversal'
  | 'exit_intent'
  // Form interaction events
  | 'form_focus'
  | 'form_blur'
  | 'slow_form_fill'
  | 'form_error'
  // Product behavior events
  | 'product_view'
  | 'product_compare'
  | 'price_check'
  | 'search_intent'
  | 'navigation_browse'
  // Tab visibility
  | 'tab_hidden'
  | 'tab_visible'
  // CTA lifecycle events
  | 'cta_visible'
  | 'cta_expired'
  // Session events
  | 'session_start'
  | 'session_end';

// Inferred user behaviors
export type InferredBehavior =
  | 'browsing'
  | 'product_hunting'
  | 'comparison_shopping'
  | 'ready_to_buy'
  | 'price_sensitive'
  | 'confused'
  | 'abandoning';

// =============================================================================
// ANALYTICS EVENT
// =============================================================================

export interface AnalyticsEvent {
  id: string;
  type: EventType;
  timestamp: number;
  sessionId: string;
  pageUrl: string;
  viewport: Viewport;

  // Click/position data
  x?: number;
  y?: number;
  elementSelector?: string;
  elementText?: string;
  clickCount?: number;

  // Scroll data
  scrollDepth?: number;

  // Section/location data
  sectionId?: string;

  // CTA lifecycle data
  ctaId?: string;
  ctaVisibleDuration?: number;
  ctaPosition?: 'above-fold' | 'below-fold';

  // E-commerce specific fields
  productId?: string;
  productName?: string;
  productPrice?: number;

  // Behavior inference
  inferredBehavior?: InferredBehavior;
  behaviorConfidence?: number;
  behaviorContext?: string;

  // Session end data
  endReason?: 'timeout' | 'navigation' | 'inactivity';
}

// =============================================================================
// CTA STATE TRACKING
// =============================================================================

export type CTAStatus = 'visible' | 'clicked' | 'expired';

export interface CTAState {
  id: string;
  selector: string;
  visibleAt: number;
  clickedAt: number | null;
  expiredAt: number | null;
  status: CTAStatus;
  position: { x: number; y: number };
  viewportPosition: 'above-fold' | 'below-fold';
}

// =============================================================================
// SESSION STATE & ACTIONS
// =============================================================================

export interface SessionState {
  sessionId: string | null;
  sessionStart: number | null;
  sessionActive: boolean;
  visibleCTAs: Map<string, CTAState>;
  clickedCTAs: string[];
  lastActivityAt: number;
  scrollPosition: number;
}

export interface SessionActions {
  startSession: () => string;
  endSession: (reason: 'timeout' | 'navigation' | 'inactivity') => void;
  resetSession: () => void;
  markCTAVisible: (ctaId: string, selector: string, position: { x: number; y: number }) => void;
  markCTAClicked: (ctaId: string) => void;
  markCTAExpired: (ctaId: string) => void;
  updateActivity: () => void;
  updateScroll: (depth: number) => void;
  getSessionId: () => string | null;
  getCTAState: (ctaId: string) => CTAState | undefined;
  isSessionActive: () => boolean;
}

// =============================================================================
// SITE CONFIG
// =============================================================================

export interface SiteConfig {
  id: string;
  version: number;
  status: 'live' | 'preview';
  ownerEmail?: string;
  storeName?: string;

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

// =============================================================================
// SUGGESTION & FIX TYPES
// =============================================================================

export interface Suggestion {
  id: string;
  createdAt: number;
  status: 'pending' | 'accepted' | 'rejected';
  version?: string;

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

// =============================================================================
// PR INFO
// =============================================================================

export interface PRInfo {
  id: string;
  number?: number;
  branchName: string;
  title: string;
  description: string;
  status: 'open' | 'merged' | 'closed';
  createdAt: number;
  fixId: string;
  suggestionId: string;
  url?: string;
}

// =============================================================================
// IDENTITY STATE (Behavioral Classification)
// =============================================================================

export interface BehavioralVector {
  exploration_score: number;
  hesitation_score: number;
  engagement_depth: number;
  decision_velocity: number;
  content_focus_ratio: number;
}

export type IdentityState =
  | 'exploratory'
  | 'overwhelmed'
  | 'comparison_focused'
  | 'confident'
  | 'ready_to_decide'
  | 'cautious'
  | 'impulse_buyer'
  | 'frustrated'
  | 'curious';

export interface UserIdentity {
  state: IdentityState;
  confidence: number;
  reasoning: string;
  vector: BehavioralVector;
  computedAt: number;
}

// =============================================================================
// ANALYTICS AGGREGATION
// =============================================================================

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

export interface AnalyticsSummary {
  totalSessions: number;
  totalEvents: number;
  bounceRate: number;
  avgTimeOnPage: number;
  avgSessionDuration: number;
  ctaClickRate: number;
  avgCTAVisibleTime: number;
  ctaExpireRate: number;
}

export interface AggregatedAnalytics {
  summary: AnalyticsSummary;
  heatmapData: {
    clicks: HeatmapPoint[];
    rageClicks: HeatmapPoint[];
    deadClicks: HeatmapPoint[];
  };
  scrollData: ScrollData;
  ctaFunnel: {
    visible: number;
    clicked: number;
    expired: number;
    conversionRate: number;
  };
}

// =============================================================================
// UI ISSUE TYPES (Self-Healing System)
// =============================================================================

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
  sampleEvents: AnalyticsEvent[];

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

// =============================================================================
// PATTERN RULES (Issue Detection)
// =============================================================================

export interface PatternRule {
  id: string;
  name: string;
  category: IssueCategory;

  // What events to look for (string[] for flexibility with dynamic event types)
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

// =============================================================================
// COMPONENT MAPPING
// =============================================================================

export interface ComponentMapping {
  selector: string;
  componentPath: string;
  componentName: string;
  dataAttributes: string[];
}
