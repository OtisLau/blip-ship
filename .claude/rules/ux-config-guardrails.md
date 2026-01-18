# UX Config Change Guardrails

These rules define constraints for LLM-generated SiteConfig changes to ensure safe and consistent updates.

## General Principles

1. **Minimal Changes**: Only suggest changes that directly address detected issues
2. **Reversibility**: All config changes should be easily reversible
3. **Preview First**: Changes should be applied to preview config before going live
4. **Data-Driven**: Require minimum thresholds before suggesting changes

## Product Image Clickability

### What `products.imageClickable` Does

When `imageClickable: true`, clicking a product image opens the ProductModal (the same behavior as clicking the product info/name/price below the image).

### When to Enable `products.imageClickable`

**Required Signals (ALL must be present):**
- At least 5 rapid clicks (< 500ms apart) on product images
- At least 3 unique sessions showing the pattern
- At least 20% of image clicks followed by product info click within 2s (to open modal)

**Severity Thresholds:**
| Severity | Rapid Clicks | Unique Sessions | Follow-up Rate |
|----------|--------------|-----------------|----------------|
| Critical | >30 | >10 | >50% |
| High | 15-30 | 5-10 | 30-50% |
| Medium | 5-15 | 2-5 | 10-30% |
| Low | <5 | 1 | <10% |

### No Companion Changes Required

When enabling `imageClickable: true`:
- No URL configuration needed
- The image click handler opens ProductModal automatically
- Same behavior as clicking product info (name/price)

### Forbidden Changes

Never suggest:
- Enabling clickable images without analytics support

## Config Path Validation

### Allowed Config Paths

Currently supported for LLM modification:
- `products.imageClickable` (boolean)

### Forbidden Config Paths

Never modify via LLM:
- `id`, `version`, `status` (system fields)
- Any path not explicitly allowed above
- Nested objects beyond specified depth

## Change Validation Checklist

Before approving a config change:
- [ ] Config path is in allowed list
- [ ] Value type matches expected type (boolean for imageClickable)
- [ ] Analytics meet minimum thresholds
- [ ] Change is reversible
- [ ] Preview mode used first

## Rollback Procedure

If issues detected after applying:
1. Revert `products.imageClickable` to `false`
2. Log the rollback with reason
3. Notify user of the rollback

## Audit Requirements

Each config change should record:
- Timestamp of change
- Analytics that triggered it
- Old value → New value
- Applied by (user/auto)
- Preview/Live mode
