/**
 * POST /api/fix/[fixId]/approve - Approve a fix and merge the PR
 *
 * This endpoint:
 * 1. Validates the fix exists and is pending
 * 2. Merges the associated PR
 * 3. Updates the fix status to 'merged'
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFix, updateFixStatus } from '@/lib/fix-store';
import { mergePullRequest, getPRInfo } from '@/lib/git-service';

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
      return NextResponse.json(
        { success: false, error: `Fix is already ${fix.status}` },
        { status: 400 }
      );
    }

    // Attempt to merge the PR (use suggestion.id as that's how PRs are keyed)
    const suggestionId = fix.suggestion.id;
    const prInfo = getPRInfo(suggestionId);

    // If there's a PR to merge, merge it
    if (prInfo) {
      const mergeResult = await mergePullRequest(suggestionId);

      if (!mergeResult.success) {
        return NextResponse.json(
          { success: false, error: mergeResult.message },
          { status: 500 }
        );
      }
    }

    // Update fix status (works even if no PR was created - for skipPR mode)
    const updatedFix = await updateFixStatus(fixId, 'merged', prInfo);

    return NextResponse.json({
      success: true,
      message: 'Fix approved and PR merged successfully',
      fix: updatedFix,
    });
  } catch (error) {
    console.error('Error approving fix:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
