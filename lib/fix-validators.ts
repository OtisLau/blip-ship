/**
 * Fix Validators
 *
 * Validates LLM-generated fixes against theme guardrails.
 * Supports both hardcoded (legacy) and dynamic (site-specific) guardrails.
 * Also validates TypeScript/JSX syntax BEFORE applying patches.
 * Any fix that violates these rules is rejected before application.
 */

import type { SiteGuardrails, GuardrailsValidationResult, GuardrailViolation } from './types';
import { loadSiteGuardrails, DEFAULT_GUARDRAILS } from './site-guardrails';
import { promises as fs } from 'fs';
import path from 'path';

export interface ValidationResult {
  valid: boolean;
  violations: ValidationViolation[];
  fixType: FixType;
}

export interface ValidationViolation {
  rule: string;
  message: string;
  severity: 'error' | 'warning';
  location?: string;
  found?: string;
  expected?: string;
}

export type FixType =
  | 'loading_state'
  | 'image_gallery'
  | 'address_autocomplete'
  | 'product_comparison'
  | 'color_preview'
  | 'unknown';

// ============================================
// ALLOWED VALUES (from theme-protection-guardrails.md)
// ============================================

const ALLOWED_BG_COLORS = new Set([
  '#111',
  '#111111',
  '#fafafa',
  '#f5f5f5',
  '#fff',
  '#ffffff',
  'white',
  'transparent',
  'inherit',
  // Success state (only for Add to Cart confirmation)
  '#22c55e',
  // Hero CTA only - validated separately
  '#3b82f6',
]);

const ALLOWED_TEXT_COLORS = new Set([
  '#111',
  '#111111',
  '#374151',
  '#6b7280',
  '#fff',
  '#ffffff',
  'white',
  'inherit',
  'currentColor',
]);

const ALLOWED_BORDER_COLORS = new Set([
  '#e5e7eb',
  '#111',
  '#111111',
  'transparent',
  'inherit',
]);

const ALLOWED_FONT_WEIGHTS = new Set([
  '500',
  '600',
  'medium',
  'semibold',
]);

// ============================================
// FORBIDDEN PATTERNS
// ============================================

const FORBIDDEN_COLOR_KEYWORDS = [
  'yellow', 'pink', 'purple', 'orange', 'teal',
  'red', 'green', 'blue', 'indigo', 'violet', 'rose',
  'amber', 'lime', 'emerald', 'cyan', 'sky', 'fuchsia',
];

// Regex patterns
const BORDER_RADIUS_PATTERN = /border-radius:\s*([1-9]\d*(?:px|rem|em|%))/gi;
const ROUNDED_CLASS_PATTERN = /rounded-(?!none)(\w+)/gi;
const TAILWIND_COLOR_PATTERN = new RegExp(
  `(bg|text|border)-(${FORBIDDEN_COLOR_KEYWORDS.join('|')})-\\d+`,
  'gi'
);
const HEX_COLOR_PATTERN = /#([0-9a-fA-F]{3,8})/gi;

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate a color value against allowed colors
 */
function isAllowedColor(color: string, type: 'bg' | 'text' | 'border'): boolean {
  const normalized = color.toLowerCase().trim();

  switch (type) {
    case 'bg':
      return ALLOWED_BG_COLORS.has(normalized);
    case 'text':
      return ALLOWED_TEXT_COLORS.has(normalized);
    case 'border':
      return ALLOWED_BORDER_COLORS.has(normalized);
  }
}

/**
 * Check if code contains forbidden Tailwind color classes
 */
function checkForbiddenTailwindColors(code: string): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  let match;

  while ((match = TAILWIND_COLOR_PATTERN.exec(code)) !== null) {
    violations.push({
      rule: 'forbidden-color',
      message: `Forbidden Tailwind color class: ${match[0]}`,
      severity: 'error',
      found: match[0],
      expected: 'Use only allowed colors: #111, #fafafa, #f5f5f5, white, #e5e7eb',
    });
  }

  return violations;
}

/**
 * Check for border-radius violations
 */
