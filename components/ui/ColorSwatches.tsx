'use client';

interface ColorOption {
  name: string;
  value: string;
  image?: string;
}

interface ColorSwatchesProps {
  colors: ColorOption[];
  selectedColor?: string;
  onSelect: (colorValue: string) => void;
  maxVisible?: number;
  size?: 'small' | 'medium';
}

/**
 * ColorSwatches Component
 *
 * Displays color options as clickable circles.
 * Follows theme-protection-guardrails.md:
 * - Circles ARE allowed for color swatches (border-radius: 50%)
 * - Border: #e5e7eb normal, #111 selected
 * - Size: 20-24px
 */
export function ColorSwatches({
  colors,
  selectedColor,
  onSelect,
  maxVisible = 5,
  size = 'small',
}: ColorSwatchesProps) {
  const swatchSize = size === 'small' ? 20 : 24;
  const visibleColors = colors.slice(0, maxVisible);
  const hiddenCount = colors.length - maxVisible;

  // Determine if color is light (for checkmark visibility)
  const isLightColor = (color: string): boolean => {
    // Convert to RGB and check luminance
    const hex = color.replace('#', '');
    if (hex.length !== 6) return false;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '6px',
        marginTop: '8px',
      }}
    >
      {visibleColors.map((color) => {
        const isSelected = selectedColor === color.value;
        const checkmarkColor = isLightColor(color.value) ? '#111' : 'white';

        return (
          <button
            key={color.value}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(color.value);
            }}
            title={color.name}
            style={{
              width: `${swatchSize}px`,
              height: `${swatchSize}px`,
              borderRadius: '50%',
              backgroundColor: color.value,
              border: isSelected ? '2px solid #111' : '1px solid #e5e7eb',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.1s, border-color 0.1s',
              transform: isSelected ? 'scale(1.1)' : 'scale(1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = isSelected ? 'scale(1.1)' : 'scale(1)';
            }}
          >
            {isSelected && (
              <svg
                width={swatchSize * 0.5}
                height={swatchSize * 0.5}
                viewBox="0 0 12 12"
                fill="none"
                stroke={checkmarkColor}
                strokeWidth="2"
              >
                <path d="M2 6l3 3 5-5" />
              </svg>
            )}
          </button>
        );
      })}

      {hiddenCount > 0 && (
        <span
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: '#6b7280',
          }}
        >
          +{hiddenCount} more
        </span>
      )}
    </div>
  );
}

export default ColorSwatches;
