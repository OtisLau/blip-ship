/**
 * POST /api/fix/[fixId]/approve - Approve a fix and merge the PR
 *
 * This endpoint:
 * 1. Validates the fix exists and is pending
 * 2. Merges the associated PR
 * 3. Updates the fix status to 'merged'
 * 4. Records approval in learning system (improves future predictions)
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getFix, updateFixStatus } from '@/lib/fix-store';
import { mergePullRequest, getPRInfo } from '@/lib/git-service';
import { recordFixOutcome } from '@/lib/continuous-improvement';

const execAsync = promisify(exec);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fixId: string }> }
) {
  try {
    const { fixId } = await params;

    // Get the fix
    const fix = await getFix(fixId);

    if (!fix) {
      return NextResponse.json(
        { success: false, error: 'Fix not found' },
        { status: 404 }
      );
    }

    if (fix.status !== 'pending') {
      // If already merged, return success (idempotent)
      if (fix.status === 'merged') {
        return NextResponse.json({
          success: true,
          message: 'Fix was already shipped',
          fix,
          alreadyMerged: true,
        });
      }
      // If rejected, return error
      return NextResponse.json(
        { success: false, error: `Fix was already ${fix.status}` },
        { status: 400 }
      );
    }

    // Get PR info - first try from stored fix, then from git-service
    const storedPrInfo = fix.prInfo;
    let prNumber: number | undefined;

    // Extract PR number from stored prInfo
    if (storedPrInfo?.number) {
      prNumber = storedPrInfo.number;
    } else if (storedPrInfo?.url) {
      // Extract from URL like https://github.com/user/repo/pull/123
      const match = storedPrInfo.url.match(/\/pull\/(\d+)/);
      if (match) {
        prNumber = parseInt(match[1], 10);
      }
    }

    let mergeResult: { success: boolean; message: string };

    if (prNumber) {
      // Use gh CLI to merge by PR number directly
      try {
        await execAsync(`gh pr merge ${prNumber} --squash --delete-branch`, {
          cwd: process.cwd(),
        });
        mergeResult = { success: true, message: 'PR merged successfully' };
      } catch (error) {
        mergeResult = {
          success: false,
          message: error instanceof Error ? error.message : 'Merge failed',
        };
      }
    } else {
      // Fallback to git-service (for older fixes)
      const suggestionId = fix.suggestion.id;
      mergeResult = await mergePullRequest(suggestionId);
    }

    if (!mergeResult.success) {
      return NextResponse.json(
        { success: false, error: mergeResult.message },
        { status: 500 }
      );
    }

    // Update fix status
    const prInfo = storedPrInfo || getPRInfo(fix.suggestion.id);
    const updatedFix = await updateFixStatus(fixId, 'merged', prInfo);

    // Record approval in learning system
    // Extract identity state from fixId (format: identity_<state>_<timestamp>)
    const identityMatch = fixId.match(/identity_(\w+)_/);
    if (identityMatch) {
      const identityState = identityMatch[1] as Parameters<typeof recordFixOutcome>[1];
      // Assume 20% improvement for now (will be measured in production)
      recordFixOutcome(fixId, identityState, true, 20);
      console.log(`[Learning] Recorded approval for ${identityState} identity`);
    }

    return NextResponse.json({
      success: true,
      message: 'Fix approved and PR merged successfully',
      fix: updatedFix,
      learned: identityMatch ? `Increased confidence for "${identityMatch[1]}" fixes` : undefined,
    });
  } catch (error) {
    console.error('Error approving fix:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
