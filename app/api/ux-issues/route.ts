import { NextResponse } from 'next/server';
import { readEvents } from '@/lib/db';
import { analyzeImageClickability } from '@/lib/ux-detection';

/**
 * GET /api/ux-issues
 * Analyze events and detect UX issues, return suggested code changes
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

    // Read events
    const events = await readEvents();

    if (events.length === 0) {
      return NextResponse.json({
        issuesDetected: [],
        codeChanges: [],
        summary: 'No tracking data available. Visit the store to generate events.',
        generatedAt: new Date().toISOString(),
      });
    }

    // Analyze for image clickability issues
    // Default config assumes images are not yet clickable
    const currentConfig = { products: { imageClickable: false } };
    const analysis = await analyzeImageClickability(events, currentConfig);

    return NextResponse.json({
      ...analysis,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error analyzing UX issues:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze UX issues',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
