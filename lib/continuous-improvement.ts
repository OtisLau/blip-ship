/**
 * Continuous Improvement Engine
 *
 * This module implements the "data → insights → action" loop:
 * 1. DETECT: Monitor event streams for behavioral patterns
 * 2. ANALYZE: Use AI to classify user identity and recommend changes
 * 3. ADAPT: Apply real-time UI variants OR queue for approval
 * 4. MEASURE: Track impact of changes on conversion metrics
 * 5. LEARN: Update rules based on what works
 */

import { AnalyticsEvent } from '@/types';
import { IdentityState, UserIdentity, computeUserIdentity, BehavioralVector } from './behavioral-vector';
import { getUIRecommendations, classifyUserIdentity, isIdentityClassifierConfigured } from './identity-classifier';
import { mapRecommendationsToChanges, IdentityFixMapping } from './identity-to-fix-mapper';

// =============================================================================
// TYPES
// =============================================================================

export interface ImprovementCycle {
  id: string;
  startedAt: number;
  completedAt?: number;

  // Detection phase
  triggerReason: 'threshold' | 'schedule' | 'manual' | 'anomaly';
  eventsAnalyzed: number;
  sessionsAnalyzed: number;

  // Analysis phase
  identity: UserIdentity;
  recommendations: ReturnType<typeof getUIRecommendations>;
  mapping: IdentityFixMapping;

  // Action phase
  actionType: 'realtime_variant' | 'pr_approval' | 'skipped';
  actionReason: string;

  // Measurement phase (populated after action)
  impact?: {
    beforeMetrics: ConversionMetrics;
    afterMetrics: ConversionMetrics;
    improvement: number; // percentage
    statisticalSignificance: number; // 0-1
  };
}

export interface ConversionMetrics {
  sessions: number;
  ctaClicks: number;
  addToCarts: number;
  checkoutStarts: number;
  purchases: number;
  bounceRate: number;
  avgSessionDuration: number;
}

export interface LearningRecord {
  fixRuleId: string;
  identityState: IdentityState;
  timesApplied: number;
  timesApproved: number;
  timesRejected: number;
  avgImpact: number;
  lastApplied: number;
  confidence: number; // Higher = more likely to auto-apply
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  // Auto-trigger detection after this many events
  eventThreshold: 50,

  // Minimum time between cycles (5 minutes)
  cooldownMs: 5 * 60 * 1000,

  // Confidence threshold for auto-applying without approval
  autoApplyConfidence: 0.9,

  // Minimum events to calculate metrics
  minEventsForMetrics: 20,

  // Statistical significance threshold
  significanceThreshold: 0.95,
};

// =============================================================================
// STATE
// =============================================================================

let lastCycleTime = 0;
let cycleCount = 0;
const learningRecords: Map<string, LearningRecord> = new Map();
const cycleHistory: ImprovementCycle[] = [];

// =============================================================================
// DETECTION PHASE
// =============================================================================

/**
 * Check if we should trigger an improvement cycle
 */
export function shouldTriggerCycle(eventCount: number): {
  should: boolean;
  reason: string;
} {
  const now = Date.now();
  const timeSinceLastCycle = now - lastCycleTime;

  // Cooldown check
  if (timeSinceLastCycle < CONFIG.cooldownMs) {
    return {
      should: false,
      reason: `Cooldown: ${Math.round((CONFIG.cooldownMs - timeSinceLastCycle) / 1000)}s remaining`
    };
  }

  // Threshold check
  if (eventCount >= CONFIG.eventThreshold) {
    return {
      should: true,
      reason: `Event threshold reached (${eventCount} >= ${CONFIG.eventThreshold})`
    };
  }

  return {
    should: false,
    reason: `Waiting for more events (${eventCount} < ${CONFIG.eventThreshold})`
  };
}

/**
 * Detect anomalies in event stream that should trigger immediate action
 */
