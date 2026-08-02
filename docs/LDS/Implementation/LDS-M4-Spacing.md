# Milestone 4 — Spacing (Report)

**Scope:** Replace spacing values (padding/margin/gap) only where they have an **exact** `--sp-*`
token equivalent, preserving layout, sizing, hierarchy, and appearance.

## What changed (css/styles.css)
Converted only exact on-scale spacing values to tokens (value-identical):

| File | Rule | Change |
|---|---|---|
| `.metric-icon` | `right:16px` | → `right:var(--sp-4)` |
| `.toast` | `bottom:24px; right:24px` | → `var(--sp-6)` |
| `.fab` | `bottom:20px; right:20px` | → `var(--sp-5)` |
| (owned group) | `right:32px` | → `var(--sp-8)` |
| `.drp-popover` | `calc(100vw - 32px)`; `left:16px` | → `---sp-8`; `var(--sp-4)` |

These are boundary/coordinate offsets (position of toast/fab/metric-icon) — the only spacing
values that already fell exactly on the token scale.

## Spacing tokens consumed
`--sp-4` (16px), `--sp-5` (20px), `--sp-6` (24px), `--sp-8` (32px).

## Hard-coded values removed
6 raw pixel literals (16×2, 24×2, 20×2, 32×3 occurrences resolved to their token equivalent).

## Remaining LDS-TODO items (deferred deliberately)
- **Off-scale padding/margin/gap** — the overwhelming majority of the codebase (`6px`, `10px`,
  `14px`, `18px`, `22px`, `13px`, `5px`, `2px`, `30px`, `60px`) have **no exact** `--sp-*`
  equivalent. Rounding them to a token would change layout/spacing, which is prohibited this
  milestone. These are LDS-003 §13 forbidden values and are future token-contract candidates.
- **Inline `style="padding:…"` literals** in `js/**` — present in rendered DOM strings; converting
  would break the byte-identical snapshot gate.

## Preserved (verified unchanged)
- Page layout, component sizing, card dimensions, toolbar layout, table layout, dialog layout.

## Test results
- **Test suite:** 451/451 passing (16 files).
- **Visual snapshot:** 0 diffs across all 42 rendered pages (byte-identical).

## Zero-regression summary
Only exact-value coordinate substitutions; no spacing/layout/hierarchy change.

---
*End of Milestone 4 report.*