function checkBorderRadius(code: string): ValidationViolation[] {
  const violations: ValidationViolation[] = [];

  // Check CSS border-radius
  let match;
  while ((match = BORDER_RADIUS_PATTERN.exec(code)) !== null) {
    violations.push({
      rule: 'no-border-radius',
      message: `Border radius not allowed: ${match[0]}`,
      severity: 'error',
      found: match[0],
      expected: 'border-radius: 0 or rounded-none (sharp corners only)',
    });
  }

  // Check Tailwind rounded classes
  const tailwindMatch = code.match(ROUNDED_CLASS_PATTERN);
  if (tailwindMatch) {
    tailwindMatch.forEach(cls => {
      violations.push({
        rule: 'no-border-radius',
        message: `Rounded Tailwind class not allowed: ${cls}`,
        severity: 'error',
        found: cls,
        expected: 'rounded-none only (sharp corners)',
      });
    });
  }

  return violations;
}

/**
 * Check font weight violations
 */
function checkFontWeight(code: string): ValidationViolation[] {
  const violations: ValidationViolation[] = [];

  // Check CSS font-weight
  const fontWeightCSS = code.match(/font-weight:\s*(\d+|bold|normal|light)/gi);
  if (fontWeightCSS) {
    fontWeightCSS.forEach(fw => {
      const value = fw.replace(/font-weight:\s*/i, '').trim().toLowerCase();
      if (!['500', '600', 'medium', 'semibold'].includes(value)) {
        violations.push({
          rule: 'font-weight',
          message: `Invalid font weight: ${value}`,
          severity: 'error',
          found: value,
          expected: '500 (medium) or 600 (semibold)',
        });
      }
    });
  }

  // Check Tailwind font classes
  const forbiddenWeights = code.match(/font-(bold|light|normal|black|thin|extralight|extrabold)/gi);
  if (forbiddenWeights) {
    forbiddenWeights.forEach(fw => {
      violations.push({
        rule: 'font-weight',
        message: `Forbidden font weight class: ${fw}`,
        severity: 'error',
        found: fw,
        expected: 'font-medium or font-semibold only',
      });
    });
  }

  return violations;
}

/**
 * Check font size for buttons (should be 12-14px)
 */
function checkButtonFontSize(code: string, isButtonCode: boolean): ValidationViolation[] {
  const violations: ValidationViolation[] = [];

  if (!isButtonCode) return violations;

  // Check for font sizes outside 12-14px range
  const fontSizeMatch = code.match(/font-size:\s*(\d+)px/gi);
  if (fontSizeMatch) {
    fontSizeMatch.forEach(fs => {
      const size = parseInt(fs.replace(/font-size:\s*/i, ''));
      if (size < 12 || size > 14) {
        violations.push({
          rule: 'button-font-size',
          message: `Button font size out of range: ${size}px`,
          severity: 'warning',
          found: `${size}px`,
          expected: '12px - 14px',
        });
      }
    });
  }

  return violations;
}

/**
 * Check that buttons have required uppercase styling
 */
function checkButtonTextTransform(code: string, isButtonCode: boolean): ValidationViolation[] {
  const violations: ValidationViolation[] = [];

  if (!isButtonCode) return violations;

  // Check if button code is missing text-transform: uppercase
  if (code.includes('<button') || code.includes('Button')) {
    const hasUppercase =
      code.includes('textTransform') ||
      code.includes('text-transform') ||
      code.includes('uppercase');

    if (!hasUppercase) {
      violations.push({
        rule: 'button-uppercase',
        message: 'Button missing required uppercase text transform',
        severity: 'warning',
        expected: 'textTransform: "uppercase" and letterSpacing: "0.5px"',
      });
    }
  }

  return violations;
}

/**
 * Extract and validate inline style colors
 */