export function detectAnomalies(events: AnalyticsEvent[]): {
  hasAnomaly: boolean;
  anomalyType?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
} {
  const recentEvents = events.slice(-20);

  // Rage click spike detection
  const rageClicks = recentEvents.filter(e => e.type === 'rage_click').length;
  if (rageClicks >= 5) {
    return {
      hasAnomaly: true,
      anomalyType: 'rage_click_spike',
      severity: 'critical',
    };
  }

  // Bounce spike detection
  const bounces = recentEvents.filter(e => e.type === 'bounce').length;
  if (bounces >= 3) {
    return {
      hasAnomaly: true,
      anomalyType: 'bounce_spike',
      severity: 'high',
    };
  }

  // Form error spike
  const formErrors = recentEvents.filter(e => e.type === 'form_error').length;
  if (formErrors >= 4) {
    return {
      hasAnomaly: true,
      anomalyType: 'form_error_spike',
      severity: 'high',
    };
  }

  return { hasAnomaly: false };
}

// =============================================================================
// ANALYSIS PHASE
// =============================================================================

/**
 * Run the full analysis pipeline
 */
export async function analyzeUserBehavior(events: AnalyticsEvent[]): Promise<{
  identity: UserIdentity;
  recommendations: ReturnType<typeof getUIRecommendations>;
  mapping: IdentityFixMapping;
}> {
  // Classify identity
  let identity: UserIdentity;
  if (isIdentityClassifierConfigured()) {
    identity = await classifyUserIdentity(events);
  } else {
    identity = computeUserIdentity(events);
  }

  // Get UI recommendations
  const recommendations = getUIRecommendations(identity.state);

  // Map to element changes
  const mapping = mapRecommendationsToChanges(
    identity.state,
    identity.confidence,
    recommendations
  );

  return { identity, recommendations, mapping };
}

// =============================================================================
// ACTION PHASE
// =============================================================================

/**
 * Decide whether to auto-apply or require approval
 */
export function decideAction(
  identity: UserIdentity,
  mapping: IdentityFixMapping
): {
  actionType: 'realtime_variant' | 'pr_approval' | 'skipped';
  reason: string;
} {
  // No changes to apply
  if (mapping.elementChanges.length === 0) {
    return {
      actionType: 'skipped',
      reason: 'No applicable changes for this identity state',
    };
  }

  // Check learning records for this identity state
  const record = learningRecords.get(mapping.identityState);

  // High confidence from learning + high identity confidence = auto-apply
  if (record && record.confidence >= CONFIG.autoApplyConfidence && identity.confidence >= 0.8) {
    return {
      actionType: 'realtime_variant',
      reason: `Auto-applying: rule confidence ${(record.confidence * 100).toFixed(0)}%, ` +
              `identity confidence ${(identity.confidence * 100).toFixed(0)}%`,
    };
  }

  // Otherwise require approval
  return {
    actionType: 'pr_approval',
    reason: 'Requires approval: insufficient confidence for auto-apply',
  };
}

// =============================================================================
// MEASUREMENT PHASE
// =============================================================================

/**
 * Calculate conversion metrics from events
 */
export function calculateMetrics(events: AnalyticsEvent[]): ConversionMetrics {
  const sessions = new Set(events.map(e => e.sessionId)).size;
  const ctaClicks = events.filter(e => e.type === 'cta_click' ||
    (e.type === 'click' && e.elementSelector?.includes('[data-cta]'))).length;
  const addToCarts = events.filter(e => e.type === 'add_to_cart').length;
  const checkoutStarts = events.filter(e => e.type === 'checkout_start').length;
  const purchases = events.filter(e => e.type === 'purchase').length;
  const bounces = events.filter(e => e.type === 'bounce').length;

  // Calculate average session duration
  const sessionDurations: number[] = [];
  const sessionEvents = new Map<string, AnalyticsEvent[]>();
  events.forEach(e => {
    if (!sessionEvents.has(e.sessionId)) {
      sessionEvents.set(e.sessionId, []);
    }
    sessionEvents.get(e.sessionId)!.push(e);
  });
  sessionEvents.forEach(sessEvents => {
    if (sessEvents.length >= 2) {
      const sorted = sessEvents.sort((a, b) => a.timestamp - b.timestamp);
      const duration = sorted[sorted.length - 1].timestamp - sorted[0].timestamp;
      sessionDurations.push(duration);
    }
  });

  return {
    sessions,
    ctaClicks,
    addToCarts,
    checkoutStarts,
    purchases,
    bounceRate: sessions > 0 ? bounces / sessions : 0,
    avgSessionDuration: sessionDurations.length > 0
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
      : 0,
  };
}

/**
 * Calculate improvement percentage
 */
