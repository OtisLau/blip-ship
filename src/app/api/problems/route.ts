import { NextResponse } from 'next/server';
import { getEvents, addProblemAnalysis, getProblems } from '@/lib/db';
import { findProblems, formatProblemsForAI, getProblemsByCategory, getProblemsBySeverity, ProblemCategory, ProblemSeverity } from '@/lib/problemFinder';

// GET /api/problems - Analyze events and return identified problems
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // 'json' or 'ai'
    const category = searchParams.get('category') as ProblemCategory | null;
    const severity = searchParams.get('severity') as ProblemSeverity | null;
    const history = searchParams.get('history') === 'true'; // Get stored history
    const save = searchParams.get('save') !== 'false'; // Save by default, pass save=false to skip

    // Return stored problem history
    if (history) {
      const storedProblems = await getProblems();
      return NextResponse.json({
        success: true,
        count: storedProblems.length,
        history: storedProblems,
      });
    }

    // Get all events
    const events = await getEvents();

    if (!events || events.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No events to analyze',
        analysis: {
          timestamp: Date.now(),
          totalProblems: 0,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          problems: [],
          summary: 'No event data available for analysis.',
        },
      });
    }

    // Run problem analysis
    let analysis = findProblems(events);

    // Save to history (before filtering)
    if (save) {
      await addProblemAnalysis(analysis);
    }

    // Filter by category if specified
    if (category) {
      const filteredProblems = getProblemsByCategory(analysis, category);
      analysis = {
        ...analysis,
        problems: filteredProblems,
        totalProblems: filteredProblems.length,
        criticalCount: filteredProblems.filter(p => p.severity === 'critical').length,
        highCount: filteredProblems.filter(p => p.severity === 'high').length,
        mediumCount: filteredProblems.filter(p => p.severity === 'medium').length,
        lowCount: filteredProblems.filter(p => p.severity === 'low').length,
      };
    }

    // Filter by severity if specified
    if (severity) {
      const filteredProblems = getProblemsBySeverity(analysis, severity);
      analysis = {
        ...analysis,
        problems: filteredProblems,
        totalProblems: filteredProblems.length,
        criticalCount: severity === 'critical' ? filteredProblems.length : 0,
        highCount: severity === 'high' ? filteredProblems.length : 0,
        mediumCount: severity === 'medium' ? filteredProblems.length : 0,
        lowCount: severity === 'low' ? filteredProblems.length : 0,
      };
    }

    // Return AI-formatted text or JSON
    if (format === 'ai') {
      return NextResponse.json({
        success: true,
        eventsAnalyzed: events.length,
        saved: save,
        formatted: formatProblemsForAI(analysis),
      });
    }

    return NextResponse.json({
      success: true,
      eventsAnalyzed: events.length,
      saved: save,
      analysis,
    });
  } catch (error) {
    console.error('Problem analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze problems' },
      { status: 500 }
    );
  }
}
