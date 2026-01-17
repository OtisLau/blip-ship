// Types
export type {
  PageZone,
  PatternType,
  EffortLevel,
  Coordinates,
  SpatialLocation,
  ViewportAnalysis,
  BusinessImpact,
  BusinessConfig,
  Recommendation,
  Pattern,
  SignalStrength,
  Insight,
  InsightsAnalysis,
} from './types';

export {
  DEFAULT_BUSINESS_CONFIG,
  PATTERN_IMPACT_FACTORS,
  INSIGHTS_CONFIG,
} from './types';

// Spatial Analyzer
export {
  analyzeViewport,
  getZoneForY,
  analyzeSpatialLocation,
  analyzeEventLocation,
  getAboveFoldTargetLocation,
  calculateCentroid,
  calculateClusterRadius,
  arePointsNearby,
  clusterEventsBySpatialProximity,
  formatLocationForDisplay,
} from './spatialAnalyzer';

// Impact Calculator
export {
  calculateRevenueLoss,
  calculateUrgencyScore,
  calculateConfidence,
  calculatePatternImpact,
  calculateSeverityBasedImpact,
  getImpactDescription,
  compareImpacts,
  aggregateImpacts,
} from './impactCalculator';

// Pattern Aggregator
export {
  detectRageClusters,
  detectDeadClickHotspots,
  detectScrollAbandonment,
  detectElementConfusion,
  detectPriceAnxiety,
  detectAllPatterns,
  getPatternTypeDescription,
} from './patternAggregator';

// Noise Filter
export {
  calculatePatternSignalStrength,
  calculateInsightSignalStrength,
  filterBySignalStrength,
  sortBySignalAndImpact,
  limitInsights,
  filterAndPrioritizeInsights,
  getSignalDescription,
  hasEnoughDataForInsights,
} from './noiseFilter';

// Recommendation Generator
export {
  generatePatternRecommendation,
  generateInsightTitle,
  generateInsightSummary,
  getEffortDescription,
  getImprovementProjection,
  getPriorityLabel,
} from './recommendationGenerator';

// Main Engine
export {
  generateInsights,
  getInsightsByCategory,
  getInsightsByUrgency,
  formatInsightsForDisplay,
} from './insightsEngine';
