/**
 * POST /api/analyze-and-fix
 *
 * Full CRO automation flow:
 * 1. Read detected UI issues
 * 2. Analyze with Gemini 2.1 Flash
 * 3. Generate code changes with Claude Sonnet
 * 4. Create PR with changes
 * 5. Send approval email
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { readUIIssues, upsertUIIssue, getConfig } from '@/lib/db';
import { analyzeIssuesAndRecommendFix, isGeminiConfigured } from '@/lib/gemini-service';
import { generateCodeChanges, applyCodeChanges, isAnthropicConfigured } from '@/lib/code-change-service';
import { sendFixApprovalEmail, buildFixApprovalEmail, isSendGridConfigured } from '@/lib/email-service';
import { captureAndUploadScreenshots } from '@/lib/screenshot-service';
import type { UIIssue, Suggestion } from '@/types';

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
    log('Starting analyze-and-fix flow');

    // Check configuration
    if (!isGeminiConfigured()) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }
    if (!isAnthropicConfigured()) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
    }

    // 1. Read detected issues
    log('Reading detected UI issues...');
    const issues = await readUIIssues();
    const pendingIssues = issues.filter(i => i.status === 'detected');

    if (pendingIssues.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No pending issues to analyze',
        logs,
      });
    }

    log(`Found ${pendingIssues.length} pending issues`);

    // 2. Analyze with Gemini
    log('Analyzing issues with Gemini 2.1 Flash...');
    const recommendation = await analyzeIssuesAndRecommendFix(pendingIssues);

    if (!recommendation) {
      return NextResponse.json({
        success: false,
        message: 'Gemini could not generate a recommendation',
        logs,
      });
    }

    log(`Gemini recommends: ${recommendation.summary} (confidence: ${recommendation.confidence})`);

    // 3. Generate code changes with Sonnet
    log('Generating code changes with Claude Sonnet...');
    const codeResult = await generateCodeChanges(recommendation);

    if (!codeResult.success || codeResult.changes.length === 0) {
      return NextResponse.json({
        success: false,
        message: `Failed to generate code changes: ${codeResult.error}`,
        logs,
      });
    }

    log(`Generated changes for ${codeResult.changes.length} file(s)`);

    // 4. Create branch and apply changes
    log('Creating fix branch...');
    const originalBranch = await gitCommand('rev-parse --abbrev-ref HEAD');
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    // Sanitize issue ID for branch name (remove spaces and special chars)
    const safeIssueId = recommendation.issueId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 12);
    const branchName = `fix/cro-code-${timestamp}-${safeIssueId}`;

    await gitCommand('fetch origin main');
    await gitCommand(`checkout -b ${branchName} origin/main`);
    log(`Created branch: ${branchName}`);

    // Apply code changes
    log('Applying code changes...');
    await applyCodeChanges(codeResult.changes);

    // Stage and commit
    const filePaths = codeResult.changes.map(c => c.file).join(' ');
    await gitCommand(`add ${filePaths}`);

    const commitMessage = `fix(cro): ${recommendation.summary}

Automated CRO fix based on user behavior analysis.

Changes:
${recommendation.changes.map(c => `- ${c.file}: ${c.action} ${c.attribute || ''}`).join('\n')}

Expected Impact: ${recommendation.expectedImpact}

Issue ID: ${recommendation.issueId}

Co-Authored-By: CRO Agent <cro-agent@blip.ship>`;

    // Write commit message to temp file to handle special characters
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
      const prTitle = `🔧 CRO Code Fix: ${recommendation.summary}`;
      const prBody = `## Summary
${recommendation.summary}

## Changes
${recommendation.changes.map(c => `- **${c.file}**: ${c.action} \`${c.attribute || c.value}\` - ${c.reason}`).join('\n')}

## Expected Impact
${recommendation.expectedImpact}

## Rationale
${recommendation.rationale}

## Diff
\`\`\`diff
${codeResult.changes.map(c => c.diff).join('\n')}
\`\`\`

---
🤖 Generated by CRO Agent using Gemini + Claude`;

      const tmpPrBody = path.join(process.cwd(), '.git', 'PR_BODY_TMP');
      await fs.writeFile(tmpPrBody, prBody);
      const prResult = await gitCommand(`gh pr create --title "${prTitle}" --body-file "${tmpPrBody}"`);
      await fs.unlink(tmpPrBody);
      prUrl = prResult.trim();
      const prMatch = prUrl.match(/\/pull\/(\d+)/);
      prNumber = prMatch ? parseInt(prMatch[1], 10) : 0;
      log(`Created PR: ${prUrl}`);
    } catch (prError) {
      log(`Warning: Could not create PR via gh CLI: ${prError}`);
      // Generate compare URL as fallback
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

    // 5. Update issue status
    const issue = pendingIssues.find(i => i.id === recommendation.issueId);
    if (issue) {
      issue.status = 'fix_generated';
      issue.fix = {
        branch: branchName,
        previewUrl: prUrl,
        diff: codeResult.changes.map(c => c.diff).join('\n'),
        modifiedFiles: codeResult.changes.map(c => ({ path: c.file, content: c.modifiedContent })),
        explanation: recommendation.rationale,
        generatedAt: Date.now(),
      };
      await upsertUIIssue(issue);
      log('Updated issue status');
    }

    // 6. Send approval email
    log('Preparing approval email...');
    const config = await getConfig('live');
    const ownerEmail = config.ownerEmail;

    if (!ownerEmail) {
      log('Warning: No owner email configured, skipping email');
    } else if (!isSendGridConfigured()) {
      log('Warning: SendGrid not configured, skipping email');
    } else {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

      // Build adapter objects that match the email service's expected types
      const suggestionAdapter: Suggestion = {
        id: recommendation.issueId,
        createdAt: Date.now(),
        status: 'pending',
        analysis: {
          summary: recommendation.summary,
          insights: [recommendation.rationale],
          dataPoints: [{
            metric: 'Confidence',
            value: recommendation.confidence,
            interpretation: `${Math.round(recommendation.confidence * 100)}% confident this fix will help`,
          }],
        },
        recommendation: {
          summary: recommendation.summary,
          rationale: recommendation.rationale,
          expectedImpact: recommendation.expectedImpact,
        },
        changes: recommendation.changes.map(c => ({
          field: `${c.file}:${c.attribute || 'style'}`,
          oldValue: c.oldValue || '(none)',
          newValue: c.value || '(added)',
          reason: c.reason,
        })),
        previewConfig: config, // Use current config as placeholder
      };

      const fixAdapter = {
        id: `codefix_${Date.now()}`,
        suggestionId: recommendation.issueId,
        createdAt: Date.now(),
        status: 'pending' as const,
        configChanges: recommendation.changes.map(c => ({
          path: `${c.file}:${c.attribute || 'code'}`,
          oldValue: c.oldValue || '',
          newValue: c.value || '',
        })),
        affectedFiles: codeResult.changes.map(c => ({
          path: c.file,
          changeType: 'modify' as const,
          diff: c.diff,
        })),
        metadata: {
          estimatedImpact: recommendation.expectedImpact,
          rollbackPlan: `Revert branch ${branchName}`,
          testingNotes: 'Verify form autofill works correctly',
        },
      };

      const emailPayload = {
        to: ownerEmail,
        subject: `🔧 CRO Fix: ${recommendation.summary}`,
        fixId: recommendation.issueId,
        storeName: config.storeName || 'Your Store',
        suggestion: suggestionAdapter,
        fix: fixAdapter,
        screenshots: {
          currentScreenshotUrl: `${baseUrl}/store`,
          proposedScreenshotUrl: prUrl || `${baseUrl}/store`,
          isEmbedded: false,
        },
        approvalUrl: `${baseUrl}/fix/${recommendation.issueId}?action=approve`,
        rejectionUrl: `${baseUrl}/fix/${recommendation.issueId}?action=reject`,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      try {
        await sendFixApprovalEmail(emailPayload);
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
      logs,
      result: {
        issueId: recommendation.issueId,
        summary: recommendation.summary,
        confidence: recommendation.confidence,
        expectedImpact: recommendation.expectedImpact,
        filesChanged: codeResult.changes.map(c => c.file),
        branch: branchName,
        prUrl,
        prNumber,
        emailSent: !!ownerEmail && isSendGridConfigured(),
      },
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
