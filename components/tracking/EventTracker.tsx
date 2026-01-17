'use client';

/**
 * EventTracker - Main tracking wrapper component
 *
 * Combines patterns from:
 * - blip-ship CRO-AGENT-MASTER-DOC.md: click, scroll, rage click, dead click detection
 * - 0-1 store.ts: session lifecycle management
 * - 0-1 useToolSpawner.ts: session timing and expiry logic
 *
 * Wraps the entire store/page to track all user interactions.
 */

import { useEffect, useRef, useCallback, type ReactNode } from 'react';
import {
  sessionActions,
  restoreSession,
  checkSessionTimeout,
  checkInactivity,
  CTA_VISIBILITY_TIMEOUT,
  SESSION_DURATION,
  INACTIVITY_TIMEOUT,
  getState,
} from '../../lib/session-store';
import { sendEvent, flushEventBuffer, getSelector, isAboveFold } from '../../lib/tracker';

interface EventTrackerProps {
  children: ReactNode;
}

export function EventTracker({ children }: EventTrackerProps) {
  // Refs for tracking (adapted from 0-1's FloatingTool pattern)
  const clickBuffer = useRef<Array<{ time: number; x: number; y: number }>>([]);
  const scrollMilestones = useRef(new Set<number>());
  const ctaObserver = useRef<IntersectionObserver | null>(null);
  const ctaTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  /**
   * Initialize session on mount (adapted from 0-1's App.tsx useEffect)
   */
  useEffect(() => {
    // Try to restore existing session
    let sessionId = restoreSession();

    // If no valid session, start a new one
    if (!sessionId) {
      sessionId = sessionActions.startSession();
    }

    sessionIdRef.current = sessionId;

    // Send session_start event
    sendEvent({
      type: 'session_start',
      sessionId,
    }, true);

    // Send page_view event
    sendEvent({
      type: 'page_view',
      sessionId,
    });

    // Set up session timeout (adapted from useToolSpawner's SESSION_DURATION)
    sessionTimerRef.current = setTimeout(() => {
      if (sessionActions.isSessionActive()) {
        sessionActions.endSession('timeout');
        sendEvent({
          type: 'session_end',
          sessionId: sessionIdRef.current!,
          endReason: 'timeout',
        }, true);
      }
    }, SESSION_DURATION);

    // Set up inactivity check interval
    inactivityTimerRef.current = setInterval(() => {
      if (checkInactivity()) {
        sendEvent({
          type: 'session_end',
          sessionId: sessionIdRef.current!,
          endReason: 'inactivity',
        }, true);
      }
    }, 60000); // Check every minute

    // Cleanup on unmount
    return () => {
      if (sessionTimerRef.current) {
        clearTimeout(sessionTimerRef.current);
      }
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
      }

      // Flush any pending events
      flushEventBuffer();

      // End session on navigation
      if (sessionActions.isSessionActive()) {
        sessionActions.endSession('navigation');
        sendEvent({
          type: 'session_end',
          sessionId: sessionIdRef.current!,
          endReason: 'navigation',
        }, true);
      }
    };
  }, []);

  /**
   * CTA visibility tracking via IntersectionObserver
   * This replaces 0-1's periodic spawnTool() with viewport-based detection
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    ctaObserver.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const ctaId = entry.target.getAttribute('data-cta-id');
          if (!ctaId || !sessionIdRef.current) return;

          if (entry.isIntersecting) {
            // CTA became visible - equivalent to spawnTool()
            const rect = entry.boundingClientRect;
            sessionActions.markCTAVisible(ctaId, getSelector(entry.target as HTMLElement), {
              x: rect.x,
              y: rect.y,
            });

            sendEvent({
              type: 'cta_visible',
              ctaId,
              ctaPosition: isAboveFold(entry.target as HTMLElement) ? 'above-fold' : 'below-fold',
              sessionId: sessionIdRef.current,
              elementSelector: getSelector(entry.target as HTMLElement),
            });

            // Start expiry timer (adapted from 0-1's TOOL_EXPIRE_TIME pattern)
            const timer = setTimeout(() => {
              const ctaState = sessionActions.getCTAState(ctaId);
              if (ctaState?.status === 'visible') {
                sessionActions.markCTAExpired(ctaId);
                sendEvent({
                  type: 'cta_expired',
                  ctaId,
                  ctaVisibleDuration: CTA_VISIBILITY_TIMEOUT,
                  sessionId: sessionIdRef.current!,
                });
              }
            }, CTA_VISIBILITY_TIMEOUT);

            ctaTimers.current.set(ctaId, timer);
          } else {
            // CTA left viewport - clear timer if exists
            const timer = ctaTimers.current.get(ctaId);
            if (timer) {
              clearTimeout(timer);
              ctaTimers.current.delete(ctaId);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    // Observe all CTAs with data-cta-id attribute
    const observeCTAs = () => {
      document.querySelectorAll('[data-cta-id]').forEach((el) => {
        ctaObserver.current?.observe(el);
      });
    };

    // Initial observation
    observeCTAs();

    // Re-observe when DOM changes (for dynamically added CTAs)
    const mutationObserver = new MutationObserver(() => {
      observeCTAs();
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      ctaObserver.current?.disconnect();
      mutationObserver.disconnect();
      // Clear all CTA timers
      ctaTimers.current.forEach((timer) => clearTimeout(timer));
      ctaTimers.current.clear();
    };
  }, []);

  /**
   * Click handling (combining blip-ship doc patterns with 0-1's selectTool)
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!sessionIdRef.current) return;

      sessionActions.updateActivity();

      // Check if it's a CTA click - equivalent to selectTool()
      const ctaElement = target.closest('[data-cta-id]') as HTMLElement | null;
      if (ctaElement) {
        const ctaId = ctaElement.getAttribute('data-cta-id')!;
        const ctaState = sessionActions.getCTAState(ctaId);

        sessionActions.markCTAClicked(ctaId);

        // Clear expiry timer
        const timer = ctaTimers.current.get(ctaId);
        if (timer) {
          clearTimeout(timer);
          ctaTimers.current.delete(ctaId);
        }

        sendEvent({
          type: 'cta_click',
          ctaId,
          ctaVisibleDuration: ctaState ? Date.now() - ctaState.visibleAt : 0,
          ctaPosition: ctaState?.viewportPosition,
          x: e.clientX,
          y: e.clientY,
          elementSelector: getSelector(ctaElement),
          elementText: ctaElement.textContent?.slice(0, 50),
          sessionId: sessionIdRef.current,
        });
      }

      // Regular click tracking (from blip-ship doc)
      sendEvent({
        type: 'click',
        x: e.clientX,
        y: e.clientY,
        elementSelector: getSelector(target),
        elementText: target.textContent?.slice(0, 50),
        sessionId: sessionIdRef.current,
      });

      // Rage click detection (from blip-ship doc)
      const now = Date.now();
      clickBuffer.current.push({ time: now, x: e.clientX, y: e.clientY });
      clickBuffer.current = clickBuffer.current.filter((c) => now - c.time < 2000);

      if (clickBuffer.current.length >= 3) {
        // Check if clicks are in similar area (within 50px)
        const avgX = clickBuffer.current.reduce((sum, c) => sum + c.x, 0) / clickBuffer.current.length;
        const avgY = clickBuffer.current.reduce((sum, c) => sum + c.y, 0) / clickBuffer.current.length;
        const allClose = clickBuffer.current.every(
          (c) => Math.abs(c.x - avgX) < 50 && Math.abs(c.y - avgY) < 50
        );

        if (allClose) {
          sendEvent({
            type: 'rage_click',
            x: e.clientX,
            y: e.clientY,
            clickCount: clickBuffer.current.length,
            elementSelector: getSelector(target),
            sessionId: sessionIdRef.current,
          });
        }
      }

      // Dead click detection (from blip-ship doc)
      const isInteractive = target.closest('a, button, input, select, textarea, [onclick], [data-cta-id], [role="button"]');
      if (!isInteractive) {
        sendEvent({
          type: 'dead_click',
          x: e.clientX,
          y: e.clientY,
          elementSelector: getSelector(target),
          sessionId: sessionIdRef.current,
        });
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  /**
   * Scroll tracking (from blip-ship doc)
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      if (!sessionIdRef.current) return;

      sessionActions.updateActivity();

      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;

      sessionActions.updateScroll(scrollPercent);

      // Track scroll milestones
      [25, 50, 75, 100].forEach((milestone) => {
        if (scrollPercent >= milestone && !scrollMilestones.current.has(milestone)) {
          scrollMilestones.current.add(milestone);
          sendEvent({
            type: 'scroll_depth',
            scrollDepth: milestone,
            sessionId: sessionIdRef.current!,
          });
        }
      });
    };

    // Throttle scroll handler
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledScroll);
    return () => window.removeEventListener('scroll', throttledScroll);
  }, []);

  /**
   * Track visibility changes for bounce detection
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushEventBuffer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return <>{children}</>;
}

export default EventTracker;
