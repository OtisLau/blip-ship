/**
 * Fix Validators
 *
 * Validates LLM-generated fixes against theme guardrails.
 * Any fix that violates these rules is rejected before application.
 */

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
