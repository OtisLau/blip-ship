import {
  AnalyticsEvent,
  AggregatedAnalytics,
  HeatmapPoint,
  ScrollData,
  AnalyticsSummary,
} from './types';

// Cluster points that are within this radius (pixels)
const CLUSTER_RADIUS = 30;

// Group points into clusters for heatmap visualization
function clusterPoints(
  events: Array<{ x: number; y: number }>
): HeatmapPoint[] {
  if (events.length === 0) return [];

  const clusters: HeatmapPoint[] = [];

  events.forEach(event => {
    // Find existing cluster within radius
    const existingCluster = clusters.find(
      c =>
        Math.abs(c.x - event.x) < CLUSTER_RADIUS &&
        Math.abs(c.y - event.y) < CLUSTER_RADIUS
    );

    if (existingCluster) {
      // Update cluster centroid and count
      existingCluster.x = Math.round(
        (existingCluster.x * existingCluster.count + event.x) /
          (existingCluster.count + 1)
      );
      existingCluster.y = Math.round(
        (existingCluster.y * existingCluster.count + event.y) /
          (existingCluster.count + 1)
      );
      existingCluster.count++;
    } else {
      // Create new cluster
      clusters.push({
        x: event.x,
        y: event.y,
        count: 1,
      });
    }
  });

  // Sort by count descending
  return clusters.sort((a, b) => b.count - a.count);
}

// Get unique sessions from events
function getUniqueSessions(events: AnalyticsEvent[]): string[] {
  return [...new Set(events.map(e => e.sessionId))];
}

// Calculate time between first and last event for a session
function getSessionDuration(events: AnalyticsEvent[], sessionId: string): number {
  const sessionEvents = events
    .filter(e => e.sessionId === sessionId)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (sessionEvents.length < 2) return 0;

  return (
    sessionEvents[sessionEvents.length - 1].timestamp -
    sessionEvents[0].timestamp
  ) / 1000; // Convert to seconds
}

// Aggregate raw events into analytics data
export function aggregateEvents(events: AnalyticsEvent[]): AggregatedAnalytics {
  const sessions = getUniqueSessions(events);
  const totalSessions = sessions.length;

  // Count bounces (sessions with bounce event or only page_view)
  const bounces = sessions.filter(sessionId => {
    const sessionEvents = events.filter(e => e.sessionId === sessionId);
    const hasBounce = sessionEvents.some(e => e.type === 'bounce');
    const onlyPageView =
      sessionEvents.length === 1 && sessionEvents[0].type === 'page_view';
    return hasBounce || onlyPageView;
  }).length;

  const bounceRate = totalSessions > 0 ? (bounces / totalSessions) * 100 : 0;

  // Calculate average time on page
  const sessionDurations = sessions.map(s => getSessionDuration(events, s));
  const avgTimeOnPage =
    sessionDurations.length > 0
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
      : 0;

  // Calculate CTA click rate
  const sessionsWithCTAClick = sessions.filter(sessionId =>
    events.some(
      e =>
        e.sessionId === sessionId &&
        (e.type === 'cta_click' || e.type === 'add_to_cart')
    )
  ).length;
  const ctaClickRate =
    totalSessions > 0 ? (sessionsWithCTAClick / totalSessions) * 100 : 0;

  // Summary stats
  const summary: AnalyticsSummary = {
    totalSessions,
    totalEvents: events.length,
    bounceRate: Math.round(bounceRate * 10) / 10,
    avgTimeOnPage: Math.round(avgTimeOnPage * 10) / 10,
    ctaClickRate: Math.round(ctaClickRate * 10) / 10,
  };

  // Heatmap data - cluster clicks by type
  const clickEvents = events
    .filter(e => e.type === 'click' && e.x !== undefined && e.y !== undefined)
    .map(e => ({ x: e.x!, y: e.y! }));

  const rageClickEvents = events
    .filter(e => e.type === 'rage_click' && e.x !== undefined && e.y !== undefined)
    .map(e => ({ x: e.x!, y: e.y! }));

  const deadClickEvents = events
    .filter(e => e.type === 'dead_click' && e.x !== undefined && e.y !== undefined)
    .map(e => ({ x: e.x!, y: e.y! }));

  const heatmapData = {
    clicks: clusterPoints(clickEvents).slice(0, 50), // Top 50 clusters
    rageClicks: clusterPoints(rageClickEvents).slice(0, 20),
    deadClicks: clusterPoints(deadClickEvents).slice(0, 20),
  };

  // Scroll depth data - what % of sessions reached each milestone
  const scrollData: ScrollData = {
    reached25: 0,
    reached50: 0,
    reached75: 0,
    reached100: 0,
  };

  if (totalSessions > 0) {
    const scrollEvents = events.filter(e => e.type === 'scroll_depth');

    sessions.forEach(sessionId => {
      const sessionScrolls = scrollEvents.filter(e => e.sessionId === sessionId);
      const maxScroll = Math.max(
        0,
        ...sessionScrolls.map(e => e.scrollDepth || 0)
      );

      if (maxScroll >= 25) scrollData.reached25++;
      if (maxScroll >= 50) scrollData.reached50++;
      if (maxScroll >= 75) scrollData.reached75++;
      if (maxScroll >= 100) scrollData.reached100++;
    });

    // Convert to percentages
    scrollData.reached25 = Math.round((scrollData.reached25 / totalSessions) * 100);
    scrollData.reached50 = Math.round((scrollData.reached50 / totalSessions) * 100);
    scrollData.reached75 = Math.round((scrollData.reached75 / totalSessions) * 100);
    scrollData.reached100 = Math.round((scrollData.reached100 / totalSessions) * 100);
  }

  return {
    summary,
    heatmapData,
    scrollData,
  };
}