function checkInlineStyleColors(code: string): ValidationViolation[] {
  const violations: ValidationViolation[] = [];

  // Match backgroundColor, color, borderColor in inline styles
  const bgColorMatch = code.match(/backgroundColor:\s*['"]([^'"]+)['"]/gi);
  const textColorMatch = code.match(/(?<![a-z])color:\s*['"]([^'"]+)['"]/gi);
  const borderColorMatch = code.match(/borderColor:\s*['"]([^'"]+)['"]/gi);

  bgColorMatch?.forEach(match => {
    const color = match.match(/['"]([^'"]+)['"]/)?.[1];
    if (color && !isAllowedColor(color, 'bg')) {
      violations.push({
        rule: 'background-color',
        message: `Invalid background color: ${color}`,
        severity: 'error',
        found: color,
        expected: Array.from(ALLOWED_BG_COLORS).join(', '),
      });
    }
  });

  textColorMatch?.forEach(match => {
    const color = match.match(/['"]([^'"]+)['"]/)?.[1];
    if (color && !isAllowedColor(color, 'text')) {
      violations.push({
        rule: 'text-color',
        message: `Invalid text color: ${color}`,
        severity: 'error',
        found: color,
        expected: Array.from(ALLOWED_TEXT_COLORS).join(', '),
      });
    }
  });

  borderColorMatch?.forEach(match => {
    const color = match.match(/['"]([^'"]+)['"]/)?.[1];
    if (color && !isAllowedColor(color, 'border')) {
      violations.push({
        rule: 'border-color',
        message: `Invalid border color: ${color}`,
        severity: 'error',
        found: color,
        expected: Array.from(ALLOWED_BORDER_COLORS).join(', '),
      });
    }
  });

  return violations;
}

/**
 * Detect the type of fix from the code
 */
function detectFixType(code: string): FixType {
  if (code.includes('Spinner') || code.includes('loading') || code.includes('isLoading')) {
    return 'loading_state';
  }
  if (code.includes('Gallery') || code.includes('lightbox') || code.includes('Lightbox')) {
    return 'image_gallery';
  }
  if (code.includes('autocomplete') || code.includes('Autocomplete') || code.includes('address')) {
    return 'address_autocomplete';
  }
  if (code.includes('compare') || code.includes('Compare') || code.includes('comparison')) {
    return 'product_comparison';
  }
  if (code.includes('swatch') || code.includes('Swatch') || code.includes('ColorSwatch')) {
    return 'color_preview';
  }
  return 'unknown';
}

// ============================================
// MAIN VALIDATION FUNCTION
// ============================================

/**
 * Validate generated fix code against theme guardrails
 *
 * @param code - The generated code to validate
 * @param options - Additional validation options
 * @returns ValidationResult with any violations found
 */
export function validateFix(
  code: string,
  options: {
    isButtonCode?: boolean;
    isHeroContext?: boolean;
    allowColorSwatchCircles?: boolean;
  } = {}
): ValidationResult {
  const violations: ValidationViolation[] = [];
  const fixType = detectFixType(code);

  // Run all validation checks
  violations.push(...checkForbiddenTailwindColors(code));

  // Border radius check (skip for color swatches if allowed)
  if (!(options.allowColorSwatchCircles && fixType === 'color_preview')) {
    violations.push(...checkBorderRadius(code));
  }

  violations.push(...checkFontWeight(code));
  violations.push(...checkButtonFontSize(code, options.isButtonCode ?? false));
  violations.push(...checkButtonTextTransform(code, options.isButtonCode ?? false));
  violations.push(...checkInlineStyleColors(code));

  // Filter out Hero CTA blue if in hero context
  const filteredViolations = options.isHeroContext
    ? violations.filter(v => !v.found?.includes('#3b82f6'))
    : violations;

  return {
    valid: filteredViolations.filter(v => v.severity === 'error').length === 0,
    violations: filteredViolations,
    fixType,
  };
}

/**
 * Validate a complete fix including its patches
 */
export function validateFixPatches(
  patches: Array<{ filePath: string; oldCode: string; newCode: string }>
): ValidationResult {
  const allViolations: ValidationViolation[] = [];
  let fixType: FixType = 'unknown';

  for (const patch of patches) {
    const isButtonCode = patch.newCode.includes('<button') ||
                         patch.newCode.includes('Button') ||
                         patch.filePath.includes('Button');

    const isHeroContext = patch.filePath.includes('Hero');
    const allowColorSwatchCircles = patch.filePath.includes('Swatch') ||
                                     patch.filePath.includes('Color');

    const result = validateFix(patch.newCode, {
      isButtonCode,
      isHeroContext,
      allowColorSwatchCircles,
    });

    // Add file path context to violations
    result.violations.forEach(v => {
      v.location = patch.filePath;
    });

    allViolations.push(...result.violations);

    if (result.fixType !== 'unknown') {
      fixType = result.fixType;
    }
  }

  return {
    valid: allViolations.filter(v => v.severity === 'error').length === 0,
    violations: allViolations,
    fixType,
  };
}

/**
 * Get a human-readable summary of validation failures
 */
