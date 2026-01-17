import { AnalyticsEvent } from '../types';
import {
  PageZone,
  SpatialLocation,
  ViewportAnalysis,
  Coordinates,
  INSIGHTS_CONFIG,
} from './types';

/**
 * Analyzes viewport data from events to determine fold line and zone breakpoints
 */
export function analyzeViewport(events: AnalyticsEvent[]): ViewportAnalysis {
  const viewports = events
    .filter(e => e.viewport?.width && e.viewport?.height)
    .map(e => e.viewport);

  if (viewports.length === 0) {
    // Default values if no viewport data
    return {
      averageWidth: 1280,
      averageHeight: 800,
      foldLine: 800,
      pageHeight: 2400,
      zoneBreakpoints: {
        aboveFold: 800,
        midPage: 1600,
        belowFold: 2400,
        footer: 3200,
      },
    };
  }

  const avgWidth = viewports.reduce((sum, v) => sum + v.width, 0) / viewports.length;
  const avgHeight = viewports.reduce((sum, v) => sum + v.height, 0) / viewports.length;

  // Fold line is the average viewport height
  const foldLine = avgHeight;

  // Estimate page height from scroll depth events
  const scrollEvents = events.filter(e => e.type === 'scroll_depth' && e.scrollDepth);
  let pageHeight = foldLine * 3; // Default assumption

  if (scrollEvents.length > 0) {
    // If users reach 100% scroll, we can estimate based on where they scrolled from
    const maxScrollDepth = Math.max(...scrollEvents.map(e => e.scrollDepth || 0));
    if (maxScrollDepth >= 100) {
      // Page is likely at least 2-3 viewports tall based on common patterns
      pageHeight = foldLine * 3;
    }
  }

  return {
    averageWidth: Math.round(avgWidth),
    averageHeight: Math.round(avgHeight),
    foldLine: Math.round(foldLine),
    pageHeight: Math.round(pageHeight),
    zoneBreakpoints: {
      aboveFold: Math.round(foldLine),
      midPage: Math.round(foldLine * 2),
      belowFold: Math.round(foldLine * 3),
      footer: Math.round(foldLine * 4),
    },
  };
}

/**
 * Determines which zone a Y coordinate falls into
 */
export function getZoneForY(y: number, viewport: ViewportAnalysis): PageZone {
  if (y <= viewport.zoneBreakpoints.aboveFold) {
    return 'above_fold';
  }
  if (y <= viewport.zoneBreakpoints.midPage) {
    return 'mid_page';
  }
  if (y <= viewport.zoneBreakpoints.belowFold) {
    return 'below_fold';
  }
  return 'footer';
}

/**
 * Gets human-readable zone description
 */
function getZoneDescription(zone: PageZone): string {
  switch (zone) {
    case 'above_fold':
      return 'visible without scrolling';
    case 'mid_page':
      return 'in the middle of the page (requires scrolling)';
    case 'below_fold':
      return 'below the fold (requires significant scrolling)';
    case 'footer':
      return 'in the footer area';
  }
}

/**
 * Gets horizontal position description
 */
function getHorizontalDescription(percentX: number): string {
  if (percentX <= 25) return 'left side';
  if (percentX <= 40) return 'left-center area';
  if (percentX <= 60) return 'center';
  if (percentX <= 75) return 'right-center area';
  return 'right side';
}

/**
 * Gets vertical position description
 */
function getVerticalDescription(zone: PageZone, y: number): string {
  switch (zone) {
    case 'above_fold':
      if (y <= 100) return 'at the top';
      if (y <= 300) return 'in the upper area';
      return 'in the lower hero section';
    case 'mid_page':
      return 'in the main content area';
    case 'below_fold':
      return 'in the lower content area';
    case 'footer':
      return 'in the footer';
  }
}

/**
 * Analyzes a coordinate and returns full spatial location info
 */
