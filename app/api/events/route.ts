/**
 * POST /api/events - Receive and persist tracking events
 * As specified in blip-ship CRO-AGENT-MASTER-DOC.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { appendEvents } from '../../../lib/db';
import type { AnalyticsEvent } from '../../../types/events';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { events }: { events: AnalyticsEvent[] } = body;

    // Validate events array
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'Invalid events array' },
        { status: 400 }
      );
    }

    // Validate and normalize each event
    const validatedEvents: AnalyticsEvent[] = events.map((event) => ({
      ...event,
      id: event.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: event.timestamp || Date.now(),
      pageUrl: event.pageUrl || '',
      viewport: event.viewport || { width: 0, height: 0 },
    }));

    // Persist events
    await appendEvents(validatedEvents);

    return NextResponse.json({
      success: true,
      received: validatedEvents.length,
    });
  } catch (error) {
    console.error('Error processing events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
