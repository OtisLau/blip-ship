import { AnalyticsEvent } from '../types';
import { Problem } from '../problemFinder';
import {
  Pattern,
  PatternType,
  Coordinates,
  INSIGHTS_CONFIG,
} from './types';
import {
  clusterEventsBySpatialProximity,
  calculateCentroid,
  calculateClusterRadius,
} from './spatialAnalyzer';

/**
 * Generate a unique pattern ID
 */
function generatePatternId(type: PatternType, index: number): string {
  return `pattern_${type}_${Date.now()}_${index}`;
}

/**
 * Get unique sessions from events
 */
function getUniqueSessions(events: AnalyticsEvent[]): Set<string> {
  return new Set(events.map(e => e.sessionId));
}

/**
 * Get unique element selectors from events
 */
function getUniqueSelectors(events: AnalyticsEvent[]): string[] {
  const selectors = new Set(
    events.filter(e => e.elementSelector).map(e => e.elementSelector!)
  );
  return Array.from(selectors);
}

/**
 * Get unique element texts from events
 */
function getUniqueTexts(events: AnalyticsEvent[]): string[] {
  const texts = new Set(
    events.filter(e => e.elementText).map(e => e.elementText!)
  );
  return Array.from(texts);
}

/**
 * Detect rage click clusters - areas with repeated rapid clicks
 */
export function detectRageClusters(
  events: AnalyticsEvent[],
  totalSessions: number
): Pattern[] {
  const rageClicks = events.filter(e => e.type === 'rage_click');

  if (rageClicks.length === 0) return [];

  const clusters = clusterEventsBySpatialProximity(
    rageClicks,
    INSIGHTS_CONFIG.clusterRadiusPx
  );

  const patterns: Pattern[] = [];

  clusters.forEach((cluster, index) => {
    if (cluster.length < INSIGHTS_CONFIG.minOccurrencesForPattern) return;

    const sessions = getUniqueSessions(cluster);
    const sessionPercent = (sessions.size / totalSessions) * 100;

    if (sessionPercent < INSIGHTS_CONFIG.minSessionPercentForPattern) return;

    const coords = cluster
      .filter(e => typeof e.x === 'number' && typeof e.y === 'number')
      .map(e => ({ x: e.x!, y: e.y! }));

    const centroid = calculateCentroid(coords);
    const radius = calculateClusterRadius(coords, centroid);

    patterns.push({
      id: generatePatternId('rage_cluster', index),
      type: 'rage_cluster',
      centroid,
      radius,
      occurrences: cluster.length,
      sessionsAffected: sessions.size,
      sessionsAffectedPercent: sessionPercent,
      elementSelectors: getUniqueSelectors(cluster),
      elementTexts: getUniqueTexts(cluster),
      events: cluster,
      relatedProblems: [],
    });
  });

  return patterns;
}

/**
 * Detect dead click hotspots - areas with repeated unresponsive clicks
 */
export function detectDeadClickHotspots(
  events: AnalyticsEvent[],
  totalSessions: number
): Pattern[] {
  const deadClicks = events.filter(e => e.type === 'dead_click');

  if (deadClicks.length === 0) return [];

  // First, group by element selector for more accurate clustering
  const bySelector: Record<string, AnalyticsEvent[]> = {};
  deadClicks.forEach(event => {
    const key = event.elementSelector || 'unknown';
    if (!bySelector[key]) bySelector[key] = [];
    bySelector[key].push(event);
  });

  const patterns: Pattern[] = [];
  let patternIndex = 0;

  // Create patterns from selector groups
  Object.entries(bySelector).forEach(([selector, selectorEvents]) => {
    if (selectorEvents.length < INSIGHTS_CONFIG.minOccurrencesForPattern) return;

    const sessions = getUniqueSessions(selectorEvents);
    const sessionPercent = (sessions.size / totalSessions) * 100;

    // For dead clicks, we're more lenient on session percent since
    // even a small percentage of frustrated users matters
    if (sessionPercent < 1) return;

    const coords = selectorEvents
      .filter(e => typeof e.x === 'number' && typeof e.y === 'number')
      .map(e => ({ x: e.x!, y: e.y! }));

    if (coords.length === 0) return;

    const centroid = calculateCentroid(coords);
    const radius = calculateClusterRadius(coords, centroid);

    patterns.push({
      id: generatePatternId('dead_click_hotspot', patternIndex++),
      type: 'dead_click_hotspot',
      centroid,
      radius,
      occurrences: selectorEvents.length,
      sessionsAffected: sessions.size,
      sessionsAffectedPercent: sessionPercent,
      elementSelectors: [selector],
      elementTexts: getUniqueTexts(selectorEvents),
      events: selectorEvents,
      relatedProblems: [],
    });
  });

  // Also do spatial clustering for elements without consistent selectors
  const spatialClusters = clusterEventsBySpatialProximity(
    deadClicks,
    INSIGHTS_CONFIG.clusterRadiusPx
  );

  spatialClusters.forEach((cluster, index) => {
    // Skip if this cluster overlaps significantly with existing patterns
    const clusterSelectors = new Set(getUniqueSelectors(cluster));
    const alreadyCovered = patterns.some(p =>
      p.elementSelectors.some(s => clusterSelectors.has(s))
    );

    if (alreadyCovered) return;
    if (cluster.length < INSIGHTS_CONFIG.minOccurrencesForPattern) return;

    const sessions = getUniqueSessions(cluster);
    const sessionPercent = (sessions.size / totalSessions) * 100;

    if (sessionPercent < 1) return;

    const coords = cluster
      .filter(e => typeof e.x === 'number' && typeof e.y === 'number')
      .map(e => ({ x: e.x!, y: e.y! }));

    if (coords.length === 0) return;

    const centroid = calculateCentroid(coords);
    const radius = calculateClusterRadius(coords, centroid);

    patterns.push({
      id: generatePatternId('dead_click_hotspot', patternIndex + index),
      type: 'dead_click_hotspot',
      centroid,
      radius,
      occurrences: cluster.length,
      sessionsAffected: sessions.size,
      sessionsAffectedPercent: sessionPercent,
      elementSelectors: getUniqueSelectors(cluster),
      elementTexts: getUniqueTexts(cluster),
      events: cluster,
      relatedProblems: [],
    });
  });

  return patterns;
}

