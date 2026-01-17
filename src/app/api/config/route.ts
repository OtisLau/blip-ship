import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') === 'preview' ? 'preview' : 'live';

  try {
    const config = await getConfig(mode);
    return NextResponse.json({ config });
  } catch {
    // If preview doesn't exist, fall back to live
    if (mode === 'preview') {
      const config = await getConfig('live');
      return NextResponse.json({ config });
    }
    return NextResponse.json({ error: 'Config not found' }, { status: 404 });
  }
}
