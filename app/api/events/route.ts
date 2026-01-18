/**
 * POST /api/events - Receive and persist tracking events
 * As specified in blip-ship CRO-AGENT-MASTER-DOC.md
 *
 * Extended to support all UX fix types:
 * - Loading states (button_no_feedback)
 * - Image gallery (image_gallery_needed)
 * - Address autocomplete (address_autocomplete_needed)
 * - Product comparison (comparison_feature_needed)
 * - Color preview (color_preview_needed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { appendEvents, readEvents, readUIIssues, writeUIIssues } from '../../../lib/db';
import { detectIssues } from '../../../lib/issue-detector';
import { hasSignificantDeadClickPattern, analyzeDeadClicksForActionMapping, applyCodePatches, processIssueWithLLM, writeNewFiles } from '../../../lib/ux-detection';
import { validateFixPatches, getValidationSummary, validateFixPatchesWithGuardrails, getDynamicValidationSummary, validateAllPatchesSyntax } from '../../../lib/fix-validators';
import { getFallbackFix, hasFallback, applyFallbackPatch } from '../../../lib/fallback-generators';
import { promises as fs } from 'fs';
import path from 'path';
import type { AnalyticsEvent } from '../../../types/events';
import type { UIIssue } from '../../../lib/types';
import type { LLMPipelineResult } from '../../../types/suggestions';

// Config for auto-detection trigger
const AUTO_DETECT_THRESHOLD = 10; // Trigger after this many events (lowered for testing)
const AUTO_DETECT_COOLDOWN = 30 * 1000; // Don't re-run within 30 seconds (lowered for testing)

// Config for Gemini LLM trigger (separate from rule-based)
const DEAD_CLICK_LLM_THRESHOLD = 3; // Min dead clicks before considering LLM (lowered for testing)
const DEAD_CLICK_LLM_COOLDOWN = 10 * 1000; // Don't re-run LLM within 10 seconds (lowered for testing)

// Track last detection times (in-memory for simplicity)
let lastDetectionTime = 0;
let lastLLMAnalysisTime = 0;
let lastCategorizationTime = 0;
let lastNavFilterTime = 0;
const CATEGORIZATION_COOLDOWN = 5 * 1000; // 5 seconds between categorizations
const NAV_FILTER_COOLDOWN = 10 * 1000; // 10 seconds between nav filter generations

// Track products that have been categorized to avoid re-categorizing
const categorizedProducts = new Set<string>();

// Track if nav filter has been generated
let navFilterGenerated = false;

// Store pending LLM-generated fixes (in-memory for now)
export const pendingFixes: Array<{
  id: string;
  generatedAt: string;
  mapping: unknown;
  applied: boolean;
  fixType?: string;
  validationResult?: ReturnType<typeof validateFixPatches>;
}> = [];

// Store file backups for easy revert (in-memory)
export const fileBackups: Map<string, {
  originalContent: string;
  backedUpAt: string;
  fixId: string;
}> = new Map();

// Pattern ID to fix type mapping
const PATTERN_TO_FIX_TYPE: Record<string, string> = {
  button_no_feedback: 'loading_state',
  image_gallery_needed: 'image_gallery',
  address_autocomplete_needed: 'address_autocomplete',
  comparison_feature_needed: 'product_comparison',
  color_preview_needed: 'color_preview',
  click_frustration: 'loading_state', // Can map to multiple, use context
};

/**
 * Process detected issues and generate fixes based on pattern type
 * Uses LLM pipeline first, falls back to hardcoded fixes if LLM fails
 *
 * Enhanced to support:
 * - New file generation (e.g., CompareContext.tsx, CompareDrawer.tsx)
 * - Agent-specific prompts loaded dynamically
 * - Theme guardrails validation
 */
