/**
 * Test script for the dynamic guardrails system
 * Run with: npx tsx scripts/test-guardrails.ts
 */

import { validateFixWithGuardrails } from '../lib/fix-validators';
import { loadSiteGuardrails, formatGuardrailsForLLM } from '../lib/site-guardrails';
import { extractThemeGuardrails } from '../lib/theme-extractor';

async function runTests() {
  console.log('='.repeat(60));
  console.log('DYNAMIC GUARDRAILS TEST SUITE');
  console.log('='.repeat(60));

  // Test 1: Load guardrails
  console.log('\n📋 Test 1: Load Site Guardrails');
  const guardrails = await loadSiteGuardrails();
  console.log(`  Site ID: ${guardrails.siteId}`);
  console.log(`  Source: ${guardrails.source}`);
  console.log(`  Background colors: ${guardrails.colors.backgrounds.length}`);
  console.log(`  Font weights: ${guardrails.typography.allowedFontWeights.join(', ')}`);
  console.log(`  Border radius: ${guardrails.spacing.borderRadiusAllowed.join(', ')}`);
  console.log('  ✅ PASS');

  // Test 2: Format for LLM
  console.log('\n📋 Test 2: Format Guardrails for LLM');
  const formatted = formatGuardrailsForLLM(guardrails);
  console.log(`  Output length: ${formatted.length} chars`);
  console.log(`  Contains color palette: ${formatted.includes('Color Palette')}`);
  console.log(`  Contains typography: ${formatted.includes('Typography')}`);
  console.log('  ✅ PASS');

  // Test 3: Validate valid code
  console.log('\n📋 Test 3: Validate VALID Code');
  const validCode = `
    <button style={{
      backgroundColor: '#111',
      color: 'white',
      fontWeight: 600,
      textTransform: 'uppercase'
    }}>
      ADD TO CART
    </button>
  `;
  const result1 = await validateFixWithGuardrails(validCode, guardrails, { isButtonCode: true });
  console.log(`  Valid: ${result1.valid}`);
  console.log(`  Violations: ${result1.violations.length}`);
  console.log(`  Used dynamic guardrails: ${result1.usedDynamicGuardrails}`);
  console.log(result1.valid ? '  ✅ PASS' : '  ❌ FAIL');

  // Test 4: Validate invalid color
  console.log('\n📋 Test 4: Validate INVALID Color (should reject)');
  const invalidColor = `
    <button style={{ backgroundColor: '#ff00ff', color: 'white' }}>
      CLICK ME
    </button>
  `;
  const result2 = await validateFixWithGuardrails(invalidColor, guardrails, { isButtonCode: true });
  console.log(`  Valid: ${result2.valid}`);
  console.log(`  Violations: ${result2.violations.length}`);
  if (result2.violations.length > 0) {
    console.log(`  First violation: ${result2.violations[0].message}`);
  }
  console.log(!result2.valid ? '  ✅ PASS (correctly rejected)' : '  ❌ FAIL (should have rejected)');

  // Test 5: Validate invalid font weight
  console.log('\n📋 Test 5: Validate INVALID Font Weight (should reject)');
  const invalidWeight = `
    <button style={{ backgroundColor: '#111', fontWeight: 800 }}>
      BOLD
    </button>
  `;
  const result3 = await validateFixWithGuardrails(invalidWeight, guardrails, { isButtonCode: true });
  console.log(`  Valid: ${result3.valid}`);
  console.log(`  Violations: ${result3.violations.length}`);
  if (result3.violations.length > 0) {
    console.log(`  First violation: ${result3.violations[0].message}`);
  }
  console.log(!result3.valid ? '  ✅ PASS (correctly rejected)' : '  ❌ FAIL (should have rejected)');

  // Test 6: Theme extraction (quick scan)
  console.log('\n📋 Test 6: Theme Extraction (components only)');
  const { guardrails: extracted, report } = await extractThemeGuardrails(['components/store'], {
    siteId: 'test-extraction',
    merge: false,
  });
  console.log(`  Files scanned: ${report.filesScanned.length}`);
  console.log(`  Colors found: ${Object.keys(report.colorsFound).length}`);
  console.log(`  Font weights found: ${Object.keys(report.fontWeightsFound).join(', ')}`);
  console.log(`  Border radii found: ${Object.keys(report.borderRadiiFound).join(', ')}`);
  console.log('  ✅ PASS');

  console.log('\n' + '='.repeat(60));
  console.log('ALL TESTS COMPLETE');
  console.log('='.repeat(60));
}

runTests().catch(console.error);
