import { AnalyticsEvent } from '../types';
import { findProblems, Problem } from '../problemFinder';
import {
  Insight,
  InsightsAnalysis,
  BusinessConfig,
  DEFAULT_BUSINESS_CONFIG,
  PATTERN_IMPACT_FACTORS,
} from './types';
import { analyzeViewport, analyzeSpatialLocation } from './spatialAnalyzer';
import { calculatePatternImpact, aggregateImpacts } from './impactCalculator';
import { detectAllPatterns } from './patternAggregator';
import {
  calculateInsightSignalStrength,
  filterAndPrioritizeInsights,
  hasEnoughDataForInsights,
} from './noiseFilter';
import {
  generatePatternRecommendation,
  generateInsightTitle,
  generateInsightSummary,
} from './recommendationGenerator';

/**
 * Generate a unique insight ID
 */
function generateInsightId(index: number): string {
  return `insight_${Date.now()}_${index}`;
}

/**
 * Convert a pattern into a fully formed insight
 */
function patternToInsight(
  pattern: ReturnType<typeof detectAllPatterns>[0],
  viewport: ReturnType<typeof analyzeViewport>,
  config: BusinessConfig,
  index: number
): Insight {
  // Get location from pattern centroid
  const location = analyzeSpatialLocation(pattern.centroid, viewport);

  // Calculate business impact
  const impact = calculatePatternImpact(pattern, location, config);

  // Generate recommendation
  const recommendation = generatePatternRecommendation(
    pattern,
    location,
    impact,
    viewport
  );

  // Generate title and summary
  const title = generateInsightTitle(pattern, location);
  const summary = generateInsightSummary(pattern, location, impact);

  // Get severity from pattern type
  const severity = PATTERN_IMPACT_FACTORS[pattern.type].baseSeverity;

  // Determine category from pattern type
  const categoryMap: Record<string, Insight['category']> = {
    rage_cluster: 'ux_friction',
    dead_click_hotspot: 'ux_friction',
    cta_invisibility: 'conversion_blocker',
    checkout_friction: 'conversion_blocker',
    scroll_abandonment: 'engagement_dropoff',
    element_confusion: 'ux_friction',
    price_anxiety: 'conversion_blocker',
  };

  const category = categoryMap[pattern.type] || 'ux_friction';

  // Get page URL from events
  const pageUrl = pattern.events[0]?.pageUrl || '/';

  // Create insight without signal first
  const insightWithoutSignal: Omit<Insight, 'signal'> = {
    id: generateInsightId(index),
    title,
    summary,
    category,
    severity,
    location,
    impact,
    recommendation,
    pattern,
    sourceProblems: pattern.relatedProblems,
    eventCount: pattern.occurrences,
    sessionsAffected: pattern.sessionsAffected,
    sessionsAffectedPercent: pattern.sessionsAffectedPercent,
    timestamp: Date.now(),
    pageUrl,
  };

  // Calculate signal strength
  const signal = calculateInsightSignalStrength(insightWithoutSignal);

  return {
    ...insightWithoutSignal,
    signal,
  };
}

/**
 * Generate insights summary text
 */
function generateSummary(
  insights: Insight[],
  totalRevenueLoss: number
): string {
  if (insights.length === 0) {
    return 'No significant insights detected. Continue monitoring for patterns.';
  }

  const highImpact = insights.filter(i => i.impact.urgencyScore >= 70).length;
  const parts: string[] = [];

  if (highImpact > 0) {
    parts.push(`${highImpact} high-impact issue${highImpact > 1 ? 's' : ''} requiring attention`);
  }

  if (totalRevenueLoss > 0) {
    parts.push(`Est. $${totalRevenueLoss}/mo revenue at risk`);
  }

  parts.push(`${insights.length} actionable insight${insights.length > 1 ? 's' : ''} generated`);

  return parts.join('. ') + '.';
}

/**
 * Main function to generate insights from events
 */