export function getValidationSummary(result: ValidationResult): string {
  if (result.valid) {
    return `✅ Fix validated successfully (type: ${result.fixType})`;
  }

  const errors = result.violations.filter(v => v.severity === 'error');
  const warnings = result.violations.filter(v => v.severity === 'warning');

  let summary = `❌ Fix validation failed (type: ${result.fixType})\n`;
  summary += `   ${errors.length} error(s), ${warnings.length} warning(s)\n\n`;

  errors.forEach((v, i) => {
    summary += `   Error ${i + 1}: ${v.message}\n`;
    if (v.found) summary += `      Found: ${v.found}\n`;
    if (v.expected) summary += `      Expected: ${v.expected}\n`;
    if (v.location) summary += `      File: ${v.location}\n`;
  });

  return summary;
}

// ============================================
// SPECIAL VALIDATORS FOR SPECIFIC FIX TYPES
// ============================================

/**
 * Validate loading spinner specifications
 */
export function validateSpinner(code: string): ValidationViolation[] {
  const violations: ValidationViolation[] = [];

  // Check spinner size (should be 16px)
  const sizeMatch = code.match(/(?:width|height|size):\s*(\d+)(?:px)?/gi);
  if (sizeMatch) {
    sizeMatch.forEach(match => {
      const size = parseInt(match.replace(/\D/g, ''));
      if (size !== 16 && size !== 14 && size !== 18) {
        violations.push({
          rule: 'spinner-size',
          message: `Spinner size should be 16px, found ${size}px`,
          severity: 'warning',
          found: `${size}px`,
          expected: '16px',
        });
      }
    });
  }

  // Check for spin animation
  if (!code.includes('spin') && !code.includes('rotate')) {
    violations.push({
      rule: 'spinner-animation',
      message: 'Spinner should have spin animation',
      severity: 'warning',
      expected: 'animation: spin 1s linear infinite',
    });
  }

  return violations;
}

/**
 * Validate gallery/lightbox styling
 */
export function validateGallery(code: string): ValidationViolation[] {
  const violations: ValidationViolation[] = [];

  // Check overlay color
  if (code.includes('overlay') || code.includes('Overlay')) {
    const hasCorrectOverlay =
      code.includes('rgba(0, 0, 0') ||
      code.includes('rgba(17, 17, 17') ||
      code.includes('#111');

    if (!hasCorrectOverlay) {
      violations.push({
        rule: 'gallery-overlay',
        message: 'Gallery overlay should use dark color',
        severity: 'warning',
        expected: 'rgba(0, 0, 0, 0.9) or #111 with opacity',
      });
    }
  }

  return violations;
}

// ============================================
// DYNAMIC GUARDRAILS VALIDATION
// ============================================

/**
 * Normalize a color for comparison
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
 * Check if a color is allowed by the dynamic guardrails
 */
function isColorAllowedDynamic(
  color: string,
  type: 'backgrounds' | 'text' | 'borders',
  guardrails: SiteGuardrails,
  context?: string
): boolean {
  const normalized = normalizeColor(color);
  const allowedColors = guardrails.colors[type].map(c => normalizeColor(c));

  // Special case for accents - check context
  if (!allowedColors.includes(normalized)) {
    // Check if it's an allowed accent
    const allowedAccents = guardrails.colors.accents.map(c => normalizeColor(c));
    if (allowedAccents.includes(normalized)) {
      // Accent is allowed only in specific contexts
      if (context && guardrails.colors.accentContexts.includes(context)) {
        return true;
      }
    }
    return false;
  }

  return true;
}

/**
 * Check colors against dynamic guardrails
 */
