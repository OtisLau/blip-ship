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
