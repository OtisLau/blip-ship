/**
 * Design Tokens - "Better" E-commerce Design System
 * Extracted from CSS specification
 */

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const fonts = {
  /** Primary font for body text and UI elements */
  body: "'Poppins', sans-serif",
  /** Secondary font for headings and display text */
  heading: "'Volkhov', serif",
} as const;

export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const fontSizes = {
  /** 12px - Small labels, captions */
  xs: '12px',
  /** 14px - Secondary text */
  sm: '14px',
  /** 16px - Body text default */
  base: '16px',
  /** 18px - Large body text */
  lg: '18px',
  /** 20px - Small headings */
  xl: '20px',
  /** 22px - Medium headings */
  '2xl': '22px',
  /** 26px - Section headings */
  '3xl': '26px',
  /** 35px - Page headings */
  '4xl': '35px',
  /** 46px - Hero headings */
  '5xl': '46px',
} as const;

export const lineHeights = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.7,
  loose: 2,
} as const;

// =============================================================================
// COLORS
// =============================================================================

export const colors = {
  // Text colors
  text: {
    /** Primary text - #484848 */
    primary: '#484848',
    /** Secondary/muted text - #8A8A8A */
    secondary: '#8A8A8A',
    /** Inverted text on dark backgrounds */
    inverted: '#FFFFFF',
    /** Black text for emphasis */
    black: '#000000',
  },

  // Background colors
  background: {
    /** Primary white background */
    primary: '#FFFFFF',
    /** Light gray background for sections */
    secondary: '#FAFAFA',
    /** Dark background for hero/footer */
    dark: '#000000',
  },

  // Brand/Accent colors
  accent: {
    /** Star ratings - #FCA120 */
    star: '#FCA120',
    /** Sale/discount text - #FF4646 */
    sale: '#FF4646',
    /** Primary CTA color */
    primary: '#000000',
  },

  // UI colors
  ui: {
    /** Border color for cards */
    border: '#E5E5E5',
    /** Divider lines */
    divider: '#EBEBEB',
    /** Input borders */
    inputBorder: '#CCCCCC',
    /** Hover states */
    hover: '#333333',
  },
} as const;

// =============================================================================
// SPACING
// =============================================================================

export const spacing = {
  /** 4px */
  xs: '4px',
  /** 8px */
  sm: '8px',
  /** 12px */
  md: '12px',
  /** 16px */
  base: '16px',
  /** 20px */
  lg: '20px',
  /** 24px */
  xl: '24px',
  /** 32px */
  '2xl': '32px',
  /** 40px */
  '3xl': '40px',
  /** 48px */
  '4xl': '48px',
  /** 64px */
  '5xl': '64px',
  /** 80px */
  '6xl': '80px',
  /** 100px */
  '7xl': '100px',
} as const;

// =============================================================================
// BORDERS & RADIUS
// =============================================================================

export const borderRadius = {
  /** No rounding */
  none: '0px',
  /** Slight rounding - 4px */
  sm: '4px',
  /** Default rounding - 10px (primary) */
  base: '10px',
  /** Medium rounding - 12px */
  md: '12px',
  /** Large rounding - 16px */
  lg: '16px',
  /** Extra large - 20px */
  xl: '20px',
  /** Pill shape */
  full: '9999px',
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const shadows = {
  /** No shadow */
  none: 'none',
  /** Subtle card shadow */
  sm: '0 2px 4px rgba(0, 0, 0, 0.05)',
  /** Default card shadow */
  base: '0 4px 12px rgba(0, 0, 0, 0.08)',
  /** Elevated shadow for modals, dropdowns */
  md: '0 8px 24px rgba(0, 0, 0, 0.12)',
  /** Strong shadow for focus states */
  lg: '0 12px 32px rgba(0, 0, 0, 0.15)',
} as const;

// =============================================================================
// TRANSITIONS
// =============================================================================

export const transitions = {
  /** Fast transitions - 150ms */
  fast: '150ms ease',
  /** Default transitions - 200ms */
  base: '200ms ease',
  /** Slow transitions - 300ms */
  slow: '300ms ease',
  /** Hover transforms - 400ms */
  hover: '400ms ease',
} as const;

// =============================================================================
// BREAKPOINTS
// =============================================================================

export const breakpoints = {
  /** Mobile: 0-639px */
  sm: '640px',
  /** Tablet: 640-767px */
  md: '768px',
  /** Desktop: 768-1023px */
  lg: '1024px',
  /** Large desktop: 1024-1279px */
  xl: '1280px',
  /** Extra large: 1280px+ */
  '2xl': '1440px',
} as const;

// =============================================================================
// LAYOUT
// =============================================================================

export const layout = {
  /** Maximum content width */
  maxWidth: '1280px',
  /** Container padding */
  containerPadding: '24px',
  /** Header height */
  headerHeight: '80px',
  /** Grid gap for product cards */
  gridGap: '20px',
} as const;

// =============================================================================
// COMPONENT STYLES
// =============================================================================

export const components = {
  // Button styles
  button: {
    primary: {
      background: colors.accent.primary,
      color: colors.text.inverted,
      padding: '14px 28px',
      borderRadius: borderRadius.base,
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      fontFamily: fonts.body,
    },
    secondary: {
      background: 'transparent',
      color: colors.text.primary,
      border: `1px solid ${colors.text.black}`,
      padding: '14px 28px',
      borderRadius: borderRadius.base,
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      fontFamily: fonts.body,
    },
  },

  // Card styles
  card: {
    product: {
      background: colors.background.primary,
      borderRadius: borderRadius.base,
      border: `1px solid ${colors.ui.border}`,
      shadow: shadows.base,
    },
    testimonial: {
      background: colors.background.primary,
      borderRadius: borderRadius.base,
      padding: spacing['2xl'],
      shadow: shadows.md,
    },
  },

  // Input styles
  input: {
    default: {
      background: colors.background.primary,
      border: `1px solid ${colors.ui.inputBorder}`,
      borderRadius: borderRadius.base,
      padding: '14px 16px',
      fontSize: fontSizes.base,
      fontFamily: fonts.body,
    },
  },

  // Badge styles
  badge: {
    sale: {
      background: colors.accent.sale,
      color: colors.text.inverted,
      padding: '6px 12px',
      borderRadius: borderRadius.sm,
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
    },
    new: {
      background: colors.accent.primary,
      color: colors.text.inverted,
      padding: '6px 12px',
      borderRadius: borderRadius.sm,
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
    },
  },
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type FontKey = keyof typeof fonts;
export type FontWeight = keyof typeof fontWeights;
export type FontSize = keyof typeof fontSizes;
export type ColorKey = keyof typeof colors;
export type SpacingKey = keyof typeof spacing;
export type BorderRadiusKey = keyof typeof borderRadius;
export type ShadowKey = keyof typeof shadows;
export type TransitionKey = keyof typeof transitions;
export type BreakpointKey = keyof typeof breakpoints;
