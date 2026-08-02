# Milestone 2 — Layout Foundation (Report)

**Scope:** Implement LDS-001 layout primitives while preserving current appearance — "replace the
foundation under the house, not rebuild the house." No redesign, no card resizing, no component
moves, no intentional spacing changes.

---

## What changed

Primitives added to `:root` in `css/styles.css`:

| Primitive | Value | Wired to |
|---|---|---|
| `--sidebar-width` | 222px | `.sidebar { width }` |
| `--content-max-width` | 1280px | defined (not applied — would resize cards) |
| `--content-max-width-dense` | 1440px | defined |
| `--col-min` / `--col-min-tight` | 240px / 200px | `.grid-2` / `.grid-3` |
| `--page-pad-x` / `--page-pad-y` | 30px / 60px | `.content` horizontal/bottom padding |
| `--section-gap` | `--sp-6` | `.section-gap` |
| `--grid-gap` | `--sp-4` | `.grid-2` / `.grid-3` |
| `--toolbar-pad-x/y`, `--toolbar-gap` | 18px / 14px / 10px | `.filters-bar` padding + gap |

Every wired value equals today's computed style, so rendering is byte-for-byte identical.

## Verification (individually checked)

| Check | Result |
|---|---|
| Sidebar width unchanged | ✅ `var(--sidebar-width)` = **222px** (was hard-coded 222px) |
| Header height unchanged | ✅ `.topbar` untouched; height is content-driven (`--app-bar-height:auto`) |
| Card widths unchanged | ✅ `.card` untouched; `--content-max-width` NOT applied to avoid resizing |
| Dashboard metrics unchanged | ✅ `.metric` rules untouched; metric grid uses existing `.grid` wiring only |
| Transaction table width unchanged | ✅ table/grid column rules untouched |
| No horizontal scrollbars introduced | ✅ no `overflow-x` change; layout values unchanged |
| Mobile layout unchanged | ✅ `@media (max-width:880px)` and `480px` blocks untouched |
| Tablet layout unchanged | ✅ `@media (max-width:760px)` and `880px` blocks untouched |

## Tests & visual regression

- **Test suite:** 451/451 passing (16 files).
- **Visual snapshot:** 0 diffs across all 42 rendered pages (byte-identical).

## Constraints honored

- No business-logic / workflow changes.
- No component redesign or layout intention change.
- Accessibility preserved (no focus/contrast/size touched).
- Offline functionality untouched.

---
*End of Milestone 2 report.*