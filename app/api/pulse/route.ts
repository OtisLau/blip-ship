/**
 * POST /api/pulse - Receive and persist tracking events
 * Renamed from /api/events to avoid ad blocker detection
 *
 * AUTO-TRIGGERS demo-fix flow when threshold is reached!
 */

import { NextRequest, NextResponse } from 'next/server';
import { appendEvents, readEvents } from '../../../lib/db';
import type { AnalyticsEvent } from '../../../types/events';

// Config for auto-detection trigger
const AUTO_FIX_THRESHOLD = 50; // Trigger demo-fix after this many events
const AUTO_FIX_COOLDOWN = 2 * 60 * 1000; // 2 minute cooldown between auto-fixes

// Track last fix time (in-memory for simplicity)
let lastFixTime = 0;
let fixInProgress = false;

// Trigger the hardcoded demo-fix flow
async function triggerDemoFix(): Promise<{
  success: boolean;
  message?: string;
  prUrl?: string;
  emailSent?: boolean;
}> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  try {
    const response = await fetch(`${baseUrl}/api/demo-fix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        prUrl: data.result?.prUrl,
        emailSent: data.result?.emailSent,
      };
    } else {
      return {
        success: false,
        message: data.message || 'Demo fix failed',
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

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

    // Check if we should trigger auto-fix
    let fixTriggered = false;
    let fixResult: { prUrl?: string; emailSent?: boolean } = {};

    const allEvents = await readEvents();
    const now = Date.now();
    const cooldownPassed = (now - lastFixTime) > AUTO_FIX_COOLDOWN;

    if (allEvents.length >= AUTO_FIX_THRESHOLD && cooldownPassed && !fixInProgress) {
      console.log(`\n🧠 [Auto-Fix] Threshold reached (${allEvents.length} events). Triggering demo-fix flow...`);

      lastFixTime = now;
      fixInProgress = true;
      fixTriggered = true;

      // Trigger demo-fix flow in background (don't block the response)
      triggerDemoFix().then(result => {
        fixInProgress = false;
        if (result.success) {
          console.log(`✅ [Auto-Fix] Complete! PR: ${result.prUrl}`);
        } else {
          console.log(`⚠️ [Auto-Fix] ${result.message}`);
        }
      }).catch(err => {
        fixInProgress = false;
        console.error(`❌ [Auto-Fix] Error:`, err);
      });

      fixResult = { prUrl: 'creating...', emailSent: false };
    }

    return NextResponse.json({
      success: true,
      received: validatedEvents.length,
      totalEvents: allEvents.length,
      threshold: AUTO_FIX_THRESHOLD,
      fixTriggered,
      fixInProgress,
      ...(fixTriggered ? { fixResult } : {}),
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
