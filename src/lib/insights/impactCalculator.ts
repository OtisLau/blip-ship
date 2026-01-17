import { ProblemSeverity } from '../problemFinder';
import {
  BusinessImpact,
  BusinessConfig,
  PatternType,
  Pattern,
  SpatialLocation,
  DEFAULT_BUSINESS_CONFIG,
  PATTERN_IMPACT_FACTORS,
} from './types';

/**
 * Base conversion loss rates by severity
 */
const SEVERITY_CONVERSION_LOSS: Record<ProblemSeverity, number> = {
  critical: 20,
  high: 12,
  medium: 6,
  low: 2,
};

/**
 * Location modifiers - issues above fold are more impactful
 */
const LOCATION_IMPACT_MULTIPLIER = {
  above_fold: 1.5,    // Issues above fold are 50% more impactful
  mid_page: 1.0,      // Baseline
  below_fold: 0.7,    // Less impactful
  footer: 0.4,        // Least impactful
};

/**
 * Session coverage impact multiplier
 */
function getSessionCoverageMultiplier(sessionPercent: number): number {
  if (sessionPercent >= 80) return 1.5;
  if (sessionPercent >= 50) return 1.2;
  if (sessionPercent >= 25) return 1.0;
  if (sessionPercent >= 10) return 0.8;
  return 0.5;
}

/**
 * Calculate estimated monthly revenue loss
 */
export function calculateRevenueLoss(
  conversionLossPercent: number,
  config: BusinessConfig
): number {
  // Revenue = Visitors × ConversionRate × AOV
  const currentMonthlyRevenue =
    config.monthlyVisitors * (config.currentConversionRate / 100) * config.averageOrderValue;

  // Lost revenue = Current revenue × (loss percent / 100)
  const lostRevenue = currentMonthlyRevenue * (conversionLossPercent / 100);

  return Math.round(lostRevenue);
}

/**
 * Calculate urgency score based on multiple factors
 */
export function calculateUrgencyScore(
  conversionLoss: number,
  severity: ProblemSeverity,
  sessionPercent: number,
  isAboveFold: boolean
): number {
  // Base urgency from severity
  const severityBase: Record<ProblemSeverity, number> = {
    critical: 80,
    high: 60,
    medium: 40,
    low: 20,
  };

  let score = severityBase[severity];

  // Add urgency for high session coverage
  if (sessionPercent >= 50) {
    score += 15;
  } else if (sessionPercent >= 25) {
    score += 8;
  }

  // Add urgency for above-fold issues
  if (isAboveFold) {
    score += 10;
  }

  // Add urgency for high conversion impact
  if (conversionLoss >= 20) {
    score += 10;
  } else if (conversionLoss >= 10) {
    score += 5;
  }

  return Math.min(Math.round(score), 100);
}

/**
 * Calculate confidence based on data quality
 */
export function calculateConfidence(
  eventCount: number,
  sessionCount: number,
  hasLocationData: boolean
): number {
  let confidence = 0.5; // Base confidence

  // More events = higher confidence
  if (eventCount >= 20) {
    confidence += 0.2;
  } else if (eventCount >= 10) {
    confidence += 0.15;
  } else if (eventCount >= 5) {
    confidence += 0.1;
  }

  // More sessions = higher confidence
  if (sessionCount >= 10) {
    confidence += 0.2;
  } else if (sessionCount >= 5) {
    confidence += 0.15;
  } else if (sessionCount >= 3) {
    confidence += 0.1;
  }

  // Location data improves confidence
  if (hasLocationData) {
    confidence += 0.1;
  }

  return Math.min(confidence, 1.0);
}

/**
 * Calculate business impact for a pattern
 */
export function calculatePatternImpact(
  pattern: Pattern,
  location: SpatialLocation | null,
  config: BusinessConfig = DEFAULT_BUSINESS_CONFIG
): BusinessImpact {
  // Get base impact factor for this pattern type
  const impactFactor = PATTERN_IMPACT_FACTORS[pattern.type];
  let conversionLoss = impactFactor.conversionLossPercent;

  // Apply location modifier
  if (location) {
    conversionLoss *= LOCATION_IMPACT_MULTIPLIER[location.zone];
  }

  // Apply session coverage modifier
  conversionLoss *= getSessionCoverageMultiplier(pattern.sessionsAffectedPercent);

  // Cap at reasonable maximum
  conversionLoss = Math.min(conversionLoss, 50);

  const revenueLoss = calculateRevenueLoss(conversionLoss, config);
  const urgency = calculateUrgencyScore(
    conversionLoss,
    impactFactor.baseSeverity,
    pattern.sessionsAffectedPercent,
    location?.isAboveFold ?? false
  );

  const confidence = calculateConfidence(
    pattern.occurrences,
    pattern.sessionsAffected,
    location !== null
  );

  return {
    estimatedConversionLoss: Math.round(conversionLoss * 10) / 10,
    estimatedRevenueLossPerMonth: revenueLoss,
    urgencyScore: urgency,
    confidence,
    trend: 'unknown', // Would need historical data to calculate
  };
}

