/**
 * POST /api/fix/[fixId]/reject - Reject a fix and close the PR
 *
 * This endpoint:
 * 1. Validates the fix exists and is pending
 * 2. Closes the associated PR without merging
 * 3. Updates the fix status to 'rejected'
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFix, updateFixStatus } from '@/lib/fix-store';
import { closePullRequest, getPRInfo } from '@/lib/git-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fixId: string }> }
) {
  try {
    const { fixId } = await params;

    // Get optional rejection reason from body
    let reason = 'No reason provided';
    try {
      const body = await request.json();
      if (body.reason) {
        reason = body.reason;
      }
    } catch {
      // No body provided, that's fine
    }

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

    // Attempt to close the PR (use suggestion.id as that's how PRs are keyed)
    const suggestionId = fix.suggestion.id;
    const closeResult = await closePullRequest(suggestionId);

    if (!closeResult.success) {
      // Log but don't fail - PR might not exist or already be closed
      console.warn('Could not close PR:', closeResult.message);
    }

    // Update fix status
    const prInfo = getPRInfo(suggestionId);
    const updatedFix = await updateFixStatus(fixId, 'rejected', prInfo);

    return NextResponse.json({
      success: true,
      message: 'Fix rejected',
      reason,
      fix: updatedFix,
    });
  } catch (error) {
    console.error('Error rejecting fix:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
