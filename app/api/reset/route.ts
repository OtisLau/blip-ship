/**
 * POST /api/reset - Clear all events and issues for fresh demo
 * Useful for resetting state before hackathon demos
 */

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST() {
  try {
    const dataDir = path.join(process.cwd(), 'data');

    // Clear events
    await fs.writeFile(path.join(dataDir, 'events.json'), '[]');
    console.log('🗑️ [Reset] Cleared events.json');

    // Clear UI issues
    await fs.writeFile(path.join(dataDir, 'ui-issues.json'), '[]');
    console.log('🗑️ [Reset] Cleared ui-issues.json');

    return NextResponse.json({
      success: true,
      message: 'Reset complete - events and issues cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error resetting data:', error);
    return NextResponse.json(
      { error: 'Failed to reset data' },
      { status: 500 }
    );
  }
}

// Allow GET for easy browser testing
export async function GET() {
  return NextResponse.json({
    message: 'Use POST to reset events and issues',
    usage: 'curl -X POST localhost:3000/api/reset'
  });
}
