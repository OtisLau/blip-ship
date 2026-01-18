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
        setState(prev => ({
          ...prev,
          status: 'success',
          identity: data.identity,
          result: {
            prUrl: data.result.prUrl,
            prNumber: data.result.prNumber,
            fixId: data.logs?.find((l: string) => l.includes('Saved fix'))?.match(/ID: (.+)/)?.[1] || '',
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

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="text-2xl">🧠</span> CRO Agent Demo
      </h2>

      {/* Step 1: Store Link */}
      <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Step 1: Interact with Store</h3>
            <p className="text-sm text-gray-400">
              Click around, hover on buttons, scroll up and down
            </p>
          </div>
          <a
            href="/store"
            target="_blank"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition font-medium"
          >
            Open Store →
          </a>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-gray-400">Events tracked:</span>
          <span className="px-2 py-0.5 bg-gray-700 rounded text-sm font-mono">
            {state.eventCount}
          </span>
          {state.eventCount >= 5 && (
            <span className="text-green-400 text-sm">✓ Ready for analysis</span>
          )}
        </div>
      </div>

      {/* Step 2: Run Analysis */}
      <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Step 2: Run AI Analysis</h3>
            <p className="text-sm text-gray-400">
              AI will classify user behavior and generate a fix
            </p>
          </div>
          <button
            onClick={handleRunAnalysis}
            disabled={state.status === 'analyzing' || state.eventCount < 5}
            className={`px-4 py-2 rounded-lg transition font-medium ${
              state.status === 'analyzing'
                ? 'bg-yellow-600 cursor-wait'
                : state.eventCount < 5
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {state.status === 'analyzing' ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span> Analyzing...
              </span>
            ) : (
              'Run Analysis'
            )}
          </button>
        </div>
      </div>

      {/* Status Display */}
      {state.status === 'success' && state.identity && state.result && (
        <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg">
          <h3 className="font-medium text-green-400 mb-2">✓ Fix Generated!</h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-gray-400">User Identity:</span>{' '}
              <span className="font-medium">{state.identity.state}</span>{' '}
              <span className="text-gray-500">
                ({(state.identity.confidence * 100).toFixed(0)}% confidence)
              </span>
            </p>
            {state.result.prUrl && (
              <p>
                <span className="text-gray-400">Pull Request:</span>{' '}
                <a
                  href={state.result.prUrl}
                  target="_blank"
                  className="text-blue-400 hover:underline"
                >
                  PR #{state.result.prNumber}
                </a>
              </p>
            )}
            <p>
              <span className="text-gray-400">Email:</span>{' '}
              {state.result.emailSent ? (
                <span className="text-green-400">✓ Sent to store owner</span>
              ) : (
                <span className="text-yellow-400">Not configured</span>
              )}
            </p>
          </div>
          <div className="mt-4 flex gap-3">
            <a
              href={`/fix/${state.result.fixId || 'latest'}`}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition text-sm font-medium"
            >
              View Approval Page →
            </a>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-sm"
            >
              Reset & Try Again
            </button>
          </div>
        </div>
      )}

      {state.status === 'error' && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
          <h3 className="font-medium text-red-400 mb-2">Error</h3>
          <p className="text-sm text-gray-300">{state.error}</p>
          {state.identity && (
            <p className="text-sm text-gray-400 mt-2">
              Detected identity: {state.identity.state} ({(state.identity.confidence * 100).toFixed(0)}%)
            </p>
          )}
          <button
            onClick={handleReset}
            className="mt-3 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-sm"
          >
            Reset & Try Again
          </button>
        </div>
      )}

      {/* Reset Button */}
      {state.status === 'idle' && state.eventCount > 0 && (
        <div className="text-center">
          <button
            onClick={handleReset}
            className="text-sm text-gray-500 hover:text-gray-300 transition"
          >
            Reset all data
          </button>
        </div>
      )}
    </div>
  );
}
