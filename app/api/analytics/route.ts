/**
 * GET /api/analytics - Return aggregated analytics
 * As specified in blip-ship CRO-AGENT-MASTER-DOC.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { readEvents } from '../../../lib/db';
import { aggregateEvents } from '../../../lib/analytics';

export async function GET(request: NextRequest) {
  try {
    // Read all events
    const events = await readEvents();

    // Aggregate into metrics
    const analytics = aggregateEvents(events);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