/**
 * Detect scroll abandonment - users not scrolling to important content
 */
export function detectScrollAbandonment(
  events: AnalyticsEvent[],
  totalSessions: number
): Pattern[] {
  const scrollEvents = events.filter(e => e.type === 'scroll_depth');

  if (scrollEvents.length === 0) return [];

  // Get max scroll depth per session
  const sessionScrollDepths: Record<string, number> = {};
  scrollEvents.forEach(e => {
    const current = sessionScrollDepths[e.sessionId] || 0;
    sessionScrollDepths[e.sessionId] = Math.max(current, e.scrollDepth || 0);
  });

  // Count sessions that didn't scroll past 50%
  const shallowScrollSessions = Object.entries(sessionScrollDepths).filter(
    ([_, depth]) => depth < 50
  );

  if (shallowScrollSessions.length < INSIGHTS_CONFIG.minOccurrencesForPattern) {
    return [];
  }

  const sessionPercent = (shallowScrollSessions.length / totalSessions) * 100;

  if (sessionPercent < INSIGHTS_CONFIG.minSessionPercentForPattern) {
    return [];
  }

  // Create a pattern at the 50% scroll point
  const avgViewport = events[0]?.viewport || { width: 1280, height: 800 };
  const scrollAbandonPoint = avgViewport.height; // Fold line

  return [{
    id: generatePatternId('scroll_abandonment', 0),
    type: 'scroll_abandonment',
    centroid: { x: avgViewport.width / 2, y: scrollAbandonPoint },
    radius: avgViewport.width / 2,
    occurrences: shallowScrollSessions.length,
    sessionsAffected: shallowScrollSessions.length,
    sessionsAffectedPercent: sessionPercent,
    elementSelectors: [],
    elementTexts: [],
    events: scrollEvents.filter(e =>
      shallowScrollSessions.some(([sessionId]) => e.sessionId === sessionId)
    ),
    relatedProblems: [],
  }];
}

/**
 * Detect element confusion - users clicking non-interactive elements
 */
export function detectElementConfusion(
  events: AnalyticsEvent[],
  totalSessions: number
): Pattern[] {
  // Look for patterns of dead clicks combined with double clicks on same element
  const deadClicks = events.filter(e => e.type === 'dead_click');
  const doubleClicks = events.filter(e => e.type === 'double_click');

  // Group by element
  const elementConfusion: Record<string, {
    deadClicks: AnalyticsEvent[];
    doubleClicks: AnalyticsEvent[];
    sessions: Set<string>;
  }> = {};

  deadClicks.forEach(e => {
    const key = e.elementSelector || 'unknown';
    if (!elementConfusion[key]) {
      elementConfusion[key] = { deadClicks: [], doubleClicks: [], sessions: new Set() };
    }
    elementConfusion[key].deadClicks.push(e);
    elementConfusion[key].sessions.add(e.sessionId);
  });

  doubleClicks.forEach(e => {
    const key = e.elementSelector || 'unknown';
    if (!elementConfusion[key]) {
      elementConfusion[key] = { deadClicks: [], doubleClicks: [], sessions: new Set() };
    }
    elementConfusion[key].doubleClicks.push(e);
    elementConfusion[key].sessions.add(e.sessionId);
  });

  const patterns: Pattern[] = [];

  Object.entries(elementConfusion).forEach(([selector, data], index) => {
    // Need both dead clicks and double clicks to indicate confusion
    if (data.deadClicks.length < 2 || data.doubleClicks.length < 1) return;

    const totalEvents = [...data.deadClicks, ...data.doubleClicks];
    const sessionPercent = (data.sessions.size / totalSessions) * 100;

    if (sessionPercent < 1) return;

    const coords = totalEvents
      .filter(e => typeof e.x === 'number' && typeof e.y === 'number')
      .map(e => ({ x: e.x!, y: e.y! }));

    if (coords.length === 0) return;

    const centroid = calculateCentroid(coords);
    const radius = calculateClusterRadius(coords, centroid);

    patterns.push({
      id: generatePatternId('element_confusion', index),
      type: 'element_confusion',
      centroid,
      radius,
      occurrences: totalEvents.length,
      sessionsAffected: data.sessions.size,
      sessionsAffectedPercent: sessionPercent,
      elementSelectors: [selector],
      elementTexts: getUniqueTexts(totalEvents),
      events: totalEvents,
      relatedProblems: [],
    });
  });

  return patterns;
}

