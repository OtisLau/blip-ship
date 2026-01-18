'use client';

import { useFeatureToggle } from '@/context/FeatureToggleContext';

/**
 * Floating toggle button to switch between enhanced and basic modes.
 * For testing/demo purposes.
 */
export function FeatureToggleButton() {
  const { enhancedMode, toggleEnhancedMode, features } = useFeatureToggle();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <button
        onClick={toggleEnhancedMode}
        style={{
          padding: '12px 20px',
          backgroundColor: enhancedMode ? '#22c55e' : '#6b7280',
          color: 'white',
          border: 'none',
          fontSize: '12px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          transition: 'all 0.2s',
        }}
      >
        {enhancedMode ? '✓ Enhanced Mode' : '○ Basic Mode'}
      </button>

      {/* Feature status indicators */}
      <div
        style={{
          backgroundColor: 'rgba(17, 17, 17, 0.9)',
          padding: '8px 12px',
          fontSize: '10px',
          color: 'white',
          fontFamily: 'monospace',
        }}
      >
        <div style={{ marginBottom: '4px', fontWeight: 600 }}>Features:</div>
        <div style={{ color: features.imageClickable ? '#22c55e' : '#6b7280' }}>
          {features.imageClickable ? '●' : '○'} Image Clickable
        </div>
        <div style={{ color: features.loadingSpinner ? '#22c55e' : '#6b7280' }}>
          {features.loadingSpinner ? '●' : '○'} Loading Spinners
        </div>
        <div style={{ color: features.imageGallery ? '#22c55e' : '#6b7280' }}>
          {features.imageGallery ? '●' : '○'} Image Gallery
        </div>
        <div style={{ color: features.compareFeature ? '#22c55e' : '#6b7280' }}>
          {features.compareFeature ? '●' : '○'} Compare Feature
        </div>
        <div style={{ color: features.colorSwatches ? '#22c55e' : '#6b7280' }}>
          {features.colorSwatches ? '●' : '○'} Color Swatches
        </div>
      </div>
    </div>
  );
}

export default FeatureToggleButton;