function checkColorsDynamic(code: string, guardrails: SiteGuardrails): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];

  // Extract and check inline style background colors
  const bgColorMatches = code.matchAll(/backgroundColor:\s*['"]([^'"]+)['"]/gi);
  for (const match of bgColorMatches) {
    const color = match[1];
    if (!isColorAllowedDynamic(color, 'backgrounds', guardrails)) {
      violations.push({
        rule: 'background-color',
        message: `Background color not in site palette: ${color}`,
        severity: 'error',
        suggestion: `Use: ${guardrails.colors.backgrounds.join(', ')}`,
      });
    }
  }

  // Extract and check inline style text colors
  const textColorMatches = code.matchAll(/(?<![a-z])color:\s*['"]([^'"]+)['"]/gi);
  for (const match of textColorMatches) {
    const color = match[1];
    if (!isColorAllowedDynamic(color, 'text', guardrails)) {
      violations.push({
        rule: 'text-color',
        message: `Text color not in site palette: ${color}`,
        severity: 'error',
        suggestion: `Use: ${guardrails.colors.text.join(', ')}`,
      });
    }
  }

  // Extract and check inline style border colors
  const borderColorMatches = code.matchAll(/borderColor:\s*['"]([^'"]+)['"]/gi);
  for (const match of borderColorMatches) {
    const color = match[1];
    if (!isColorAllowedDynamic(color, 'borders', guardrails)) {
      violations.push({
        rule: 'border-color',
        message: `Border color not in site palette: ${color}`,
        severity: 'error',
        suggestion: `Use: ${guardrails.colors.borders.join(', ')}`,
      });
    }
  }

  return violations;
}

/**
 * Check typography against dynamic guardrails
 */
function checkTypographyDynamic(
  code: string,
  guardrails: SiteGuardrails,
  isButtonCode: boolean
): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];

  // Check font weights
  const fontWeightMatches = code.matchAll(/font-?[wW]eight:\s*['"]?(\d+)['"]?/gi);
  for (const match of fontWeightMatches) {
    const weight = parseInt(match[1], 10);
    if (!guardrails.typography.allowedFontWeights.includes(weight)) {
      violations.push({
        rule: 'font-weight',
        message: `Font weight not allowed: ${weight}`,
        severity: 'error',
        suggestion: `Use: ${guardrails.typography.allowedFontWeights.join(', ')}`,
      });
    }
  }

  // Check button-specific typography
  if (isButtonCode) {
    const [minSize, maxSize] = guardrails.typography.buttonFontSizeRange;

    // Check font size
    const fontSizeMatches = code.matchAll(/font-?[sS]ize:\s*['"]?(\d+)(?:px)?['"]?/gi);
    for (const match of fontSizeMatches) {
      const size = parseInt(match[1], 10);
      if (size < minSize || size > maxSize) {
        violations.push({
          rule: 'button-font-size',
          message: `Button font size out of range: ${size}px`,
          severity: 'warning',
          suggestion: `Use: ${minSize}px - ${maxSize}px`,
        });
      }
    }

    // Check for uppercase requirement
    if (guardrails.typography.requireUppercaseButtons) {
      if (code.includes('<button') || code.includes('Button')) {
        const hasUppercase =
          code.includes('textTransform') ||
          code.includes('text-transform') ||
          code.includes('uppercase');

        if (!hasUppercase) {
          violations.push({
            rule: 'button-uppercase',
            message: 'Button missing required uppercase text transform',
            severity: 'warning',
            suggestion: `Add: textTransform: 'uppercase', letterSpacing: '${guardrails.typography.letterSpacing}'`,
          });
        }
      }
    }
  }

  return violations;
}

/**
 * Check spacing/border-radius against dynamic guardrails
 */
function checkSpacingDynamic(
  code: string,
  guardrails: SiteGuardrails,
  allowColorSwatchCircles: boolean
): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];

  // Skip border-radius check if color swatches are allowed (they can be circles)
  if (!allowColorSwatchCircles) {
    // Check CSS border-radius values
    const borderRadiusMatches = code.matchAll(/border-radius:\s*(\d+)(?:px)?/gi);
    for (const match of borderRadiusMatches) {
      const radius = parseInt(match[1], 10);
      if (!guardrails.spacing.borderRadiusAllowed.includes(radius)) {
        violations.push({
          rule: 'border-radius',
          message: `Border radius not allowed: ${radius}px`,
          severity: 'error',
          suggestion:
            guardrails.spacing.borderRadiusAllowed.length === 1 &&
            guardrails.spacing.borderRadiusAllowed[0] === 0
              ? 'Use sharp corners only (border-radius: 0)'
              : `Use: ${guardrails.spacing.borderRadiusAllowed.join('px, ')}px`,
        });
      }
    }

    // Check Tailwind rounded classes
    const roundedClasses = code.match(/rounded-(?!none)(\w+)/gi);
    if (roundedClasses) {
      // If site requires sharp corners only (borderRadiusAllowed = [0])
      if (
        guardrails.spacing.borderRadiusAllowed.length === 1 &&
        guardrails.spacing.borderRadiusAllowed[0] === 0
      ) {
        roundedClasses.forEach((cls) => {
          violations.push({
            rule: 'border-radius',
            message: `Rounded class not allowed: ${cls}`,
            severity: 'error',
            suggestion: 'Use: rounded-none (sharp corners only)',
          });
        });
      }
    }
  }

  return violations;
}

/**
 * Check animations against dynamic guardrails
 */
function checkAnimationsDynamic(code: string, guardrails: SiteGuardrails): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];

  // Check transition durations
  const transitionMatches = code.matchAll(/transition[^;]*?(\d+(?:\.\d+)?(?:s|ms))/gi);
  for (const match of transitionMatches) {
    const duration = match[1];
    const maxMs = parseFloat(guardrails.animations.maxTransitionDuration) * 1000;
    const durationMs = duration.endsWith('ms')
      ? parseFloat(duration)
      : parseFloat(duration) * 1000;

    if (durationMs > maxMs) {
      violations.push({
        rule: 'transition-duration',
        message: `Transition duration too long: ${duration}`,
        severity: 'warning',
        suggestion: `Max: ${guardrails.animations.maxTransitionDuration}`,
      });
    }
  }

  return violations;
}

