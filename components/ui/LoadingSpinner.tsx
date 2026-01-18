'use client';

interface LoadingSpinnerProps {
  /**
   * Size of the spinner in pixels
   * @default 16
   */
  size?: number;
  /**
   * Color of the spinner
   * @default 'currentColor' - inherits from parent text color
   */
  color?: 'white' | 'dark' | 'currentColor';
  /**
   * Additional class names
   */
  className?: string;
}

/**
 * LoadingSpinner Component
 *
 * A simple, theme-compliant loading spinner.
 * Follows theme-protection-guardrails.md specifications:
 * - 16px default size
 * - 1s linear infinite rotation
 * - Uses allowed colors only (white, #111, currentColor)
 */
export function LoadingSpinner({
  size = 16,
  color = 'currentColor',
  className = '',
}: LoadingSpinnerProps) {
  const colorValue = {
    white: '#fff',
    dark: '#111',
    currentColor: 'currentColor',
  }[color];

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{
        animation: 'spin 1s linear infinite',
      }}
      aria-label="Loading"
      role="status"
    >
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={colorValue}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="31.4 31.4"
        opacity="0.25"
      />
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={colorValue}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="31.4 31.4"
        strokeDashoffset="23.55"
      />
    </svg>
  );
}

/**
 * Inline loading spinner for use within button text
 */
export function InlineSpinner({
  size = 14,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        marginRight: '6px',
      }}
    >
      <LoadingSpinner size={size} color="currentColor" />
    </span>
  );
}

export default LoadingSpinner;
