/**
 * Button UI/UX Suggestion Types
 * Used for LLM-powered button improvement generation
 */

/**
 * Analytics data for a tracked button
 */
export interface ButtonAnalytics {
  ctaId: string;
  currentText: string;
  currentStyles: string; // Tailwind classes
  clickRate: number; // Percentage (e.g., 2.5 = 2.5%)
  visibilityDuration: number; // Average ms before click
  conversionRate: number; // Percentage
  rageClicks: number; // Count of rage clicks
  deadClicks: number; // Count of dead clicks
}

/**
 * A single button improvement suggestion from the generator
 */
export interface ButtonSuggestion {
  ctaId: string;
  suggestedText: string | null;
  suggestedStyles: string | null; // Tailwind classes
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  expectedImpact: string;
}

/**
 * Response from the generator LLM
 */
export interface GeneratorResponse {
  suggestions: ButtonSuggestion[];
  errors?: string[];
  notes?: string[];
}

/**
 * Result from the critique agent validation
 */
export interface CritiqueResult {
  approved: boolean;
  violations: string[];
  feedback: string;
  revisedSuggestion: {
    suggestedText: string | null;
    suggestedStyles: string | null;
  } | null;
}

/**
 * A validated suggestion that passed critique
 */
export interface ValidatedSuggestion extends ButtonSuggestion {
  critiqueApproved: true;
  critiqueFeedback: string;
}

/**
 * A rejected suggestion that failed critique
 */
export interface RejectedSuggestion {
  ctaId: string;
  originalSuggestion: ButtonSuggestion;
  violations: string[];
  feedback: string;
  revisedSuggestion: ButtonSuggestion | null;
}

/**
 * Input for the generator LLM call
 */
export interface GeneratorInput {
  guardrails: string;
  buttons: ButtonAnalytics[];
}

/**
 * Input for the critique LLM call
 */
export interface CritiqueInput {
  guardrails: string;
  existingButtonStyles: string[];
  suggestionToReview: ButtonSuggestion;
}

/**
 * Final API response from /api/suggestions
 */
export interface SuggestionsResponse {
  suggestions: ValidatedSuggestion[];
  rejected: RejectedSuggestion[];
  generatedAt: string;
}

// ============================================
// UX Pattern Detection Types
// ============================================

/**
 * Detected UX issue pattern
 */
export type UXIssueType =
  | 'non_clickable_image'      // Users clicking images expecting navigation
  | 'rage_click_element'       // Repeated frustrated clicks on element
  | 'dead_click_area'          // Clicks on non-interactive area
  | 'missed_tap_target'        // Mobile users missing small buttons
  | 'confusing_navigation';    // Users lost or confused

/**
 * Analytics for dead click detection on images
 */
export interface ImageClickAnalytics {
  elementSelector: string;       // CSS selector for the image
  productId?: string;            // Associated product ID
  totalClicks: number;           // Total clicks on image
  rapidClicks: number;           // Clicks < 500ms apart (frustration signal)
  followedByTitleClick: number;  // User clicked title link within 2s after
  avgTimeBetweenClicks: number;  // Average ms between clicks
  uniqueSessions: number;        // Number of unique sessions with this pattern
}

/**
 * Detected UX issue from analytics
 */
export interface DetectedUXIssue {
  type: UXIssueType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  elementSelector: string;
  productId?: string;
  analytics: ImageClickAnalytics;
  detectedAt: string;
}

/**
 * Config change suggestion from LLM
 */