// Get top clicked elements (for AI analysis)
export function getTopClickedElements(
  events: AnalyticsEvent[],
  limit: number = 10
): Array<{ selector: string; text: string; count: number }> {
  const clickCounts = new Map<string, { text: string; count: number }>();

  events
    .filter(e => e.type === 'click' && e.elementSelector)
    .forEach(e => {
      const key = e.elementSelector!;
      const existing = clickCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        clickCounts.set(key, {
          text: e.elementText || '',
          count: 1,
        });
      }
    });

  return Array.from(clickCounts.entries())
    .map(([selector, data]) => ({
      selector,
      text: data.text,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// Get frustration signals (dead clicks + rage clicks) grouped by element
export function getFrustrationSignals(
  events: AnalyticsEvent[]
): Array<{ selector: string; text: string; deadClicks: number; rageClicks: number }> {
  const signals = new Map<
    string,
    { text: string; deadClicks: number; rageClicks: number }
  >();

  events
    .filter(
      e =>
        (e.type === 'dead_click' || e.type === 'rage_click') &&
        e.elementSelector
    )
    .forEach(e => {
      const key = e.elementSelector!;
      const existing = signals.get(key);
      if (existing) {
        if (e.type === 'dead_click') existing.deadClicks++;
        if (e.type === 'rage_click') existing.rageClicks++;
      } else {
        signals.set(key, {
          text: e.elementText || '',
          deadClicks: e.type === 'dead_click' ? 1 : 0,
          rageClicks: e.type === 'rage_click' ? 1 : 0,
        });
      }
    });

  return Array.from(signals.entries())
    .map(([selector, data]) => ({
      selector,
      ...data,
    }))
    .sort((a, b) => b.deadClicks + b.rageClicks - (a.deadClicks + a.rageClicks))
    .slice(0, 15);
}

// Format analytics data for AI prompt
export function formatAnalyticsForAI(events: AnalyticsEvent[]): string {
  const analytics = aggregateEvents(events);
  const topClicked = getTopClickedElements(events);
  const frustrations = getFrustrationSignals(events);

  return `
## Analytics Data
- Total sessions: ${analytics.summary.totalSessions}
- Bounce rate: ${analytics.summary.bounceRate}%
- CTA click rate: ${analytics.summary.ctaClickRate}%
- Avg time on page: ${analytics.summary.avgTimeOnPage}s

## Scroll Depth (% of users reaching each milestone)
- 25%: ${analytics.scrollData.reached25}%
- 50%: ${analytics.scrollData.reached50}%
- 75%: ${analytics.scrollData.reached75}%
- 100%: ${analytics.scrollData.reached100}%

## Top Clicked Elements
${topClicked.map(c => `- ${c.selector}: "${c.text}" (${c.count} clicks)`).join('\n')}

## Frustration Signals (Dead Clicks + Rage Clicks)
${frustrations.length > 0 ? frustrations.map(f => `- ${f.selector}: "${f.text}" (${f.deadClicks} dead clicks, ${f.rageClicks} rage clicks)`).join('\n') : 'None detected'}

## Click Heatmap Hotspots
${analytics.heatmapData.clicks.slice(0, 5).map(c => `- Position (${c.x}, ${c.y}): ${c.count} clicks`).join('\n')}
`.trim();
}
