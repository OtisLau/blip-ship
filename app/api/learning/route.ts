/**
 * GET /api/learning - View learning statistics
 *
 * Shows how the system has learned from approvals/rejections
 */

import { NextResponse } from 'next/server';
import { getLearningStats, getCycleHistory, getConfig } from '@/lib/continuous-improvement';

export async function GET() {
  const stats = getLearningStats();
  const history = getCycleHistory();
  const config = getConfig();

  return NextResponse.json({
    success: true,
    learning: {
      totalCycles: stats.totalCycles,
      rulesLearned: stats.records.length,
      topPerformingRules: stats.topPerformingRules,
      records: stats.records.map(r => ({
        identityState: r.identityState,
        timesApplied: r.timesApplied,
        approvalRate: r.timesApplied > 0
          ? `${Math.round((r.timesApproved / r.timesApplied) * 100)}%`
          : 'N/A',
        avgImpact: `${r.avgImpact.toFixed(1)}%`,
        confidence: `${Math.round(r.confidence * 100)}%`,
        autoApplyEligible: r.confidence >= config.autoApplyConfidence,
      })),
    },
    recentCycles: history.slice(-10).map(c => ({
      id: c.id,
      identity: c.identity.state,
      confidence: `${Math.round(c.identity.confidence * 100)}%`,
      action: c.actionType,
      changes: c.mapping.elementChanges.length,
      trigger: c.triggerReason,
      duration: c.completedAt ? `${c.completedAt - c.startedAt}ms` : 'in progress',
    })),
    config: {
      eventThreshold: config.eventThreshold,
      cooldownMinutes: config.cooldownMs / 60000,
      autoApplyConfidenceThreshold: `${config.autoApplyConfidence * 100}%`,
    },
    explanation: {
      howItWorks: [
        '1. Each approval increases confidence for that identity state',
        '2. Each rejection decreases confidence',
        '3. When confidence reaches 90%+, fixes auto-apply without approval',
        '4. Impact is tracked to prioritize effective fixes',
      ],
      confidenceFormula: 'confidence = (approval_rate × 0.6) + (avg_impact_normalized × 0.4)',
    },
  });
}
