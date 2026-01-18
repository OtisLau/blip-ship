'use client';

/**
 * useCTATracking - Custom hook for CTA components
 * Adapted from 0-1's useToolSpawner pattern for e-commerce CTAs
 *
 * Provides:
 * - Ref to attach to CTA element
 * - Click handler with state update
 * - Visibility and click state
 * - Time visible before action
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  sessionActions,
  CTA_VISIBILITY_TIMEOUT,
  subscribe,
  getState,
} from '../lib/session-store';
import { sendEvent, getSelector, isAboveFold } from '../lib/tracker';
import type { CTAState } from '@/types';

interface UseCTATrackingOptions {
  ctaId: string;
  visibilityTimeout?: number;
}

interface UseCTATrackingReturn {
  ref: React.RefObject<HTMLElement | null>;
  handleClick: () => void;
  isVisible: boolean;
  wasClicked: boolean;
  wasExpired: boolean;
  visibleDuration: number;
  ctaState: CTAState | undefined;
}

export function useCTATracking({
  ctaId,
  visibilityTimeout = CTA_VISIBILITY_TIMEOUT,
}: UseCTATrackingOptions): UseCTATrackingReturn {
  const ref = useRef<HTMLElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [ctaState, setCTAState] = useState<CTAState | undefined>(undefined);

  // Subscribe to state changes
  useEffect(() => {
    const updateState = () => {
      const state = getState();
      setCTAState(state.visibleCTAs.get(ctaId));
    };

    // Initial state
    updateState();

    // Subscribe to changes
    const unsubscribe = subscribe(updateState);
    return unsubscribe;
  }, [ctaId]);

  // Track visibility with IntersectionObserver (adapted from useToolSpawner's spawn logic)
  useEffect(() => {
    if (!ref.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        const sessionId = sessionActions.getSessionId();
        if (!sessionId) return;

        if (entry.isIntersecting) {
          // CTA became visible - equivalent to spawnTool()
          const element = entry.target as HTMLElement;
          const rect = entry.boundingClientRect;

          sessionActions.markCTAVisible(ctaId, getSelector(element), {
            x: rect.x,
            y: rect.y,
          });

          sendEvent({
            type: 'cta_visible',
            ctaId,
            ctaPosition: isAboveFold(element) ? 'above-fold' : 'below-fold',
            sessionId,
            elementSelector: getSelector(element),
          });

          // Set expiry timer (adapted from TOOL_EXPIRE_TIME pattern)
          timerRef.current = setTimeout(() => {
            const state = sessionActions.getCTAState(ctaId);
            if (state?.status === 'visible') {
              sessionActions.markCTAExpired(ctaId);
              sendEvent({
                type: 'cta_expired',
                ctaId,
                ctaVisibleDuration: visibilityTimeout,
                sessionId: sessionActions.getSessionId()!,
              });
            }
          }, visibilityTimeout);
        } else {
          // CTA left viewport - clear timer if exists
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = undefined;
          }
        }
      },
      { threshold: 0.5 }
    );

    observerRef.current.observe(ref.current);

    return () => {
      observerRef.current?.disconnect();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [ctaId, visibilityTimeout]);

  // Click handler - equivalent to selectTool()
  const handleClick = useCallback(() => {
    const sessionId = sessionActions.getSessionId();
    if (!sessionId) return;

    const state = sessionActions.getCTAState(ctaId);

    // Clear expiry timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }

    // Mark as clicked
    sessionActions.markCTAClicked(ctaId);

    // Send click event
    const element = ref.current;
    sendEvent({
      type: 'cta_click',
      ctaId,
      ctaVisibleDuration: state ? Date.now() - state.visibleAt : 0,
      ctaPosition: state?.viewportPosition,
      sessionId,
      elementSelector: element ? getSelector(element) : undefined,
      elementText: element?.textContent?.slice(0, 50),
    });
  }, [ctaId]);

  return {
    ref,
    handleClick,
    isVisible: ctaState?.status === 'visible',
    wasClicked: ctaState?.status === 'clicked',
    wasExpired: ctaState?.status === 'expired',
    visibleDuration: ctaState ? Date.now() - ctaState.visibleAt : 0,
    ctaState,
  };
}

export default useCTATracking;