/**
 * Detect price anxiety - excessive price checking behavior
 */
export function detectPriceAnxiety(
  events: AnalyticsEvent[],
  totalSessions: number
): Pattern[] {
  const priceChecks = events.filter(e => e.type === 'price_check');

  if (priceChecks.length === 0) return [];

  // Count price checks per session
  const sessionPriceChecks: Record<string, AnalyticsEvent[]> = {};
  priceChecks.forEach(e => {
    if (!sessionPriceChecks[e.sessionId]) {
      sessionPriceChecks[e.sessionId] = [];
    }
    sessionPriceChecks[e.sessionId].push(e);
  });

  // Sessions with excessive price checking (5+ checks)
  const anxiousSessions = Object.entries(sessionPriceChecks).filter(
    ([_, checks]) => checks.length >= 5
  );

  if (anxiousSessions.length < 1) return [];

  const sessionPercent = (anxiousSessions.length / totalSessions) * 100;

  if (sessionPercent < 1) return [];

  const allAnxiousEvents = anxiousSessions.flatMap(([_, events]) => events);
  const coords = allAnxiousEvents
    .filter(e => typeof e.x === 'number' && typeof e.y === 'number')
    .map(e => ({ x: e.x!, y: e.y! }));

  const centroid = coords.length > 0 ? calculateCentroid(coords) : { x: 0, y: 0 };
  const radius = coords.length > 0 ? calculateClusterRadius(coords, centroid) : 0;

  return [{
    id: generatePatternId('price_anxiety', 0),
    type: 'price_anxiety',
    centroid,
    radius,
    occurrences: allAnxiousEvents.length,
    sessionsAffected: anxiousSessions.length,
    sessionsAffectedPercent: sessionPercent,
    elementSelectors: getUniqueSelectors(allAnxiousEvents),
    elementTexts: getUniqueTexts(allAnxiousEvents),
    events: allAnxiousEvents,
    relatedProblems: [],
  }];
}

/**
 * Main function to detect all patterns
 */
export function detectAllPatterns(
  events: AnalyticsEvent[],
  problems: Problem[]
): Pattern[] {
  const sessions = new Set(events.map(e => e.sessionId));
  const totalSessions = sessions.size;

  if (totalSessions === 0) return [];

  const allPatterns: Pattern[] = [
    ...detectRageClusters(events, totalSessions),
    ...detectDeadClickHotspots(events, totalSessions),
    ...detectScrollAbandonment(events, totalSessions),
    ...detectElementConfusion(events, totalSessions),
    ...detectPriceAnxiety(events, totalSessions),
  ];

  // Link problems to patterns
  allPatterns.forEach(pattern => {
    pattern.relatedProblems = problems.filter(problem => {
      // Match by element selector or by category
      const selectorMatch = pattern.elementSelectors.some(selector =>
        problem.evidence.some(e => e.value === selector)
      );

      const categoryMatch =
        (pattern.type === 'rage_cluster' && problem.category === 'ux_friction') ||
        (pattern.type === 'dead_click_hotspot' && problem.category === 'ux_friction') ||
        (pattern.type === 'scroll_abandonment' && problem.category === 'engagement_dropoff') ||
        (pattern.type === 'price_anxiety' && problem.category === 'conversion_blocker');

      return selectorMatch || categoryMatch;
    });
  });

  // Sort by impact (occurrences × session coverage)
  allPatterns.sort((a, b) => {
    const scoreA = a.occurrences * a.sessionsAffectedPercent;
    const scoreB = b.occurrences * b.sessionsAffectedPercent;
    return scoreB - scoreA;
  });

  return allPatterns;
}

/**
 * Get pattern type description for display
 */
export function getPatternTypeDescription(type: PatternType): string {
  const descriptions: Record<PatternType, string> = {
    rage_cluster: 'Users rapidly clicking in frustration',
    dead_click_hotspot: 'Users clicking expecting interaction',
    cta_invisibility: 'CTA not being seen or clicked',
    checkout_friction: 'Friction in checkout process',
    scroll_abandonment: 'Users not scrolling to content',
    element_confusion: 'Users confused about interactivity',
    price_anxiety: 'Users showing price-checking behavior',
  };

  return descriptions[type];
}
