/**
 * POST /api/suggest-fix - Stub endpoint for getting suggested fixes
 *
 * This is a STUB endpoint being worked on by another team member.
 * It simulates receiving analytics data and returning a suggested fix.
 *
 * In production, this would:
 * 1. Receive analytics data
 * 2. Call an AI service to analyze the data
 * 3. Return a suggested fix with config changes
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Suggestion, SiteConfig } from '@/types';
import { getConfig } from '../../../lib/db';

// Stub: Mock suggestions based on common CRO issues
const MOCK_SUGGESTIONS: Array<{
  issue: string;
  fix: Partial<SiteConfig['hero']>;
  rationale: string;
  expectedImpact: string;
}> = [
  {
    issue: 'Low CTA visibility',
    fix: {
      cta: {
        text: 'Shop Now - Free Shipping',
        color: '#10B981',
        textColor: '#FFFFFF',
        position: 'inside-hero',
        size: 'large',
      },
    },
    rationale: 'Analytics show low CTA engagement. A larger, more prominent button with urgency copy can increase clicks.',
    expectedImpact: '+15-25% CTA click rate',
  },
  {
    issue: 'Weak headline engagement',
    fix: {
      headline: 'Premium Quality, Unbeatable Prices',
      subheadline: 'Join 10,000+ happy customers. Shop our curated collection today.',
    },
    rationale: 'Current headline has high bounce rate. Social proof and value proposition can increase engagement.',
    expectedImpact: '-10% bounce rate, +20% scroll depth',
  },
  {
    issue: 'Hero contrast issues',
    fix: {
      backgroundColor: '#1F2937',
      cta: {
        text: 'Explore Collection',
        color: '#F59E0B',
        textColor: '#000000',
        position: 'inside-hero',
        size: 'large',
      },
    },
    rationale: 'Heatmap shows dead clicks around CTA area. Better contrast can improve visibility.',
    expectedImpact: '+30% CTA visibility, -15% dead clicks',
  },
];

export async function POST(request: NextRequest) {
  try {
    // STUB: In production, this would receive and process analytics data
    const body = await request.json();
    const { analyticsData, forceIndex } = body as {
      analyticsData?: unknown;
      forceIndex?: number;
    };

    // Log for debugging
    console.log('[STUB] Received analytics data for fix suggestion:', {
      hasData: !!analyticsData,
      timestamp: Date.now(),
    });

    // Get current live config
    const currentConfig = await getConfig('live');

    // STUB: Randomly select a suggestion (or use forceIndex for testing)
    const suggestionIndex = forceIndex ?? Math.floor(Math.random() * MOCK_SUGGESTIONS.length);
    const mockSuggestion = MOCK_SUGGESTIONS[suggestionIndex];

    // Generate a unique fix ID
    const fixId = `fix_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Create the preview config with the suggested changes
    const previewConfig: SiteConfig = {
      ...currentConfig,
      id: `preview_${fixId}`,
      version: currentConfig.version + 1,
      status: 'preview',
      hero: {
        ...currentConfig.hero,
        ...mockSuggestion.fix,
        cta: {
          ...currentConfig.hero.cta,
          ...(mockSuggestion.fix.cta || {}),
        },
      },
    };

    // Build the suggestion object
    const suggestion: Suggestion = {
      id: fixId,
      createdAt: Date.now(),
      status: 'pending',
      analysis: {
        summary: `Detected issue: ${mockSuggestion.issue}`,
        insights: [
          'Analyzed user behavior patterns from event data',
          'Identified conversion bottleneck in hero section',
          'Compared against CRO best practices',
        ],
        dataPoints: [
          { metric: 'CTA Click Rate', value: 2.3, interpretation: 'Below industry average of 4.5%' },
          { metric: 'Bounce Rate', value: 45, interpretation: 'High - indicates weak initial engagement' },
          { metric: 'Avg Scroll Depth', value: 35, interpretation: 'Users not seeing full content' },
        ],
      },
      recommendation: {
        summary: mockSuggestion.rationale,
        rationale: `Based on analysis of user behavior, we recommend this minimal, targeted fix to address the ${mockSuggestion.issue.toLowerCase()} issue.`,
        expectedImpact: mockSuggestion.expectedImpact,
      },
      changes: Object.entries(mockSuggestion.fix).map(([field, newValue]) => ({
        field: `hero.${field}`,
        oldValue: currentConfig.hero[field as keyof typeof currentConfig.hero],
        newValue,
        reason: mockSuggestion.rationale,
      })),
      previewConfig,
    };

    // Return the suggestion with approval URL
    const baseUrl = request.headers.get('host') || 'localhost:3000';
    const protocol = baseUrl.includes('localhost') ? 'http' : 'https';

    return NextResponse.json({
      success: true,
      suggestion,
      approvalUrl: `${protocol}://${baseUrl}/fix/${fixId}`,
      message: 'STUB: This is a simulated fix suggestion. The minimal fix agent will process this.',
    });
  } catch (error) {
    console.error('Error generating fix suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to generate fix suggestion' },
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
