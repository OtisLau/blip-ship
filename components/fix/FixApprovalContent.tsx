'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [selectedChange, setSelectedChange] = useState<number>(0);
  const [actionResult, setActionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);

  // Slider state for before/after comparison (0-100, default 50 for dual view)
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const sidebarRef = useRef<HTMLDivElement>(null);
  const calloutRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const comparisonRef = useRef<HTMLDivElement>(null);
  const beforeIframeRef = useRef<HTMLIFrameElement>(null);
  const afterIframeRef = useRef<HTMLIFrameElement>(null);

  // Dummy versions for dropdown
  const versions = ['5.0', '4.0', '3.0', '2.0', '1.0'];

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
        setActionResult({ success: true, message: 'Fix shipped successfully!' });
        setFixData((prev) => (prev ? { ...prev, status: 'merged' } : null));
      } else {
        setActionResult({ success: false, message: result.error || 'Ship failed' });
      }
    } catch (err) {
      setActionResult({
        success: false,
        message: err instanceof Error ? err.message : 'Ship failed',
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
        setActionResult({ success: true, message: 'Changes rejected.' });
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

  // Sync scrolling between the two iframes
  const setupScrollSync = () => {
    const beforeIframe = beforeIframeRef.current;
    const afterIframe = afterIframeRef.current;

    if (!beforeIframe || !afterIframe) return;

    try {
      const beforeDoc = beforeIframe.contentWindow?.document;
      const afterDoc = afterIframe.contentWindow?.document;
      const beforeWin = beforeIframe.contentWindow;
      const afterWin = afterIframe.contentWindow;

      if (!beforeDoc || !afterDoc || !beforeWin || !afterWin) return;

      // Track which iframe initiated the scroll
      let scrollSource: 'before' | 'after' | null = null;

      // Handler for before iframe scroll
      const handleBeforeScroll = () => {
        if (scrollSource === 'after') return;
        scrollSource = 'before';
        const scrollTop = beforeWin.scrollY || beforeDoc.documentElement.scrollTop;
        afterWin.scrollTo({ top: scrollTop, behavior: 'instant' as ScrollBehavior });
        // Reset source after a microtask
        queueMicrotask(() => { scrollSource = null; });
      };

      // Handler for after iframe scroll
      const handleAfterScroll = () => {
        if (scrollSource === 'before') return;
        scrollSource = 'after';
        const scrollTop = afterWin.scrollY || afterDoc.documentElement.scrollTop;
        beforeWin.scrollTo({ top: scrollTop, behavior: 'instant' as ScrollBehavior });
        // Reset source after a microtask
        queueMicrotask(() => { scrollSource = null; });
      };

      // Attach scroll listeners
      beforeWin.addEventListener('scroll', handleBeforeScroll, { passive: true });
      afterWin.addEventListener('scroll', handleAfterScroll, { passive: true });

      // Return cleanup function
      return () => {
        beforeWin.removeEventListener('scroll', handleBeforeScroll);
        afterWin.removeEventListener('scroll', handleAfterScroll);
      };
    } catch (e) {
      console.warn('Could not setup scroll sync:', e);
    }
  };

  // State to track when iframes are loaded
  const [iframesLoaded, setIframesLoaded] = useState({ before: false, after: false });

  const handleBeforeIframeLoad = () => {
    setIframesLoaded(prev => ({ ...prev, before: true }));
  };

  const handleAfterIframeLoad = () => {
    setIframesLoaded(prev => ({ ...prev, after: true }));
  };

  // Setup scroll sync once both iframes are loaded
  useEffect(() => {
    if (iframesLoaded.before && iframesLoaded.after) {
      const cleanup = setupScrollSync();
      return cleanup;
    }
  }, [iframesLoaded.before, iframesLoaded.after]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error || !fixData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">Warning</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {error || 'Fix Not Found'}
          </h2>
          <p className="text-gray-600">
            The requested fix could not be found or has expired.
          </p>
        </div>
      </div>
    );
  }

  const { suggestion, status } = fixData;

  // Map changes to display labels
  const changeLabels = suggestion.changes.map((change) => {
    const field = change.field.toLowerCase();
    if (field.includes('color') || field.includes('background')) return 'Color Change';
    if (field.includes('text') || field.includes('headline')) return 'Text Update';
    if (field.includes('cta') || field.includes('button')) return 'Button Change';
    if (field.includes('image')) return 'Image suggestion';
    if (field.includes('shipping') || field.includes('banner')) return 'Adding Free Shipping Callout!';
    return 'Formatting Issue';
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Sailboat Logo - using actual boat.png image */}
          <img
            src="/boat.png"
            alt="Blip Ship logo"
            className="w-8 h-8"
          />
        </div>

        {/* Version Dropdown */}
        <div className="relative">
          <button
            onClick={() => setVersionDropdownOpen(!versionDropdownOpen)}
            className="flex items-center gap-2 bg-gray-900 text-white rounded px-4 py-2 text-sm font-medium hover:bg-gray-800 transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900"
            aria-label="Select version"
            aria-expanded={versionDropdownOpen}
            aria-haspopup="listbox"
          >
            <span>VERSION {suggestion.version || '5.0'}</span>
            <svg className={`w-4 h-4 transition-transform ${versionDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {/* Dropdown Menu */}
          {versionDropdownOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              {versions.map((version) => (
                <button
                  key={version}
                  onClick={() => setVersionDropdownOpen(false)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition ${
                    version === (suggestion.version || '5.0')
                      ? 'text-gray-900 font-medium bg-gray-50'
                      : 'text-gray-600'
                  }`}
                >
                  VERSION {version}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Success/Error Banner */}
      {actionResult && (
        <div
          className={`px-4 py-3 ${actionResult.success ? 'bg-green-500' : 'bg-red-500'} text-white text-center font-medium`}
          role="alert"
          aria-live="polite"
        >
          {actionResult.message}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex relative">
        {/* Preview Area - Slider Comparison */}
        <div className="flex-1 p-4 relative">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full">
            {/* Slider Comparison Container */}
            <div
              ref={comparisonRef}
              className={`relative w-full h-full overflow-hidden select-none ${isDragging ? 'cursor-ew-resize' : 'cursor-pointer'}`}
              onMouseMove={(e) => {
                if (!isDragging || !comparisonRef.current) return;
                const rect = comparisonRef.current.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                setSliderPosition(Math.min(98, Math.max(2, x)));
              }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onClick={(e) => {
                // Click left side = show Before, click right side = show After
                if (isDragging || !comparisonRef.current) return;
                const rect = comparisonRef.current.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const isLeftHalf = clickX < rect.width / 2;
                setSliderPosition(isLeftHalf ? 2 : 98);
              }}
              onKeyDown={(e) => {
                // Keyboard navigation
                if (e.key === 'ArrowLeft') {
                  setSliderPosition((prev) => Math.max(2, prev - 5));
                } else if (e.key === 'ArrowRight') {
                  setSliderPosition((prev) => Math.min(98, prev + 5));
                }
              }}
              tabIndex={0}
              role="slider"
              aria-label="Compare before and after versions"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={sliderPosition}
            >
              {/* Overlay to capture mouse events when dragging */}
              {isDragging && (
                <div className="absolute inset-0 z-30 cursor-ew-resize" />
              )}

              {/* BEFORE - Original version (full width, visible on left of slider) */}
              <iframe
                ref={beforeIframeRef}
                src="/store?mode=live"
                className={`absolute inset-0 w-full h-full border-0 ${isDragging ? 'pointer-events-none' : ''}`}
                onLoad={handleBeforeIframeLoad}
                title="Original Store (Before)"
              />

              {/* AFTER - New version (clipped from left based on slider position) */}
              <div
                className="absolute inset-0 h-full"
                style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
              >
                <iframe
                  ref={afterIframeRef}
                  src={`/store?mode=preview&fixId=${fixId}`}
                  className={`w-full h-full border-0 ${isDragging ? 'pointer-events-none' : ''}`}
                  onLoad={handleAfterIframeLoad}
                  title="Preview Store (After)"
                />
              </div>

              {/* Draggable Slider Handle - thin line with circular handle */}
              <div
                className="absolute top-0 bottom-0 cursor-ew-resize z-20 group"
                style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)', width: '20px' }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
              >
                {/* Thin vertical line */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-white/80" />

                {/* Circular handle - centered vertically */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg border border-gray-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>

            </div>
          </div>
          {/* Labels - positioned in the preview area container, fixed relative to viewport */}
          <div className="absolute top-7 left-7 bg-gray-900/80 text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider z-10 pointer-events-none">
            Before
          </div>
          <div className="absolute top-7 right-7 bg-green-600/90 text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider z-10 pointer-events-none">
            After
          </div>
          {/* Subtle hint text */}
          <div className="absolute bottom-7 left-1/2 -translate-x-1/2 bg-black/50 text-white/80 px-3 py-1 rounded-full text-xs z-10 pointer-events-none opacity-60">
            Drag slider to compare · Scroll synced between views
          </div>
        </div>

        {/* Right Sidebar */}
        <div ref={sidebarRef} className="w-80 bg-white border-l border-gray-200 flex flex-col">
          {/* Change List - Selected item expands to fill available space */}
          <div className="flex-1 p-4 flex flex-col overflow-y-auto min-h-0">
            {suggestion.changes.map((change, i) => (
              <div
                key={i}
                className={`transition-all duration-500 ease-out ${selectedChange === i ? 'flex-[1_1_auto]' : 'flex-[0_0_auto] mb-3'}`}
                style={{
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)', // Logarithmic ease-out
                }}
              >
                <button
                  ref={(el) => { calloutRefs.current[i] = el; }}
                  onClick={() => setSelectedChange(i)}
                  aria-pressed={selectedChange === i}
                  className={`w-full h-full text-left p-4 rounded border transition-all duration-500 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 ${
                    selectedChange === i
                      ? 'border-gray-900 bg-white border-solid'
                      : 'border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                  style={{
                    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <p className="font-medium text-gray-900">{changeLabels[i]}</p>
                  {/* Expanded detail when selected */}
                  {selectedChange === i && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-700">
                        {getChangeDescription(change)}
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-1">
                        {change.field}
                      </p>
                    </div>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Ship Button Area - Using actual image */}
          <div className="p-4 pt-0">
            {status === 'pending' && !actionResult?.success ? (
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                aria-busy={actionLoading}
                className="w-full relative overflow-hidden cursor-pointer group focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white rounded-lg"
              >
                <img
                  src="/ship-button.png"
                  alt="SHIP!"
                  className="w-full h-auto rounded-lg transition-all duration-200 group-hover:brightness-110 group-hover:scale-[1.02] group-active:scale-[0.98] group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                />
                {actionLoading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <span className="animate-spin" role="status" aria-label="Loading">
                      <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </span>
                  </div>
                )}
              </button>
            ) : (
              <div className="bg-black text-center py-8 rounded-lg">
                <span className={`text-2xl font-bold ${
                  status === 'merged' ? 'text-green-400' :
                  status === 'rejected' ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {status === 'merged' && 'Shipped!'}
                  {status === 'rejected' && 'Rejected'}
                  {status === 'approved' && 'Approved'}
                </span>
              </div>
            )}
            {status === 'pending' && !actionResult?.success && (
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="w-full py-2 mt-2 bg-gray-900 text-gray-500 hover:text-white text-sm transition rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900"
              >
                Reject Changes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getChangeDescription(change: { field: string; oldValue: unknown; newValue: unknown }): string {
  const field = change.field.toLowerCase();

  if (field.includes('cta') || field.includes('button')) {
    const newVal = change.newValue as Record<string, unknown>;
    if (newVal?.text) return `Updating CTA to "${newVal.text}"`;
    return 'Updating button styling';
  }

  if (field.includes('color') || field.includes('background')) {
    return `Changing color to ${String(change.newValue)}`;
  }

  if (field.includes('headline') || field.includes('text')) {
    return `Updating text content`;
  }

  if (field.includes('shipping') || field.includes('banner')) {
    return 'Adding promotional banner';
  }

  return `Updating ${change.field}`;
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="w-10 h-10 bg-gray-200 rounded animate-pulse" />
        <div className="w-32 h-10 bg-gray-200 rounded animate-pulse" />
      </header>
      <div className="flex-1 flex">
        <div className="flex-1 p-4">
          <div className="bg-white rounded-lg border border-gray-200 h-full animate-pulse" />
        </div>
        <div className="w-80 bg-white border-l border-gray-200 p-4 space-y-3">
          <div className="h-16 bg-gray-200 rounded border-2 border-dashed border-gray-300 animate-pulse" />
          <div className="h-16 bg-gray-200 rounded border-2 border-dashed border-gray-300 animate-pulse" />
          <div className="h-16 bg-gray-200 rounded border-2 border-dashed border-gray-300 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
