/**
 * Identity Classification Service
 * Adapted from html.ai's identity_agent.py
 *
 * Uses Gemini to interpret behavioral vector into semantic identity state.
 * Falls back to rule-based classification if LLM fails.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AnalyticsEvent } from '@/types/events';
import {
  BehavioralVector,
  IdentityState,
  UserIdentity,
  computeBehavioralVector,
  classifyIdentityRuleBased,
  getRuleBasedConfidence,
  formatVector,
} from './behavioral-vector';

// Initialize Gemini
const genAI = process.env.GOOGLE_GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
  : null;

// Cache for similar patterns (reduces API calls by ~70% per html.ai)
interface CacheEntry {
  identity: UserIdentity;
  expiresAt: number;
}
const identityCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

/**
 * Generate cache key from behavioral vector
 * Round values to reduce cache misses for similar patterns
 */
function getCacheKey(vector: BehavioralVector): string {
  const round = (n: number) => Math.round(n * 10) / 10; // Round to 1 decimal
  return [
    round(vector.exploration_score),
    round(vector.hesitation_score),
    round(vector.engagement_depth),
    round(vector.decision_velocity),
    round(vector.content_focus_ratio),
  ].join('|');
}

/**
 * Check cache for similar pattern
 */
function checkCache(vector: BehavioralVector): UserIdentity | null {
  const key = getCacheKey(vector);
  const cached = identityCache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    console.log('[Identity] Cache hit for pattern:', key);
    return cached.identity;
  }

  return null;
}

/**
 * Store identity in cache
 */
