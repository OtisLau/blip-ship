/**
 * POST /api/trigger-fix-flow - Main orchestration endpoint
 *
 * This endpoint orchestrates the complete fix suggestion flow:
 * 1. Gets a suggested fix from the stub endpoint
 * 2. Feeds it to the minimal fix agent
 * 3. Creates a PR with the fix
 * 4. Sends an email with screenshots
 * 5. Returns the approval URL
 *
 * This is the entry point for the POC demonstration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processFixSuggestion } from '@/lib/fix-agent';
import { buildFixApprovalEmail, sendFixApprovalEmail, isSendGridConfigured } from '@/lib/email-service';
import { createFixPR } from '@/lib/git-service';
import { saveFix } from '@/lib/fix-store';
import { getConfig } from '@/lib/db';
import type { Suggestion } from '@/lib/types';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const logs: string[] = [];

  const log = (message: string) => {
    const timestamp = Date.now() - startTime;
    logs.push(`[${timestamp}ms] ${message}`);
    console.log(`[trigger-fix-flow] ${message}`);
  };

  try {
    // Get configuration from request body
    const body = await request.json().catch(() => ({}));
    const {
      forceIndex,
      skipPR = false,
      skipEmail = false,
    } = body as {
      forceIndex?: number;
      skipPR?: boolean;
      skipEmail?: boolean;
    };

    log('Starting fix suggestion flow');

    // Load site config to get owner email
    log('Loading site config...');
    const siteConfig = await getConfig('live');
    const ownerEmail = siteConfig.ownerEmail;
    const storeName = siteConfig.storeName;

    if (!ownerEmail) {
      throw new Error('No ownerEmail configured in config-live.json. Please set ownerEmail in your site config.');
    }

    log(`Owner email: ${ownerEmail}, Store: ${storeName || 'unnamed'}`);
    log(`SendGrid configured: ${isSendGridConfigured()}`);

    // Step 1: Get a suggested fix from the stub endpoint
    log('Step 1: Fetching suggested fix...');
    const baseUrl = `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`;

    const suggestRes = await fetch(`${baseUrl}/api/suggest-fix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        analyticsData: { source: 'trigger-fix-flow' },
        forceIndex,
      }),
    });

    if (!suggestRes.ok) {
      throw new Error('Failed to get suggestion from stub endpoint');
    }

    const suggestData = await suggestRes.json();
    const suggestion: Suggestion = suggestData.suggestion;
    log(`Got suggestion: ${suggestion.id} - ${suggestion.analysis.summary}`);

    // Step 2: Feed to minimal fix agent
    log('Step 2: Processing with minimal fix agent...');
    const agentResult = await processFixSuggestion(suggestion);

    if (!agentResult.success || !agentResult.fix) {
      throw new Error(`Fix agent failed: ${agentResult.error}`);
    }

    const fix = agentResult.fix;
    log(`Generated minimal fix: ${fix.id} (${agentResult.processingTimeMs}ms)`);

    // Step 3: Create PR (unless skipped for testing)
    let prInfo;
    if (!skipPR) {
      log('Step 3: Creating pull request...');
      const prResult = await createFixPR(suggestion, fix);

      if (!prResult.success) {
        log(`Warning: PR creation failed: ${prResult.error}`);
        // Continue without PR for POC
      } else {
        prInfo = prResult.prInfo;
        log(`Created PR: ${prInfo?.branchName}`);
      }
    } else {
      log('Step 3: Skipping PR creation (skipPR=true)');
    }

    // Step 4: Save the fix to the store
    log('Step 4: Saving fix to store...');
    const storedFix = await saveFix(suggestion, fix, prInfo);
    log(`Saved fix with status: ${storedFix.status}`);

    // Step 5: Send email with screenshots (unless skipped)
    let emailResult;
    if (!skipEmail) {
      log(`Step 5: Sending approval email to ${ownerEmail}...`);
      const emailPayload = await buildFixApprovalEmail(
        ownerEmail,
        suggestion,
        fix,
        baseUrl,
        storeName
      );
      emailResult = await sendFixApprovalEmail(emailPayload);

      if (emailResult.success) {
        log(`Email sent: ${emailResult.messageId}`);
      } else {
        log(`Email failed: ${emailResult.error}`);
      }
    } else {
      log('Step 5: Skipping email (skipEmail=true)');
    }

    // Build approval URL
    const approvalUrl = `${baseUrl}/fix/${suggestion.id}`;

    log('Flow completed successfully!');

    return NextResponse.json({
      success: true,
      duration: Date.now() - startTime,
      logs,
      config: {
        ownerEmail,
        storeName,
        sendGridConfigured: isSendGridConfigured(),
      },
      result: {
        suggestionId: suggestion.id,
        fixId: fix.id,
        summary: suggestion.analysis.summary,
        expectedImpact: suggestion.recommendation.expectedImpact,
        changes: suggestion.changes.length,
        approvalUrl,
        prUrl: prInfo?.url,
        emailSent: emailResult?.success ?? false,
        emailPreviewUrl: emailResult?.previewUrl,
      },
      nextSteps: [
        `Visit ${approvalUrl} to review and approve/reject the fix`,
        prInfo?.url ? `View the PR at ${prInfo.url}` : 'PR creation was skipped',
        emailResult?.success ? `Email sent to ${ownerEmail}` : 'Email was skipped or failed',
        'Click "Approve & Merge" to merge the PR into main',
        'Click "Reject" to close the PR without merging',
      ],
    });
  } catch (error) {
    log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);

    return NextResponse.json(
      {
        success: false,
        duration: Date.now() - startTime,
        logs,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
