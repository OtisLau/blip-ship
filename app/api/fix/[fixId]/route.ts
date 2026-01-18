/**
 * GET /api/fix/[fixId] - Get fix details
 *
 * Returns the fix data including suggestion, changes, and PR info
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFix } from '@/lib/fix-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fixId: string }> }
) {
  try {
    const { fixId } = await params;

    const fix = await getFix(fixId);

    if (!fix) {
      return NextResponse.json(
        { error: 'Fix not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(fix);
  } catch (error) {
    console.error('Error getting fix:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