/**
 * Validate fix code against DYNAMIC site guardrails
 * This is the preferred validation method for site-agnostic fixes
 */
export async function validateFixWithGuardrails(
  code: string,
  guardrails?: SiteGuardrails,
  options: {
    isButtonCode?: boolean;
    isHeroContext?: boolean;
    allowColorSwatchCircles?: boolean;
  } = {}
): Promise<GuardrailsValidationResult> {
  // Load guardrails if not provided
  const siteGuardrails = guardrails || (await loadSiteGuardrails());
  const usedDynamicGuardrails = siteGuardrails.source !== 'manual' || siteGuardrails.siteId !== DEFAULT_GUARDRAILS.siteId;

  const violations: GuardrailViolation[] = [];

  // Run dynamic validations
  violations.push(...checkColorsDynamic(code, siteGuardrails));
  violations.push(
    ...checkTypographyDynamic(code, siteGuardrails, options.isButtonCode ?? false)
  );
  violations.push(
    ...checkSpacingDynamic(code, siteGuardrails, options.allowColorSwatchCircles ?? false)
  );
  violations.push(...checkAnimationsDynamic(code, siteGuardrails));

  // Filter out Hero CTA colors if in hero context
  const filteredViolations = options.isHeroContext
    ? violations.filter((v) => {
        // Allow accent colors in hero context
        const isAccentViolation = siteGuardrails.colors.accents.some((accent) =>
          v.message?.includes(accent)
        );
        return !isAccentViolation;
      })
    : violations;

  const errors = filteredViolations.filter((v) => v.severity === 'error');

  return {
    valid: errors.length === 0,
    violations: filteredViolations,
    usedDynamicGuardrails,
    guardrailsSource: usedDynamicGuardrails ? siteGuardrails.source as 'extracted' | 'mixed' : 'hardcoded',
  };
}

/**
 * Validate patches with dynamic guardrails
 */
export async function validateFixPatchesWithGuardrails(
  patches: Array<{ filePath: string; oldCode: string; newCode: string }>,
  guardrails?: SiteGuardrails
): Promise<GuardrailsValidationResult> {
  const siteGuardrails = guardrails || (await loadSiteGuardrails());
  const allViolations: GuardrailViolation[] = [];

  for (const patch of patches) {
    const isButtonCode =
      patch.newCode.includes('<button') ||
      patch.newCode.includes('Button') ||
      patch.filePath.includes('Button');

    const isHeroContext = patch.filePath.includes('Hero');
    const allowColorSwatchCircles =
      patch.filePath.includes('Swatch') || patch.filePath.includes('Color');

    const result = await validateFixWithGuardrails(patch.newCode, siteGuardrails, {
      isButtonCode,
      isHeroContext,
      allowColorSwatchCircles,
    });

    // Add file path context to violations
    result.violations.forEach((v) => {
      v.line = undefined; // Could be enhanced to include line numbers
      allViolations.push({
        ...v,
        message: `[${patch.filePath}] ${v.message}`,
      });
    });
  }

  const errors = allViolations.filter((v) => v.severity === 'error');

  return {
    valid: errors.length === 0,
    violations: allViolations,
    usedDynamicGuardrails: siteGuardrails.siteId !== DEFAULT_GUARDRAILS.siteId,
    guardrailsSource: siteGuardrails.source as 'extracted' | 'mixed' | 'hardcoded',
  };
}