function cacheIdentity(vector: BehavioralVector, identity: UserIdentity): void {
  const key = getCacheKey(vector);
  identityCache.set(key, {
    identity,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Clean expired cache entries
 */
function cleanCache(): void {
  const now = Date.now();
  for (const [key, entry] of identityCache.entries()) {
    if (entry.expiresAt < now) {
      identityCache.delete(key);
    }
  }
}

// Clean cache periodically
setInterval(cleanCache, CACHE_TTL_MS);

/**
 * Build prompt for Gemini identity classification
 * Adapted from html.ai's identity_agent prompt
 */
function buildIdentityPrompt(vector: BehavioralVector): string {
  return `You are an identity interpretation agent that analyzes user behavior patterns.

Given a behavioral vector with these dimensions (all 0.0 to 1.0):
- exploration_score: How much the user is exploring vs focused (high = exploring many items)
- hesitation_score: Degree of indecision/backtracking (high = uncertain/hesitant)
- engagement_depth: Time spent vs content consumed (high = deep engagement)
- decision_velocity: Speed of progression through funnel (high = moving fast)
- content_focus_ratio: Focused vs scattered attention (high = focused on specific content)

Interpret the user's current identity state. Choose ONE from:
- exploratory: Browsing many options, high exploration
- overwhelmed: High exploration + high hesitation, struggling to choose
- comparison_focused: High engagement + moderate exploration, researching carefully
- confident: Low hesitation + high velocity, knows what they want
- ready_to_decide: High engagement + high velocity + low hesitation
- cautious: Low velocity + high engagement, being very careful
- impulse_buyer: High velocity + low engagement, quick decisions
- frustrated: Showing frustration signals (rage clicks, repeated failures)

Behavioral vector:
${JSON.stringify(vector, null, 2)}

Return ONLY a JSON object with:
{
  "identity_state": "one_of_the_states_above",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;
}

/**
 * Parse Gemini response with validation
 */
function parseGeminiResponse(response: string): { state: IdentityState; confidence: number; reasoning: string } | null {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response;
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      // Try to find JSON object directly
      const objMatch = response.match(/\{[\s\S]*\}/);
      if (objMatch) {
        jsonStr = objMatch[0];
      }
    }

    const parsed = JSON.parse(jsonStr);

    // Validate identity state
    const validStates: IdentityState[] = [
      'exploratory', 'overwhelmed', 'comparison_focused', 'confident',
      'ready_to_decide', 'cautious', 'impulse_buyer', 'frustrated',
    ];

    if (!validStates.includes(parsed.identity_state)) {
      console.warn('[Identity] Invalid state from Gemini:', parsed.identity_state);
      return null;
    }

    // Validate confidence
    const confidence = parseFloat(parsed.confidence);
    if (isNaN(confidence) || confidence < 0 || confidence > 1) {
      console.warn('[Identity] Invalid confidence from Gemini:', parsed.confidence);
      return null;
    }

    return {
      state: parsed.identity_state as IdentityState,
      confidence,
      reasoning: parsed.reasoning || 'No reasoning provided',
    };
  } catch (error) {
    console.error('[Identity] Failed to parse Gemini response:', error);
    return null;
  }
}

/**
 * Classify identity using Gemini LLM
 */
async function classifyWithGemini(vector: BehavioralVector): Promise<{ state: IdentityState; confidence: number; reasoning: string } | null> {
  if (!genAI) {
    console.log('[Identity] Gemini not configured, using rule-based fallback');
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const prompt = buildIdentityPrompt(vector);

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return parseGeminiResponse(response);
  } catch (error) {
    console.error('[Identity] Gemini API error:', error);
    return null;
  }
}

/**
 * Main function: Classify user identity from events
 *
 * Pipeline:
 * 1. Compute behavioral vector from events
 * 2. Check cache for similar patterns
 * 3. Try Gemini classification
 * 4. Fall back to rule-based if Gemini fails
 */
export async function classifyUserIdentity(events: AnalyticsEvent[]): Promise<UserIdentity> {
  console.log(`[Identity] Classifying user from ${events.length} events`);

  // Step 1: Compute behavioral vector
  const vector = computeBehavioralVector(events);
  console.log(`[Identity] Behavioral vector: ${formatVector(vector)}`);

  // Step 2: Check cache
  const cached = checkCache(vector);
  if (cached) {
    return cached;
  }

  // Step 3: Try Gemini classification
  const geminiResult = await classifyWithGemini(vector);

  let identity: UserIdentity;

  if (geminiResult) {
    // Gemini succeeded
    identity = {
      state: geminiResult.state,
      confidence: geminiResult.confidence,
      reasoning: geminiResult.reasoning,
      vector,
      computedAt: Date.now(),
    };
    console.log(`[Identity] Gemini classified as: ${identity.state} (${identity.confidence.toFixed(2)})`);
  } else {
    // Step 4: Rule-based fallback
    const state = classifyIdentityRuleBased(vector, events);
    const confidence = getRuleBasedConfidence(vector, state);

    identity = {
      state,
      confidence,
      reasoning: `Rule-based fallback: ${formatVector(vector)}`,
      vector,
      computedAt: Date.now(),
    };
    console.log(`[Identity] Rule-based classified as: ${identity.state} (${identity.confidence.toFixed(2)})`);
  }

  // Cache the result
  cacheIdentity(vector, identity);

  return identity;
}

/**
 * Get recommended UI adaptations for identity state
 * Based on html.ai's variant targeting
 */
export function getUIRecommendations(state: IdentityState): {
  headline_style: string;
  cta_style: string;
  urgency: 'low' | 'medium' | 'high' | 'extreme';
  show_trust_badges: boolean;
  show_comparison_tools: boolean;
  simplify_layout: boolean;
} {
  switch (state) {
    case 'confident':
      return {
        headline_style: 'direct',
        cta_style: 'bold',
        urgency: 'high',
        show_trust_badges: false,
        show_comparison_tools: false,
        simplify_layout: false,
      };

    case 'overwhelmed':
      return {
        headline_style: 'helpful',
        cta_style: 'guided',
        urgency: 'low',
        show_trust_badges: true,
        show_comparison_tools: false,
        simplify_layout: true, // Key: reduce choices
      };

    case 'comparison_focused':
      return {
        headline_style: 'informative',
        cta_style: 'compare',
        urgency: 'low',
        show_trust_badges: true,
        show_comparison_tools: true, // Key: enable comparison
        simplify_layout: false,
      };

    case 'ready_to_decide':
      return {
        headline_style: 'action',
        cta_style: 'checkout',
        urgency: 'high',
        show_trust_badges: true,
        show_comparison_tools: false,
        simplify_layout: true, // Remove distractions
      };

    case 'cautious':
      return {
        headline_style: 'reassuring',
        cta_style: 'safe',
        urgency: 'medium',
        show_trust_badges: true, // Key: build trust
        show_comparison_tools: true,
        simplify_layout: false,
      };

    case 'impulse_buyer':
      return {
        headline_style: 'exciting',
        cta_style: 'urgent',
        urgency: 'extreme', // Key: create FOMO
        show_trust_badges: false,
        show_comparison_tools: false,
        simplify_layout: true,
      };

    case 'frustrated':
      return {
        headline_style: 'helpful',
        cta_style: 'support',
        urgency: 'low',
        show_trust_badges: true,
        show_comparison_tools: false,
        simplify_layout: true, // Key: reduce friction
      };

    case 'exploratory':
    default:
      return {
        headline_style: 'inviting',
        cta_style: 'browse',
        urgency: 'low',
        show_trust_badges: false,
        show_comparison_tools: false,
        simplify_layout: false,
      };
  }
}

/**
 * Check if identity classifier is configured
 */
export function isIdentityClassifierConfigured(): boolean {
  return !!genAI;
}
