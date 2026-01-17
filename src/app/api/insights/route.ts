import { NextResponse } from 'next/server';
import { getEvents } from '@/lib/db';
import {
  generateInsights,
  formatInsightsForDisplay,
  getInsightsByCategory,
  getInsightsByUrgency,
  BusinessConfig,
  DEFAULT_BUSINESS_CONFIG,
} from '@/lib/insights';
import type { Insight } from '@/lib/insights';

// GET /api/insights - Generate actionable insights from events
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Format: 'json' (structured) or 'text' (formatted for display)
    const format = searchParams.get('format') || 'json';

    // Filter options
    const category = searchParams.get('category') as Insight['category'] | null;
    const minUrgency = searchParams.get('minUrgency')
      ? parseInt(searchParams.get('minUrgency')!, 10)
      : null;

    // Business config overrides
    const aov = searchParams.get('aov')
      ? parseFloat(searchParams.get('aov')!)
      : null;
    const monthlyVisitors = searchParams.get('visitors')
      ? parseInt(searchParams.get('visitors')!, 10)
      : null;
    const conversionRate = searchParams.get('conversionRate')
      ? parseFloat(searchParams.get('conversionRate')!)
      : null;

    // Build business config
    const businessConfig: BusinessConfig = {
      averageOrderValue: aov || DEFAULT_BUSINESS_CONFIG.averageOrderValue,
      monthlyVisitors: monthlyVisitors || DEFAULT_BUSINESS_CONFIG.monthlyVisitors,
      currentConversionRate: conversionRate || DEFAULT_BUSINESS_CONFIG.currentConversionRate,
    };

    // Get all events
    const events = await getEvents();

    if (!events || events.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No events to analyze',
        analysis: {
          timestamp: Date.now(),
          totalInsights: 0,
          highImpactCount: 0,
          mediumImpactCount: 0,
          lowImpactCount: 0,
          totalEstimatedRevenueLoss: 0,
          topRecommendations: [],
          viewport: {
            averageWidth: 0,
            averageHeight: 0,
            foldLine: 0,
            pageHeight: 0,
            zoneBreakpoints: { aboveFold: 0, midPage: 0, belowFold: 0, footer: 0 },
          },
          businessConfig,
          insights: [],
          summary: 'No event data available for analysis.',
          totalEventsAnalyzed: 0,
          totalSessionsAnalyzed: 0,
          patternsDetected: 0,
        },
      });
    }

    // Generate insights
    let analysis = generateInsights(events, businessConfig);

    // Filter by category if specified
    if (category) {
      const filteredInsights = getInsightsByCategory(analysis, category);
      analysis = {
        ...analysis,
        insights: filteredInsights,
        totalInsights: filteredInsights.length,
        highImpactCount: filteredInsights.filter(i => i.impact.urgencyScore >= 70).length,
        mediumImpactCount: filteredInsights.filter(
          i => i.impact.urgencyScore >= 40 && i.impact.urgencyScore < 70
        ).length,
        lowImpactCount: filteredInsights.filter(i => i.impact.urgencyScore < 40).length,
      };
    }

    // Filter by minimum urgency if specified
    if (minUrgency !== null) {
      const filteredInsights = getInsightsByUrgency(analysis, minUrgency);
      analysis = {
        ...analysis,
        insights: filteredInsights,
        totalInsights: filteredInsights.length,
        highImpactCount: filteredInsights.filter(i => i.impact.urgencyScore >= 70).length,
        mediumImpactCount: filteredInsights.filter(
          i => i.impact.urgencyScore >= 40 && i.impact.urgencyScore < 70
        ).length,
        lowImpactCount: filteredInsights.filter(i => i.impact.urgencyScore < 40).length,
      };
    }

    // Return formatted text or JSON
    if (format === 'text') {
      return NextResponse.json({
        success: true,
        eventsAnalyzed: events.length,
        formatted: formatInsightsForDisplay(analysis),
      });
    }

    return NextResponse.json({
      success: true,
      eventsAnalyzed: events.length,
      analysis,
    });
  } catch (error) {
    console.error('Insights analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}
