/**
 * POST /api/identity-fix
 *
 * Identity-based CRO fix flow:
 * 1. Load events from session or request
 * 2. Classify user identity (frustrated, overwhelmed, etc.)
 * 3. Get UI recommendations for that identity
 * 4. Map recommendations to specific element changes
 * 5. Apply config changes and create PR
 * 6. Send approval email
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { readEvents, getConfig, saveConfig } from '@/lib/db';
import { computeUserIdentity } from '@/lib/behavioral-vector';
import { getUIRecommendations, isIdentityClassifierConfigured, classifyUserIdentity } from '@/lib/identity-classifier';
import {
  mapRecommendationsToChanges,
  validateElementTargets,
  toFixRecommendation,
  describeMapping,
  IdentityFixMapping,
} from '@/lib/identity-to-fix-mapper';
import { sendFixApprovalEmail, isSendGridConfigured, generateScreenshots } from '@/lib/email-service';
import { saveFix } from '@/lib/fix-store';
import type { AnalyticsEvent } from '@/types/events';
import type { Suggestion, SiteConfig } from '@/lib/types';

const execAsync = promisify(exec);

async function gitCommand(command: string): Promise<string> {
  const repoPath = process.cwd();
  try {
    const { stdout, stderr } = await execAsync(`git ${command}`, { cwd: repoPath });
    if (stderr && !stderr.includes('Switched to') && !stderr.includes('Already')) {
      console.log('[Git stderr]:', stderr);
    }
    return stdout.trim();
  } catch (error) {
    console.error('[Git error]:', error);
    throw error;
  }
}

async function ghCommand(command: string): Promise<string> {
  const repoPath = process.cwd();
  try {
    const { stdout, stderr } = await execAsync(`gh ${command}`, { cwd: repoPath });
    if (stderr) {
      console.log('[GH stderr]:', stderr);
    }
    return stdout.trim();
  } catch (error) {
    console.error('[GH error]:', error);
    throw error;
  }
}

interface IdentityFixRequest {
  sessionId?: string;
  events?: AnalyticsEvent[];
  dryRun?: boolean;
  useGemini?: boolean;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const logs: string[] = [];

  const log = (msg: string) => {
    const elapsed = Date.now() - startTime;
    const entry = `[${elapsed}ms] ${msg}`;
    logs.push(entry);
    console.log(entry);
  };

  try {
    log('Starting identity-fix flow');

    // Parse request
    const body: IdentityFixRequest = await request.json();
    const { sessionId, events: providedEvents, dryRun = false, useGemini = true } = body;

    // 1. Load events
    log('Loading events...');
    let events: AnalyticsEvent[];

    if (providedEvents && providedEvents.length > 0) {
      events = providedEvents;
      log(`Using ${events.length} provided events`);
    } else {
      const allEvents = await readEvents();
      events = sessionId
        ? allEvents.filter(e => e.sessionId === sessionId)
        : allEvents;
      events = events.slice(-50); // Last 50 events
      log(`Loaded ${events.length} events from ${sessionId || 'all sessions'}`);
    }

    if (events.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No events found',
        hint: sessionId ? `No events for session ${sessionId}` : 'No events in data/events.json',
        logs,
      }, { status: 404 });
    }

    // 2. Classify identity
    log('Classifying user identity...');
    let identity;
    if (useGemini && isIdentityClassifierConfigured()) {
      identity = await classifyUserIdentity(events);
      log(`Gemini classified: ${identity.state} (${(identity.confidence * 100).toFixed(0)}%)`);
    } else {
      identity = computeUserIdentity(events);
      log(`Rule-based classified: ${identity.state} (${(identity.confidence * 100).toFixed(0)}%)`);
    }

    // 3. Get UI recommendations
    log('Getting UI recommendations...');
    const recommendations = getUIRecommendations(identity.state);
    log(`Recommendations: simplify=${recommendations.simplify_layout}, trust=${recommendations.show_trust_badges}, cta=${recommendations.cta_style}`);

    // 4. Map to element changes
    log('Mapping recommendations to element changes...');
    const mapping = mapRecommendationsToChanges(
      identity.state,
      identity.confidence,
      recommendations
    );

    if (mapping.elementChanges.length === 0) {
      return NextResponse.json({
        success: false,
        message: `No specific fixes defined for "${identity.state}" identity state`,
        identity: {
          state: identity.state,
          confidence: identity.confidence,
          reasoning: identity.reasoning,
        },
        recommendations,
        logs,
      });
    }

    log(`Mapped ${mapping.elementChanges.length} element changes`);

    // Validate targets
    const { valid, invalid, indexLoaded } = await validateElementTargets(mapping.elementChanges);
    if (invalid.length > 0) {
      log(`Warning: ${invalid.length} changes could not be validated`);
    }
    if (indexLoaded) {
      log(`Validated ${valid.length} changes against element index`);
    }

    // 5. If dry run, return mapping without applying
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        duration: Date.now() - startTime,
        identity: {
          state: identity.state,
          confidence: identity.confidence,
          reasoning: identity.reasoning,
        },
        recommendations,
        mapping: {
          summary: mapping.summary,
          expectedImpact: mapping.expectedImpact,
          rationale: mapping.rationale,
          changes: mapping.elementChanges,
        },
        description: describeMapping(mapping),
        logs,
      });
    }

    // 6. Apply config changes
    log('Applying config changes...');
    const config = await getConfig('live');
    const originalConfig = JSON.parse(JSON.stringify(config)); // Deep clone

    // Apply each config change
    for (const change of mapping.elementChanges) {
      if (change.changeType === 'config') {
        applyConfigChange(config, change.property, change.newValue);
        log(`  Applied: ${change.property} = "${change.newValue}"`);
      }
    }

    // 7. Create branch and commit
    log('Creating fix branch...');
    const originalBranch = await gitCommand('rev-parse --abbrev-ref HEAD');
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const shortId = identity.state.slice(0, 8);
    const branchName = `fix/identity-${shortId}-${timestamp}`;

    await gitCommand('fetch origin main');
    await gitCommand(`checkout -b ${branchName} origin/main`);
    log(`Created branch: ${branchName}`);

    // Save config
    await saveConfig('live', config);
    log('Saved config changes');

    // Stage and commit
    await gitCommand('add data/config-live.json');

    const commitMessage = `fix(identity): ${mapping.summary}

Identity-based CRO fix for "${identity.state}" users.

User Behavior:
- Identity State: ${identity.state}
- Confidence: ${(identity.confidence * 100).toFixed(0)}%
- ${identity.reasoning}

Changes Applied:
${mapping.elementChanges.map(c => `- ${c.property}: "${c.oldValue}" → "${c.newValue}"`).join('\n')}

Expected Impact: ${mapping.expectedImpact}

Co-Authored-By: CRO Agent <cro-agent@blip.ship>`;

    const tmpFile = path.join(process.cwd(), '.git', 'COMMIT_MSG_TMP');
    await fs.writeFile(tmpFile, commitMessage);
    await gitCommand(`commit -F "${tmpFile}"`);
    await fs.unlink(tmpFile);
    log('Committed changes');

    // Push branch
    log('Pushing to remote...');
    await gitCommand(`push -u origin ${branchName}`);

    // Create PR using gh CLI
    let prUrl = '';
    let prNumber = 0;
    try {
      const prTitle = `🧠 Identity Fix: ${identity.state} → ${mapping.summary}`;
      const prBody = `## User Identity Analysis

**State:** \`${identity.state}\`
**Confidence:** ${(identity.confidence * 100).toFixed(0)}%

### Behavioral Signals
${identity.reasoning}

## UI Recommendations Applied
- Simplify Layout: ${recommendations.simplify_layout ? '✅' : '❌'}
- Show Trust Badges: ${recommendations.show_trust_badges ? '✅' : '❌'}
- CTA Style: ${recommendations.cta_style}
- Urgency: ${recommendations.urgency}

## Changes
${mapping.elementChanges.map(c => `- **${c.property}**: \`"${c.oldValue}"\` → \`"${c.newValue}"\`
  - *${c.reason}*`).join('\n')}

## Expected Impact
${mapping.expectedImpact}

---
🤖 Generated by Identity-Based CRO Agent`;

      const tmpPrBody = path.join(process.cwd(), '.git', 'PR_BODY_TMP');
      await fs.writeFile(tmpPrBody, prBody);
      const prResult = await ghCommand(`pr create --title "${prTitle}" --body-file "${tmpPrBody}"`);
      await fs.unlink(tmpPrBody);
      prUrl = prResult.trim();
      const prMatch = prUrl.match(/\/pull\/(\d+)/);
      prNumber = prMatch ? parseInt(prMatch[1], 10) : 0;
      log(`Created PR: ${prUrl}`);
    } catch (prError) {
      log(`Warning: Could not create PR via gh CLI: ${prError}`);
      try {
        const remoteUrl = await gitCommand('remote get-url origin');
        const repoMatch = remoteUrl.match(/github\.com[:/](.+?)(?:\.git)?$/);
        if (repoMatch) {
          prUrl = `https://github.com/${repoMatch[1]}/compare/main...${branchName}`;
        }
      } catch {
        prUrl = '';
      }
    }

    // Return to original branch
    await gitCommand(`checkout ${originalBranch}`);
    log('Returned to original branch');

    // Restore original config on main branch
    await saveConfig('live', originalConfig);
    log('Restored original config on main branch');

    // 8. Send approval email with screenshots
    const ownerEmail = originalConfig.ownerEmail;
    let emailSent = false;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const fixId = `identity_${identity.state}_${Date.now()}`;

    const suggestionAdapter: Suggestion = {
      id: fixId,
      createdAt: Date.now(),
      status: 'pending',
      analysis: {
        summary: `User identified as "${identity.state}" with ${(identity.confidence * 100).toFixed(0)}% confidence`,
        insights: [identity.reasoning],
        dataPoints: [{
          metric: 'Confidence',
          value: identity.confidence,
          interpretation: `${(identity.confidence * 100).toFixed(0)}% confident in this user identity`,
        }],
      },
      recommendation: {
        summary: mapping.summary,
        rationale: mapping.rationale,
        expectedImpact: mapping.expectedImpact,
      },
      changes: mapping.elementChanges.map(c => ({
        field: c.property,
        oldValue: c.oldValue,
        newValue: c.newValue,
        reason: c.reason,
      })),
      previewConfig: config,
    };

    const fixAdapter = {
      id: `identityfix_${Date.now()}`,
      suggestionId: fixId,
      createdAt: Date.now(),
      status: 'pending' as const,
      configChanges: mapping.elementChanges.map(c => ({
        path: c.property,
        oldValue: c.oldValue,
        newValue: c.newValue,
      })),
      affectedFiles: [{
        path: 'data/config-live.json',
        changeType: 'modify' as const,
        diff: generateConfigDiff(originalConfig, config),
      }],
      metadata: {
        estimatedImpact: mapping.expectedImpact,
        rollbackPlan: `Revert branch ${branchName}`,
        testingNotes: `Test with simulated ${identity.state} user behavior`,
      },
    };

    // Save fix to store so approval page can find it
    const storedPrNumber = prNumber || undefined;

    const prInfo = {
      id: `pr_${Date.now()}`,
      number: storedPrNumber,
      branchName,
      title: `Identity Fix: Optimize for ${identity.state} users`,
      description: mapping.summary,
      status: 'open' as const,
      url: prUrl || undefined,
      fixId: fixAdapter.id,
      suggestionId: fixId,
    };
    await saveFix(suggestionAdapter, fixAdapter, prInfo);
    log(`Saved fix to store with ID: ${fixId}`);

    // Generate screenshots by temporarily saving preview config
    let screenshots = {
      currentScreenshotUrl: `${baseUrl}/store`,
      proposedScreenshotUrl: `${baseUrl}/store?mode=preview`,
      isEmbedded: false,
    };

    try {
      log('Generating before/after screenshots...');
      // Save the modified config as preview so screenshots can capture it
      await saveConfig('preview', config);
      log('Saved preview config for screenshots');

      // Capture screenshots
      const screenshotResult = await generateScreenshots(suggestionAdapter, baseUrl);
      if (screenshotResult.currentUrl && screenshotResult.proposedUrl) {
        screenshots = {
          currentScreenshotUrl: screenshotResult.currentUrl,
          proposedScreenshotUrl: screenshotResult.proposedUrl,
          isEmbedded: screenshotResult.isEmbedded,
        };
        log(`Screenshots captured: ${screenshotResult.isEmbedded ? 'embedded' : 'hosted on Cloudinary'}`);
      } else {
        log('Warning: Screenshots not available, using store URLs');
      }
    } catch (screenshotError) {
      log(`Warning: Screenshot capture failed: ${screenshotError}`);
    }

    if (!ownerEmail) {
      log('Warning: No owner email configured, skipping email');
    } else if (!isSendGridConfigured()) {
      log('Warning: SendGrid not configured, skipping email');
    } else {
      log('Sending approval email...');

      const emailPayload = {
        to: ownerEmail,
        subject: `🧠 Identity Fix: Optimize for ${identity.state} users`,
        fixId,
        storeName: originalConfig.storeName || 'Your Store',
        suggestion: suggestionAdapter,
        fix: fixAdapter,
        screenshots,
        approvalUrl: `${baseUrl}/fix/${fixId}?action=approve`,
        rejectionUrl: `${baseUrl}/fix/${fixId}?action=reject`,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };

      try {
        await sendFixApprovalEmail(emailPayload);
        emailSent = true;
        log(`Approval email sent to ${ownerEmail}`);
      } catch (emailError) {
        log(`Warning: Email failed: ${emailError}`);
      }
    }

    const duration = Date.now() - startTime;
    log(`Flow completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      duration,
      identity: {
        state: identity.state,
        confidence: identity.confidence,
        reasoning: identity.reasoning,
      },
      recommendations,
      mapping: {
        summary: mapping.summary,
        expectedImpact: mapping.expectedImpact,
        changesCount: mapping.elementChanges.length,
        changes: mapping.elementChanges.map(c => ({
          field: c.property,
          oldValue: c.oldValue,
          newValue: c.newValue,
        })),
      },
      result: {
        branch: branchName,
        prUrl,
        prNumber,
        filesChanged: ['data/config-live.json'],
        emailSent,
      },
      logs,
    });

  } catch (error) {
    log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);

    // Try to return to main branch on error
    try {
      await gitCommand('checkout main');
    } catch {
      // Ignore
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        logs,
      },
      { status: 500 }
    );
  }
}

/**
 * Apply a config change using dot notation path
 * e.g., "hero.cta.text" → config.hero.cta.text = value
 */
