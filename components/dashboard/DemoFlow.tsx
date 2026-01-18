'use client';

import { useState, useEffect } from 'react';

interface FlowState {
  status: 'idle' | 'analyzing' | 'success' | 'error';
  eventCount: number;
  identity?: {
    state: string;
    confidence: number;
  };
  result?: {
    prUrl: string;
    prNumber: number;
    fixId: string;
    emailSent: boolean;
  };
  error?: string;
  changes?: Array<{
    field: string;
    oldValue: string;
    newValue: string;
  }>;
}

export function DemoFlow() {
  const [state, setState] = useState<FlowState>({
    status: 'idle',
    eventCount: 0,
  });

  // Poll for event count
  useEffect(() => {
    const fetchEventCount = async () => {
      try {
        const res = await fetch('/api/analytics');
        const data = await res.json();
        setState(prev => ({
          ...prev,
          eventCount: data.summary?.totalEvents || 0,
        }));
      } catch {
        // Ignore errors
      }
    };

    fetchEventCount();
    const interval = setInterval(fetchEventCount, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = async () => {
    setState({ status: 'idle', eventCount: 0 });
    try {
      await fetch('/api/reset', { method: 'POST' });
    } catch {
      // Ignore errors
    }
  };

  const handleRunAnalysis = async () => {
    setState(prev => ({ ...prev, status: 'analyzing' }));

    try {
      const res = await fetch('/api/identity-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false }),
      });

      const data = await res.json();

      if (data.success) {
        const fixIdMatch = data.logs?.find((l: string) => l.includes('Saved fix'))?.match(/ID: (.+)/);
        setState(prev => ({
          ...prev,
          status: 'success',
          identity: data.identity,
          changes: data.mapping?.changes || data.suggestion?.changes || [],
          result: {
            prUrl: data.result.prUrl,
            prNumber: data.result.prNumber,
            fixId: fixIdMatch?.[1] || data.result.fixId || '',
            emailSent: data.result.emailSent,
          },
        }));
      } else {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: data.error || data.message || 'Unknown error',
          identity: data.identity,
        }));
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Network error',
      }));
    }
  };

  const handleShip = async () => {
    if (!state.result?.fixId) return;

    try {
      const res = await fetch(`/api/fix/${state.result.fixId}/approve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      }
    } catch {
      // Ignore
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Side - Store Preview */}
      <div className="flex-1 border-r border-gray-200">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Events:</span>
            <span className="font-mono font-medium">{state.eventCount}</span>
            {state.eventCount >= 5 && (
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
        </div>

        {/* Store iframe */}
        <div className="relative" style={{ height: 'calc(100vh - 120px)' }}>
          <iframe
            src="/store"
            className="w-full h-full border-0"
            title="Store Preview"
          />
          {state.status === 'analyzing' && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-600 font-medium">Analyzing behavior...</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="flex items-center justify-center gap-4 px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button className="px-4 py-1.5 text-sm font-medium text-gray-600 border-b-2 border-green-500">
            LIVE
          </button>
          <button className="px-4 py-1.5 text-sm font-medium text-gray-400 hover:text-gray-600 transition">
            PREVIEW
          </button>
        </div>
      </div>

      {/* Right Side - Suggestions */}
      <div className="w-80 flex flex-col bg-gray-50">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Suggestions</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {state.status === 'idle' && state.eventCount < 5 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🚢</div>
              <p className="text-gray-500 text-sm">
                Interact with the store to<br />generate suggestions
              </p>
              <p className="text-gray-400 text-xs mt-2">
                {5 - state.eventCount} more events needed
              </p>
            </div>
          )}

          {state.status === 'idle' && state.eventCount >= 5 && (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">✨</div>
              <p className="text-gray-700 font-medium mb-2">Ready to analyze!</p>
              <p className="text-gray-500 text-sm mb-4">
                {state.eventCount} events captured
              </p>
              <button
                onClick={handleRunAnalysis}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition"
              >
                Find Improvements
              </button>
            </div>
          )}

          {state.status === 'analyzing' && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4 animate-bounce">🔍</div>
              <p className="text-gray-600 font-medium">Analyzing patterns...</p>
            </div>
          )}

          {state.status === 'success' && state.identity && (
            <>
              {/* Identity Badge */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🧠</span>
                  <span className="text-sm font-medium text-gray-500">User Profile</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 capitalize">
                  {state.identity.state.replace('_', ' ')}
                </p>
                <p className="text-sm text-gray-500">
                  {(state.identity.confidence * 100).toFixed(0)}% confidence
                </p>
              </div>

              {/* Suggestions */}
              {state.changes && state.changes.length > 0 && (
                <div className="space-y-2">
                  {state.changes.slice(0, 4).map((change, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-lg border border-gray-200 p-3 hover:border-green-300 transition cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatChangeLabel(change.field)}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            "{change.newValue}"
                          </p>
                        </div>
                        <span className="text-green-500 text-lg">→</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* PR Link */}
              {state.result?.prUrl && (
                <a
                  href={state.result.prUrl}
                  target="_blank"
                  className="block text-center text-sm text-green-600 hover:text-green-700 transition"
                >
                  View PR #{state.result.prNumber} →
                </a>
              )}
            </>
          )}

          {state.status === 'error' && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">😅</div>
              <p className="text-gray-700 font-medium mb-2">No changes needed</p>
              <p className="text-gray-500 text-sm mb-4">{state.error}</p>
              <button
                onClick={handleReset}
                className="text-sm text-green-600 hover:text-green-700 transition"
              >
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Ship Button */}
        <div className="p-4 border-t border-gray-200 bg-white">
          {state.status === 'success' && state.result ? (
            <button
              onClick={handleShip}
              className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-bold text-lg rounded-xl transition flex items-center justify-center gap-3 shadow-lg shadow-green-500/25"
            >
              <span className="text-2xl">⚓</span>
              SHIP IT!
            </button>
          ) : (
            <button
              disabled
              className="w-full py-4 bg-gray-200 text-gray-400 font-bold text-lg rounded-xl cursor-not-allowed flex items-center justify-center gap-3"
            >
              <span className="text-2xl opacity-50">⚓</span>
              SHIP IT!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatChangeLabel(field: string): string {
  const labels: Record<string, string> = {
    'hero.headline': 'Headline Change',
    'hero.subheadline': 'Subheadline Update',
    'hero.cta.text': 'Button Text',
    'hero.cta.size': 'Button Size',
    'hero.cta.color': 'Button Color',
    'products.layout': 'Product Layout',
    'testimonials.show': 'Show Reviews',
  };
  return labels[field] || field.split('.').pop()?.replace(/_/g, ' ') || field;
}
