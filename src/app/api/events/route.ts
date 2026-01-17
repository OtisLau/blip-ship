import { NextRequest, NextResponse } from 'next/server';
import { appendEvents, getEvents, addProblemAnalysis } from '@/lib/db';
import { AnalyticsEvent } from '@/lib/types';
import { findProblems } from '@/lib/problemFinder';

const ANALYSIS_THRESHOLD = 50; // Run analysis every N events

export async function POST(request: NextRequest) {
  try {
    // Handle both JSON and sendBeacon (which sends as text/plain)
    const contentType = request.headers.get('content-type') || '';
    let body: { events: AnalyticsEvent[] };

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      // sendBeacon sends as text/plain
      const text = await request.text();
      body = JSON.parse(text);
    }

    const { events } = body;

    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Events array is required' },
        { status: 400 }
      );
    }

    // Validate and sanitize events
    const validatedEvents = events.map(event => ({
      id: event.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type: event.type,
      timestamp: event.timestamp || Date.now(),
      sessionId: event.sessionId || 'unknown',
      x: event.x,
      y: event.y,
      elementSelector: event.elementSelector?.slice(0, 200), // Limit selector length
      elementText: event.elementText?.slice(0, 200), // Limit text length
      scrollDepth: event.scrollDepth,
      clickCount: event.clickCount,
      pageUrl: event.pageUrl || '/',
      viewport: event.viewport || { width: 0, height: 0 },
    })) as AnalyticsEvent[];

    // Append to events store
    await appendEvents(validatedEvents);

    // Check if we should run analysis
    const allEvents = await getEvents();
    const shouldAnalyze = allEvents.length > 0 && allEvents.length % ANALYSIS_THRESHOLD === 0;

    if (shouldAnalyze) {
      // Run analysis in background (don't await the save)
      const analysis = findProblems(allEvents);
      addProblemAnalysis(analysis).catch(err =>
        console.error('Failed to save problem analysis:', err)
      );
    }

    return NextResponse.json({
      success: true,
      received: validatedEvents.length,
    });
  } catch (error) {
    console.error('Error processing events:', error);
    return NextResponse.json(
      { error: 'Failed to process events' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const events = await getEvents();

    return NextResponse.json({
      events,
      count: events.length,
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
