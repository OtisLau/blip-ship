/**
 * POST /api/index-elements
 * Crawls the site and builds an index of all interactable elements
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildElementIndex, saveElementIndex, loadElementIndex } from '@/lib/element-indexer';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json().catch(() => ({}));
    const baseUrl = body.baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const pages = body.pages || ['/store'];

    console.log('🔍 [API] Starting element indexing...');
    console.log('   Base URL:', baseUrl);
    console.log('   Pages:', pages);

    const index = await buildElementIndex(baseUrl, pages);
    await saveElementIndex(index);

    const duration = Date.now() - startTime;

    // Summary stats
    const componentStats: Record<string, number> = {};
    for (const el of index.elements) {
      componentStats[el.componentPath] = (componentStats[el.componentPath] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      duration,
      summary: {
        totalElements: index.elements.length,
        pages: index.pages,
        componentBreakdown: componentStats,
      },
      sampleElements: index.elements.slice(0, 10).map(el => ({
        id: el.id,
        tag: el.tag,
        type: el.type,
        text: el.text.slice(0, 50),
        component: el.componentName,
        componentPath: el.componentPath,
      })),
    });
  } catch (error) {
    console.error('Error indexing elements:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const index = await loadElementIndex();

    if (!index) {
      return NextResponse.json({
        success: false,
        message: 'No element index found. POST to this endpoint to build one.',
      });
    }

    // Summary stats
    const componentStats: Record<string, number> = {};
    for (const el of index.elements) {
      componentStats[el.componentPath] = (componentStats[el.componentPath] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      index: {
        version: index.version,
        generatedAt: new Date(index.generatedAt).toISOString(),
        totalElements: index.elements.length,
        pages: index.pages,
        componentBreakdown: componentStats,
      },
      elements: index.elements,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
