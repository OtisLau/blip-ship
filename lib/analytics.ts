/**
 * Analytics aggregation utilities
 * Aggregates raw events into meaningful metrics
 */

import type { AnalyticsEvent, AggregatedAnalytics, EventType } from '../types/events';

/**
 * Aggregate events into summary metrics
 */
export function aggregateEvents(events: AnalyticsEvent[]): AggregatedAnalytics {
  // Group events by session
  const sessions = new Map<string, AnalyticsEvent[]>();
  events.forEach((e) => {
    const sessionEvents = sessions.get(e.sessionId) || [];
    sessionEvents.push(e);
    sessions.set(e.sessionId, sessionEvents);
  });

  // Calculate session durations
  const sessionDurations: number[] = [];
  sessions.forEach((sessionEvents) => {
    const timestamps = sessionEvents.map((e) => e.timestamp).sort((a, b) => a - b);
    if (timestamps.length >= 2) {
      sessionDurations.push(timestamps[timestamps.length - 1] - timestamps[0]);
    }
  });
  const avgSessionDuration =
    sessionDurations.length > 0
      ? sessionDurations.reduce((sum, d) => sum + d, 0) / sessionDurations.length / 1000 // Convert to seconds
      : 0;

  // Calculate bounce rate (sessions with only page_view and possibly session events)
  let bouncedSessions = 0;
  sessions.forEach((sessionEvents) => {
    const interactionTypes = new Set(sessionEvents.map((e) => e.type));
    const hasInteraction = ['click', 'cta_click', 'scroll_depth', 'add_to_cart'].some((t) =>
      interactionTypes.has(t as EventType)
    );
    if (!hasInteraction) {
      bouncedSessions++;
    }
  });
  const bounceRate = sessions.size > 0 ? (bouncedSessions / sessions.size) * 100 : 0;

  // CTA metrics (adapted from 0-1's spawn/select/expire lifecycle)
  const ctaVisible = events.filter((e) => e.type === 'cta_visible').length;
  const ctaClicked = events.filter((e) => e.type === 'cta_click').length;
  const ctaExpired = events.filter((e) => e.type === 'cta_expired').length;
  const ctaClickRate = ctaVisible > 0 ? (ctaClicked / ctaVisible) * 100 : 0;
  const ctaExpireRate = ctaVisible > 0 ? (ctaExpired / ctaVisible) * 100 : 0;

  // Average CTA visible time before click
  const ctaClickEvents = events.filter((e) => e.type === 'cta_click' && e.ctaVisibleDuration);
  const avgCTAVisibleTime =
    ctaClickEvents.length > 0
      ? ctaClickEvents.reduce((sum, e) => sum + (e.ctaVisibleDuration || 0), 0) /
        ctaClickEvents.length /
        1000 // Convert to seconds
      : 0;

  // Heatmap data
  const clickEvents = events.filter((e) => e.type === 'click' && e.x !== undefined && e.y !== undefined);
  const rageClickEvents = events.filter((e) => e.type === 'rage_click' && e.x !== undefined && e.y !== undefined);
  const deadClickEvents = events.filter((e) => e.type === 'dead_click' && e.x !== undefined && e.y !== undefined);

  // Aggregate click positions (bucket into 50px grid for heatmap)
  const bucketClicks = (evts: AnalyticsEvent[]) => {
    const buckets = new Map<string, { x: number; y: number; count: number }>();
    evts.forEach((e) => {
      const bx = Math.floor((e.x || 0) / 50) * 50;
      const by = Math.floor((e.y || 0) / 50) * 50;
      const key = `${bx},${by}`;
      const existing = buckets.get(key);
      if (existing) {
        existing.count++;
      } else {
        buckets.set(key, { x: bx, y: by, count: 1 });
      }
    });
    return Array.from(buckets.values());
  };

  // Scroll data
  const scrollEvents = events.filter((e) => e.type === 'scroll_depth');
  const reached25 = scrollEvents.filter((e) => (e.scrollDepth || 0) >= 25).length;
  const reached50 = scrollEvents.filter((e) => (e.scrollDepth || 0) >= 50).length;
  const reached75 = scrollEvents.filter((e) => (e.scrollDepth || 0) >= 75).length;
  const reached100 = scrollEvents.filter((e) => (e.scrollDepth || 0) >= 100).length;

  // Convert to percentages based on total sessions
  const totalSessions = sessions.size || 1;

  return {
    summary: {
      totalSessions: sessions.size,
      totalEvents: events.length,
      bounceRate: Math.round(bounceRate * 10) / 10,
      avgSessionDuration: Math.round(avgSessionDuration * 10) / 10,
      ctaClickRate: Math.round(ctaClickRate * 10) / 10,
      avgCTAVisibleTime: Math.round(avgCTAVisibleTime * 10) / 10,
      ctaExpireRate: Math.round(ctaExpireRate * 10) / 10,
    },
    heatmapData: {
      clicks: bucketClicks(clickEvents),
      rageClicks: bucketClicks(rageClickEvents),
      deadClicks: bucketClicks(deadClickEvents),
    },
    scrollData: {
      reached25: Math.round((reached25 / totalSessions) * 100),
      reached50: Math.round((reached50 / totalSessions) * 100),
      reached75: Math.round((reached75 / totalSessions) * 100),
      reached100: Math.round((reached100 / totalSessions) * 100),
    },
    ctaFunnel: {
      visible: ctaVisible,
      clicked: ctaClicked,
      expired: ctaExpired,
      conversionRate: Math.round(ctaClickRate * 10) / 10,
    },
  };
}

/**
 * Get events grouped by type
 */
export function getEventsByType(
  events: AnalyticsEvent[]
): Map<string, AnalyticsEvent[]> {
  const grouped = new Map<string, AnalyticsEvent[]>();
  events.forEach((e) => {
    const typeEvents = grouped.get(e.type) || [];
    typeEvents.push(e);
    grouped.set(e.type, typeEvents);
  });
  return grouped;
}

/**
 * Get CTA performance metrics
 */
export function getCTAMetrics(
  events: AnalyticsEvent[],
  ctaId?: string
): {
  totalVisible: number;
  totalClicked: number;
  totalExpired: number;
  avgVisibleTime: number;
  conversionRate: number;
} {
  let filteredEvents = events;
  if (ctaId) {
    filteredEvents = events.filter((e) => e.ctaId === ctaId);
  }

  const visible = filteredEvents.filter((e) => e.type === 'cta_visible').length;
  const clicked = filteredEvents.filter((e) => e.type === 'cta_click').length;
  const expired = filteredEvents.filter((e) => e.type === 'cta_expired').length;

  const clickedWithDuration = filteredEvents.filter(
    (e) => e.type === 'cta_click' && e.ctaVisibleDuration
  );
  const avgVisibleTime =
    clickedWithDuration.length > 0
      ? clickedWithDuration.reduce((sum, e) => sum + (e.ctaVisibleDuration || 0), 0) /
        clickedWithDuration.length /
        1000
      : 0;

  return {
    totalVisible: visible,
    totalClicked: clicked,
    totalExpired: expired,
    avgVisibleTime: Math.round(avgVisibleTime * 10) / 10,
    conversionRate: visible > 0 ? Math.round((clicked / visible) * 1000) / 10 : 0,
  };
}