function applyConfigChange(config: SiteConfig, path: string, value: string): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = config as unknown as Record<string, unknown>;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] === undefined) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1];

  // Handle type conversion
  if (value === 'true') {
    current[lastPart] = true;
  } else if (value === 'false') {
    current[lastPart] = false;
  } else if (!isNaN(Number(value)) && value !== '') {
    current[lastPart] = Number(value);
  } else {
    current[lastPart] = value;
  }
}

/**
 * Generate a simple diff between two configs
 */
function generateConfigDiff(original: SiteConfig, modified: SiteConfig): string {
  const originalStr = JSON.stringify(original, null, 2);
  const modifiedStr = JSON.stringify(modified, null, 2);

  const originalLines = originalStr.split('\n');
  const modifiedLines = modifiedStr.split('\n');

  let diff = '--- a/data/config-live.json\n+++ b/data/config-live.json\n';

  const maxLen = Math.max(originalLines.length, modifiedLines.length);
  for (let i = 0; i < maxLen; i++) {
    const orig = originalLines[i] || '';
    const mod = modifiedLines[i] || '';
    if (orig !== mod) {
      if (orig) diff += `-${orig}\n`;
      if (mod) diff += `+${mod}\n`;
    }
  }

  return diff;
}

/**
 * GET handler for checking identity-fix status or getting rules
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action');

  if (action === 'rules') {
    // Return all available fix rules
    const { getFixRulesForIdentity } = await import('@/lib/identity-to-fix-mapper');
    const states = ['frustrated', 'overwhelmed', 'cautious', 'confident', 'ready_to_decide'] as const;

    const rules: Record<string, unknown[]> = {};
    for (const state of states) {
      rules[state] = getFixRulesForIdentity(state);
    }

    return NextResponse.json({
      success: true,
      rules,
    });
  }

  if (action === 'preview') {
    // Preview changes for a given identity state
    const state = searchParams.get('state') as string;
    if (!state) {
      return NextResponse.json({ error: 'Missing state parameter' }, { status: 400 });
    }

    const { getUIRecommendations } = await import('@/lib/identity-classifier');
    const { mapRecommendationsToChanges, describeMapping } = await import('@/lib/identity-to-fix-mapper');

    const recommendations = getUIRecommendations(state as Parameters<typeof getUIRecommendations>[0]);
    const mapping = mapRecommendationsToChanges(
      state as Parameters<typeof mapRecommendationsToChanges>[0],
      0.8, // Assume 80% confidence for preview
      recommendations
    );

    return NextResponse.json({
      success: true,
      state,
      recommendations,
      mapping: {
        summary: mapping.summary,
        expectedImpact: mapping.expectedImpact,
        changes: mapping.elementChanges,
      },
      description: describeMapping(mapping),
    });
  }

  return NextResponse.json({
    success: true,
    message: 'Identity-fix API',
    endpoints: {
      'POST /api/identity-fix': 'Create identity-based fix',
      'GET /api/identity-fix?action=rules': 'List all fix rules',
      'GET /api/identity-fix?action=preview&state=frustrated': 'Preview changes for a state',
    },
  });
}