/**
 * Get a human-readable summary of dynamic validation
 */
export function getDynamicValidationSummary(result: GuardrailsValidationResult): string {
  const source = result.usedDynamicGuardrails
    ? `dynamic (${result.guardrailsSource})`
    : 'hardcoded fallback';

  if (result.valid) {
    return `✅ Fix validated successfully using ${source} guardrails`;
  }

  const errors = result.violations.filter((v) => v.severity === 'error');
  const warnings = result.violations.filter((v) => v.severity === 'warning');

  let summary = `❌ Fix validation failed using ${source} guardrails\n`;
  summary += `   ${errors.length} error(s), ${warnings.length} warning(s)\n\n`;

  errors.forEach((v, i) => {
    summary += `   Error ${i + 1}: ${v.message}\n`;
    if (v.suggestion) summary += `      Suggestion: ${v.suggestion}\n`;
  });

  return summary;
}

// ============================================
// SYNTAX VALIDATION (Pre-Apply Check)
// ============================================

export interface SyntaxValidationResult {
  valid: boolean;
  errors: string[];
  patchedContent?: string;
}

/**
 * Check for basic JSX/TSX syntax issues in code
 * This is a lightweight check before applying patches
 *
 * NOTE: We rely on Next.js/TypeScript compilation to catch real syntax errors.
 * This function only catches obvious issues that would definitely break the build.
 */
function checkBasicSyntax(code: string): string[] {
  const errors: string[] = [];

  // Check for duplicate code blocks (common LLM error)
  const lines = code.split('\n');
  for (let i = 0; i < lines.length - 5; i++) {
    const block = lines.slice(i, i + 5).join('\n').trim();
    if (block.length > 50) {
      const restOfCode = lines.slice(i + 5).join('\n');
      if (restOfCode.includes(block)) {
        errors.push(`Possible duplicate code block detected around line ${i + 1}`);
        break; // Only report once
      }
    }
  }

  // Check for obviously broken patterns
  if (code.includes('<<<<<<') || code.includes('>>>>>>')) {
    errors.push('Contains git merge conflict markers');
  }

  if (code.includes('undefined undefined') || code.includes('null null')) {
    errors.push('Contains suspicious repeated tokens');
  }

  // Check for common TypeScript errors: using hook functions as boolean conditions
  // Pattern: {functionName && ( where functionName is a known hook function
  const hookFunctionPatterns = [
    'isInCompare',     // Should be isInCompare(id) or compareItems.length > 0
    'isInCart',        // Should be isInCart(id) or cartItems.length > 0
    'addToCart',       // Should never be used as a condition
    'addToCompare',    // Should never be used as a condition
    'toggleCompare',   // Should never be used as a condition
  ];

  for (const funcName of hookFunctionPatterns) {
    // Match patterns like {funcName && or (funcName && where funcName is NOT followed by (
    const badPattern = new RegExp(`[{(]\\s*${funcName}\\s*&&`, 'g');
    if (badPattern.test(code)) {
      errors.push(
        `Suspicious pattern: "${funcName}" used as boolean condition. ` +
        `This is likely a function that should be called with arguments or replaced with array.length check.`
      );
    }
  }

  // Check for balanced braces in JSX expressions
  const braceBalance = checkBraceBalance(code);
  if (braceBalance !== 0) {
    errors.push(`Unbalanced curly braces: ${braceBalance > 0 ? 'missing closing }' : 'extra closing }'}`);
  }

  // Check for unclosed JSX tags (simple check)
  const selfClosingOrVoid = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];
  const tagPattern = /<(\w+)[^>]*>/g;
  const closeTagPattern = /<\/(\w+)>/g;
  const openTags: string[] = [];
  const closeTags: string[] = [];

  let match;
  while ((match = tagPattern.exec(code)) !== null) {
    const tag = match[1].toLowerCase();
    const fullMatch = match[0];
    // Skip self-closing tags and void elements
    if (!fullMatch.endsWith('/>') && !selfClosingOrVoid.includes(tag)) {
      openTags.push(tag);
    }
  }
  while ((match = closeTagPattern.exec(code)) !== null) {
    closeTags.push(match[1].toLowerCase());
  }

  // Simple mismatch check (not perfect but catches obvious issues)
  const tagCounts = new Map<string, number>();
  openTags.forEach(t => tagCounts.set(t, (tagCounts.get(t) || 0) + 1));
  closeTags.forEach(t => tagCounts.set(t, (tagCounts.get(t) || 0) - 1));

  for (const [tag, count] of tagCounts) {
    if (count > 2) { // Allow some tolerance for complex components
      errors.push(`Potentially unclosed <${tag}> tag (${count} more opens than closes)`);
    } else if (count < -2) {
      errors.push(`Extra closing </${tag}> tag (${-count} more closes than opens)`);
    }
  }

  return errors;
}

