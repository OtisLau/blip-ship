import { NextResponse } from 'next/server';
import {
  loadSiteGuardrails,
  saveSiteGuardrails,
  mergeGuardrails,
  formatGuardrailsForLLM,
} from '@/lib/site-guardrails';
import { extractThemeGuardrails, validateExtractedGuardrails } from '@/lib/theme-extractor';
import type { SiteGuardrails } from '@/lib/types';

/**
 * GET /api/guardrails
 * Get current site guardrails configuration
 */
export async function GET() {
  try {
    const guardrails = await loadSiteGuardrails();

    return NextResponse.json({
      guardrails,
      formattedForLLM: formatGuardrailsForLLM(guardrails),
      loadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error loading guardrails:', error);
    return NextResponse.json(
      {
        error: 'Failed to load guardrails',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/guardrails
 * Update or regenerate site guardrails
 *
 * Body options:
 * - action: 'extract' | 'update' | 'reset'
 * - overrides?: Partial<SiteGuardrails> (for action: 'update')
 * - paths?: string[] (for action: 'extract')
 * - merge?: boolean (for action: 'extract', merge with existing)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, overrides, paths, merge, siteId } = body as {
      action: 'extract' | 'update' | 'reset';
      overrides?: Partial<SiteGuardrails>;
      paths?: string[];
      merge?: boolean;
      siteId?: string;
    };

    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      );
    }

    let result: {
      guardrails: SiteGuardrails;
      report?: unknown;
      conflicts?: string[];
    };

    switch (action) {
      case 'extract': {
        // Auto-extract guardrails from the codebase
        const scanPaths = paths || ['components', 'app'];
        const extraction = await extractThemeGuardrails(scanPaths, {
          merge: merge ?? false,
          siteId: siteId || 'extracted-site',
        });

        // Validate against markdown guardrails
        const conflicts = await validateExtractedGuardrails(extraction.guardrails);

        result = {
          guardrails: extraction.guardrails,
          report: extraction.report,
          conflicts,
        };
        break;
      }

      case 'update': {
        // Merge overrides with existing guardrails
        if (!overrides) {
          return NextResponse.json(
            { error: 'Missing required field: overrides for action "update"' },
            { status: 400 }
          );
        }

        const merged = await mergeGuardrails(overrides);
        result = { guardrails: merged };
        break;
      }

      case 'reset': {
        // Reset to default guardrails
        const { DEFAULT_GUARDRAILS } = await import('@/lib/site-guardrails');
        await saveSiteGuardrails({
          ...DEFAULT_GUARDRAILS,
          siteId: siteId || DEFAULT_GUARDRAILS.siteId,
        });
        result = { guardrails: DEFAULT_GUARDRAILS };
        break;
      }

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Use 'extract', 'update', or 'reset'` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      ...result,
      formattedForLLM: formatGuardrailsForLLM(result.guardrails),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating guardrails:', error);
    return NextResponse.json(
      {
        error: 'Failed to update guardrails',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
