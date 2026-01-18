/**
 * UI Issues API
 * Detects and returns UI/UX issues for LLM-powered fixes
 */

import { NextResponse } from 'next/server';
import { detectIssues, summarizeIssues } from '@/lib/issue-detector';
import { formatIssueForLLM, formatIssuesSummary, formatIssueAsJSON } from '@/lib/llm-formatter';

/**
 * GET /api/ui-issues
 * Detect and return UI issues
 *
 * Query params:
 * - timeWindow: hours to analyze (default: 24)
 * - format: 'json' | 'llm' | 'summary' (default: 'json')
 * - severity: filter by severity (optional)
 * - category: filter by category (optional)
 * - includeCode: include component code in response (default: true)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const timeWindow = parseInt(searchParams.get('timeWindow') || '24', 10);
    const format = searchParams.get('format') || 'json';
    const severityFilter = searchParams.get('severity');
    const categoryFilter = searchParams.get('category');
    const includeCode = searchParams.get('includeCode') !== 'false';

    // Detect issues
    let issues = await detectIssues(timeWindow);

    // Apply filters
    if (severityFilter) {
      issues = issues.filter(i => i.severity === severityFilter);
    }
    if (categoryFilter) {
      issues = issues.filter(i => i.category === categoryFilter);
    }

    // Format response based on requested format
    if (format === 'summary') {
      const summary = await formatIssuesSummary(issues);
      return new NextResponse(summary, {
        headers: { 'Content-Type': 'text/markdown' },
      });
    }

    if (format === 'llm' && issues.length > 0) {
      // Return the highest priority issue formatted for LLM
      const llmPrompt = await formatIssueForLLM(issues[0]);
      return new NextResponse(llmPrompt, {
        headers: { 'Content-Type': 'text/markdown' },
      });
    }

    // Default JSON response
    const response = {
      generatedAt: Date.now(),
      timeWindowHours: timeWindow,
      summary: summarizeIssues(issues),
      issues: includeCode
        ? await Promise.all(issues.map(formatIssueAsJSON))
        : issues,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error detecting UI issues:', error);
    return NextResponse.json(
      { error: 'Failed to detect UI issues' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ui-issues/analyze
 * Trigger a fresh analysis and return results
 *
 * Body:
 * - timeWindow: hours to analyze (default: 24)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const timeWindow = body.timeWindow || 24;

    const issues = await detectIssues(timeWindow);
    const summary = summarizeIssues(issues);

    // Format top issues for immediate LLM consumption
    const topIssues = await Promise.all(
      issues.slice(0, 3).map(formatIssueAsJSON)
    );

    return NextResponse.json({
      success: true,
      analyzedAt: Date.now(),
      timeWindowHours: timeWindow,
      summary,
      topIssues,
      totalIssues: issues.length,
    });
  } catch (error) {
    console.error('Error analyzing UI issues:', error);
    return NextResponse.json(
      { error: 'Failed to analyze UI issues' },
      { status: 500 }
    );
  }
}
