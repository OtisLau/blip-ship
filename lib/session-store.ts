/**
 * Session Store - Client-side session state management
 * Adapted from 0-1's Zustand store patterns for e-commerce CRO
 *
 * Key patterns from 0-1/src/state/store.ts:
 * - sessionStart/sessionActive for session lifecycle
 * - spawnTool/selectTool/expireTool -> markCTAVisible/markCTAClicked/markCTAExpired
 * - floatingTools/selectedTools -> visibleCTAs/clickedCTAs
 */

import type { CTAState, SessionState, SessionActions } from '@/types';
import { generateSessionId } from './tracker';

// Session constants (adapted from 0-1's useToolSpawner.ts)
export const SESSION_DURATION = 30 * 60 * 1000;  // 30 minutes for e-commerce
export const CTA_VISIBILITY_TIMEOUT = 10 * 1000; // 10 seconds (vs 5s tool expiry in 0-1)
export const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes of no activity = session end

// Module-level state (simpler than Zustand for this use case)
let state: SessionState = {
  sessionId: null,
  sessionStart: null,
  sessionActive: false,
  visibleCTAs: new Map<string, CTAState>(),
  clickedCTAs: [],
  lastActivityAt: Date.now(),
  scrollPosition: 0,
};

// Listeners for state changes (React integration)
type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners(): void {
  listeners.forEach(listener => listener());
}

/**
 * Subscribe to state changes
 */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Get current state snapshot
 */
export function getState(): SessionState {
  return { ...state, visibleCTAs: new Map(state.visibleCTAs) };
}

/**
 * Session Actions - adapted from 0-1's store actions
 */
