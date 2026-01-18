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
