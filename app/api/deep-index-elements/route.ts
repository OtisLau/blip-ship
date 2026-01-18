/**
 * Deep Element Index API - Comprehensive page analysis for maximum accuracy
 *
 * POST /api/deep-index-elements - Build deep element index
 * GET /api/deep-index-elements - Retrieve existing deep index
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  buildDeepElementIndex,
  saveDeepElementIndex,
  loadDeepElementIndex,
} from '@/lib/deep-element-indexer';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json().catch(() => ({}));
    const baseUrl = body.baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const pages = body.pages || ['/store'];

    console.log('🔬 [Deep Index API] Starting comprehensive page analysis...');
    console.log(`   Base URL: ${baseUrl}`);
    console.log(`   Pages: ${pages.join(', ')}`);

    // Build the deep index
    const index = await buildDeepElementIndex(baseUrl, pages);

    // Save to file
    await saveDeepElementIndex(index);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      duration,
      summary: {
        totalElements: index.totalElements,
        pages: index.pages,
        stats: index.stats,
        landmarks: index.landmarks.length,
      },
      sampleElements: index.elements.slice(0, 10).map(el => ({
        id: el.id,
        tag: el.tag,
        type: el.type,
        selector: el.selector,
        semanticType: el.semanticType,
        componentName: el.componentName,
        isClickable: el.isClickable,
        text: el.text.slice(0, 50),
      })),
    });
  } catch (error) {
    console.error('❌ [Deep Index API] Error:', error);
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
    const index = await loadDeepElementIndex();

    if (!index) {
      return NextResponse.json({
        success: false,
        error: 'No deep index found. POST to this endpoint to build one.',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      index: {
        version: index.version,
        generatedAt: new Date(index.generatedAt).toISOString(),
        duration: index.duration,
        totalElements: index.totalElements,
        pages: index.pages,
        stats: index.stats,
      },
      elements: index.elements,
      tree: index.tree,
      landmarks: index.landmarks,
    });
  } catch (error) {
    console.error('❌ [Deep Index API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
