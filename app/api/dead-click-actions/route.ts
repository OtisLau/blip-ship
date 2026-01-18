import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { AnalyticsEvent } from '@/lib/types';
import {
  analyzeDeadClicksForActionMapping,
  validateMapping,
  applyCodePatches,
  validateCodePatch,
} from '@/lib/ux-detection';
import type { DeadClickActionResponse, CodePatch } from '@/types/suggestions';

/**
 * Load events from the events.json file
 */
async function loadEvents(): Promise<AnalyticsEvent[]> {
  const eventsPath = path.join(process.cwd(), 'data/events.json');
  try {
    const content = await fs.readFile(eventsPath, 'utf-8');
    return JSON.parse(content) as AnalyticsEvent[];
  } catch {
    return [];
  }
}

/**
 * GET /api/dead-click-actions
 * 
 * Analyzes dead click events on product images and generates
 * action mappings with code patches to open the product modal
 * 
 * Query params:
 * - useLLM: true/false (default true) - use LLM for analysis
 * - productId: filter by product
 * - apply: true/false (default false) - actually apply the patches
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const useLLM = searchParams.get('useLLM') !== 'false';
    const productId = searchParams.get('productId') || undefined;
    const shouldApply = searchParams.get('apply') === 'true';

    console.log('\n========================================');
    console.log('[STEP 1] API /api/dead-click-actions GET called');
    console.log('  - useLLM:', useLLM);
    console.log('  - productId filter:', productId || 'none');
    console.log('  - shouldApply:', shouldApply);
    console.log('========================================\n');

    // Load events
    let events = await loadEvents();
    console.log('[STEP 2] Loaded events from data/events.json');
    console.log('  - Total events:', events.length);
    const deadClickEvents = events.filter((e) => e.type === 'dead_click');
    console.log('  - Dead click events:', deadClickEvents.length);

    // Filter by product if specified
    if (productId) {
      events = events.filter((e) => e.productId === productId);
      console.log('  - After productId filter:', events.length);
    }

    // Analyze dead clicks
    console.log('\n[STEP 3] Calling analyzeDeadClicksForActionMapping...');
    const result = await analyzeDeadClicksForActionMapping(events, { useLLM });
    console.log('[STEP 3 DONE] Analysis complete');
    console.log('  - Enriched events:', result.enrichedEvents.length);
    console.log('  - Mappings generated:', result.mappings.length);

    // Validate each mapping
    console.log('\n[STEP 4] Validating mappings...');
    const validatedMappings = result.mappings.map((mapping) => {
      const validation = validateMapping(mapping);
      console.log('  - Mapping validated:', validation.valid, mapping.actionMapping?.suggestedAction?.actionType);
      return {
        ...mapping,
        validationResult: validation,
      };
    });

    // Find the first valid mapping for the primary response
    const primaryMapping = validatedMappings.find((m) => m.validationResult.valid);
    console.log('[STEP 4 DONE] Primary mapping found:', !!primaryMapping);

    // If apply=true, apply the patches
    let applyResult = null;
    if (shouldApply && primaryMapping?.generatedCode?.patches) {
      console.log('\n[STEP 5] apply=true, validating patches...');
      console.log('  - Patches to apply:', primaryMapping.generatedCode.patches.length);
      
      // First validate all patches
      const validations = await Promise.all(
        primaryMapping.generatedCode.patches.map(validateCodePatch)
      );
      
      const allValid = validations.every((v) => v.valid);
      console.log('  - All patches valid:', allValid);
      validations.forEach((v, i) => {
        console.log(`    Patch ${i + 1}: valid=${v.valid}, issues=${v.issues.join(', ') || 'none'}`);
      });
      
      if (allValid) {
        console.log('\n[STEP 6] Applying patches...');
        applyResult = await applyCodePatches(primaryMapping.generatedCode.patches);
        console.log('[STEP 6 DONE] Patches applied:', applyResult.allApplied);
      } else {
        applyResult = {
          success: false,
          error: 'Patch validation failed',
          validationIssues: validations.flatMap((v) => v.issues),
        };
        console.log('[STEP 5 FAILED] Patch validation failed:', applyResult.validationIssues);
      }
    } else if (shouldApply) {
      console.log('\n[STEP 5 SKIPPED] No patches to apply');
      console.log('  - primaryMapping exists:', !!primaryMapping);
      console.log('  - has generatedCode:', !!primaryMapping?.generatedCode);
      console.log('  - has patches:', !!primaryMapping?.generatedCode?.patches);
    }

    const response: DeadClickActionResponse & {
      allMappings: typeof validatedMappings;
      summary: string;
      enrichedEvents: typeof result.enrichedEvents;
      applyResult?: typeof applyResult;
    } = {
      success: true,
      mapping: primaryMapping || validatedMappings[0],
      allMappings: validatedMappings,
      summary: result.summary,
      enrichedEvents: result.enrichedEvents,
      appliedAt: new Date().toISOString(),
      ...(applyResult && { applyResult }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Dead click action analysis error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dead-click-actions
 * 
 * Accepts dead click events and optionally applies the generated patches
 * 
 * Body:
 * - events: AnalyticsEvent[] - dead click events to analyze
 * - useLLM: boolean (default true) - use LLM for analysis
 * - apply: boolean (default false) - apply the generated patches
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { events, useLLM = true, apply = false } = body as {
      events?: AnalyticsEvent[];
      useLLM?: boolean;
      apply?: boolean;
    };

    // If no events provided, load from file
    const eventsToAnalyze = events && Array.isArray(events) && events.length > 0
      ? events
      : await loadEvents();

    // Analyze the provided events
    const result = await analyzeDeadClicksForActionMapping(eventsToAnalyze, { useLLM });

    // Validate mappings
    const validatedMappings = result.mappings.map((mapping) => {
      const validation = validateMapping(mapping);
      return {
        ...mapping,
        validationResult: validation,
      };
    });

    const primaryMapping = validatedMappings.find((m) => m.validationResult.valid);

    // If apply=true, apply the patches
    let applyResult = null;
    if (apply && primaryMapping?.generatedCode?.patches) {
      // First validate all patches
      const validations = await Promise.all(
        primaryMapping.generatedCode.patches.map(validateCodePatch)
      );
      
      const allValid = validations.every((v) => v.valid);
      
      if (allValid) {
        applyResult = await applyCodePatches(primaryMapping.generatedCode.patches);
      } else {
        applyResult = {
          success: false,
          error: 'Patch validation failed',
          validationIssues: validations.flatMap((v) => v.issues),
        };
      }
    }

    return NextResponse.json({
      success: true,
      mapping: primaryMapping || validatedMappings[0],
      allMappings: validatedMappings,
      summary: result.summary,
      enrichedEvents: result.enrichedEvents,
      appliedAt: new Date().toISOString(),
      ...(applyResult && { applyResult }),
    });
  } catch (error) {
    console.error('Dead click action analysis error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/dead-click-actions
 * 
 * Apply specific patches to files
 * 
 * Body:
 * - patches: CodePatch[] - patches to apply
 * - validate: boolean (default true) - validate before applying
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { patches, validate = true } = body as {
      patches: CodePatch[];
      validate?: boolean;
    };

    if (!patches || !Array.isArray(patches) || patches.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request: patches array required',
        },
        { status: 400 }
      );
    }

    // Validate patches if requested
    if (validate) {
      const validations = await Promise.all(patches.map(validateCodePatch));
      const invalidPatches = validations
        .map((v, i) => ({ ...v, patch: patches[i] }))
        .filter((v) => !v.valid);

      if (invalidPatches.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Patch validation failed',
          invalidPatches: invalidPatches.map((p) => ({
            filePath: p.patch.filePath,
            issues: p.issues,
          })),
        });
      }
    }

    // Apply patches
    const result = await applyCodePatches(patches);

    return NextResponse.json({
      success: result.allApplied,
      results: result.results.map((r) => ({
        filePath: r.patch.filePath,
        description: r.patch.description,
        success: r.success,
        error: r.error,
      })),
      appliedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Patch application error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dead-click-actions
 * 
 * Rollback applied patches using the rollback patches
 * 
 * Body:
 * - rollbackPatches: CodePatch[] - rollback patches to apply
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { rollbackPatches } = body as {
      rollbackPatches: CodePatch[];
    };

    if (!rollbackPatches || !Array.isArray(rollbackPatches) || rollbackPatches.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request: rollbackPatches array required',
        },
        { status: 400 }
      );
    }

    // Validate rollback patches
    const validations = await Promise.all(rollbackPatches.map(validateCodePatch));
    const invalidPatches = validations
      .map((v, i) => ({ ...v, patch: rollbackPatches[i] }))
      .filter((v) => !v.valid);

    if (invalidPatches.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Rollback patch validation failed',
        invalidPatches: invalidPatches.map((p) => ({
          filePath: p.patch.filePath,
          issues: p.issues,
        })),
      });
    }

    // Apply rollback patches
    const result = await applyCodePatches(rollbackPatches);

    return NextResponse.json({
      success: result.allApplied,
      message: result.allApplied ? 'Rollback successful' : 'Rollback partially failed',
      results: result.results.map((r) => ({
        filePath: r.patch.filePath,
        description: r.patch.description,
        success: r.success,
        error: r.error,
      })),
      rolledBackAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Rollback error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