export function generateInsights(
  events: AnalyticsEvent[],
  config: BusinessConfig = DEFAULT_BUSINESS_CONFIG
): InsightsAnalysis {
  const timestamp = Date.now();

  // Check if we have enough data
  const sessions = new Set(events.map(e => e.sessionId));
  const totalSessions = sessions.size;

  const dataCheck = hasEnoughDataForInsights(events.length, totalSessions);

  if (!dataCheck.sufficient) {
    return {
      timestamp,
      totalInsights: 0,
      highImpactCount: 0,
      mediumImpactCount: 0,
      lowImpactCount: 0,
      totalEstimatedRevenueLoss: 0,
      topRecommendations: [],
      viewport: analyzeViewport(events),
      businessConfig: config,
      insights: [],
      summary: dataCheck.reason || 'Not enough data for analysis',
      totalEventsAnalyzed: events.length,
      totalSessionsAnalyzed: totalSessions,
      patternsDetected: 0,
    };
  }

  // Step 1: Analyze viewport
  const viewport = analyzeViewport(events);

  // Step 2: Find problems using existing problem finder
  const problemAnalysis = findProblems(events);

  // Step 3: Detect patterns
  const patterns = detectAllPatterns(events, problemAnalysis.problems);

  // Step 4: Convert patterns to insights
  const rawInsights = patterns.map((pattern, index) =>
    patternToInsight(pattern, viewport, config, index)
  );

  // Step 5: Filter and prioritize
  const filteredInsights = filterAndPrioritizeInsights(rawInsights);

  // Step 6: Calculate aggregates
  const impacts = filteredInsights.map(i => i.impact);
  const { totalRevenueLoss } = aggregateImpacts(impacts);

  const highImpactCount = filteredInsights.filter(i => i.impact.urgencyScore >= 70).length;
  const mediumImpactCount = filteredInsights.filter(
    i => i.impact.urgencyScore >= 40 && i.impact.urgencyScore < 70
  ).length;
  const lowImpactCount = filteredInsights.filter(i => i.impact.urgencyScore < 40).length;

  // Extract top recommendations
  const topRecommendations = filteredInsights
    .slice(0, 3)
    .map(i => i.recommendation);

  return {
    timestamp,
    totalInsights: filteredInsights.length,
    highImpactCount,
    mediumImpactCount,
    lowImpactCount,
    totalEstimatedRevenueLoss: totalRevenueLoss,
    topRecommendations,
    viewport,
    businessConfig: config,
    insights: filteredInsights,
    summary: generateSummary(filteredInsights, totalRevenueLoss),
    totalEventsAnalyzed: events.length,
    totalSessionsAnalyzed: totalSessions,
    patternsDetected: patterns.length,
  };
}

/**
 * Get insights filtered by category
 */
export function getInsightsByCategory(
  analysis: InsightsAnalysis,
  category: Insight['category']
): Insight[] {
  return analysis.insights.filter(i => i.category === category);
}

/**
 * Get insights filtered by minimum urgency
 */
export function getInsightsByUrgency(
  analysis: InsightsAnalysis,
  minUrgency: number
): Insight[] {
  return analysis.insights.filter(i => i.impact.urgencyScore >= minUrgency);
}

/**
 * Format insights for display
 */
export function formatInsightsForDisplay(analysis: InsightsAnalysis): string {
  const lines = [
    '# Actionable Insights Report',
    `Generated: ${new Date(analysis.timestamp).toISOString()}`,
    '',
    '## Summary',
    analysis.summary,
    '',
    `- Events analyzed: ${analysis.totalEventsAnalyzed}`,
    `- Sessions analyzed: ${analysis.totalSessionsAnalyzed}`,
    `- Patterns detected: ${analysis.patternsDetected}`,
    `- Insights generated: ${analysis.totalInsights}`,
    '',
    '## Viewport Analysis',
    `- Average size: ${analysis.viewport.averageWidth}x${analysis.viewport.averageHeight}`,
    `- Fold line: ${analysis.viewport.foldLine}px`,
    '',
  ];

  if (analysis.insights.length > 0) {
    lines.push('## Top Insights');
    lines.push('');

    analysis.insights.forEach((insight, index) => {
      lines.push(`### ${index + 1}. ${insight.title}`);
      lines.push(`**Severity:** ${insight.severity.toUpperCase()} | **Urgency:** ${insight.impact.urgencyScore}/100`);
      lines.push('');
      lines.push(insight.summary);
      lines.push('');
      lines.push('**Location:**');
      lines.push(`- ${insight.location.description}`);
      lines.push(`- Zone: ${insight.location.zone.replace('_', ' ')}`);
      lines.push('');
      lines.push('**Impact:**');
      lines.push(`- Estimated conversion loss: ${insight.impact.estimatedConversionLoss}%`);
      lines.push(`- Estimated revenue loss: $${insight.impact.estimatedRevenueLossPerMonth}/mo`);
      lines.push('');
      lines.push('**Recommendation:**');
      lines.push(`- ${insight.recommendation.action}`);
      lines.push(`- Expected: ${insight.recommendation.expectedOutcome.metric} +${insight.recommendation.expectedOutcome.improvementPercent}%`);
      lines.push(`- Effort: ${insight.recommendation.effort}`);
      lines.push('');
    });
  }

  return lines.join('\n');
}