export interface ConfigChangeSuggestion {
  issueType: UXIssueType;
  configPath: string;            // e.g., "products.imageClickable"
  currentValue: unknown;
  suggestedValue: unknown;
  reasoning: string;
  expectedImpact: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Full analysis result for image clickability issue
 */
export interface ImageClickabilityAnalysis {
  issuesDetected: DetectedUXIssue[];
  configChanges: ConfigChangeSuggestion[];
  summary: string;
}

// ============================================
// Dead Click Action Mapping Types
// ============================================

/**
 * Types of actions that can be mapped to dead click elements
 */
export type ClickActionType =
  | 'open-modal'       // Open product modal
  | 'navigate-to-pdp'  // Navigate to product detail page
  | 'add-to-cart'      // Add item to cart
  | 'quick-view'       // Show quick preview
  | 'enlarge-image'    // Open image lightbox
  | 'custom';          // Custom handler

/**
 * Inferred user intent from dead click behavior
 */
export type UserClickIntent =
  | 'view-product-details'
  | 'add-to-cart'
  | 'navigate'
  | 'enlarge-image'
  | 'unknown';

/**
 * Element role within a product card
 */
export type ProductCardElementRole =
  | 'product-image'
  | 'product-image-container'
  | 'add-to-cart'
  | 'product-info'
  | 'product-name'
  | 'product-price'
  | 'product-badge'
  | 'quantity-control'
  | 'unknown';

/**
 * Dead click event with enriched context
 */
export interface EnrichedDeadClickEvent {
  // Core click data
  elementSelector: string;
  elementType: string;
  elementRole: ProductCardElementRole;
  clickCount: number;
  rapidClicks: number;
  uniqueSessions: number;
  
  // Product context
  productId?: string;
  productName?: string;
}

/**
 * Sibling element information for context
 */
export interface SiblingElementInfo {
  selector: string;
  type: string;
  role: ProductCardElementRole;
  hasOnClick: boolean;
  action?: string;
  handler?: string;
  hasStopPropagation?: boolean;
}

/**
 * Component context surrounding the dead click
 */
export interface ComponentContext {
  containerSelector: string;
  containerType: 'product-card' | 'product-grid' | 'gallery' | 'other';
  productId?: string;
  siblingElements: SiblingElementInfo[];
}

/**
 * Existing handler that can be mirrored
 */
export interface ExistingHandler {
  selector: string;
  handler: string;
  description?: string;
}

/**
 * Input for dead click action mapper LLM
 */
export interface DeadClickMapperInput {
  deadClickData: EnrichedDeadClickEvent;
  componentContext: ComponentContext;
  existingHandlers: {
    modalOpener?: ExistingHandler;
    navigator?: ExistingHandler;
    cartAdder?: ExistingHandler;
  };
}

/**
 * Target element for action mapping
 */
export interface ActionTargetElement {
  selector: string;
  description: string;
  currentBehavior: 'none' | 'bubbles-to-parent' | 'has-handler';
}

/**
 * Handler mirroring specification
 */
export interface HandlerMirror {
  sourceElement: string;
  handler: string;
}

/**
 * Code change specification for the action
 */
export interface ClickActionCodeChange {
  type: 'add-onclick' | 'modify-onclick' | 'wrap-element';
  element: string;
  handler: string;
  addStyles?: Record<string, string>;
  requiresStopPropagation: boolean;
  stopPropagationReason?: string;
}

/**
 * Actual code patch to apply to a file
 * Uses find-and-replace pattern similar to StrReplace
 */
export interface CodePatch {
  filePath: string;
  description: string;
  oldCode: string;
  newCode: string;
}

/**
 * LLM-generated code change with patches
 */
export interface GeneratedCodeChange {
  patches: CodePatch[];
  explanation: string;
  rollbackPatches: CodePatch[];  // To undo the change if needed
}

/**
 * Preserved element confirmation
 */
export interface PreservedElement {
  selector: string;
  action: string;
  preserved: boolean;
  reason: string;
}

/**
 * Validation checklist results
 */
export interface ActionValidationChecklist {
  singleElementTargeted: boolean;
  actionMatchesIntent: boolean;
  siblingsPreserved: boolean;
  stopPropagationIncluded: boolean;
  handlerMirrorsExisting: boolean;
}

/**
 * Full action mapping result from LLM
 */
export interface DeadClickActionMapping {
  analysis: {
    deadClickElement: string;
    inferredUserIntent: UserClickIntent;
    intentConfidence: number;
    intentReasoning: string;
  };
  actionMapping: {
    targetElement: ActionTargetElement;
    suggestedAction: {
      actionType: ClickActionType;
      mirrorHandler?: HandlerMirror;
    };
    codeChange: ClickActionCodeChange;
  };
  preservedElements: PreservedElement[];
  validation: {
    passesGuardrails: boolean;
    checklist: ActionValidationChecklist;
  };
  confidence: number;
  reasoning: string;
}

/**
 * API response for dead click action suggestions
 */
export interface DeadClickActionResponse {
  success: boolean;
  mapping?: DeadClickActionMapping;
  error?: string;
  appliedAt?: string;
}
