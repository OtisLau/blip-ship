/**
 * Theme Extractor - Auto-extract design patterns from codebase
 *
 * Scans React/Next.js components to extract:
 * - Color palette (hex, rgb, Tailwind classes)
 * - Typography patterns (font weights, sizes)
 * - Spacing conventions (padding, margin, border-radius)
 * - Animation/transition patterns
 *
 * Outputs a SiteGuardrails config for dynamic validation.
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { SiteGuardrails, GuardrailsExtractionReport } from './types';
import { saveSiteGuardrails, loadSiteGuardrails } from './site-guardrails';

// Regex patterns for extraction
const PATTERNS = {
  // Hex colors: #fff, #ffffff, #111111
  hexColor: /#([0-9a-fA-F]{3}){1,2}\b/g,

  // RGB/RGBA: rgb(0, 0, 0), rgba(255, 255, 255, 0.5)
  rgbColor: /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)/g,

  // Inline style colors: backgroundColor: '#111', color: 'white'
  inlineStyleColor:
    /(?:backgroundColor|color|borderColor|background)\s*:\s*['"]?(#[0-9a-fA-F]{3,6}|white|black|transparent|rgba?\([^)]+\))['"]?/g,

  // Tailwind background colors: bg-gray-900, bg-white, bg-black
  tailwindBgColor: /\bbg-(?:gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b|\bbg-(?:white|black|transparent)\b/g,

  // Tailwind text colors: text-gray-700, text-white
  tailwindTextColor: /\btext-(?:gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b|\btext-(?:white|black)\b/g,

  // Tailwind border colors: border-gray-200
  tailwindBorderColor: /\bborder-(?:gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b|\bborder-(?:white|black|transparent)\b/g,

  // Font weights: fontWeight: 500, font-medium, font-semibold
  fontWeight: /fontWeight\s*:\s*(\d+)|font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/g,

  // Font sizes: fontSize: 14, text-sm, text-xs
  fontSize: /fontSize\s*:\s*['"]?(\d+)(?:px)?['"]?|text-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)/g,

  // Border radius: borderRadius: 0, rounded-none, rounded-md
  borderRadius: /borderRadius\s*:\s*['"]?(\d+)(?:px)?['"]?|rounded-(?:none|sm|md|lg|xl|2xl|3xl|full)\b/g,

  // Padding values: padding: '12px 24px', px-4, py-3
  padding: /padding\s*:\s*['"]?(\d+)(?:px)?(?:\s+(\d+)(?:px)?)?['"]?|p[xy]?-\d+/g,

  // Transitions: transition: all 0.2s, duration-200
  transition: /transition\s*:\s*[^;,}]+|duration-\d+/g,

  // Text transform: textTransform: 'uppercase', uppercase
  textTransform: /textTransform\s*:\s*['"]?(uppercase|lowercase|capitalize)['"]?|\b(?:uppercase|lowercase|capitalize)\b/g,

  // Letter spacing: letterSpacing: '0.5px', tracking-wide
  letterSpacing: /letterSpacing\s*:\s*['"]?([^'"]+)['"]?|tracking-(?:tighter|tight|normal|wide|wider|widest)/g,
};

// Tailwind to actual values mapping
const TAILWIND_MAPPINGS = {
  fontWeight: {
    'font-thin': 100,
    'font-extralight': 200,
    'font-light': 300,
    'font-normal': 400,
    'font-medium': 500,
    'font-semibold': 600,
    'font-bold': 700,
    'font-extrabold': 800,
    'font-black': 900,
  },
  fontSize: {
    'text-xs': 12,
    'text-sm': 14,
    'text-base': 16,
    'text-lg': 18,
    'text-xl': 20,
    'text-2xl': 24,
    'text-3xl': 30,
    'text-4xl': 36,
    'text-5xl': 48,
  },
  borderRadius: {
    'rounded-none': 0,
    'rounded-sm': 2,
    'rounded': 4,
    'rounded-md': 6,
    'rounded-lg': 8,
    'rounded-xl': 12,
    'rounded-2xl': 16,
    'rounded-3xl': 24,
    'rounded-full': 9999,
  },
  bgColor: {
    'bg-white': '#ffffff',
    'bg-black': '#000000',
    'bg-transparent': 'transparent',
    'bg-gray-50': '#f9fafb',
    'bg-gray-100': '#f3f4f6',
    'bg-gray-200': '#e5e7eb',
    'bg-gray-300': '#d1d5db',
    'bg-gray-400': '#9ca3af',
    'bg-gray-500': '#6b7280',
    'bg-gray-600': '#4b5563',
    'bg-gray-700': '#374151',
    'bg-gray-800': '#1f2937',
    'bg-gray-900': '#111827',
    'bg-blue-500': '#3b82f6',
    'bg-blue-600': '#2563eb',
    'bg-green-500': '#22c55e',
    'bg-red-500': '#ef4444',
  },
  textColor: {
    'text-white': '#ffffff',
    'text-black': '#000000',
    'text-gray-50': '#f9fafb',
    'text-gray-100': '#f3f4f6',
    'text-gray-200': '#e5e7eb',
    'text-gray-300': '#d1d5db',
    'text-gray-400': '#9ca3af',
    'text-gray-500': '#6b7280',
    'text-gray-600': '#4b5563',
    'text-gray-700': '#374151',
    'text-gray-800': '#1f2937',
    'text-gray-900': '#111827',
  },
};

/**
 * Recursively get all component files from directories
 */
