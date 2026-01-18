'use client';

import { useFeatureToggle } from '@/context/FeatureToggleContext';

/**
 * Floating toggle button to control feature flags.
 * For testing/demo purposes.
 */
export function FeatureToggleButton() {
  const { features, toggleFeature } = useFeatureToggle();

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
        <button
          onClick={() => toggleFeature('compareFeature')}
          style={{
            display: 'block',
            background: 'none',
            border: 'none',
            padding: '2px 0',
            cursor: 'pointer',
            color: features.compareFeature ? '#22c55e' : '#6b7280',
            fontSize: '10px',
            fontFamily: 'monospace',
            textAlign: 'left',
          }}
        >
          {features.compareFeature ? '●' : '○'} Compare Feature
        </button>
        <button
          onClick={() => toggleFeature('quickView')}
          style={{
            display: 'block',
            background: 'none',
            border: 'none',
            padding: '2px 0',
            cursor: 'pointer',
            color: features.quickView ? '#22c55e' : '#6b7280',
            fontSize: '10px',
            fontFamily: 'monospace',
            textAlign: 'left',
          }}
        >
          {features.quickView ? '●' : '○'} Quick View
        </button>
      </div>
    </div>
  );
}

export default FeatureToggleButton;
