import { AnalyticsEvent } from '../types';
import { Problem, ProblemCategory, ProblemSeverity } from '../problemFinder';

// Zone types for spatial analysis
export type PageZone = 'above_fold' | 'mid_page' | 'below_fold' | 'footer';

// Pattern types representing aggregated problems
export type PatternType =
  | 'rage_cluster'          // Multiple rage clicks in same area
  | 'dead_click_hotspot'    // Repeated dead clicks on same element
  | 'cta_invisibility'      // CTA not being seen/clicked
  | 'checkout_friction'     // Problems during checkout flow
  | 'scroll_abandonment'    // Users not scrolling to content
  | 'element_confusion'     // Users clicking non-interactive elements
  | 'price_anxiety';        // Excessive price checking behavior

// Effort level for implementing a fix
export type EffortLevel = 'trivial' | 'small' | 'medium' | 'large';

// Coordinates with optional dimensions
export interface Coordinates {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

// Spatial location information
export interface SpatialLocation {
  zone: PageZone;
  coordinates: Coordinates;
  description: string;           // Human-readable location description
  viewportPercentageX: number;   // 0-100 where in viewport horizontally
  viewportPercentageY: number;   // 0-100 where in viewport vertically
  foldLine: number;              // Y position of the fold
  isAboveFold: boolean;
}

// Viewport analysis result
export interface ViewportAnalysis {
  averageWidth: number;
  averageHeight: number;
  foldLine: number;              // Calculated fold position
  pageHeight: number;            // Estimated full page height
  zoneBreakpoints: {
    aboveFold: number;
    midPage: number;
    belowFold: number;
    footer: number;
  };
}

// Business impact metrics
export interface BusinessImpact {
  estimatedConversionLoss: number;      // Percentage loss (0-100)
  estimatedRevenueLossPerMonth: number; // Dollar amount
  urgencyScore: number;                 // 0-100, higher = more urgent
  confidence: number;                   // 0-1, how confident we are in the estimate
  trend: 'improving' | 'stable' | 'worsening' | 'unknown';
}

// Business config for impact calculations
export interface BusinessConfig {
  averageOrderValue: number;       // AOV in dollars
  monthlyVisitors: number;         // Monthly unique visitors
  currentConversionRate: number;   // Current conversion rate (0-100)
}

// Recommended action with expected outcome
export interface Recommendation {
  action: string;                  // What to do
  currentLocation?: SpatialLocation;
  targetLocation?: {
    zone: PageZone;
    description: string;
    suggestedY?: number;
  };
  expectedOutcome: {
    metric: string;                // What metric will improve
    currentValue?: number;
    projectedValue?: number;
    improvementPercent: number;
  };
  effort: EffortLevel;
  priority: number;                // 1-100
}

// A pattern is a group of related problems
export interface Pattern {
  id: string;
  type: PatternType;
  centroid: Coordinates;           // Center point of the cluster
  radius: number;                  // Cluster radius in pixels
  occurrences: number;             // Number of events in this pattern
  sessionsAffected: number;
  sessionsAffectedPercent: number;
  elementSelectors: string[];      // Elements involved
  elementTexts: string[];          // Text of elements involved
  events: AnalyticsEvent[];        // Source events
  relatedProblems: Problem[];      // Problems that contributed to this pattern
}

// Signal strength for noise filtering
export interface SignalStrength {
  score: number;                   // 0-100
  factors: {
    frequency: number;             // How often it occurs
    sessionCoverage: number;       // % of sessions affected
    severity: number;              // Based on problem severity
    recency: number;               // More recent = higher signal
    consistency: number;           // Same location/element = higher
  };
  isSignificant: boolean;          // Passes minimum threshold
}

// The main insight structure
export interface Insight {
  id: string;
  title: string;                   // Human-readable title
  summary: string;                 // Detailed explanation
  category: ProblemCategory;
  severity: ProblemSeverity;

  // Spatial information
  location: SpatialLocation;

  // Business impact
  impact: BusinessImpact;

  // Actionable recommendation
  recommendation: Recommendation;

  // Signal quality
  signal: SignalStrength;

  // Source data
  pattern?: Pattern;               // The pattern this insight is based on
  sourceProblems: Problem[];       // Original problems that led to this insight
  eventCount: number;              // Number of events involved
  sessionsAffected: number;
  sessionsAffectedPercent: number;

  // Metadata
  timestamp: number;
  pageUrl: string;
}

// Insights analysis result
export interface InsightsAnalysis {
  timestamp: number;
  totalInsights: number;
  highImpactCount: number;         // Insights with urgency > 70
  mediumImpactCount: number;       // Insights with urgency 40-70
  lowImpactCount: number;          // Insights with urgency < 40

  // Aggregated impact
  totalEstimatedRevenueLoss: number;
  topRecommendations: Recommendation[];

  // Viewport analysis
  viewport: ViewportAnalysis;

  // Business config used
  businessConfig: BusinessConfig;

  // Filtered, prioritized insights
  insights: Insight[];

  // Summary for quick understanding
  summary: string;

  // Source statistics
  totalEventsAnalyzed: number;
  totalSessionsAnalyzed: number;
  patternsDetected: number;
}

// Default business configuration
export const DEFAULT_BUSINESS_CONFIG: BusinessConfig = {
  averageOrderValue: 75,
  monthlyVisitors: 1000,
  currentConversionRate: 3,
};

// Impact factors by pattern type
export const PATTERN_IMPACT_FACTORS: Record<PatternType, {
  conversionLossPercent: number;
  baseSeverity: ProblemSeverity;
}> = {
  rage_cluster: { conversionLossPercent: 25, baseSeverity: 'critical' },
  dead_click_hotspot: { conversionLossPercent: 15, baseSeverity: 'high' },
  cta_invisibility: { conversionLossPercent: 35, baseSeverity: 'critical' },
  checkout_friction: { conversionLossPercent: 40, baseSeverity: 'critical' },
  scroll_abandonment: { conversionLossPercent: 20, baseSeverity: 'high' },
  element_confusion: { conversionLossPercent: 10, baseSeverity: 'medium' },
  price_anxiety: { conversionLossPercent: 15, baseSeverity: 'medium' },
};

// Configuration constants
export const INSIGHTS_CONFIG = {
  // Clustering
  clusterRadiusPx: 50,
  minOccurrencesForPattern: 3,
  minSessionPercentForPattern: 5,

  // Noise filtering
  minSignalStrength: 30,
  maxInsightsPerReport: 10,

  // Zone detection (as % of viewport height from top)
  zoneBreakpoints: {
    aboveFold: 100,    // First viewport height
    midPage: 200,      // Second viewport
    belowFold: 300,    // Third viewport
    // Everything beyond is footer
  },
};
