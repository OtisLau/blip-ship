/**
 * User Identity Classification API
 *
 * GET /api/user-identity?sessionId=xxx - Get identity for a session
 * POST /api/user-identity - Classify identity from events
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { classifyUserIdentity, getUIRecommendations, isIdentityClassifierConfigured } from '@/lib/identity-classifier';
import { computeBehavioralVector, formatVector, computeUserIdentity } from '@/lib/behavioral-vector';
import type { AnalyticsEvent } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

/**
 * Load events from file
 */
async function loadEvents(): Promise<AnalyticsEvent[]> {
  try {
    const data = await fs.readFile(EVENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * GET /api/user-identity - Get identity for current session or all recent events
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    const useGemini = request.nextUrl.searchParams.get('useGemini') !== 'false';

    const allEvents = await loadEvents();

    // Filter by session if provided
    let events = sessionId
      ? allEvents.filter(e => e.sessionId === sessionId)
      : allEvents;

    // Take last 50 events for efficiency
    events = events.slice(-50);

    if (events.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No events found',
        hint: sessionId ? `No events for session ${sessionId}` : 'No events in data/events.json',
      }, { status: 404 });
    }

    // Classify identity
    let identity;
    if (useGemini && isIdentityClassifierConfigured()) {
      identity = await classifyUserIdentity(events);
    } else {
      identity = computeUserIdentity(events);
    }

    // Get UI recommendations for this identity
    const recommendations = getUIRecommendations(identity.state);

    return NextResponse.json({
      success: true,
      sessionId: sessionId || 'all',
      eventCount: events.length,
      identity: {
        state: identity.state,
        confidence: identity.confidence,
        reasoning: identity.reasoning,
        computedAt: new Date(identity.computedAt).toISOString(),
      },
      behavioralVector: identity.vector,
      vectorFormatted: formatVector(identity.vector),
      uiRecommendations: recommendations,
      geminiUsed: useGemini && isIdentityClassifierConfigured(),
    });
  } catch (error) {
    console.error('[Identity API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * POST /api/user-identity - Classify identity from provided events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const events: AnalyticsEvent[] = body.events || [];
    const useGemini = body.useGemini !== false;

    if (events.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No events provided',
      }, { status: 400 });
    }

    // Classify identity
    let identity;
    if (useGemini && isIdentityClassifierConfigured()) {
      identity = await classifyUserIdentity(events);
    } else {
      identity = computeUserIdentity(events);
    }

    // Get UI recommendations
    const recommendations = getUIRecommendations(identity.state);

    return NextResponse.json({
      success: true,
      eventCount: events.length,
      identity: {
        state: identity.state,
        confidence: identity.confidence,
        reasoning: identity.reasoning,
        computedAt: new Date(identity.computedAt).toISOString(),
      },
      behavioralVector: identity.vector,
      vectorFormatted: formatVector(identity.vector),
      uiRecommendations: recommendations,
      geminiUsed: useGemini && isIdentityClassifierConfigured(),
    });
  } catch (error) {
    console.error('[Identity API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
