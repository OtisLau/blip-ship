import { NextResponse } from 'next/server';
import { readEvents } from '@/lib/db';
import { getCTAMetrics } from '@/lib/analytics';
import { generateAndValidateSuggestions } from '@/lib/gemini';
import type { ButtonAnalytics, SuggestionsResponse } from '@/types/suggestions';
import type { AnalyticsEvent } from '@/types/events';

/**
 * Extract unique CTA IDs from events
 */
function getUniqueCTAIds(events: AnalyticsEvent[]): string[] {
  const ctaIds = new Set<string>();
  events.forEach((e) => {
    if (e.ctaId) {
      ctaIds.add(e.ctaId);
    }
  });
  return Array.from(ctaIds);
}

/**
 * Get existing button styles from events (for consistency checking)
 * In a real implementation, this would come from a style registry
 */
function getExistingButtonStyles(): string[] {
  // Default styles used in the codebase
  return [
    'px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700',
    'px-4 py-2 bg-gray-200 rounded hover:bg-gray-300',
    'px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition',
  ];
}

/**
 * Build ButtonAnalytics from events for a specific CTA
 */
function buildButtonAnalytics(
  ctaId: string,
  events: AnalyticsEvent[]
): ButtonAnalytics {
  const ctaEvents = events.filter((e) => e.ctaId === ctaId);
  const metrics = getCTAMetrics(events, ctaId);

  // Get rage clicks and dead clicks for this button area
  // This is simplified - in production you'd correlate by element position
  const rageClicks = events.filter(
    (e) => e.type === 'rage_click' && e.ctaId === ctaId
  ).length;
  const deadClicks = events.filter(
    (e) => e.type === 'dead_click' && e.ctaId === ctaId
  ).length;

  // Extract current text and styles from CTA visible events
  // In production, this would come from a component registry
  const visibleEvent = ctaEvents.find((e) => e.type === 'cta_visible');

  return {
    ctaId,
    currentText: extractTextFromCtaId(ctaId),
    currentStyles: 'px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700', // Default
    clickRate: metrics.conversionRate,
    visibilityDuration: metrics.avgVisibleTime * 1000, // Convert to ms
    conversionRate: metrics.conversionRate,
    rageClicks,
    deadClicks,
  };
}

/**
 * Extract human-readable text from CTA ID
 * e.g., "add-to-cart-btn" -> "Add to Cart"
 */
function extractTextFromCtaId(ctaId: string): string {
  return ctaId
    .replace(/-btn$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * GET /api/suggestions
 * Generate UI/UX suggestions for all tracked buttons
 */
export async function GET() {
  try {
    // Check for API key
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error: 'GOOGLE_GEMINI_API_KEY not configured',
          hint: 'Add GOOGLE_GEMINI_API_KEY to your .env.local file',
        },
        { status: 500 }
      );
    }

    // Read all events
    const events = await readEvents();

    if (events.length === 0) {
      return NextResponse.json({
        suggestions: [],
        rejected: [],
        generatedAt: new Date().toISOString(),
        message: 'No tracking data available. Visit the store to generate events.',
      });
    }

    // Get unique CTA IDs
    const ctaIds = getUniqueCTAIds(events);

    if (ctaIds.length === 0) {
      return NextResponse.json({
        suggestions: [],
        rejected: [],
        generatedAt: new Date().toISOString(),
        message: 'No CTA buttons have been tracked yet.',
      });
    }

    // Build analytics for each button
    const buttonAnalytics: ButtonAnalytics[] = ctaIds.map((ctaId) =>
      buildButtonAnalytics(ctaId, events)
    );

    // Get existing styles for consistency checking
    const existingStyles = getExistingButtonStyles();

    // Generate and validate suggestions
    const { approved, rejected } = await generateAndValidateSuggestions(
      buttonAnalytics,
      existingStyles
    );

    const response: SuggestionsResponse = {
      suggestions: approved.map((s) => ({
        ...s,
        critiqueApproved: true as const,
      })),
      rejected: rejected.map((r) => ({
        ctaId: r.original.ctaId,
        originalSuggestion: r.original,
        violations: r.violations,
        feedback: r.feedback,
        revisedSuggestion: r.revised,
      })),
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate suggestions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/suggestions
 * Generate suggestion for a specific button
 */
export async function POST(request: Request) {
  try {
    // Check for API key
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error: 'GOOGLE_GEMINI_API_KEY not configured',
          hint: 'Add GOOGLE_GEMINI_API_KEY to your .env.local file',
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { ctaId } = body;

    if (!ctaId) {
      return NextResponse.json(
        { error: 'ctaId is required' },
        { status: 400 }
      );
    }

    // Read all events
    const events = await readEvents();
    const ctaEvents = events.filter((e) => e.ctaId === ctaId);

    if (ctaEvents.length === 0) {
      return NextResponse.json(
        { error: `No tracking data found for CTA: ${ctaId}` },
        { status: 404 }
      );
    }

    // Build analytics for the specific button
    const buttonAnalytics = buildButtonAnalytics(ctaId, events);

    // Get existing styles
    const existingStyles = getExistingButtonStyles();

    // Generate and validate suggestions
    const { approved, rejected } = await generateAndValidateSuggestions(
      [buttonAnalytics],
      existingStyles
    );

    return NextResponse.json({
      ctaId,
      analytics: buttonAnalytics,
      suggestions: approved,
      rejected,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating suggestion:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate suggestion',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