export function calculateImprovement(
  before: ConversionMetrics,
  after: ConversionMetrics
): number {
  // Primary metric: CTA click rate
  const beforeRate = before.sessions > 0 ? before.ctaClicks / before.sessions : 0;
  const afterRate = after.sessions > 0 ? after.ctaClicks / after.sessions : 0;

  if (beforeRate === 0) return afterRate > 0 ? 100 : 0;

  return ((afterRate - beforeRate) / beforeRate) * 100;
}

// =============================================================================
// LEARNING PHASE
// =============================================================================

/**
 * Update learning records based on fix outcomes
 */
export function recordFixOutcome(
  fixRuleId: string,
  identityState: IdentityState,
  approved: boolean,
  impact: number
): void {
  const key = identityState;
  let record = learningRecords.get(key);

  if (!record) {
    record = {
      fixRuleId,
      identityState,
      timesApplied: 0,
      timesApproved: 0,
      timesRejected: 0,
      avgImpact: 0,
      lastApplied: Date.now(),
      confidence: 0.5, // Start neutral
    };
  }

  record.timesApplied++;
  record.lastApplied = Date.now();

  if (approved) {
    record.timesApproved++;
    // Update average impact (weighted moving average)
    record.avgImpact = record.avgImpact * 0.7 + impact * 0.3;
  } else {
    record.timesRejected++;
  }

  // Update confidence based on approval rate and impact
  const approvalRate = record.timesApproved / record.timesApplied;
  const impactScore = Math.min(1, Math.max(0, record.avgImpact / 50)); // Normalize to 0-1
  record.confidence = approvalRate * 0.6 + impactScore * 0.4;

  learningRecords.set(key, record);

  console.log(`[Learning] Updated record for ${identityState}:`, {
    approvalRate: `${(approvalRate * 100).toFixed(0)}%`,
    avgImpact: `${record.avgImpact.toFixed(1)}%`,
    confidence: `${(record.confidence * 100).toFixed(0)}%`,
  });
}

/**
 * Get learning statistics
 */
export function getLearningStats(): {
  totalCycles: number;
  records: LearningRecord[];
  topPerformingRules: Array<{ state: IdentityState; confidence: number; impact: number }>;
} {
  const records = Array.from(learningRecords.values());
  const topPerforming = records
    .filter(r => r.timesApplied >= 3) // Minimum sample size
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)
    .map(r => ({
      state: r.identityState,
      confidence: r.confidence,
      impact: r.avgImpact,
    }));

  return {
    totalCycles: cycleCount,
    records,
    topPerformingRules: topPerforming,
  };
}

// =============================================================================
// MAIN CYCLE RUNNER
// =============================================================================

/**
 * Run a complete improvement cycle
 */
export async function runImprovementCycle(
  events: AnalyticsEvent[],
  triggerReason: ImprovementCycle['triggerReason']
): Promise<ImprovementCycle> {
  const cycleId = `cycle_${Date.now()}_${++cycleCount}`;
  const startedAt = Date.now();

  console.log(`[Cycle ${cycleId}] Starting improvement cycle (${triggerReason})`);

  // Analysis phase
  const { identity, recommendations, mapping } = await analyzeUserBehavior(events);
  console.log(`[Cycle ${cycleId}] Identity: ${identity.state} (${(identity.confidence * 100).toFixed(0)}%)`);

  // Action decision
  const { actionType, reason: actionReason } = decideAction(identity, mapping);
  console.log(`[Cycle ${cycleId}] Action: ${actionType} - ${actionReason}`);

  // Create cycle record
  const cycle: ImprovementCycle = {
    id: cycleId,
    startedAt,
    triggerReason,
    eventsAnalyzed: events.length,
    sessionsAnalyzed: new Set(events.map(e => e.sessionId)).size,
    identity,
    recommendations,
    mapping,
    actionType,
    actionReason,
  };

  // Update state
  lastCycleTime = Date.now();
  cycleHistory.push(cycle);

  // Keep only last 100 cycles
  if (cycleHistory.length > 100) {
    cycleHistory.shift();
  }

  cycle.completedAt = Date.now();
  console.log(`[Cycle ${cycleId}] Completed in ${cycle.completedAt - startedAt}ms`);

  return cycle;
}

/**
 * Get cycle history
 */
export function getCycleHistory(): ImprovementCycle[] {
  return [...cycleHistory];
}

/**
 * Get current configuration
 */
export function getConfig() {
  return { ...CONFIG };
}
