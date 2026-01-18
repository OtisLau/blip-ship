/**
 * POST /api/demo-fix - Hard-coded demo flow for hackathon video
 *
 * This endpoint demonstrates the full CRO fix flow with a specific, pre-defined issue:
 * "Product images don't open modal when clicked"
 *
 * It skips AI classification and applies a known fix directly.
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { sendFixApprovalEmail, isSendGridConfigured } from '@/lib/email-service';
import { saveFix } from '@/lib/fix-store';
import { getConfig } from '@/lib/db';
import type { Suggestion } from '@/lib/types';

const execAsync = promisify(exec);

async function gitCommand(command: string): Promise<string> {
  const { stdout } = await execAsync(`git ${command}`, { cwd: process.cwd() });
  return stdout.trim();
}

async function ghCommand(command: string): Promise<string> {
  const { stdout } = await execAsync(`gh ${command}`, { cwd: process.cwd() });
  return stdout.trim();
}

// The exact code to find and replace
const FIND_CODE = `                {/* Product Image - NOT CLICKABLE (creates dead click frustration) */}
                <div
                  style={{
                    aspectRatio: '4/5',
                    position: 'relative',
                    overflow: 'hidden',
                    backgroundColor: '#f5f5f5',
                  }}
                >`;

const REPLACE_CODE = `                {/* Product Image - CLICKABLE (opens modal) */}
                <div
                  onClick={() => setSelectedProduct(product)}
                  style={{
                    aspectRatio: '4/5',
                    position: 'relative',
                    overflow: 'hidden',
                    backgroundColor: '#f5f5f5',
                    cursor: 'pointer',
                  }}
                >`;

export async function POST() {
  const logs: string[] = [];
  const log = (msg: string) => {
    const timestamp = Date.now() - startTime;
    logs.push(`[${timestamp}ms] ${msg}`);
    console.log(`🎬 [Demo-Fix] ${msg}`);
  };
  const startTime = Date.now();

  try {
    log('Starting hard-coded demo fix flow');
    log('Issue: Product images don\'t open modal when clicked');

    // 1. Read the current ProductGrid.tsx
    const filePath = path.join(process.cwd(), 'components/store/ProductGrid.tsx');
    const originalContent = await fs.readFile(filePath, 'utf-8');
    log('Read ProductGrid.tsx');

    // Check if already fixed (look for the specific fix pattern)
    if (originalContent.includes('{/* Product Image - CLICKABLE (opens modal) */}')) {
      return NextResponse.json({
        success: false,
        message: 'Fix already applied - product images are already clickable',
        logs,
      });
    }

    // Check if the code to replace exists
    if (!originalContent.includes(FIND_CODE)) {
      return NextResponse.json({
        success: false,
        message: 'Could not find the target code in ProductGrid.tsx',
        logs,
      });
    }

    // 2. Create branch
    log('Creating fix branch...');
    const originalBranch = await gitCommand('rev-parse --abbrev-ref HEAD');
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const uniqueSuffix = Math.random().toString(36).slice(2, 6);
    const branchName = `fix/product-image-click-${timestamp}-${uniqueSuffix}`;

    await gitCommand('fetch origin main');

    // Delete branch if exists
    try {
      await gitCommand(`branch -D ${branchName}`);
    } catch {
      // Branch doesn't exist
    }

    await gitCommand(`checkout -b ${branchName} origin/main`);
    log(`Created branch: ${branchName}`);

    // 3. Apply the fix
    const fixedContent = originalContent.replace(FIND_CODE, REPLACE_CODE);
    await fs.writeFile(filePath, fixedContent);
    log('Applied fix: Added onClick handler to product images');

    // 4. Commit
    await gitCommand('add components/store/ProductGrid.tsx');

    const commitMessage = `fix(ux): Make product images clickable to open modal

🔍 Issue Detected:
- Users clicking product images expect a modal to open
- Currently, nothing happens (dead click)
- This causes user frustration and abandonment

✅ Fix Applied:
- Added onClick={() => setSelectedProduct(product)} to image container
- Added cursor: pointer for visual feedback

📊 Expected Impact:
- +35% engagement with product details
- -50% dead click frustration signals

Co-Authored-By: CRO Agent <cro-agent@blip.ship>`;

    const tmpFile = path.join(process.cwd(), '.git', 'COMMIT_MSG_TMP');
    await fs.writeFile(tmpFile, commitMessage);
    await gitCommand(`commit -F "${tmpFile}"`);
    await fs.unlink(tmpFile).catch(() => {});
    log('Committed changes');

    // 5. Push
    log('Pushing to remote...');
    await gitCommand(`push -u origin ${branchName}`);
    log('Pushed branch');

    // 6. Create PR
    let prUrl = '';
    let prNumber = 0;
    try {
      const prTitle = '🖱️ Fix: Make product images clickable to open modal';
      const prBody = `## 🔍 Issue Detected

**Problem:** Product images don't respond to clicks. Users expect clicking a product image to show more details, but nothing happens.

**Severity:** Critical (causes user frustration)

**Evidence:**
- Dead click events detected on product images
- Users clicking repeatedly without response
- High bounce rate from product grid

---

## ✅ Fix Applied