async function processIssuesForAutoFix(issues: UIIssue[]): Promise<void> {
  for (const issue of issues) {
    const fixType = PATTERN_TO_FIX_TYPE[issue.patternId];

    if (!fixType) {
      console.log(`⚠️ [Auto-Fix] No fix type mapping for pattern: ${issue.patternId}`);
      continue;
    }

    console.log(`🔧 [Auto-Fix] Processing ${issue.patternId} -> ${fixType}`);
    console.log(`   Problem: ${issue.problemStatement}`);
    console.log(`   Severity: ${issue.severity}, Events: ${issue.eventCount}, Sessions: ${issue.uniqueSessions}`);

    // Try LLM pipeline first (now with agent prompts and newFiles support)
    console.log(`🤖 [Auto-Fix] Sending to LLM for fix generation...`);
    const llmResult: LLMPipelineResult = await processIssueWithLLM(issue);

    const hasNewFiles = llmResult.newFiles && llmResult.newFiles.length > 0;
    const hasPatches = llmResult.patches && llmResult.patches.length > 0;

    if (llmResult.success && (hasNewFiles || hasPatches)) {
      console.log(`✅ [Auto-Fix] LLM generated:`);
      console.log(`   - ${llmResult.newFiles?.length || 0} new file(s)`);
      console.log(`   - ${llmResult.patches?.length || 0} patch(es)`);
      if (llmResult.agentUsed) {
        console.log(`   - Agent used: ${llmResult.agentUsed}`);
      }
      console.log(`   Explanation: ${llmResult.explanation.substring(0, 100)}...`);

      const fixId = `fix_${Date.now()}_${issue.patternId}`;
      let allApplied = true;

      try {
        // Step 1: Create new files FIRST (before patches, since patches may reference them)
        if (hasNewFiles) {
          console.log(`📁 [Auto-Fix] Creating ${llmResult.newFiles!.length} new file(s)...`);
          const newFilesResult = await writeNewFiles(llmResult.newFiles!);

          if (!newFilesResult.success) {
            console.log(`⚠️ [Auto-Fix] Some new files failed to create`);
            newFilesResult.results.forEach(r => {
              if (!r.success) {
                console.log(`   ✗ ${r.path}: ${r.error}`);
                allApplied = false;
              } else {
                console.log(`   ✓ Created ${r.path}`);
              }
            });
          } else {
            console.log(`✅ [Auto-Fix] All new files created successfully`);
          }
        }

        // Step 2: Backup existing files before applying patches
        if (hasPatches) {
          console.log(`📦 [Auto-Fix] Backing up files for patches...`);
          for (const patch of llmResult.patches!) {
            if (!fileBackups.has(patch.filePath)) {
              try {
                const fullPath = path.join(process.cwd(), patch.filePath);
                const content = await fs.readFile(fullPath, 'utf-8');
                fileBackups.set(patch.filePath, {
                  originalContent: content,
                  backedUpAt: new Date().toISOString(),
                  fixId,
                });
                console.log(`   📦 Backed up ${patch.filePath}`);
              } catch (backupErr) {
                console.log(`   ⚠️ Could not backup ${patch.filePath}: ${backupErr}`);
              }
            }
          }

          // Step 3: Validate patches against DYNAMIC theme guardrails
          console.log(`🔍 [Auto-Fix] Validating patches against dynamic site guardrails...`);
          const validationResult = await validateFixPatchesWithGuardrails(llmResult.patches!);

          console.log(`   Guardrails source: ${validationResult.guardrailsSource}`);
          if (!validationResult.valid) {
            console.log(`⚠️ [Auto-Fix] Validation warnings/errors:`);
            console.log(getDynamicValidationSummary(validationResult));
            // Continue anyway for non-blocking warnings, but log for visibility
          } else {
            console.log(`✅ [Auto-Fix] Patches passed dynamic theme validation`);
          }

          // Step 4: Validate syntax BEFORE applying patches
          console.log(`🔍 [Auto-Fix] Validating patch syntax...`);
          const syntaxValidation = await validateAllPatchesSyntax(llmResult.patches!);

          if (!syntaxValidation.valid) {
            console.log(`❌ [Auto-Fix] Syntax validation FAILED - patches would break the code`);
            console.log(syntaxValidation.summary);
            syntaxValidation.results.filter(r => !r.valid).forEach(r => {
              console.log(`   ✗ ${r.patch.filePath}: ${r.errors.join(', ')}`);
            });
            // Skip applying these broken patches
            pendingFixes.push({
              id: fixId,
              generatedAt: new Date().toISOString(),
              mapping: {
                issue,
                fixType,
                llmGenerated: true,
                agentUsed: llmResult.agentUsed,
                error: 'Syntax validation failed - patches would create invalid code',
                syntaxErrors: syntaxValidation.results.filter(r => !r.valid).map(r => ({
                  file: r.patch.filePath,
                  errors: r.errors,
                })),
              },
              applied: false,
              fixType,
            });
            continue; // Skip to next issue
          }
          console.log(`✅ [Auto-Fix] Syntax validation passed`);

          // Step 5: Apply patches
          console.log(`🔧 [Auto-Fix] Applying patches...`);
          const applyResult = await applyCodePatches(llmResult.patches!);

          if (!applyResult.allApplied) {
            allApplied = false;
            console.log(`⚠️ [Auto-Fix] Some patches failed to apply`);
            applyResult.results.forEach((r, i) => {
              if (!r.success) {
                console.log(`   Patch ${i + 1} failed: ${r.error}`);
              }
            });
          } else {
            console.log(`✅ [Auto-Fix] All patches applied successfully!`);
          }
        }

        // Record the fix
        pendingFixes.push({
          id: fixId,
          generatedAt: new Date().toISOString(),
          mapping: {
            issue,
            fixType,
            llmGenerated: true,
            agentUsed: llmResult.agentUsed,
            newFiles: llmResult.newFiles,
            patches: llmResult.patches,
            explanation: llmResult.explanation,
          },
          applied: allApplied,
          fixType,
        });

        if (allApplied) {
          console.log(`✅ [Auto-Fix] Fix ${fixId} completed successfully!`);
        }
      } catch (applyErr) {
        console.error(`❌ [Auto-Fix] Failed to apply fix:`, applyErr);
        pendingFixes.push({
          id: fixId,
          generatedAt: new Date().toISOString(),
          mapping: {
            issue,
            fixType,
            llmGenerated: true,
            error: String(applyErr),
          },
          applied: false,
          fixType,
        });
      }
    } else {
      // Fall back to hardcoded fixes
      console.log(`⚠️ [Auto-Fix] LLM failed or returned no fixes, trying fallback...`);
      if (llmResult.error) {
        console.log(`   LLM error: ${llmResult.error}`);
      }

      if (hasFallback(fixType as 'loading_state' | 'image_gallery' | 'address_autocomplete' | 'product_comparison' | 'color_preview' | 'unknown')) {
        const fallback = getFallbackFix(fixType as 'loading_state' | 'image_gallery' | 'address_autocomplete' | 'product_comparison' | 'color_preview' | 'unknown');
        if (fallback) {
          console.log(`   ✓ Fallback available: ${fallback.explanation}`);

          // Apply fallback patches using regex-based applyFallbackPatch
          let allApplied = true;
          for (const patch of fallback.patches) {
            try {
              const filePath = path.join(process.cwd(), patch.filePath);
              const content = await fs.readFile(filePath, 'utf-8');
              const result = applyFallbackPatch(content, patch);
              if (result.success) {
                await fs.writeFile(filePath, result.result, 'utf-8');
                console.log(`   ✓ Applied fallback patch to ${patch.filePath}`);
              } else {
                allApplied = false;
                console.log(`   ✗ Fallback patch failed: ${result.error}`);
              }
            } catch (err) {
              allApplied = false;
              console.log(`   ✗ Error applying fallback: ${err}`);
            }
          }

          pendingFixes.push({
            id: `fix_${Date.now()}_${issue.patternId}`,
            generatedAt: new Date().toISOString(),
            mapping: {
              issue,
              fixType,
              fallback: true,
              explanation: fallback.explanation,
            },
            applied: allApplied,
            fixType,
          });
        }
      } else {
        console.log(`   ✗ No fallback available for ${fixType}`);
      }
    }
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

          // Process issues for auto-fix generation (async, don't block)
          processIssuesForAutoFix(trulyNewIssues).catch(err => {
            console.error('❌ [Auto-Fix] Error processing issues:', err);
          });
        }
      }
    }

    // Check for significant dead click patterns and trigger Gemini analysis
    const deadClickEvents = allEvents.filter(e => e.type === 'dead_click');
    const llmCooldownPassed = (now - lastLLMAnalysisTime) > DEAD_CLICK_LLM_COOLDOWN;

    if (deadClickEvents.length >= DEAD_CLICK_LLM_THRESHOLD && llmCooldownPassed) {
      // Check if we have a significant pattern worth analyzing
      const patternCheck = hasSignificantDeadClickPattern(allEvents);

      if (patternCheck.hasIssue && patternCheck.severity !== 'low') {
        console.log(`🤖 [Gemini] Significant dead click pattern detected (${patternCheck.severity}). Triggering LLM analysis...`);
        console.log(`   Stats: ${patternCheck.quickStats.rapidClicks} rapid clicks, ${patternCheck.quickStats.totalDeadClicks} total clicks, ${patternCheck.quickStats.uniqueSessions} sessions`);
        console.log(`   This will auto-generate onClick + cursor:pointer for product images`);

        lastLLMAnalysisTime = now;

        // Run Gemini analysis in background (don't block response)
        // LLM now receives actual source code via formatIssueForLLM
        analyzeDeadClicksForActionMapping(allEvents, { useLLM: true })
          .then(async (result) => {
            if (result.mappings.length > 0) {
              console.log(`✅ [Gemini] Generated ${result.mappings.length} fix(es)!`);

              for (let i = 0; i < result.mappings.length; i++) {
                const mapping = result.mappings[i];
                const fixId = `fix_${Date.now()}_${i}`;

                console.log(`   - Fix ${fixId}: ${mapping.actionMapping?.suggestedAction?.actionType || 'unknown action'}`);

                // Auto-apply the fix if it has patches
                if (mapping.generatedCode?.patches && mapping.generatedCode.patches.length > 0) {
                  console.log(`🔧 [Auto-Apply] Validating and applying fix ${fixId}...`);

                  try {
                    // Validate syntax BEFORE applying
                    const syntaxValidation = await validateAllPatchesSyntax(mapping.generatedCode.patches);
                    if (!syntaxValidation.valid) {
                      console.log(`❌ [Auto-Apply] Syntax validation FAILED for fix ${fixId}`);
                      console.log(syntaxValidation.summary);
                      pendingFixes.push({
                        id: fixId,
                        generatedAt: new Date().toISOString(),
                        mapping: {
                          ...mapping,
                          syntaxError: 'Patches would create invalid code',
                        },
                        applied: false,
                      });
                      continue; // Skip to next mapping
                    }

                    const applyResult = await applyCodePatches(mapping.generatedCode.patches);
                    if (applyResult.allApplied) {
                      console.log(`✅ [Auto-Apply] Fix ${fixId} applied successfully!`);
                      pendingFixes.push({
                        id: fixId,
                        generatedAt: new Date().toISOString(),
                        mapping,
                        applied: true,
                      });
                    } else {
                      console.log(`⚠️ [Auto-Apply] Fix ${fixId} partially applied`);
                      pendingFixes.push({
                        id: fixId,
                        generatedAt: new Date().toISOString(),
                        mapping,
                        applied: false,
                      });
                    }
                  } catch (applyErr) {
                    console.error(`❌ [Auto-Apply] Failed to apply fix ${fixId}:`, applyErr);
                    pendingFixes.push({
                      id: fixId,
                      generatedAt: new Date().toISOString(),
                      mapping,
                      applied: false,
                    });
                  }
                } else {
                  pendingFixes.push({
                    id: fixId,
                    generatedAt: new Date().toISOString(),
                    mapping,
                    applied: false,
                  });
                }
              }
            }
          })
          .catch(err => {
            console.error(`❌ [Gemini] Analysis failed:`, err);
          });
      }
    }

    // Check for rage clicks on product images to trigger categorization
    const rageClickEvents = allEvents.filter(e => e.type === 'rage_click');
    const categorizationCooldownPassed = (now - lastCategorizationTime) > CATEGORIZATION_COOLDOWN;
    
    if (rageClickEvents.length > 0 && categorizationCooldownPassed) {
      // Filter recent rage clicks (last 30 seconds) on product images
      // Using type assertion since productId is added dynamically by the tracker
      const RECENT_WINDOW_MS = 30 * 1000;
      type EventWithProduct = AnalyticsEvent & { productId?: string };
      const recentRageClicks = (rageClickEvents as EventWithProduct[]).filter(e => 
        (now - e.timestamp) < RECENT_WINDOW_MS &&
        e.elementSelector === 'img' &&
        e.productId &&
        !categorizedProducts.has(e.productId)
      );
      
      // Group by product
      const rageClicksByProduct = new Map<string, typeof recentRageClicks>();
      for (const event of recentRageClicks) {
        if (!event.productId) continue;
        const existing = rageClicksByProduct.get(event.productId) || [];
        existing.push(event);
        rageClicksByProduct.set(event.productId, existing);
      }

      // Find products with 3+ rage click events (indicating user frustration)
      for (const [productId, clicks] of rageClicksByProduct) {
        // Check if total click count from rage click events >= 3
        const totalClickCount = clicks.reduce((sum, c) => sum + (c.clickCount || 1), 0);
        
        if (totalClickCount >= 3) {
          const product = clicks[0];
          console.log(`\n🏷️ [Categorize] Detected ${totalClickCount} rage clicks on product ${productId}`);
          
          lastCategorizationTime = now;
          categorizedProducts.add(productId);
          
          // Read config to get product image
          try {
            const configPath = path.join(process.cwd(), 'data/config-live.json');
            const configContent = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            const productData = config.products.items.find((p: { id: string }) => p.id === productId);
            
            if (productData) {
              console.log(`   Triggering LLM categorization for: ${productData.name}`);
              
              // Call categorization API in background
              fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/categorize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  productId,
                  productName: productData.name,
                  imageUrl: productData.image,
                }),
              })
                .then(res => res.json())
                .then(result => {
                  if (result.success) {
                    console.log(`   ✅ Product ${productId} categorized as: ${result.newCategory}`);
                  } else {
                    console.log(`   ❌ Categorization failed:`, result.error);
                  }
                })
                .catch(err => {
                  console.error(`   ❌ Categorization request failed:`, err);
                });
            }
          } catch (err) {
            console.error(`   ❌ Failed to read config for categorization:`, err);
          }
          
          break; // Only categorize one product per request to avoid spam
        }
      }
    }

    // Check for rage clicks on Men/Women nav buttons to trigger filter generation
    const navFilterCooldownPassed = (now - lastNavFilterTime) > NAV_FILTER_COOLDOWN;
    
    // Debug logging
    console.log(`\n🧭 [Nav Filter Debug] Checking for nav rage clicks...`);
    console.log(`   - navFilterGenerated: ${navFilterGenerated}`);
    console.log(`   - cooldownPassed: ${navFilterCooldownPassed}`);
    console.log(`   - Total rage clicks in allEvents: ${rageClickEvents.length}`);
    
    if (rageClickEvents.length > 0) {
      console.log(`   - Sample rage click:`, JSON.stringify(rageClickEvents[0], null, 2).substring(0, 300));
    }
    
    if (!navFilterGenerated && navFilterCooldownPassed) {
      // Look for rage clicks on nav buttons (Men or Women)
      const RECENT_WINDOW_MS = 30 * 1000;
      const recentNavRageClicks = rageClickEvents.filter(e => {
        const isRecent = (now - e.timestamp) < RECENT_WINDOW_MS;
        const isButton = e.elementSelector === 'button';
        const isNavButton = e.elementText === 'Men' || e.elementText === 'Women';
        console.log(`   - Event check: recent=${isRecent}, button=${isButton}, navButton=${isNavButton}, text="${e.elementText}"`);
        return isRecent && isButton && isNavButton;
      });
      
      console.log(`   - Matching nav rage clicks: ${recentNavRageClicks.length}`);
      
      // Check if we have 3+ rapid clicks on nav buttons
      const totalNavClicks = recentNavRageClicks.reduce((sum, c) => sum + (c.clickCount || 1), 0);
      console.log(`   - Total nav click count: ${totalNavClicks}`);
      
      if (totalNavClicks >= 3) {
        const clickedNav = recentNavRageClicks[0]?.elementText || 'Men/Women';
        console.log(`\n🧭 [Nav Filter] Detected ${totalNavClicks} rage clicks on "${clickedNav}" nav button`);
        console.log(`   Triggering LLM to generate filtering functionality...`);
        
        lastNavFilterTime = now;
        
        // Call the nav filter generation API
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate-filter`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            triggerButton: clickedNav,
            rageClickCount: totalNavClicks,
          }),
        })
          .then(res => res.json())
          .then(result => {
            if (result.success) {
              console.log(`   ✅ Filter code generated and applied!`);
              navFilterGenerated = true;
            } else {
              console.log(`   ❌ Filter generation failed:`, result.error);
            }
          })
          .catch(err => {
            console.error(`   ❌ Filter generation request failed:`, err);
          });
      }
    }

    return NextResponse.json({
      success: true,
      received: validatedEvents.length,
      totalEvents: allEvents.length,
      deadClickCount: allEvents.filter(e => e.type === 'dead_click').length,
      rageClickCount: rageClickEvents.length,
      detectionTriggered,
      issuesDetected: detectionTriggered ? issuesDetected : undefined,
      pendingFixes: pendingFixes.filter(f => !f.applied).length,
      navFilterGenerated,
    });
  } catch (error) {
    console.error('Error processing events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/events - Get event stats and pending fixes
export async function GET() {
  try {
    const allEvents = await readEvents();
    const deadClickEvents = allEvents.filter(e => e.type === 'dead_click');
    const rageClickEvents = allEvents.filter(e => e.type === 'rage_click');
    const doubleClickEvents = allEvents.filter(e => e.type === 'double_click');

    // Group pending fixes by type
    const fixesByType: Record<string, number> = {};
    pendingFixes.forEach(f => {
      const type = f.fixType || 'unknown';
      fixesByType[type] = (fixesByType[type] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      totalEvents: allEvents.length,
      eventCounts: {
        dead_click: deadClickEvents.length,
        rage_click: rageClickEvents.length,
        double_click: doubleClickEvents.length,
      },
      pendingFixes: pendingFixes.filter(f => !f.applied),
      appliedFixes: pendingFixes.filter(f => f.applied),
      fixesByType,
    });
  } catch (error) {
    console.error('Error getting events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/events - Revert all applied fixes (for testing)
export async function DELETE() {
  try {
    console.log('\n🔄 [Revert] Reverting all applied fixes...');
    const revertedFiles: string[] = [];
    const errors: string[] = [];

    for (const [filePath, backup] of fileBackups.entries()) {
      try {
        const fullPath = path.join(process.cwd(), filePath);
        await fs.writeFile(fullPath, backup.originalContent, 'utf-8');
        revertedFiles.push(filePath);
        console.log(`   ✓ Reverted ${filePath}`);
      } catch (err) {
        const error = `Failed to revert ${filePath}: ${err}`;
        errors.push(error);
        console.log(`   ✗ ${error}`);
      }
    }

    // Clear backups after reverting
    fileBackups.clear();

    // Clear all pending fixes (remove from array)
    pendingFixes.length = 0;

    console.log(`[Revert] Complete: ${revertedFiles.length} files reverted, ${errors.length} errors`);

    return NextResponse.json({
      success: errors.length === 0,
      revertedFiles,
      errors,
      message: `Reverted ${revertedFiles.length} file(s) to original state`,
    });
  } catch (error) {
    console.error('Error reverting:', error);
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
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
