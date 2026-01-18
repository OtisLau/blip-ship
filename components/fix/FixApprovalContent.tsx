'use client';

import { useState, useEffect } from 'react';
import type { Suggestion } from '@/lib/types';
import type { MinimalFix } from '@/lib/fix-agent';
import type { PRInfo } from '@/lib/git-service';

interface FixApprovalContentProps {
  fixId: string;
  initialAction?: string;
}

interface FixData {
  suggestion: Suggestion;
  fix: MinimalFix;
  prInfo?: PRInfo;
  status: 'pending' | 'approved' | 'rejected' | 'merged';
}

export function FixApprovalContent({
  fixId,
  initialAction,
}: FixApprovalContentProps) {
  const [fixData, setFixData] = useState<FixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Fetch fix data on mount
  useEffect(() => {
    async function fetchFixData() {
      try {
        const res = await fetch(`/api/fix/${fixId}`);
        if (!res.ok) {
          throw new Error('Fix not found');
        }
        const data = await res.json();
        setFixData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load fix');
      } finally {
        setLoading(false);
      }
    }

    fetchFixData();
  }, [fixId]);

  // Handle initial action from URL
  useEffect(() => {
    if (initialAction && fixData && !actionResult) {
      if (initialAction === 'approve') {
        handleApprove();
      } else if (initialAction === 'reject') {
        handleReject();
      }
    }
  }, [initialAction, fixData]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/fix/${fixId}/approve`, {
        method: 'POST',
      });
      const result = await res.json();

      if (result.success) {
        setActionResult({ success: true, message: 'Fix approved and PR merged!' });
        setFixData((prev) => (prev ? { ...prev, status: 'merged' } : null));
      } else {
        setActionResult({ success: false, message: result.error || 'Approval failed' });
      }
    } catch (err) {
      setActionResult({
        success: false,
        message: err instanceof Error ? err.message : 'Approval failed',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/fix/${fixId}/reject`, {
        method: 'POST',
      });
      const result = await res.json();

      if (result.success) {
        setActionResult({ success: true, message: 'Fix rejected and PR closed.' });
        setFixData((prev) => (prev ? { ...prev, status: 'rejected' } : null));
      } else {
        setActionResult({ success: false, message: result.error || 'Rejection failed' });
      }
    } catch (err) {
      setActionResult({
        success: false,
        message: err instanceof Error ? err.message : 'Rejection failed',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <FixApprovalSkeleton />;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!fixData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold mb-2">Fix Not Found</h2>
          <p className="text-gray-400">
            The requested fix could not be found. It may have expired or been deleted.
          </p>
        </div>
      </div>
    );
  }

  const { suggestion, fix, prInfo, status } = fixData;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Action Result Banner */}
      {actionResult && (
        <div
          className={`p-4 rounded-lg ${
            actionResult.success
              ? 'bg-green-900/30 border border-green-700'
              : 'bg-red-900/30 border border-red-700'
          }`}
        >
          <p
            className={
              actionResult.success ? 'text-green-400' : 'text-red-400'
            }
          >
            {actionResult.message}
          </p>
        </div>
      )}

      {/* Status Badge */}
      <div className="flex items-center gap-4">
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            status === 'pending'
              ? 'bg-yellow-900/50 text-yellow-400'
              : status === 'approved' || status === 'merged'
              ? 'bg-green-900/50 text-green-400'
              : 'bg-red-900/50 text-red-400'
          }`}
        >
          {status.toUpperCase()}
        </span>
        <span className="text-gray-500 text-sm">Fix ID: {fixId}</span>
      </div>

      {/* Summary Card */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">{suggestion.analysis.summary}</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {suggestion.analysis.dataPoints.map((dp, i) => (
            <div key={i} className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm">{dp.metric}</p>
              <p className="text-2xl font-bold">{dp.value}</p>
              <p className="text-gray-500 text-xs">{dp.interpretation}</p>
            </div>
          ))}
        </div>

        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
          <p className="text-blue-400 font-medium">Expected Impact</p>
          <p className="text-white text-lg">{suggestion.recommendation.expectedImpact}</p>
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">Visual Comparison</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Version */}
          <div>
            <p className="text-gray-400 text-sm mb-2 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              Current Version
            </p>
            <div className="bg-gray-900 rounded-lg border border-gray-700 aspect-video flex items-center justify-center">
              <iframe
                src="/store?preview=false"
                className="w-full h-full rounded-lg"
                title="Current Store"
              />
            </div>
          </div>

          {/* Proposed Version */}
          <div>
            <p className="text-gray-400 text-sm mb-2 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              With Fix Applied
            </p>
            <div className="bg-gray-900 rounded-lg border border-green-700 aspect-video flex items-center justify-center">
              <iframe
                src={`/store?preview=true&fixId=${fixId}`}
                className="w-full h-full rounded-lg"
                title="Preview Store"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Changes Detail */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">Proposed Changes</h3>
        <div className="space-y-3">
          {suggestion.changes.map((change, i) => (
            <div
              key={i}
              className="bg-gray-700/50 rounded-lg p-4 flex items-start gap-4"
            >
              <div className="flex-1">
                <p className="font-mono text-sm text-blue-400">{change.field}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-red-400 line-through text-sm">
                    {JSON.stringify(change.oldValue)}
                  </span>
                  <span className="text-gray-500">→</span>
                  <span className="text-green-400 text-sm">
                    {JSON.stringify(change.newValue)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rationale */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-bold mb-2">Rationale</h3>
        <p className="text-gray-300">{suggestion.recommendation.rationale}</p>
      </div>

      {/* PR Info */}
      {prInfo && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4">Pull Request</h3>
          <div className="flex items-center gap-4">
            <span
              className={`px-2 py-1 rounded text-xs ${
                prInfo.status === 'open'
                  ? 'bg-green-900/50 text-green-400'
                  : prInfo.status === 'merged'
                  ? 'bg-purple-900/50 text-purple-400'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {prInfo.status}
            </span>
            <span className="font-mono text-sm text-gray-400">
              {prInfo.branchName}
            </span>
            {prInfo.url && (
              <a
                href={prInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                View on GitHub →
              </a>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {status === 'pending' && !actionResult?.success && (
        <div className="flex gap-4 justify-center pt-6">
          <button
            onClick={handleApprove}
            disabled={actionLoading}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition flex items-center gap-2"
          >
            {actionLoading ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <span>✅</span>
            )}
            Approve & Merge
          </button>
          <button
            onClick={handleReject}
            disabled={actionLoading}
            className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition flex items-center gap-2"
          >
            {actionLoading ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <span>❌</span>
            )}
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

function FixApprovalSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 animate-pulse">
      <div className="h-8 bg-gray-800 rounded w-48"></div>
      <div className="bg-gray-800 rounded-lg p-6 h-48"></div>
      <div className="bg-gray-800 rounded-lg p-6 h-64"></div>
      <div className="bg-gray-800 rounded-lg p-6 h-32"></div>
    </div>
  );
}