/**
 * Calculate business impact from severity and session data
 */
export function calculateSeverityBasedImpact(
  severity: ProblemSeverity,
  sessionPercent: number,
  eventCount: number,
  location: SpatialLocation | null,
  config: BusinessConfig = DEFAULT_BUSINESS_CONFIG
): BusinessImpact {
  // Get base conversion loss from severity
  let conversionLoss = SEVERITY_CONVERSION_LOSS[severity];

  // Apply location modifier
  if (location) {
    conversionLoss *= LOCATION_IMPACT_MULTIPLIER[location.zone];
  }

  // Apply session coverage modifier
  conversionLoss *= getSessionCoverageMultiplier(sessionPercent);

  // Cap at reasonable maximum
  conversionLoss = Math.min(conversionLoss, 50);

  const revenueLoss = calculateRevenueLoss(conversionLoss, config);
  const urgency = calculateUrgencyScore(
    conversionLoss,
    severity,
    sessionPercent,
    location?.isAboveFold ?? false
  );

  // Estimate sessions from percentage if we have event count
  const estimatedSessions = Math.max(1, Math.round(eventCount / 5));
  const confidence = calculateConfidence(
    eventCount,
    estimatedSessions,
    location !== null
  );

  return {
    estimatedConversionLoss: Math.round(conversionLoss * 10) / 10,
    estimatedRevenueLossPerMonth: revenueLoss,
    urgencyScore: urgency,
    confidence,
    trend: 'unknown',
  };
}

/**
 * Get a human-readable impact description
 */
export function getImpactDescription(impact: BusinessImpact): string {
  const parts: string[] = [];

  if (impact.estimatedConversionLoss >= 15) {
    parts.push(`Major conversion impact (${impact.estimatedConversionLoss}% estimated loss)`);
  } else if (impact.estimatedConversionLoss >= 8) {
    parts.push(`Moderate conversion impact (${impact.estimatedConversionLoss}% estimated loss)`);
  } else {
    parts.push(`Minor conversion impact (${impact.estimatedConversionLoss}% estimated loss)`);
  }

  if (impact.estimatedRevenueLossPerMonth > 0) {
    parts.push(`Est. $${impact.estimatedRevenueLossPerMonth}/mo revenue at risk`);
  }

  return parts.join('. ');
}

/**
 * Compare two impacts to determine which is more severe
 */
export function compareImpacts(a: BusinessImpact, b: BusinessImpact): number {
  // Primary sort by urgency
  if (a.urgencyScore !== b.urgencyScore) {
    return b.urgencyScore - a.urgencyScore;
  }

  // Secondary sort by conversion loss
  if (a.estimatedConversionLoss !== b.estimatedConversionLoss) {
    return b.estimatedConversionLoss - a.estimatedConversionLoss;
  }

  // Tertiary sort by revenue
  return b.estimatedRevenueLossPerMonth - a.estimatedRevenueLossPerMonth;
}

/**
 * Aggregate multiple impacts into a total
 */
export function aggregateImpacts(impacts: BusinessImpact[]): {
  totalRevenueLoss: number;
  averageUrgency: number;
  maxConversionLoss: number;
} {
  if (impacts.length === 0) {
    return { totalRevenueLoss: 0, averageUrgency: 0, maxConversionLoss: 0 };
  }

  const totalRevenueLoss = impacts.reduce(
    (sum, i) => sum + i.estimatedRevenueLossPerMonth,
    0
  );

  const averageUrgency = Math.round(
    impacts.reduce((sum, i) => sum + i.urgencyScore, 0) / impacts.length
  );

  const maxConversionLoss = Math.max(
    ...impacts.map(i => i.estimatedConversionLoss)
  );

  return { totalRevenueLoss, averageUrgency, maxConversionLoss };
}