export const sessionActions: SessionActions = {
  /**
   * Start a new session (adapted from 0-1's startSession)
   * Returns the new session ID
   */
  startSession: (): string => {
    const sessionId = generateSessionId();
    state = {
      ...state,
      sessionId,
      sessionStart: Date.now(),
      sessionActive: true,
      lastActivityAt: Date.now(),
      visibleCTAs: new Map(),
      clickedCTAs: [],
      scrollPosition: 0,
    };
    notifyListeners();

    // Store session ID in sessionStorage for persistence across page navigations
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('blip_session_id', sessionId);
      sessionStorage.setItem('blip_session_start', String(Date.now()));
    }

    return sessionId;
  },

  /**
   * End the current session (adapted from 0-1's endSession)
   */
  endSession: (reason: 'timeout' | 'navigation' | 'inactivity'): void => {
    state = {
      ...state,
      sessionActive: false,
    };
    notifyListeners();

    // Clear session storage
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('blip_session_id');
      sessionStorage.removeItem('blip_session_start');
    }
  },

  /**
   * Reset session to initial state (adapted from 0-1's resetSession)
   */
  resetSession: (): void => {
    state = {
      sessionId: null,
      sessionStart: null,
      sessionActive: false,
      visibleCTAs: new Map(),
      clickedCTAs: [],
      lastActivityAt: Date.now(),
      scrollPosition: 0,
    };
    notifyListeners();

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('blip_session_id');
      sessionStorage.removeItem('blip_session_start');
    }
  },

  /**
   * Mark a CTA as visible (adapted from 0-1's spawnTool)
   * Called when a CTA enters the viewport
   */
  markCTAVisible: (
    ctaId: string,
    selector: string,
    position: { x: number; y: number }
  ): void => {
    // Don't re-mark if already tracked
    if (state.visibleCTAs.has(ctaId)) return;

    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const ctaState: CTAState = {
      id: ctaId,
      selector,
      visibleAt: Date.now(),
      clickedAt: null,
      expiredAt: null,
      status: 'visible',
      position,
      viewportPosition: position.y < viewportHeight ? 'above-fold' : 'below-fold',
    };

    const newVisibleCTAs = new Map(state.visibleCTAs);
    newVisibleCTAs.set(ctaId, ctaState);

    state = {
      ...state,
      visibleCTAs: newVisibleCTAs,
      lastActivityAt: Date.now(),
    };
    notifyListeners();
  },

  /**
   * Mark a CTA as clicked (adapted from 0-1's selectTool)
   * Called when user clicks a CTA
   */
  markCTAClicked: (ctaId: string): void => {
    const ctaState = state.visibleCTAs.get(ctaId);
    if (!ctaState || ctaState.status !== 'visible') return;

    const updatedCTA: CTAState = {
      ...ctaState,
      clickedAt: Date.now(),
      status: 'clicked',
    };

    const newVisibleCTAs = new Map(state.visibleCTAs);
    newVisibleCTAs.set(ctaId, updatedCTA);

    state = {
      ...state,
      visibleCTAs: newVisibleCTAs,
      clickedCTAs: [...state.clickedCTAs, ctaId],
      lastActivityAt: Date.now(),
    };
    notifyListeners();
  },

  /**
   * Mark a CTA as expired (adapted from 0-1's expireTool)
   * Called when CTA visibility times out or user scrolls past without clicking
   */
  markCTAExpired: (ctaId: string): void => {
    const ctaState = state.visibleCTAs.get(ctaId);
    if (!ctaState || ctaState.status !== 'visible') return;

    const updatedCTA: CTAState = {
      ...ctaState,
      expiredAt: Date.now(),
      status: 'expired',
    };

    const newVisibleCTAs = new Map(state.visibleCTAs);
    newVisibleCTAs.set(ctaId, updatedCTA);

    state = {
      ...state,
      visibleCTAs: newVisibleCTAs,
    };
    notifyListeners();
  },

  /**
   * Update last activity timestamp
   */
  updateActivity: (): void => {
    state = {
      ...state,
      lastActivityAt: Date.now(),
    };
    // Don't notify listeners for activity updates to avoid excessive re-renders
  },

  /**
   * Update scroll position
   */
  updateScroll: (depth: number): void => {
    state = {
      ...state,
      scrollPosition: depth,
      lastActivityAt: Date.now(),
    };
    // Don't notify listeners for scroll updates to avoid excessive re-renders
  },

  /**
   * Get current session ID
   */
  getSessionId: (): string | null => {
    return state.sessionId;
  },

  /**
   * Get CTA state by ID
   */
  getCTAState: (ctaId: string): CTAState | undefined => {
    return state.visibleCTAs.get(ctaId);
  },

  /**
   * Check if session is active
   */
  isSessionActive: (): boolean => {
    return state.sessionActive;
  },
};

/**
 * Try to restore session from sessionStorage
 * Called on initial load
 */
export function restoreSession(): string | null {
  if (typeof sessionStorage === 'undefined') return null;

  const storedSessionId = sessionStorage.getItem('blip_session_id');
  const storedSessionStart = sessionStorage.getItem('blip_session_start');

  if (storedSessionId && storedSessionStart) {
    const sessionStart = parseInt(storedSessionStart, 10);
    const sessionAge = Date.now() - sessionStart;

    // Only restore if session is still valid (within timeout)
    if (sessionAge < SESSION_DURATION) {
      state = {
        ...state,
        sessionId: storedSessionId,
        sessionStart,
        sessionActive: true,
        lastActivityAt: Date.now(),
      };
      notifyListeners();
      return storedSessionId;
    }
  }

  return null;
}

/**
 * Check for inactivity and end session if needed
 */
export function checkInactivity(): boolean {
  if (!state.sessionActive) return false;

  const inactiveTime = Date.now() - state.lastActivityAt;
  if (inactiveTime >= INACTIVITY_TIMEOUT) {
    sessionActions.endSession('inactivity');
    return true;
  }
  return false;
}

/**
 * Check for session timeout
 */
export function checkSessionTimeout(): boolean {
  if (!state.sessionActive || !state.sessionStart) return false;

  const sessionAge = Date.now() - state.sessionStart;
  if (sessionAge >= SESSION_DURATION) {
    sessionActions.endSession('timeout');
    return true;
  }
  return false;
}
