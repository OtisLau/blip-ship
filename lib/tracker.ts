/**
 * Event tracking utilities
 * Uses navigator.sendBeacon() for reliable delivery as specified in blip-ship architecture
 */

import type { AnalyticsEvent, EventType, Viewport } from '../types/events';

/**
 * Generate a unique event ID with evt_ prefix
 */
export function generateEventId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 9);
  return `evt_${timestamp}_${random}`;
}

/**
 * Generate a unique session ID with sess_ prefix
 */
export function generateSessionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 9);
  return `sess_${timestamp}_${random}`;
}

/**
 * Get current viewport dimensions
 */
export function getViewport(): Viewport {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/**
 * Extract a CSS selector from a DOM element
 */
export function getSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${element.id}`;
  }
  if (element.className && typeof element.className === 'string') {
    const firstClass = element.className.split(' ').filter(Boolean)[0];
    if (firstClass) {
      return `${element.tagName.toLowerCase()}.${firstClass}`;
    }
  }
  return element.tagName.toLowerCase();
}

/**
 * Check if an element is above the fold (visible without scrolling)
 */
export function isAboveFold(element: HTMLElement): boolean {
  if (typeof window === 'undefined') return false;
  const rect = element.getBoundingClientRect();
  return rect.top < window.innerHeight;
}

/**
 * Event buffer for batching (optional optimization)
 */
let eventBuffer: Partial<AnalyticsEvent>[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Send a single event to the API
 * Uses navigator.sendBeacon for reliable delivery
 */
export function sendEvent(
  event: Partial<AnalyticsEvent>,
  immediate: boolean = false
): void {
  const fullEvent: AnalyticsEvent = {
    id: generateEventId(),
    timestamp: Date.now(),
    pageUrl: typeof window !== 'undefined' ? window.location.pathname : '',
    viewport: getViewport(),
    sessionId: '', // Should be set by caller
    type: 'click', // Should be set by caller
    ...event,
  } as AnalyticsEvent;

  if (immediate) {
    flushEvents([fullEvent]);
  } else {
    eventBuffer.push(fullEvent);
    scheduleFlush();
  }
}

/**
 * Schedule a flush of the event buffer
 * Batches events every 2 seconds for efficiency
 */
function scheduleFlush(): void {
  if (flushTimeout) return;

  flushTimeout = setTimeout(() => {
    if (eventBuffer.length > 0) {
      flushEvents([...eventBuffer]);
      eventBuffer = [];
    }
    flushTimeout = null;
  }, 2000);
}

/**
 * Immediately flush all buffered events
 */
export function flushEventBuffer(): void {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
  if (eventBuffer.length > 0) {
    flushEvents([...eventBuffer]);
    eventBuffer = [];
  }
}

/**
 * Send events to the API using sendBeacon
 */
function flushEvents(events: Partial<AnalyticsEvent>[]): void {
  if (typeof navigator === 'undefined' || !navigator.sendBeacon) {
    // Fallback to fetch for environments without sendBeacon
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      keepalive: true,
    }).catch(console.error);
    return;
  }

  const blob = new Blob([JSON.stringify({ events })], {
    type: 'application/json',
  });
  navigator.sendBeacon('/api/events', blob);
}

/**
 * Send event batch (for manual batching)
 */
export function sendEventBatch(events: Partial<AnalyticsEvent>[]): void {
  const fullEvents = events.map(event => ({
    id: generateEventId(),
    timestamp: Date.now(),
    pageUrl: typeof window !== 'undefined' ? window.location.pathname : '',
    viewport: getViewport(),
    sessionId: '',
    type: 'click' as EventType,
    ...event,
  }));

  flushEvents(fullEvents);
}

/**
 * Flush events on page unload
 */
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushEventBuffer();
    }
  });

  window.addEventListener('beforeunload', () => {
    flushEventBuffer();
  });
}
