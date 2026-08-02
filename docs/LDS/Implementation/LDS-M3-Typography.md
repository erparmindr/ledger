# Milestone 3 — Typography (Report)

**Scope:** Replace inline font-sizes, inconsistent weights, and line-heights with semantic
typography tokens (`--text-*`, `--fw-*`, `--lh-*`) while preserving appearance exactly.

## What changed (css/styles.css only)

**Font weights** → `--fw-*` (exact value match):
- `--fw-extrabold` (800), `--fw-bold` (700), `--fw-semibold` (600), `--fw-medium` (500), `--fw-normal` (400).

**Font sizes** → `--text-*` where value is on-scale (exact match):
- 11px→`--text-xs`, 12px→`--text-sm`, 13px→`--text-base`, 14px→`--text-md`, 16px→`--text-lg`,
  20px→`--text-xl`, 24px→`--text-2xl`, 32px→`--text-3xl`.

**Line height:** `line-height:1` → `--lh-single` (only exact-match value).

## Hard-coded values removed
~60 `font-weight` literals and ~115 `font-size` literals (on-scale) replaced with tokens.

## Remaining LDS TODOs (deferred deliberately)
| Item | Why deferred |
|---|---|
| Fractional sizes (9/9.5/10/10.5/11.5/12.5/13.5/14.5/15/15.5/17/18/19/22/26/30px) | forbidden in LDS-002 §15, but nearest token ≠ current value → converting would change appearance |
| Line-heights 1.15/1.25/1.3/1.45/1.5/normal | no exact token; converting changes appearance |
| Inline `style="font-size:…"` literals in `js/**` | present in rendered DOM string; converting would break the byte-identical snapshot gate |

## Test results
- **Test suite:** 451/451 passing (16 files).
- **Visual snapshot:** 0 diffs across all 42 rendered pages (byte-identical).

## Zero-regression summary
All changes are exact-value token substitutions in the stylesheet only. No layout, sizing,
spacing, or rendered-DOM change. The body default (`font-size:var(--text-md)`, `line-height:1.5`)
and the `:root` token scales were already present.

---
*End of Milestone 3 report.*