/**
 * Check if curly braces are balanced in the code
 * Returns 0 if balanced, positive if missing }, negative if extra }
 */
function checkBraceBalance(code: string): number {
  let balance = 0;
  let inString = false;
  let stringChar = '';
  let inTemplate = false;
  let prevChar = '';

  for (let i = 0; i < code.length; i++) {
    const char = code[i];

    // Track string literals to avoid counting braces inside strings
    if (!inString && !inTemplate && (char === '"' || char === "'" || char === '`')) {
      inString = true;
      stringChar = char;
      if (char === '`') inTemplate = true;
    } else if (inString && char === stringChar && prevChar !== '\\') {
      inString = false;
      inTemplate = false;
    } else if (!inString && !inTemplate) {
      if (char === '{') balance++;
      else if (char === '}') balance--;
    }

    prevChar = char;
  }

  return balance;
}

/**
 * Validate that a patch can be safely applied without breaking syntax
 */
export async function validatePatchSyntax(
  patch: { filePath: string; oldCode: string; newCode: string }
): Promise<SyntaxValidationResult> {
  const errors: string[] = [];

  try {
    // Read the current file
    const fullPath = path.join(process.cwd(), patch.filePath);
    const currentContent = await fs.readFile(fullPath, 'utf-8');

    // Check if oldCode exists
    if (!currentContent.includes(patch.oldCode)) {
      errors.push(`oldCode not found in ${patch.filePath} - file may have been modified`);
      return { valid: false, errors };
    }

    // Apply patch in memory
    const patchedContent = currentContent.replace(patch.oldCode, patch.newCode);

    // Check for basic syntax issues
    const syntaxErrors = checkBasicSyntax(patchedContent);
    errors.push(...syntaxErrors);

    // Check that the patch doesn't create duplicate blocks
    const occurrences = (patchedContent.match(new RegExp(escapeRegex(patch.newCode), 'g')) || []).length;
    if (occurrences > 1 && patch.newCode.length > 50) {
      errors.push(`Patch would create duplicate code (${occurrences} occurrences of the same block)`);
    }

    return {
      valid: errors.length === 0,
      errors,
      patchedContent: errors.length === 0 ? patchedContent : undefined,
    };
  } catch (error) {
    errors.push(`Failed to validate patch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { valid: false, errors };
  }
}

/**
 * Validate all patches in a fix before applying any of them
 */
export async function validateAllPatchesSyntax(
  patches: Array<{ filePath: string; oldCode: string; newCode: string }>
): Promise<{
  valid: boolean;
  results: Array<{ patch: typeof patches[0]; valid: boolean; errors: string[] }>;
  summary: string;
}> {
  const results: Array<{ patch: typeof patches[0]; valid: boolean; errors: string[] }> = [];

  for (const patch of patches) {
    const result = await validatePatchSyntax(patch);
    results.push({
      patch,
      valid: result.valid,
      errors: result.errors,
    });
  }

  const allValid = results.every(r => r.valid);
  const failedCount = results.filter(r => !r.valid).length;

  let summary = allValid
    ? `✅ All ${patches.length} patches passed syntax validation`
    : `❌ Syntax validation failed: ${failedCount}/${patches.length} patches have issues\n`;

  if (!allValid) {
    results.filter(r => !r.valid).forEach(r => {
      summary += `\n   ${r.patch.filePath}:\n`;
      r.errors.forEach(e => {
        summary += `      - ${e}\n`;
      });
    });
  }

  return { valid: allValid, results, summary };
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
