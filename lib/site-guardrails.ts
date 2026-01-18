/**
 * Site Guardrails - Dynamic theme configuration loader/saver
 *
 * This module handles loading, saving, and merging site-specific guardrails.
 * Guardrails are NOT hardcoded - they're extracted per-site and used for validation.
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { SiteGuardrails } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const GUARDRAILS_FILE = path.join(DATA_DIR, 'site-guardrails.json');

/**
 * Default guardrails (used as fallback when no site-specific config exists)
 * These are generic reasonable defaults, not site-specific
 */
export const DEFAULT_GUARDRAILS: SiteGuardrails = {
  siteId: 'default',
  extractedAt: new Date().toISOString(),
  source: 'manual',

  colors: {
    backgrounds: ['#111', '#fff', '#ffffff', '#fafafa', '#f5f5f5', 'white', 'transparent'],
    text: ['#111', '#374151', '#6b7280', '#fff', '#ffffff', 'white'],
    borders: ['#e5e7eb', '#111', 'transparent'],
    accents: ['#3b82f6'],
    accentContexts: ['hero-cta'],
  },

  typography: {
    allowedFontWeights: [500, 600],
    buttonFontSizeRange: [12, 14],
    requireUppercaseButtons: true,
    letterSpacing: '0.5px',
  },

  spacing: {
    borderRadiusAllowed: [0], // Sharp corners by default
    buttonPaddingH: [12, 32],
    buttonPaddingV: [12, 14],
    minTapTarget: 44,
  },

  animations: {
    maxTransitionDuration: '0.4s',
    allowedEasings: ['ease', 'ease-in-out', 'linear'],
  },

  components: {
    buttonPatterns: ['uppercase', 'letter-spacing'],
    loadingSpinnerSize: 16,
  },
};

/**
 * Load site guardrails from the config file
 * Returns default guardrails if file doesn't exist
 */
export async function loadSiteGuardrails(): Promise<SiteGuardrails> {
  try {
    const data = await fs.readFile(GUARDRAILS_FILE, 'utf-8');
    const guardrails = JSON.parse(data) as SiteGuardrails;
    console.log(`📋 [Guardrails] Loaded config for site: ${guardrails.siteId}`);
    return guardrails;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('📋 [Guardrails] No config found, using defaults');
      return DEFAULT_GUARDRAILS;
    }
    console.error('📋 [Guardrails] Error loading config:', error);
    return DEFAULT_GUARDRAILS;
  }
}

/**
 * Save site guardrails to the config file
 */
export async function saveSiteGuardrails(guardrails: SiteGuardrails): Promise<void> {
  try {
    // Ensure data directory exists
    await fs.mkdir(DATA_DIR, { recursive: true });

    // Update timestamp
    guardrails.extractedAt = new Date().toISOString();

    await fs.writeFile(GUARDRAILS_FILE, JSON.stringify(guardrails, null, 2), 'utf-8');
    console.log(`📋 [Guardrails] Saved config for site: ${guardrails.siteId}`);
  } catch (error) {
    console.error('📋 [Guardrails] Error saving config:', error);
    throw error;
  }
}

/**
 * Merge partial guardrails with existing config
 * Useful for manual overrides after auto-extraction
 */
export async function mergeGuardrails(
  overrides: Partial<SiteGuardrails>
): Promise<SiteGuardrails> {
  const existing = await loadSiteGuardrails();

  const merged: SiteGuardrails = {
    ...existing,
    ...overrides,
    source: 'hybrid',
    extractedAt: new Date().toISOString(),
    colors: {
      ...existing.colors,
      ...(overrides.colors || {}),
    },
    typography: {
      ...existing.typography,
      ...(overrides.typography || {}),
    },
    spacing: {
      ...existing.spacing,
      ...(overrides.spacing || {}),
    },
    animations: {
      ...existing.animations,
      ...(overrides.animations || {}),
    },
    components: {
      ...existing.components,
      ...(overrides.components || {}),
    },
  };

  await saveSiteGuardrails(merged);
  return merged;
}

/**
 * Check if a color is allowed by the guardrails
 */
export function isColorAllowed(
  color: string,
  type: 'backgrounds' | 'text' | 'borders' | 'accents',
  guardrails: SiteGuardrails,
  context?: string
): boolean {
  const normalizedColor = color.toLowerCase().trim();

  // For accents, check if context is allowed
  if (type === 'accents') {
    if (context && !guardrails.colors.accentContexts.includes(context)) {
      return false;
    }
  }

  const allowedColors = guardrails.colors[type].map((c) => c.toLowerCase());
  return allowedColors.includes(normalizedColor);
}

