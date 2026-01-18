/**
 * GET /api/detect-issues - Manually trigger issue detection
 * Useful for demos when you don't want to wait for auto-detection
 */

import { NextResponse } from 'next/server';
import { readUIIssues, writeUIIssues } from '@/lib/db';
import { detectIssues } from '@/lib/issue-detector';

export async function GET() {
  try {
    console.log('🔍 [Detect] Manual issue detection triggered');

    // Run detection on last 24 hours of events
    const issues = await detectIssues(24);

    if (issues.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No issues detected',
        issuesFound: 0,
        issues: []
      });
    }

    // Store detected issues (merge with existing)
    const existingIssues = await readUIIssues();
    const existingKeys = new Set(existingIssues.map(i => i.patternId + i.elementSelector));
    const newIssues = issues.filter(i => !existingKeys.has(i.patternId + i.elementSelector));

    if (newIssues.length > 0) {
      await writeUIIssues([...existingIssues, ...newIssues]);
      console.log(`🚨 [Detect] Found ${newIssues.length} new UI issues!`);
      newIssues.forEach(issue => {
        console.log(`   - ${issue.severity.toUpperCase()}: ${issue.problemStatement}`);
      });
    }

    return NextResponse.json({
      success: true,
      message: `Found ${issues.length} issues (${newIssues.length} new)`,
      issuesFound: issues.length,
      newIssues: newIssues.length,
      issues: issues.map(i => ({
        id: i.id,
        severity: i.severity,
        problem: i.problemStatement,
        element: i.elementSelector,
        eventCount: i.eventCount
      }))
    });
  } catch (error) {
    console.error('Error detecting issues:', error);
    return NextResponse.json(
      { error: 'Failed to detect issues', details: String(error) },
      { status: 500 }
    );
  }
}

// Also support POST for consistency
export async function POST() {
  return GET();
}
