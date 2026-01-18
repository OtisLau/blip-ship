/**
 * POST /api/generate-fix - Manually trigger a fix generation and apply it
 *
 * Body: { fixType: 'loading_state' | 'image_gallery' | 'product_comparison' | ... }
 */

import { NextResponse } from 'next/server';
import { processIssueWithLLM, writeNewFiles, applyCodePatches } from '@/lib/ux-detection';
import { validateFixPatchesWithGuardrails, getDynamicValidationSummary, validateAllPatchesSyntax } from '@/lib/fix-validators';
import { promises as fs } from 'fs';
import path from 'path';
import type { UIIssue } from '@/lib/types';

// Store backups for revert
const backups = new Map<string, string>();

// Fix type to pattern ID mapping
const FIX_TYPE_TO_PATTERN: Record<string, string> = {
  loading_state: 'button_no_feedback',
  image_gallery: 'image_gallery_needed',
  address_autocomplete: 'address_autocomplete_needed',
  product_comparison: 'comparison_feature_needed',
  color_preview: 'color_preview_needed',
};

// Mock issue data for each fix type
const MOCK_ISSUES: Record<string, Partial<UIIssue>> = {
  loading_state: {
    problemStatement: 'Users clicking Add to Cart button receive no visual feedback',
    userIntent: 'User wants immediate confirmation their click was registered',
    currentOutcome: 'No feedback leads to multiple frustrated clicks',
    suggestedFix: 'Add loading spinner and disabled state to button during add-to-cart',
    elementSelector: 'button[data-add-to-cart]',
    componentPath: 'components/store/ProductGrid.tsx',
    componentName: 'ProductGrid',
  },
  image_gallery: {
    problemStatement: 'Users clicking product images expect to see larger/zoom view',
    userIntent: 'User wants to examine product details in full-size view',
    currentOutcome: 'Image clicks do nothing, causing frustration',
    suggestedFix: 'Add image gallery/lightbox that opens on image click',
    elementSelector: 'img[data-product-id]',
    componentPath: 'components/store/ProductGrid.tsx',
    componentName: 'ProductGrid',
  },
  product_comparison: {
    problemStatement: 'Users viewing multiple products want to compare them side by side',
    userIntent: 'User wants to compare features/prices of similar products',
    currentOutcome: 'No comparison feature forces users to switch between products',
    suggestedFix: 'Add compare checkbox and comparison drawer',
    elementSelector: '[data-product-id]',
    componentPath: 'components/store/ProductGrid.tsx',
    componentName: 'ProductGrid',
  },
  color_preview: {
    problemStatement: 'Users want to see available colors before selecting',
    userIntent: 'User wants visual preview of color options',
    currentOutcome: 'Colors only visible in dropdown, no swatches',
    suggestedFix: 'Add color swatches below product price',
    elementSelector: '.product-colors',
    componentPath: 'components/store/ProductGrid.tsx',
    componentName: 'ProductGrid',
  },
  address_autocomplete: {
    problemStatement: 'Users typing addresses manually is slow and error-prone',
    userIntent: 'User wants quick address entry with autocomplete',
    currentOutcome: 'Manual typing leads to errors and abandonment',
    suggestedFix: 'Add Google Places autocomplete to address field',
    elementSelector: 'input[name="address"]',
    componentPath: 'components/store/CartDrawer.tsx',
    componentName: 'CartDrawer',
  },
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fixType, apply = true } = body as { fixType: string; apply?: boolean };

    if (!fixType || !FIX_TYPE_TO_PATTERN[fixType]) {
      return NextResponse.json(
        {
          error: 'Invalid fixType',
          validTypes: Object.keys(FIX_TYPE_TO_PATTERN),
        },
        { status: 400 }
      );
    }

    console.log(`\n🔧 [Generate-Fix] Generating ${fixType} fix...`);

    // Build mock issue
    const patternId = FIX_TYPE_TO_PATTERN[fixType];
    const mockData = MOCK_ISSUES[fixType] || {};

    const issue: UIIssue = {
      id: `manual_fix_${Date.now()}`,
      status: 'detected',
      detectedAt: Date.now(),
      lastOccurrence: Date.now(),
      category: 'frustration',
      severity: 'high',
      patternId,
      elementSelector: mockData.elementSelector || 'unknown',
      sectionId: 'products',
      componentPath: mockData.componentPath || 'components/store/ProductGrid.tsx',
      componentName: mockData.componentName || 'ProductGrid',
      eventCount: 50,
      uniqueSessions: 15,
      sampleEvents: [],
      problemStatement: mockData.problemStatement || `${fixType} issue detected`,
      userIntent: mockData.userIntent || 'User expected better feedback',
      currentOutcome: mockData.currentOutcome || 'Poor experience',
      suggestedFix: mockData.suggestedFix || 'Generate appropriate fix',
    };

    // Generate fix via LLM
    console.log(`🤖 [Generate-Fix] Calling LLM with pattern: ${patternId}`);
    const result = await processIssueWithLLM(issue);

    if (!result.success) {
      console.log(`❌ [Generate-Fix] LLM failed after multiple fix attempts: ${result.error}`);
      return NextResponse.json({
        success: false,
        error: result.error || 'LLM generation failed',
        fixType,
        patternId,
        message: 'LLM could not generate valid patches after multiple attempts. Check the server logs for details.',
      });
    }

    console.log(`✅ [Generate-Fix] LLM generated ${result.patches?.length || 0} patches, ${result.newFiles?.length || 0} new files`);

    // Validate against dynamic guardrails
    if (result.patches && result.patches.length > 0) {
      console.log(`🔍 [Generate-Fix] Validating against dynamic guardrails...`);
      const validation = await validateFixPatchesWithGuardrails(result.patches);
      console.log(getDynamicValidationSummary(validation));

      if (!validation.valid) {
        console.log(`⚠️ [Generate-Fix] Theme validation failed, but continuing...`);
      }

      // CRITICAL: Validate syntax BEFORE applying patches
      console.log(`🔍 [Generate-Fix] Validating syntax (pre-apply check)...`);
      const syntaxValidation = await validateAllPatchesSyntax(result.patches);
      console.log(syntaxValidation.summary);

      if (!syntaxValidation.valid) {
        // This shouldn't happen since processIssueWithLLM now iteratively fixes
        // But if it does, return error with details
        console.log(`❌ [Generate-Fix] Unexpected: Patches from LLM still invalid`);
        return NextResponse.json({
          success: false,
          fixType,
          patternId,
          error: 'Syntax validation failed - patches would create invalid code',
          syntaxErrors: syntaxValidation.results
            .filter(r => !r.valid)
            .map(r => ({ file: r.patch.filePath, errors: r.errors })),
          generated: {
            newFiles: result.newFiles?.length || 0,
            patches: result.patches?.length || 0,
            agentUsed: result.agentUsed,
            explanation: result.explanation,
          },
          applied: false,
          message: 'LLM could not generate valid patches.',
        });
      }
    }

    // Apply if requested
    let applied = false;
    const appliedFiles: string[] = [];
    const errors: string[] = [];

    if (apply) {
      console.log(`🔧 [Generate-Fix] Applying changes...`);

      // Create new files first
      if (result.newFiles && result.newFiles.length > 0) {
        const newFilesResult = await writeNewFiles(result.newFiles);
        result.newFiles.forEach((f, i) => {
          if (newFilesResult.results[i]?.success) {
            appliedFiles.push(f.path);
            console.log(`   ✓ Created ${f.path}`);
          } else {
            errors.push(`Failed to create ${f.path}: ${newFilesResult.results[i]?.error}`);
          }
        });
      }

      // Apply patches (already syntax-validated above)
      if (result.patches && result.patches.length > 0) {
        // Backup first
        for (const patch of result.patches) {
          if (!backups.has(patch.filePath)) {
            try {
              const fullPath = path.join(process.cwd(), patch.filePath);
              const content = await fs.readFile(fullPath, 'utf-8');
              backups.set(patch.filePath, content);
            } catch {
              // File might not exist yet
            }
          }
        }

        const applyResult = await applyCodePatches(result.patches);
        result.patches.forEach((p, i) => {
          if (applyResult.results[i]?.success) {
            appliedFiles.push(p.filePath);
            console.log(`   ✓ Patched ${p.filePath}`);
          } else {
            errors.push(`Failed to patch ${p.filePath}: ${applyResult.results[i]?.error}`);
          }
        });

        applied = applyResult.allApplied;
      }
    }

    return NextResponse.json({
      success: true,
      fixType,
      patternId,
      generated: {
        newFiles: result.newFiles?.length || 0,
        patches: result.patches?.length || 0,
        agentUsed: result.agentUsed,
        explanation: result.explanation,
      },
      applied,
      appliedFiles,
      errors: errors.length > 0 ? errors : undefined,
      patches: result.patches?.map((p) => ({
        file: p.filePath,
        description: p.description,
      })),
      newFiles: result.newFiles?.map((f) => ({
        path: f.path,
        description: f.description,
      })),
    });
  } catch (error) {
    console.error('❌ [Generate-Fix] Error:', error);
    return NextResponse.json(
      {
        error: 'Fix generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET - list available fix types
export async function GET() {
  return NextResponse.json({
    availableFixTypes: Object.keys(FIX_TYPE_TO_PATTERN),
    usage: {
      method: 'POST',
      body: { fixType: 'loading_state', apply: true },
      example: 'curl -X POST http://localhost:3000/api/generate-fix -H "Content-Type: application/json" -d \'{"fixType":"loading_state"}\'',
    },
  });
}