export function analyzeSpatialLocation(
  coords: Coordinates,
  viewport: ViewportAnalysis
): SpatialLocation {
  const { x, y } = coords;

  const zone = getZoneForY(y, viewport);
  const viewportPercentageX = Math.round((x / viewport.averageWidth) * 100);
  const viewportPercentageY = Math.round((y / viewport.foldLine) * 100);

  const horizontalPos = getHorizontalDescription(viewportPercentageX);
  const verticalPos = getVerticalDescription(zone, y);
  const zoneDesc = getZoneDescription(zone);

  const description = `${verticalPos}, ${horizontalPos}, ${zoneDesc} (Y=${y}px)`;

  return {
    zone,
    coordinates: coords,
    description,
    viewportPercentageX,
    viewportPercentageY,
    foldLine: viewport.foldLine,
    isAboveFold: zone === 'above_fold',
  };
}

/**
 * Analyzes spatial location for an event
 */
export function analyzeEventLocation(
  event: AnalyticsEvent,
  viewport: ViewportAnalysis
): SpatialLocation | null {
  if (typeof event.x !== 'number' || typeof event.y !== 'number') {
    return null;
  }

  return analyzeSpatialLocation({ x: event.x, y: event.y }, viewport);
}

/**
 * Gets a recommended target location for moving an element above the fold
 */
export function getAboveFoldTargetLocation(
  currentLocation: SpatialLocation,
  viewport: ViewportAnalysis
): { zone: PageZone; description: string; suggestedY: number } {
  // Target is upper-middle of the viewport
  const suggestedY = Math.round(viewport.foldLine * 0.5);

  return {
    zone: 'above_fold',
    description: `Move to Y=${suggestedY}px (visible without scrolling, in the upper content area)`,
    suggestedY,
  };
}

/**
 * Calculates the center point (centroid) of multiple coordinates
 */
export function calculateCentroid(coords: Coordinates[]): Coordinates {
  if (coords.length === 0) {
    return { x: 0, y: 0 };
  }

  const sumX = coords.reduce((sum, c) => sum + c.x, 0);
  const sumY = coords.reduce((sum, c) => sum + c.y, 0);

  return {
    x: Math.round(sumX / coords.length),
    y: Math.round(sumY / coords.length),
  };
}

/**
 * Calculates the radius that encompasses a set of points from their centroid
 */
export function calculateClusterRadius(
  coords: Coordinates[],
  centroid: Coordinates
): number {
  if (coords.length === 0) return 0;

  const distances = coords.map(c => {
    const dx = c.x - centroid.x;
    const dy = c.y - centroid.y;
    return Math.sqrt(dx * dx + dy * dy);
  });

  return Math.round(Math.max(...distances));
}

/**
 * Checks if two coordinates are within a certain distance of each other
 */
export function arePointsNearby(
  a: Coordinates,
  b: Coordinates,
  radiusPx: number = INSIGHTS_CONFIG.clusterRadiusPx
): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance <= radiusPx;
}

/**
 * Groups events by their spatial proximity
 */
export function clusterEventsBySpatialProximity(
  events: AnalyticsEvent[],
  radiusPx: number = INSIGHTS_CONFIG.clusterRadiusPx
): AnalyticsEvent[][] {
  const eventsWithCoords = events.filter(
    e => typeof e.x === 'number' && typeof e.y === 'number'
  );

  if (eventsWithCoords.length === 0) return [];

  const clusters: AnalyticsEvent[][] = [];
  const assigned = new Set<string>();

  for (const event of eventsWithCoords) {
    if (assigned.has(event.id)) continue;

    // Start a new cluster with this event
    const cluster: AnalyticsEvent[] = [event];
    assigned.add(event.id);

    // Find all nearby events
    for (const other of eventsWithCoords) {
      if (assigned.has(other.id)) continue;

      const isNearby = arePointsNearby(
        { x: event.x!, y: event.y! },
        { x: other.x!, y: other.y! },
        radiusPx
      );

      if (isNearby) {
        cluster.push(other);
        assigned.add(other.id);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

/**
 * Formats a location for display
 */
export function formatLocationForDisplay(location: SpatialLocation): string {
  const parts = [
    `Position: (${location.coordinates.x}, ${location.coordinates.y})`,
    `Zone: ${location.zone.replace('_', ' ')}`,
    location.isAboveFold ? 'Above fold' : 'Below fold',
  ];
  return parts.join(' | ');
}
