import { NextResponse } from 'next/server';
import { getEvents } from '@/lib/db';
import {
  aggregateEvents,
  getTopClickedElements,
  getFrustrationSignals,
} from '@/lib/analytics';

export async function GET() {
  try {
    const events = await getEvents();
    const analytics = aggregateEvents(events);
    const topClickedElements = getTopClickedElements(events);
    const frustrationSignals = getFrustrationSignals(events);

    return NextResponse.json({
      ...analytics,
      topClickedElements,
      frustrationSignals,
      eventCount: events.length,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