/**
 * Check if a font weight is allowed
 */
export function isFontWeightAllowed(weight: number, guardrails: SiteGuardrails): boolean {
  return guardrails.typography.allowedFontWeights.includes(weight);
}

/**
 * Check if a font size is in the allowed range for buttons
 */
export function isButtonFontSizeAllowed(sizePx: number, guardrails: SiteGuardrails): boolean {
  const [min, max] = guardrails.typography.buttonFontSizeRange;
  return sizePx >= min && sizePx <= max;
}

/**
 * Check if a border radius is allowed
 */
export function isBorderRadiusAllowed(radiusPx: number, guardrails: SiteGuardrails): boolean {
  return guardrails.spacing.borderRadiusAllowed.includes(radiusPx);
}

/**
 * Check if padding values are within allowed range
 */
export function isPaddingAllowed(
  horizontal: number,
  vertical: number,
  guardrails: SiteGuardrails
): boolean {
  const [minH, maxH] = guardrails.spacing.buttonPaddingH;
  const [minV, maxV] = guardrails.spacing.buttonPaddingV;
  return horizontal >= minH && horizontal <= maxH && vertical >= minV && vertical <= maxV;
}

/**
 * Check if a transition duration is within limits
 */
export function isTransitionDurationAllowed(
  duration: string,
  guardrails: SiteGuardrails
): boolean {
  const maxMs = parseFloat(guardrails.animations.maxTransitionDuration) * 1000;
  const durationMs = parseDurationToMs(duration);
  return durationMs <= maxMs;
}

/**
 * Parse CSS duration to milliseconds
 */
function parseDurationToMs(duration: string): number {
  if (duration.endsWith('ms')) {
    return parseFloat(duration);
  }
  if (duration.endsWith('s')) {
    return parseFloat(duration) * 1000;
  }
  return parseFloat(duration);
}

/**
 * Format guardrails as a constraint string for LLM prompts
 */
export function formatGuardrailsForLLM(guardrails: SiteGuardrails): string {
  return `## Site-Specific Design Constraints

### Color Palette
- Allowed backgrounds: ${guardrails.colors.backgrounds.join(', ')}
- Allowed text colors: ${guardrails.colors.text.join(', ')}
- Allowed border colors: ${guardrails.colors.borders.join(', ')}
- Accent colors (use sparingly): ${guardrails.colors.accents.join(', ')} (only in: ${guardrails.colors.accentContexts.join(', ')})

### Typography
- Font weights: ${guardrails.typography.allowedFontWeights.join(', ')} only
- Button font size: ${guardrails.typography.buttonFontSizeRange[0]}px to ${guardrails.typography.buttonFontSizeRange[1]}px
- Buttons MUST use: ${guardrails.typography.requireUppercaseButtons ? 'uppercase text-transform' : 'normal case'}
- Letter spacing: ${guardrails.typography.letterSpacing}

### Spacing & Shape
- Border radius: ${guardrails.spacing.borderRadiusAllowed.length === 1 && guardrails.spacing.borderRadiusAllowed[0] === 0 ? 'SHARP CORNERS ONLY (no rounded corners)' : `allowed values: ${guardrails.spacing.borderRadiusAllowed.join('px, ')}px`}
- Button padding: ${guardrails.spacing.buttonPaddingH[0]}-${guardrails.spacing.buttonPaddingH[1]}px horizontal, ${guardrails.spacing.buttonPaddingV[0]}-${guardrails.spacing.buttonPaddingV[1]}px vertical
- Minimum tap target: ${guardrails.spacing.minTapTarget}px

### Animations
- Max transition duration: ${guardrails.animations.maxTransitionDuration}
- Allowed easings: ${guardrails.animations.allowedEasings.join(', ')}

### Component Patterns
- Button patterns: ${guardrails.components.buttonPatterns.join(', ')}
- Loading spinner size: ${guardrails.components.loadingSpinnerSize}px

**CRITICAL**: Any generated code that violates these constraints will be rejected.`;
}

/**
 * Check if guardrails file exists
 */
export async function guardrailsExist(): Promise<boolean> {
  try {
    await fs.access(GUARDRAILS_FILE);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete guardrails file (for testing/reset)
 */
export async function deleteGuardrails(): Promise<void> {
  try {
    await fs.unlink(GUARDRAILS_FILE);
    console.log('📋 [Guardrails] Config deleted');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}
