/**
 * POST /api/events - Receive and persist tracking events
 * As specified in blip-ship CRO-AGENT-MASTER-DOC.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { appendEvents, readEvents, readUIIssues, writeUIIssues } from '../../../lib/db';
import { detectIssues } from '../../../lib/issue-detector';
import type { AnalyticsEvent } from '../../../types/events';

// Config for auto-detection trigger
const AUTO_DETECT_THRESHOLD = 50; // Trigger after this many events
const AUTO_DETECT_COOLDOWN = 5 * 60 * 1000; // Don't re-run within 5 minutes

// Track last detection time (in-memory for simplicity)
let lastDetectionTime = 0;

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

    // Check if we should trigger auto-detection
    let detectionTriggered = false;
    let issuesDetected = 0;

    const allEvents = await readEvents();
    const now = Date.now();
    const cooldownPassed = (now - lastDetectionTime) > AUTO_DETECT_COOLDOWN;

    if (allEvents.length >= AUTO_DETECT_THRESHOLD && cooldownPassed) {
      console.log(`📊 [Auto-Detect] Threshold reached (${allEvents.length} events). Running issue detection...`);

      lastDetectionTime = now;
      detectionTriggered = true;

      // Run detection
      const issues = await detectIssues(24);
      issuesDetected = issues.length;

      if (issues.length > 0) {
        // Store detected issues
        const existingIssues = await readUIIssues();
        const newIssueIds = new Set(issues.map(i => i.patternId + i.elementSelector));

        // Only add issues that don't already exist (by pattern+selector combo)
        const existingKeys = new Set(existingIssues.map(i => i.patternId + i.elementSelector));
        const trulyNewIssues = issues.filter(i => !existingKeys.has(i.patternId + i.elementSelector));

        if (trulyNewIssues.length > 0) {
          await writeUIIssues([...existingIssues, ...trulyNewIssues]);
          console.log(`🚨 [Auto-Detect] Found ${trulyNewIssues.length} new UI issues!`);
          trulyNewIssues.forEach(issue => {
            console.log(`   - ${issue.severity.toUpperCase()}: ${issue.problemStatement}`);
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      received: validatedEvents.length,
      totalEvents: allEvents.length,
      detectionTriggered,
      issuesDetected: detectionTriggered ? issuesDetected : undefined,
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
