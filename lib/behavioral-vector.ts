/**
 * Behavioral Vector Computation
 * Adapted from html.ai's analytics_agent.py
 *
 * Computes a 5-dimension behavioral vector from user events:
 * - exploration_score: How much the user is exploring vs focused
 * - hesitation_score: Degree of indecision/backtracking
 * - engagement_depth: Time spent vs content consumed
 * - decision_velocity: Speed of progression through funnel
 * - content_focus_ratio: Focused vs scattered attention
 */

import type { AnalyticsEvent } from '@/types/events';

export interface BehavioralVector {
  exploration_score: number;      // 0-1: High = exploring many items
  hesitation_score: number;       // 0-1: High = uncertain/hesitant
  engagement_depth: number;       // 0-1: High = deep engagement
  decision_velocity: number;      // 0-1: High = moving fast through funnel
  content_focus_ratio: number;    // 0-1: High = focused on specific content
}

export type IdentityState =
  | 'exploratory'           // Browsing many options, high exploration
  | 'overwhelmed'           // High exploration + high hesitation, struggling to choose
  | 'comparison_focused'    // High engagement + moderate exploration, researching
  | 'confident'             // Low hesitation + high velocity, knows what they want
  | 'ready_to_decide'       // High engagement + high velocity + low hesitation
  | 'cautious'              // Low velocity + high engagement, being careful
  | 'impulse_buyer'         // High velocity + low engagement, quick decisions
  | 'frustrated';           // High rage clicks, dead clicks

export interface UserIdentity {
  state: IdentityState;
  confidence: number;        // 0-1
  reasoning: string;
  vector: BehavioralVector;
  computedAt: number;
}

// Recency window in milliseconds (5 minutes like html.ai)
const RECENCY_WINDOW_MS = 5 * 60 * 1000;

// Funnel events for velocity calculation
const FUNNEL_EVENTS = [
  'page_view',
  'section_view',
  'product_view',
  'add_to_cart',
  'checkout_start',
  'purchase',
];

// Hesitation signals
const HESITATION_EVENTS = [
  'scroll_reversal',
  'dead_click',
  'form_blur',
  'checkout_abandon',
  'exit_intent',
];

// Frustration signals
const FRUSTRATION_EVENTS = [
  'rage_click',
  'dead_click',
  'double_click',
];

interface WeightedEvent {
  event: AnalyticsEvent;
  weight: number;
}

/**
 * Apply exponential recency decay to events
 * More recent events have higher weight
 */
function applyRecencyWeighting(events: AnalyticsEvent[]): WeightedEvent[] {
  const now = Date.now();

  return events.map(event => {
    const ageMs = now - event.timestamp;
    // Exponential decay: weight = e^(-age/window)
    const weight = Math.exp(-ageMs / RECENCY_WINDOW_MS);
    return { event, weight };
  });
}

/**
 * Compute exploration score
 * High score = user is exploring many different elements/sections
 */
