'use client';

import { useState, useRef, useEffect } from 'react';

interface BranchPreviewSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function BranchPreviewSlider({
  beforeUrl,
  afterUrl,
  beforeLabel = 'Before',
  afterLabel = 'After',
}: BranchPreviewSliderProps) {
  // Slider state for before/after comparison (0-100, default 50 for dual view)
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  // Refs for scroll sync
  const comparisonRef = useRef<HTMLDivElement>(null);
  const beforeIframeRef = useRef<HTMLIFrameElement>(null);
  const afterIframeRef = useRef<HTMLIFrameElement>(null);

  // State to track when iframes are loaded
  const [iframesLoaded, setIframesLoaded] = useState({ before: false, after: false });

  const handleBeforeIframeLoad = () => {
    setIframesLoaded((prev) => ({ ...prev, before: true }));
  };

  const handleAfterIframeLoad = () => {
    setIframesLoaded((prev) => ({ ...prev, after: true }));
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
        queueMicrotask(() => {
          scrollSource = null;
        });
      };

      // Handler for after iframe scroll
      const handleAfterScroll = () => {
        if (scrollSource === 'before') return;
        scrollSource = 'after';
        const scrollTop = afterWin.scrollY || afterDoc.documentElement.scrollTop;
        beforeWin.scrollTo({ top: scrollTop, behavior: 'instant' as ScrollBehavior });
        // Reset source after a microtask
        queueMicrotask(() => {
          scrollSource = null;
        });
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

  // Setup scroll sync once both iframes are loaded
  useEffect(() => {
    if (iframesLoaded.before && iframesLoaded.after) {
      const cleanup = setupScrollSync();
      return cleanup;
    }
  }, [iframesLoaded.before, iframesLoaded.after]);

  return (
    <div className="relative w-full h-full">
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
        {isDragging && <div className="absolute inset-0 z-30 cursor-ew-resize" />}

        {/* BEFORE - Original version (full width, visible on left of slider) */}
        <iframe
          ref={beforeIframeRef}
          src={beforeUrl}
          className={`absolute inset-0 w-full h-full border-0 ${isDragging ? 'pointer-events-none' : ''}`}
          onLoad={handleBeforeIframeLoad}
          title="Before"
        />

        {/* AFTER - New version (clipped from left based on slider position) */}
        <div
          className="absolute inset-0 h-full"
          style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
        >
          <iframe
            ref={afterIframeRef}
            src={afterUrl}
            className={`w-full h-full border-0 ${isDragging ? 'pointer-events-none' : ''}`}
            onLoad={handleAfterIframeLoad}
            title="After"
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
            <svg
              className="w-4 h-4 text-gray-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-4 left-4 bg-gray-900/80 text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider z-10 pointer-events-none">
        {beforeLabel}
      </div>
      <div className="absolute top-4 right-4 bg-green-600/90 text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider z-10 pointer-events-none">
        {afterLabel}
      </div>

      {/* Subtle hint text */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white/80 px-3 py-1 rounded-full text-xs z-10 pointer-events-none opacity-60">
        Drag slider to compare · Scroll synced between views
      </div>
    </div>
  );
}
