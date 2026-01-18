/**
 * API Route: GET /api/branch-config/[...branchName]
 *
 * Returns the config-live.json from a specific git branch without checking out.
 * Uses catch-all route to handle branch names with slashes (e.g., fix/cro-20260117-abc123)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConfigFromBranch } from '@/lib/git-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ branchName: string[] }> }
) {
  try {
    const { branchName } = await params;

    // Join the path segments to reconstruct the full branch name
    const fullBranchName = branchName.join('/');

    if (!fullBranchName) {
      return NextResponse.json({ error: 'Branch name is required' }, { status: 400 });
    }

    // Validate branch name format (prevent command injection)
    if (!/^[a-zA-Z0-9\-_/]+$/.test(fullBranchName)) {
      return NextResponse.json({ error: 'Invalid branch name format' }, { status: 400 });
    }

    const configContent = await getConfigFromBranch(fullBranchName);
    const config = JSON.parse(configContent);

    return NextResponse.json(config);
  } catch (error) {
    console.error('[API] branch-config error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get branch config' },
      { status: 500 }
    );
  }
}