function computeExploration(weightedEvents: WeightedEvent[]): number {
  const uniqueElements = new Set<string>();
  const uniqueSections = new Set<string>();
  let totalWeight = 0;

  for (const { event, weight } of weightedEvents) {
    if (event.elementSelector) {
      uniqueElements.add(event.elementSelector);
    }
    if (event.sectionId) {
      uniqueSections.add(event.sectionId);
    }
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0.5;

  // Normalize by expected max (5 sections, 10 elements)
  const sectionScore = Math.min(uniqueSections.size / 5, 1);
  const elementScore = Math.min(uniqueElements.size / 10, 1);

  return (sectionScore + elementScore) / 2;
}

/**
 * Compute hesitation score
 * High score = user is backtracking, uncertain, showing indecision
 */
function computeHesitation(weightedEvents: WeightedEvent[]): number {
  let hesitationWeight = 0;
  let totalWeight = 0;

  for (const { event, weight } of weightedEvents) {
    if (HESITATION_EVENTS.includes(event.type)) {
      hesitationWeight += weight;
    }
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0.5;

  return Math.min(hesitationWeight / totalWeight * 3, 1); // Scale up for sensitivity
}

/**
 * Compute engagement depth
 * High score = user is spending time, engaging deeply with content
 */
function computeEngagement(weightedEvents: WeightedEvent[]): number {
  let engagementScore = 0;
  let totalWeight = 0;

  for (const { event, weight } of weightedEvents) {
    // Hover intent indicates deep engagement
    if (event.type === 'hover_intent') {
      engagementScore += weight * 2;
    }
    // Text selection = research behavior
    if (event.type === 'text_selection') {
      engagementScore += weight * 1.5;
    }
    // Product view with time
    if (event.type === 'product_view') {
      engagementScore += weight;
    }
    // Section view
    if (event.type === 'section_view') {
      engagementScore += weight * 0.5;
    }
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0.5;

  // Normalize: high engagement = score approaching 1
  return Math.min(engagementScore / totalWeight, 1);
}

/**
 * Compute decision velocity
 * High score = user is moving quickly through the funnel
 */
function computeVelocity(weightedEvents: WeightedEvent[]): number {
  let funnelProgression = 0;
  let totalWeight = 0;
  let maxFunnelStage = 0;

  for (const { event, weight } of weightedEvents) {
    const funnelIndex = FUNNEL_EVENTS.indexOf(event.type);
    if (funnelIndex >= 0) {
      funnelProgression += weight * (funnelIndex + 1);
      maxFunnelStage = Math.max(maxFunnelStage, funnelIndex);
    }
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0.5;

  // Combine weighted progression with max stage reached
  const progressionScore = funnelProgression / (totalWeight * FUNNEL_EVENTS.length);
  const stageScore = maxFunnelStage / FUNNEL_EVENTS.length;

  return (progressionScore + stageScore) / 2;
}

/**
 * Compute content focus ratio
 * High score = user is focused on specific content, not scattered
 */
function computeFocus(weightedEvents: WeightedEvent[]): number {
  const sectionTimes: Record<string, number> = {};

  for (const { event, weight } of weightedEvents) {
    const section = event.sectionId || event.elementSelector || 'unknown';
    sectionTimes[section] = (sectionTimes[section] || 0) + weight;
  }

  const sections = Object.values(sectionTimes);
  if (sections.length === 0) return 0.5;

  const totalTime = sections.reduce((a, b) => a + b, 0);
  if (totalTime === 0) return 0.5;

  // Concentration: is time focused on one section or spread out?
  const sortedTimes = sections.sort((a, b) => b - a);
  const topSectionRatio = sortedTimes[0] / totalTime;

  return topSectionRatio;
}

/**
 * Compute frustration score (additional signal for our use case)
 */
function computeFrustration(weightedEvents: WeightedEvent[]): number {
  let frustrationWeight = 0;
  let totalWeight = 0;

  for (const { event, weight } of weightedEvents) {
    if (FRUSTRATION_EVENTS.includes(event.type)) {
      frustrationWeight += weight * 2; // Frustration signals are strong
    }
    // Rage clicks have click count
    if (event.type === 'rage_click' && event.clickCount) {
      frustrationWeight += weight * event.clickCount;
    }
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;

  return Math.min(frustrationWeight / totalWeight * 2, 1);
}

/**
 * Compute full behavioral vector from events
 */
export function computeBehavioralVector(events: AnalyticsEvent[]): BehavioralVector {
  if (!events || events.length === 0) {
    // Default neutral vector
    return {
      exploration_score: 0.5,
      hesitation_score: 0.5,
      engagement_depth: 0.5,
      decision_velocity: 0.5,
      content_focus_ratio: 0.5,
    };
  }

  const weightedEvents = applyRecencyWeighting(events);

  return {
    exploration_score: computeExploration(weightedEvents),
    hesitation_score: computeHesitation(weightedEvents),
    engagement_depth: computeEngagement(weightedEvents),
    decision_velocity: computeVelocity(weightedEvents),
    content_focus_ratio: computeFocus(weightedEvents),
  };
}

/**
 * Rule-based identity classification (fallback when LLM fails)
 * Adapted from html.ai's _rule_based_fallback
 */
export function classifyIdentityRuleBased(vector: BehavioralVector, events: AnalyticsEvent[]): IdentityState {
  const frustration = computeFrustration(applyRecencyWeighting(events));

  // Check frustration first (our additional signal)
  if (frustration > 0.6) {
    return 'frustrated';
  }

  // Overwhelmed: high exploration + high hesitation
  if (vector.hesitation_score > 0.7 && vector.exploration_score > 0.6) {
    return 'overwhelmed';
  }

  // Confident: low hesitation + high velocity
  if (vector.decision_velocity > 0.7 && vector.hesitation_score < 0.3) {
    return 'confident';
  }

  // Ready to decide: high engagement + high velocity + low hesitation
  if (vector.engagement_depth > 0.6 && vector.decision_velocity > 0.6 && vector.hesitation_score < 0.4) {
    return 'ready_to_decide';
  }

  // Comparison focused: high engagement + moderate exploration
  if (vector.engagement_depth > 0.7 && vector.content_focus_ratio > 0.6) {
    return 'comparison_focused';
  }

  // Impulse buyer: high velocity + low engagement
  if (vector.decision_velocity > 0.7 && vector.engagement_depth < 0.4) {
    return 'impulse_buyer';
  }

  // Cautious: low velocity + high engagement
  if (vector.decision_velocity < 0.4 && vector.engagement_depth > 0.6) {
    return 'cautious';
  }

  // Exploratory: high exploration (default for browsers)
  if (vector.exploration_score > 0.6) {
    return 'exploratory';
  }

  // Default
  return 'cautious';
}

/**
 * Get confidence score for rule-based classification
 */
export function getRuleBasedConfidence(vector: BehavioralVector, state: IdentityState): number {
  // Base confidence
  let confidence = 0.6;

  // Adjust based on how extreme the vector values are
  const values = Object.values(vector);
  const extremity = values.reduce((sum, v) => sum + Math.abs(v - 0.5), 0) / values.length;

  // More extreme values = higher confidence
  confidence += extremity * 0.3;

  return Math.min(confidence, 0.95);
}

/**
 * Format behavioral vector for logging/display
 */
export function formatVector(vector: BehavioralVector): string {
  return [
    `exploration=${vector.exploration_score.toFixed(2)}`,
    `hesitation=${vector.hesitation_score.toFixed(2)}`,
    `engagement=${vector.engagement_depth.toFixed(2)}`,
    `velocity=${vector.decision_velocity.toFixed(2)}`,
    `focus=${vector.content_focus_ratio.toFixed(2)}`,
  ].join(', ');
}

/**
 * Compute user identity from events (full pipeline)
 */
export function computeUserIdentity(events: AnalyticsEvent[]): UserIdentity {
  const vector = computeBehavioralVector(events);
  const state = classifyIdentityRuleBased(vector, events);
  const confidence = getRuleBasedConfidence(vector, state);

  return {
    state,
    confidence,
    reasoning: `Rule-based classification from behavioral vector: ${formatVector(vector)}`,
    vector,
    computedAt: Date.now(),
  };
}