async function getComponentFiles(dirs: string[]): Promise<string[]> {
  const files: string[] = [];

  for (const dir of dirs) {
    const fullPath = path.join(process.cwd(), dir);
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(fullPath, entry.name);
        if (entry.isDirectory()) {
          const subFiles = await getComponentFiles([path.join(dir, entry.name)]);
          files.push(...subFiles);
        } else if (
          entry.isFile() &&
          (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx') || entry.name.endsWith('.css'))
        ) {
          files.push(entryPath);
        }
      }
    } catch (error) {
      console.log(`📂 [Extractor] Skipping directory: ${dir}`);
    }
  }

  return files;
}

/**
 * Extract all matches for a pattern and count occurrences
 */
function extractWithCounts(content: string, pattern: RegExp): Record<string, number> {
  const counts: Record<string, number> = {};
  const matches = content.matchAll(new RegExp(pattern.source, 'g'));

  for (const match of matches) {
    const value = match[1] || match[0];
    counts[value] = (counts[value] || 0) + 1;
  }

  return counts;
}

/**
 * Normalize color values (lowercase, expand shorthand hex)
 */
function normalizeColor(color: string): string {
  let normalized = color.toLowerCase().trim();

  // Expand shorthand hex (#fff -> #ffffff)
  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    normalized = `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`;
  }

  // Map common aliases
  if (normalized === 'white') return '#ffffff';
  if (normalized === 'black') return '#000000';

  return normalized;
}

/**
 * Extract colors from file content
 */