\`\`\`diff
- {/* Product Image - NOT CLICKABLE (creates dead click frustration) */}
- <div style={{ aspectRatio: '4/5', ... }}>
+ {/* Product Image - CLICKABLE (opens modal) */}
+ <div onClick={() => setSelectedProduct(product)} style={{ aspectRatio: '4/5', cursor: 'pointer', ... }}>
\`\`\`

**Changes:**
- Added \`onClick\` handler to open product modal
- Added \`cursor: pointer\` for visual feedback

---

## 📊 Expected Impact

| Metric | Before | After (Expected) |
|--------|--------|------------------|
| Product detail views | Low | +35% |
| Dead click events | High | -50% |
| User frustration | High | Low |

---

🤖 Generated by Blip Ship CRO Agent`;

      const tmpPrBody = path.join(process.cwd(), '.git', 'PR_BODY_TMP');
      await fs.writeFile(tmpPrBody, prBody);
      const prResult = await ghCommand(`pr create --title "${prTitle}" --body-file "${tmpPrBody}"`);
      await fs.unlink(tmpPrBody).catch(() => {});
      prUrl = prResult.trim();
      const prMatch = prUrl.match(/\/pull\/(\d+)/);
      prNumber = prMatch ? parseInt(prMatch[1], 10) : 0;
      log(`Created PR: ${prUrl}`);
    } catch (prError) {
      log(`Warning: Could not create PR: ${prError}`);
    }

    // 7. Return to original branch and restore file
    await gitCommand(`checkout ${originalBranch}`);
    log('Returned to original branch');

    // 8. Send email
    const config = await getConfig('live');
    const ownerEmail = config.ownerEmail;
    let emailSent = false;
    const fixId = `demo_product_image_click_${Date.now()}`;

    const suggestionAdapter: Suggestion = {
      id: fixId,
      createdAt: Date.now(),
      status: 'pending',
      analysis: {
        summary: 'Product images don\'t respond to clicks',
        insights: [
          'Users expect clicking product images to show details',
          'Dead clicks detected on image containers',
          'This causes frustration and abandonment',
        ],
        dataPoints: [
          { metric: 'Dead Clicks', value: 47, interpretation: 'High frustration signal' },
          { metric: 'Expected Engagement', value: 35, interpretation: '+35% with fix' },
        ],
      },
      recommendation: {
        summary: 'Add onClick handler to product images to open modal',
        rationale: 'Users expect images to be interactive. Adding click handler improves UX.',
        expectedImpact: '+35% product detail views, -50% dead clicks',
      },
      changes: [
        {
          field: 'components/store/ProductGrid.tsx',
          oldValue: 'No onClick handler',
          newValue: 'onClick={() => setSelectedProduct(product)}',
          reason: 'Makes product images clickable',
        },
        {
          field: 'cursor style',
          oldValue: 'default',
          newValue: 'pointer',
          reason: 'Visual feedback that image is clickable',
        },
      ],
      previewConfig: config,
    };

    const fixAdapter = {
      id: `demofix_${Date.now()}`,
      suggestionId: fixId,
      createdAt: Date.now(),
      status: 'pending' as const,
      configChanges: [],
      affectedFiles: [{
        path: 'components/store/ProductGrid.tsx',
        changeType: 'modify' as const,
        diff: `- {/* Product Image - NOT CLICKABLE */}\n+ {/* Product Image - CLICKABLE */}\n+ onClick={() => setSelectedProduct(product)}\n+ cursor: 'pointer'`,
      }],
      metadata: {
        estimatedImpact: '+35% engagement, -50% dead clicks',
        rollbackPlan: `Revert branch ${branchName}`,
        testingNotes: 'Click any product image - should open modal',
      },
    };

    // Save to fix store
    const prInfo = {
      id: `pr_${Date.now()}`,
      number: prNumber,
      branchName,
      title: 'Fix: Make product images clickable',
      description: 'Add onClick to open modal',
      status: 'open' as const,
      url: prUrl || undefined,
      fixId: fixAdapter.id,
      suggestionId: fixId,
    };
    await saveFix(suggestionAdapter, fixAdapter, prInfo);
    log(`Saved fix to store with ID: ${fixId}`);

    // Send email
    if (ownerEmail && isSendGridConfigured()) {
      log('Sending approval email...');
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

      const emailPayload = {
        to: ownerEmail,
        subject: '🖱️ UX Fix: Product images now clickable',
        fixId,
        storeName: config.storeName || 'Your Store',
        suggestion: suggestionAdapter,
        fix: fixAdapter,
        screenshots: {
          currentScreenshotUrl: `${baseUrl}/store`,
          proposedScreenshotUrl: prUrl || `${baseUrl}/store`,
          isEmbedded: false,
        },
        approvalUrl: `${baseUrl}/fix/${fixId}?action=approve`,
        rejectionUrl: `${baseUrl}/fix/${fixId}?action=reject`,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };

      try {
        await sendFixApprovalEmail(emailPayload);
        emailSent = true;
        log(`Email sent to ${ownerEmail}`);
      } catch (emailError) {
        log(`Email failed: ${emailError}`);
      }
    } else {
      log('Skipping email (not configured)');
    }

    const duration = Date.now() - startTime;
    log(`Demo fix completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      duration,
      issue: {
        type: 'dead_click_product_images',
        severity: 'critical',
        description: 'Product images don\'t respond to clicks - users expect modal to open',
        component: 'components/store/ProductGrid.tsx',
      },
      fix: {
        description: 'Added onClick handler to open product modal',
        changes: [
          'onClick={() => setSelectedProduct(product)}',
          'cursor: pointer',
        ],
      },
      result: {
        branch: branchName,
        prUrl,
        prNumber,
        emailSent,
        approvalUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/fix/${fixId}`,
      },
      logs,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Error: ${errorMessage}`);

    return NextResponse.json({
      success: false,
      error: errorMessage,
      logs,
    }, { status: 500 });
  }
}
