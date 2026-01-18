/**
 * Event Types and Interfaces for User Operations Tracking
 * Adapted from 0-1/ drawing app patterns for e-commerce CRO use case
 */

// Session types (adapted from 0-1's session management)
export interface Session {
  id: string;                    // sess_<timestamp>_<random>
  startedAt: number;             // Date.now() - from 0-1's sessionStart
  endedAt: number | null;        // null while active
  isActive: boolean;             // from 0-1's sessionActive
  pageUrl: string;
  viewport: Viewport;
  userAgent: string;
}

export interface Viewport {
  width: number;
  height: number;
}

// Event types - extending blip-ship's planned types with CTA lifecycle events
export type EventType =
  // Core click events (from blip-ship doc)
  | 'click'
  | 'rage_click'
  | 'dead_click'
  | 'cta_click'
  // Engagement events
  | 'page_view'
  | 'scroll_depth'
  | 'section_view'
  // Conversion events
  | 'add_to_cart'
  | 'cart_remove'         // User removed item from cart
  | 'checkout_start'
  | 'checkout_abandon'    // User left during checkout
  | 'purchase'
  // Frustration signals
  | 'bounce'
  | 'rapid_scroll'
  | 'scroll_reversal'     // User scrolling up/down (confusion)
  | 'exit_intent'         // Mouse moving to leave
  // Form interaction events
  | 'form_focus'
  | 'form_blur'
  | 'slow_form_fill'      // Form took too long to complete
  | 'form_error'          // Validation error shown
  // Product behavior events
  | 'product_view'
  | 'product_compare'     // Viewing multiple products
  | 'price_check'         // Clicked/focused on price
  | 'cart_review'         // Opened cart without adding
  // Content interaction
  | 'text_selection'      // User selected/highlighted text
  | 'hover_intent'        // Hovered for 1.5+ seconds
  // CTA lifecycle events (adapted from 0-1's tool lifecycle)
  | 'cta_visible'         // Maps to spawnTool()
  | 'cta_expired'         // Maps to expireTool()
  | 'session_start'       // Maps to startSession()
  | 'session_end'         // Maps to endSession()
  // Additional interaction events
  | 'double_click'        // User double-clicked
  | 'text_copy'           // User copied text
  | 'tab_hidden'          // User switched tabs
  | 'tab_visible'         // User returned to tab
  | 'image_click'         // User clicked on image
  | 'link_hover'          // User hovered on link
  | 'keyboard_shortcut'   // User used keyboard shortcut
  | 'right_click'         // User right-clicked
  | 'navigation_browse'   // User browsing navigation
  | 'search_intent'       // User clicked search
  // Color interaction events
  | 'color_select'        // User selected a color swatch
  | 'color_hover'         // User hovered on a color swatch
  // Image gallery events
  | 'image_gallery_open'  // User opened image gallery/lightbox
  | 'image_gallery_navigate' // User navigated within gallery
  | 'image_zoom'          // User zoomed in on image
  // Comparison events
  | 'comparison_add'      // User added product to comparison
  | 'comparison_remove'   // User removed product from comparison
  | 'comparison_view';    // User opened comparison view

// CTA state tracking (adapted from 0-1's FloatingToolState)
export type CTAStatus = 'visible' | 'clicked' | 'expired';

export interface CTAState {
  id: string;                    // CTA element identifier
  selector: string;              // CSS selector
  visibleAt: number;             // spawnedAt equivalent
  clickedAt: number | null;      // selectTool timestamp
  expiredAt: number | null;      // expireTool timestamp
  status: CTAStatus;
  position: { x: number; y: number };
  viewportPosition: 'above-fold' | 'below-fold';
}

// Main event interface (extending blip-ship's AnalyticsEvent)
export interface AnalyticsEvent {
  id: string;                    // evt_<timestamp>_<random>
  type: EventType;
  timestamp: number;
  sessionId: string;

  // Click data
  x?: number;
  y?: number;
  elementSelector?: string;
  elementText?: string;

  // Scroll data
  scrollDepth?: number;

  // CTA lifecycle data (adapted from 0-1 patterns)
  ctaId?: string;
  ctaVisibleDuration?: number;   // Time CTA was visible before action
  ctaPosition?: 'above-fold' | 'below-fold';

  // Rage click data
  clickCount?: number;

  // Session end data
  endReason?: 'timeout' | 'navigation' | 'inactivity';

  // Page context
  pageUrl: string;
  viewport: Viewport;

  // Product context (for e-commerce events)
  productId?: string;
  productName?: string;
  productPrice?: number;
}

// Session state interface (adapted from 0-1's AppState)
export interface SessionState {
  // Session (from 0-1)
  sessionId: string | null;
  sessionStart: number | null;
  sessionActive: boolean;

  // CTA tracking (adapted from floatingTools/selectedTools)
  visibleCTAs: Map<string, CTAState>;
  clickedCTAs: string[];

  // Activity tracking
  lastActivityAt: number;
  scrollPosition: number;
}

// Session actions interface (adapted from 0-1's store actions)
export interface SessionActions {
  startSession: () => string;
  endSession: (reason: 'timeout' | 'navigation' | 'inactivity') => void;
  resetSession: () => void;

  // CTA lifecycle (adapted from spawnTool/selectTool/expireTool)
  markCTAVisible: (ctaId: string, selector: string, position: { x: number; y: number }) => void;
  markCTAClicked: (ctaId: string) => void;
  markCTAExpired: (ctaId: string) => void;

  // Activity tracking
  updateActivity: () => void;
  updateScroll: (depth: number) => void;

  // Getters
  getSessionId: () => string | null;
  getCTAState: (ctaId: string) => CTAState | undefined;
  isSessionActive: () => boolean;
}

// Aggregated analytics interface
export interface AggregatedAnalytics {
  summary: {
    totalSessions: number;
    totalEvents: number;
    bounceRate: number;
    avgSessionDuration: number;
    ctaClickRate: number;
    avgCTAVisibleTime: number;
    ctaExpireRate: number;
  };
  heatmapData: {
    clicks: Array<{ x: number; y: number; count: number }>;
    rageClicks: Array<{ x: number; y: number; count: number }>;
    deadClicks: Array<{ x: number; y: number; count: number }>;
  };
  scrollData: {
    reached25: number;
    reached50: number;
    reached75: number;
    reached100: number;
  };
  ctaFunnel: {
    visible: number;
    clicked: number;
    expired: number;
    conversionRate: number;
  };
}