function extractColors(content: string): {
  backgrounds: Record<string, number>;
  text: Record<string, number>;
  borders: Record<string, number>;
} {
  const backgrounds: Record<string, number> = {};
  const text: Record<string, number> = {};
  const borders: Record<string, number> = {};

  // Extract inline style colors
  const inlineMatches = content.matchAll(PATTERNS.inlineStyleColor);
  for (const match of inlineMatches) {
    const fullMatch = match[0];
    const color = fullMatch.match(/#[0-9a-fA-F]{3,6}|white|black|transparent|rgba?\([^)]+\)/)?.[0];
    if (color) {
      const normalized = normalizeColor(color);
      if (fullMatch.includes('backgroundColor') || fullMatch.includes('background:')) {
        backgrounds[normalized] = (backgrounds[normalized] || 0) + 1;
      } else if (fullMatch.includes('color:') && !fullMatch.includes('backgroundColor')) {
        text[normalized] = (text[normalized] || 0) + 1;
      } else if (fullMatch.includes('borderColor')) {
        borders[normalized] = (borders[normalized] || 0) + 1;
      }
    }
  }

  // Extract Tailwind background colors
  const bgMatches = content.matchAll(PATTERNS.tailwindBgColor);
  for (const match of bgMatches) {
    const twClass = match[0];
    const hex =
      TAILWIND_MAPPINGS.bgColor[twClass as keyof typeof TAILWIND_MAPPINGS.bgColor] || twClass;
    const normalized = normalizeColor(hex);
    backgrounds[normalized] = (backgrounds[normalized] || 0) + 1;
  }

  // Extract Tailwind text colors
  const textMatches = content.matchAll(PATTERNS.tailwindTextColor);
  for (const match of textMatches) {
    const twClass = match[0];
    const hex =
      TAILWIND_MAPPINGS.textColor[twClass as keyof typeof TAILWIND_MAPPINGS.textColor] || twClass;
    const normalized = normalizeColor(hex);
    text[normalized] = (text[normalized] || 0) + 1;
  }

  // Extract Tailwind border colors
  const borderMatches = content.matchAll(PATTERNS.tailwindBorderColor);
  for (const match of borderMatches) {
    const twClass = match[0];
    borders[twClass] = (borders[twClass] || 0) + 1;
  }

  return { backgrounds, text, borders };
}

/**
 * Extract font weights from content
 */
function extractFontWeights(content: string): Record<string, number> {
  const weights: Record<string, number> = {};
  const matches = content.matchAll(PATTERNS.fontWeight);

  for (const match of matches) {
    let weight: number | undefined;

    if (match[1]) {
      // Numeric fontWeight: 500
      weight = parseInt(match[1], 10);
    } else {
      // Tailwind class
      weight =
        TAILWIND_MAPPINGS.fontWeight[match[0] as keyof typeof TAILWIND_MAPPINGS.fontWeight];
    }

    if (weight) {
      weights[String(weight)] = (weights[String(weight)] || 0) + 1;
    }
  }

  return weights;
}

/**
 * Extract border radius values from content
 */
function extractBorderRadius(content: string): Record<string, number> {
  const radii: Record<string, number> = {};
  const matches = content.matchAll(PATTERNS.borderRadius);

  for (const match of matches) {
    let radius: number | undefined;

    if (match[1]) {
      // Numeric borderRadius: 0
      radius = parseInt(match[1], 10);
    } else {
      // Tailwind class
      radius =
        TAILWIND_MAPPINGS.borderRadius[match[0] as keyof typeof TAILWIND_MAPPINGS.borderRadius];
    }

    if (radius !== undefined) {
      radii[String(radius)] = (radii[String(radius)] || 0) + 1;
    }
  }

  return radii;
}

/**
 * Extract transition/animation patterns
 */
function extractAnimations(content: string): Record<string, number> {
  const animations: Record<string, number> = {};
  const matches = content.matchAll(PATTERNS.transition);

  for (const match of matches) {
    const value = match[0].trim();
    animations[value] = (animations[value] || 0) + 1;
  }

  return animations;
}

/**
 * Check if text transform patterns are used
 */
function extractTextTransform(content: string): { uppercase: number; lowercase: number } {
  let uppercase = 0;
  let lowercase = 0;

  const matches = content.matchAll(PATTERNS.textTransform);
  for (const match of matches) {
    const value = (match[1] || match[0]).toLowerCase();
    if (value === 'uppercase') uppercase++;
    if (value === 'lowercase') lowercase++;
  }

  return { uppercase, lowercase };
}

/**
 * Get top N items from a count record
 */
function getTopN<T extends string>(counts: Record<T, number>, n: number): T[] {
  return Object.entries(counts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, n)
    .map(([key]) => key as T);
}

/**
 * Extract guardrails from the codebase
 */
export async function extractThemeGuardrails(
  scanPaths: string[] = ['components', 'app'],
  options: { merge?: boolean; siteId?: string } = {}
): Promise<{ guardrails: SiteGuardrails; report: GuardrailsExtractionReport }> {
  console.log('🔍 [Extractor] Starting theme extraction...');

  const files = await getComponentFiles(scanPaths);
  console.log(`📂 [Extractor] Found ${files.length} component files`);

  // Aggregated results
  const allBackgrounds: Record<string, number> = {};
  const allTextColors: Record<string, number> = {};
  const allBorderColors: Record<string, number> = {};
  const allFontWeights: Record<string, number> = {};
  const allBorderRadii: Record<string, number> = {};
  const allAnimations: Record<string, number> = {};
  let totalUppercase = 0;
  let totalLowercase = 0;

  // Process each file
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8');

      // Extract colors
      const colors = extractColors(content);
      for (const [color, count] of Object.entries(colors.backgrounds)) {
        allBackgrounds[color] = (allBackgrounds[color] || 0) + count;
      }
      for (const [color, count] of Object.entries(colors.text)) {
        allTextColors[color] = (allTextColors[color] || 0) + count;
      }
      for (const [color, count] of Object.entries(colors.borders)) {
        allBorderColors[color] = (allBorderColors[color] || 0) + count;
      }

      // Extract font weights
      const weights = extractFontWeights(content);
      for (const [weight, count] of Object.entries(weights)) {
        allFontWeights[weight] = (allFontWeights[weight] || 0) + count;
      }

      // Extract border radius
      const radii = extractBorderRadius(content);
      for (const [radius, count] of Object.entries(radii)) {
        allBorderRadii[radius] = (allBorderRadii[radius] || 0) + count;
      }

      // Extract animations
      const anims = extractAnimations(content);
      for (const [anim, count] of Object.entries(anims)) {
        allAnimations[anim] = (allAnimations[anim] || 0) + count;
      }

      // Extract text transform
      const transforms = extractTextTransform(content);
      totalUppercase += transforms.uppercase;
      totalLowercase += transforms.lowercase;
    } catch (error) {
      console.log(`📂 [Extractor] Error reading file: ${file}`);
    }
  }

  // Build guardrails from extracted data
  const guardrails: SiteGuardrails = {
    siteId: options.siteId || 'extracted-site',
    extractedAt: new Date().toISOString(),
    source: 'auto-extracted',

    colors: {
      backgrounds: getTopN(allBackgrounds, 10),
      text: getTopN(allTextColors, 8),
      borders: getTopN(allBorderColors, 5),
      accents: [], // Accents need manual identification
      accentContexts: [],
    },

    typography: {
      allowedFontWeights: getTopN(allFontWeights, 4).map(Number),
      buttonFontSizeRange: [12, 14], // Default, could be extracted from button-specific patterns
      requireUppercaseButtons: totalUppercase > totalLowercase,
      letterSpacing: '0.5px', // Default
    },

    spacing: {
      borderRadiusAllowed: getTopN(allBorderRadii, 5).map(Number),
      buttonPaddingH: [12, 32],
      buttonPaddingV: [12, 14],
      minTapTarget: 44,
    },

    animations: {
      maxTransitionDuration: '0.4s',
      allowedEasings: ['ease', 'ease-in-out', 'linear'],
    },

    components: {
      buttonPatterns: totalUppercase > 0 ? ['uppercase', 'letter-spacing'] : [],
      loadingSpinnerSize: 16,
    },
  };

  // Create extraction report
  const report: GuardrailsExtractionReport = {
    extractedAt: new Date().toISOString(),
    filesScanned: files.map((f) => path.relative(process.cwd(), f)),
    colorsFound: { ...allBackgrounds, ...allTextColors },
    fontWeightsFound: allFontWeights,
    borderRadiiFound: allBorderRadii,
    spacingPatternsFound: {},
    animationsFound: allAnimations,
    conflicts: [],
  };

  // Merge with existing if requested
  if (options.merge) {
    const existing = await loadSiteGuardrails();
    guardrails.colors.accents = existing.colors.accents;
    guardrails.colors.accentContexts = existing.colors.accentContexts;
    guardrails.source = 'hybrid';
  }

  // Save guardrails
  await saveSiteGuardrails(guardrails);

  console.log('✅ [Extractor] Theme extraction complete');
  console.log(`   Colors found: ${Object.keys(allBackgrounds).length} backgrounds, ${Object.keys(allTextColors).length} text`);
  console.log(`   Font weights: ${Object.keys(allFontWeights).join(', ')}`);
  console.log(`   Border radii: ${Object.keys(allBorderRadii).join(', ')}`);
  console.log(`   Uppercase buttons: ${totalUppercase > totalLowercase ? 'yes' : 'no'}`);

  return { guardrails, report };
}

/**
 * Quick validation of extracted guardrails against markdown rules
 * Returns any conflicts found
 */
export async function validateExtractedGuardrails(
  guardrails: SiteGuardrails
): Promise<string[]> {
  const conflicts: string[] = [];

  // Check for common issues
  if (guardrails.spacing.borderRadiusAllowed.includes(0) === false) {
    // Site uses rounded corners but markdown says sharp corners only
    conflicts.push(
      'Extracted border-radius values include rounded corners, but theme-protection-guardrails.md requires sharp corners'
    );
  }

  if (!guardrails.typography.allowedFontWeights.includes(500) &&
      !guardrails.typography.allowedFontWeights.includes(600)) {
    conflicts.push(
      'Extracted font weights do not include 500 or 600, which button-guardrails.md requires'
    );
  }

  return conflicts;
}
