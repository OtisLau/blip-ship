/**
 * DEBUG endpoint to test the full UX fix pipeline
 * GET /api/debug-pipeline - Shows system status
 * POST /api/debug-pipeline - Triggers a test fix generation
 */

import { NextResponse } from 'next/server';
import { loadSiteGuardrails, formatGuardrailsForLLM } from '@/lib/site-guardrails';
import { loadCombinedGuardrails, processIssueWithLLM } from '@/lib/ux-detection';
import { validateFixWithGuardrails } from '@/lib/fix-validators';
import { detectIssues } from '@/lib/issue-detector';
import { readEvents } from '@/lib/db';
import type { UIIssue } from '@/lib/types';

export async function GET() {
  try {
    // Check all components of the pipeline
    const checks: Record<string, { status: string; details?: unknown }> = {};

    // 1. Check Gemini API key
    checks['gemini_api_key'] = {
      status: process.env.GOOGLE_GEMINI_API_KEY ? '✅ Configured' : '❌ MISSING',
      details: process.env.GOOGLE_GEMINI_API_KEY
        ? `Key starts with: ${process.env.GOOGLE_GEMINI_API_KEY.substring(0, 8)}...`
        : 'Set GOOGLE_GEMINI_API_KEY in .env.local',
    };

    // 2. Check site guardrails
    const guardrails = await loadSiteGuardrails();
    checks['site_guardrails'] = {
      status: '✅ Loaded',
      details: {
        siteId: guardrails.siteId,
        source: guardrails.source,
        backgroundColors: guardrails.colors.backgrounds.length,
        fontWeights: guardrails.typography.allowedFontWeights,
      },
    };

    // 3. Check combined guardrails loading
    const combined = await loadCombinedGuardrails();
    checks['combined_guardrails'] = {
      status: '✅ Loaded',
      details: {
        staticLength: combined.staticGuardrails.length,
        dynamicSiteId: combined.dynamicGuardrails.siteId,
        combinedPromptLength: combined.combinedPrompt.length,
      },
    };

    // 4. Check event count
    const events = await readEvents();
    checks['events'] = {
      status: events.length > 0 ? '✅ Has events' : '⚠️ No events',
      details: {
        total: events.length,
        deadClicks: events.filter((e) => e.type === 'dead_click').length,
        rageClicks: events.filter((e) => e.type === 'rage_click').length,
      },
    };

    // 5. Check issue detection
    if (events.length > 0) {
      const issues = await detectIssues(24);
      checks['issue_detection'] = {
        status: issues.length > 0 ? '✅ Found issues' : '⚠️ No issues detected',
        details: {
          count: issues.length,
          patterns: issues.map((i) => i.patternId),
        },
      };
    } else {
      checks['issue_detection'] = {
        status: '⚠️ Skipped (no events)',
        details: 'Need events to detect issues',
      };
    }

    // 6. Test validation
    const testCode = `<button style={{ backgroundColor: '#111', color: 'white' }}>TEST</button>`;
    const validationResult = await validateFixWithGuardrails(testCode, guardrails);
    checks['validation'] = {
      status: validationResult.valid ? '✅ Working' : '⚠️ Test failed',
      details: {
        usedDynamicGuardrails: validationResult.usedDynamicGuardrails,
        guardrailsSource: validationResult.guardrailsSource,
        violations: validationResult.violations.length,
      },
    };

    return NextResponse.json({
      status: 'Pipeline diagnostic complete',
      checks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Diagnostic failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patternId = 'button_no_feedback', forceGenerate = false } = body;

    console.log('\n🔬 [DEBUG] Starting pipeline test...');

    // Check API key
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error: 'GOOGLE_GEMINI_API_KEY not configured',
          fix: 'Add GOOGLE_GEMINI_API_KEY=your_key to .env.local',
        },
        { status: 500 }
      );
    }

    // Create a mock issue for testing
    const mockIssue: UIIssue = {
      id: `test_issue_${Date.now()}`,
      status: 'detected',
      detectedAt: Date.now(),
      lastOccurrence: Date.now(),
      category: 'frustration',
      severity: 'high',
      patternId,
      elementSelector: 'button[data-add-to-cart]',
      sectionId: 'products',
      componentPath: 'components/store/ProductGrid.tsx',
      componentName: 'ProductGrid',
      eventCount: 25,
      uniqueSessions: 8,
      sampleEvents: [],
      problemStatement: `Test: Users are experiencing ${patternId} issues`,
      userIntent: 'User wants immediate feedback when clicking',
      currentOutcome: 'No visible feedback causes user frustration',
      suggestedFix: 'Add loading state or visual feedback',
    };

    console.log(`🔬 [DEBUG] Testing with pattern: ${patternId}`);
    console.log(`🔬 [DEBUG] Mock issue created, calling processIssueWithLLM...`);

    // Process through the full pipeline
    const result = await processIssueWithLLM(mockIssue);

    console.log(`🔬 [DEBUG] Pipeline result:`, {
      success: result.success,
      newFiles: result.newFiles?.length || 0,
      patches: result.patches?.length || 0,
      agentUsed: result.agentUsed,
      error: result.error,
    });

    return NextResponse.json({
      status: 'Pipeline test complete',
      input: {
        patternId,
        mockIssue: {
          id: mockIssue.id,
          severity: mockIssue.severity,
          problemStatement: mockIssue.problemStatement,
        },
      },
      output: {
        success: result.success,
        agentUsed: result.agentUsed,
        explanation: result.explanation?.substring(0, 200),
        newFilesCount: result.newFiles?.length || 0,
        patchesCount: result.patches?.length || 0,
        error: result.error,
      },
      patches: result.patches?.map((p) => ({
        filePath: p.filePath,
        description: p.description,
        oldCodePreview: p.oldCode?.substring(0, 100) + '...',
        newCodePreview: p.newCode?.substring(0, 100) + '...',
      })),
      newFiles: result.newFiles?.map((f) => ({
        path: f.path,
        description: f.description,
        contentLength: f.content?.length || 0,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('🔬 [DEBUG] Pipeline test failed:', error);
    return NextResponse.json(
      {
        error: 'Pipeline test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
