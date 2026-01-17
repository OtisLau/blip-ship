import { ProblemSeverity } from '../problemFinder';
import {
  SignalStrength,
  Insight,
  Pattern,
  INSIGHTS_CONFIG,
} from './types';

/**
 * Severity scores for signal calculation
 */
const SEVERITY_SIGNAL_SCORE: Record<ProblemSeverity, number> = {
  critical: 40,
  high: 30,
  medium: 20,
  low: 10,
};

/**
 * Calculate frequency score based on occurrence count
 */
function calculateFrequencyScore(occurrences: number): number {
  if (occurrences >= 20) return 30;
  if (occurrences >= 10) return 25;
  if (occurrences >= 5) return 20;
  if (occurrences >= 3) return 15;
  return 10;
}

/**
 * Calculate session coverage score
 */
function calculateSessionCoverageScore(sessionPercent: number): number {
  if (sessionPercent >= 50) return 30;
  if (sessionPercent >= 25) return 25;
  if (sessionPercent >= 10) return 20;
  if (sessionPercent >= 5) return 15;
  return 10;
}

/**
 * Calculate recency score based on timestamps
 */
function calculateRecencyScore(
  timestamps: number[],
  now: number = Date.now()
): number {
  if (timestamps.length === 0) return 10;

  const mostRecent = Math.max(...timestamps);
  const hoursSinceRecent = (now - mostRecent) / (1000 * 60 * 60);

  if (hoursSinceRecent < 1) return 30;    // Within last hour
  if (hoursSinceRecent < 24) return 25;   // Within last day
  if (hoursSinceRecent < 72) return 20;   // Within 3 days
  if (hoursSinceRecent < 168) return 15;  // Within a week
  return 10;
}

/**
 * Calculate consistency score - how spatially/elementally consistent the events are
 */
function calculateConsistencyScore(
  uniqueSelectors: number,
  spatialRadius: number
): number {
  let score = 20;

  // Single element = high consistency
  if (uniqueSelectors === 1) {
    score += 10;
  } else if (uniqueSelectors <= 3) {
    score += 5;
  }

  // Small spatial radius = high consistency
  if (spatialRadius <= 25) {
    score += 10;
  } else if (spatialRadius <= 50) {
    score += 5;
  }

  return Math.min(score, 30);
}

/**
 * Calculate signal strength for a pattern
 */
export function calculatePatternSignalStrength(pattern: Pattern): SignalStrength {
  const frequencyScore = calculateFrequencyScore(pattern.occurrences);
  const sessionScore = calculateSessionCoverageScore(pattern.sessionsAffectedPercent);
  const recencyScore = calculateRecencyScore(pattern.events.map(e => e.timestamp));
  const consistencyScore = calculateConsistencyScore(
    pattern.elementSelectors.length,
    pattern.radius
  );

  // Get severity from related problems or default to medium
  const severity = pattern.relatedProblems.length > 0
    ? pattern.relatedProblems[0].severity
    : 'medium';
  const severityScore = SEVERITY_SIGNAL_SCORE[severity];

  // Calculate total score (max 100)
  const factors = {
    frequency: frequencyScore,
    sessionCoverage: sessionScore,
    severity: severityScore,
    recency: recencyScore,
    consistency: consistencyScore,
  };

  // Weighted average
  const weights = {
    frequency: 0.2,
    sessionCoverage: 0.25,
    severity: 0.25,
    recency: 0.15,
    consistency: 0.15,
  };

  const score = Math.round(
    factors.frequency * weights.frequency +
    factors.sessionCoverage * weights.sessionCoverage +
    factors.severity * weights.severity +
    factors.recency * weights.recency +
    factors.consistency * weights.consistency
  );

  return {
    score,
    factors,
    isSignificant: score >= INSIGHTS_CONFIG.minSignalStrength,
  };
}

/**
 * Calculate signal strength for an insight
 */
export function calculateInsightSignalStrength(
  insight: Omit<Insight, 'signal'>
): SignalStrength {
  const frequencyScore = calculateFrequencyScore(insight.eventCount);
  const sessionScore = calculateSessionCoverageScore(insight.sessionsAffectedPercent);
  const severityScore = SEVERITY_SIGNAL_SCORE[insight.severity];

  // Use pattern data if available
  let recencyScore = 20;
  let consistencyScore = 20;

  if (insight.pattern) {
    recencyScore = calculateRecencyScore(insight.pattern.events.map(e => e.timestamp));
    consistencyScore = calculateConsistencyScore(
      insight.pattern.elementSelectors.length,
      insight.pattern.radius
    );
  }

  const factors = {
    frequency: frequencyScore,
    sessionCoverage: sessionScore,
    severity: severityScore,
    recency: recencyScore,
    consistency: consistencyScore,
  };

  const weights = {
    frequency: 0.2,
    sessionCoverage: 0.25,
    severity: 0.25,
    recency: 0.15,
    consistency: 0.15,
  };

  const score = Math.round(
    factors.frequency * weights.frequency +
    factors.sessionCoverage * weights.sessionCoverage +
    factors.severity * weights.severity +
    factors.recency * weights.recency +
    factors.consistency * weights.consistency
  );

  return {
    score,
    factors,
    isSignificant: score >= INSIGHTS_CONFIG.minSignalStrength,
  };
}

/**
 * Filter insights by signal strength
 */
export function filterBySignalStrength(insights: Insight[]): Insight[] {
  return insights.filter(insight => insight.signal.isSignificant);
}

/**
 * Sort insights by combined signal and impact
 */
export function sortBySignalAndImpact(insights: Insight[]): Insight[] {
  return [...insights].sort((a, b) => {
    // Primary sort: urgency score
    if (a.impact.urgencyScore !== b.impact.urgencyScore) {
      return b.impact.urgencyScore - a.impact.urgencyScore;
    }

    // Secondary sort: signal strength
    if (a.signal.score !== b.signal.score) {
      return b.signal.score - a.signal.score;
    }

    // Tertiary sort: revenue impact
    return b.impact.estimatedRevenueLossPerMonth - a.impact.estimatedRevenueLossPerMonth;
  });
}

/**
 * Limit insights to top N
 */
export function limitInsights(
  insights: Insight[],
  maxCount: number = INSIGHTS_CONFIG.maxInsightsPerReport
): Insight[] {
  return insights.slice(0, maxCount);
}

/**
 * Full filtering pipeline
 */
export function filterAndPrioritizeInsights(insights: Insight[]): Insight[] {
  // Filter by signal strength
  const significant = filterBySignalStrength(insights);

  // Sort by combined signal and impact
  const sorted = sortBySignalAndImpact(significant);

  // Limit to max count
  return limitInsights(sorted);
}

/**
 * Get signal strength description for display
 */
export function getSignalDescription(signal: SignalStrength): string {
  if (signal.score >= 80) return 'Very strong signal';
  if (signal.score >= 60) return 'Strong signal';
  if (signal.score >= 40) return 'Moderate signal';
  if (signal.score >= 30) return 'Weak signal';
  return 'Very weak signal';
}

/**
 * Check if we have enough data for meaningful insights
 */
export function hasEnoughDataForInsights(
  eventCount: number,
  sessionCount: number
): { sufficient: boolean; reason?: string } {
  if (sessionCount < 1) {
    return { sufficient: false, reason: 'No session data available' };
  }

  if (eventCount < 5) {
    return { sufficient: false, reason: 'Not enough events for meaningful analysis' };
  }

  return { sufficient: true };
}
