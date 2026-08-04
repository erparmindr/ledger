# Change Report — Always-visible row action buttons

**Commit scope:** CSS-only change to row/group action button visibility.
**Branch:** `main` (not yet pushed — pending review).

## Requirement change

The earlier F1 fix made action buttons visible only on touch devices (via
`@media (hover:none), (pointer:coarse)` and a `body.is-mobile` override), keeping
hover-reveal on desktop. The requirement changed to:

> Row action (kebab) buttons must be **always visible** on both desktop and mobile.

## What changed

All in `css/styles.css` (no JS, markup, or tests touched):

1. **Always-visible base state** for the six controls, replacing `opacity:0`/low hover-reveal:
   - `.kebab-btn` (register rows), `.kb` (accounts tiles), `.cat-row-actions`,
     `.dupe-row-actions` → `opacity:1` by default.
   - `.group-edit` / `.group-del` (group chips) → always visible, subtle styling
     (`border-radius:4px; padding:2px 3px`), hover background feedback
     (`var(--surface-2)` / `var(--clay-soft)`).
2. **Hover/focus kept as feedback only** (background, color, focus ring) — they no longer
   control visibility. Keyboard `:focus-visible` ring preserved.
3. **Removed** all hover/focus reveal rules for these controls and the now-redundant
   touch-device override block (`@media (hover:none)` + `body.is-mobile`), which the
   always-visible base state supersedes.

## Verification

| Check | Result |
|---|---|
| Test suite `vitest run` | **469/469 passing** (16 files) |
| CSS brace balance | 820 open / 820 close ✅ |
| No `opacity:0` on action controls | confirmed ✅ |
| CDP computed style (desktop baseline) | all six controls `opacity:1` |
| CDP computed style (touch emulation) | all six controls `opacity:1` |
| CDP computed style (`body.is-mobile`) | all six controls `opacity:1` |

Buttons are always visible on desktop, tablet, and mobile.

## Docs updated

- `docs/Features/F-003-Mobile-Audit.md` — F1 finding, register, checklist, and phased plan
  updated to mark F1 resolved (always-visible design).
- `docs/Features/F-003-Regression-F1-Hover-Actions.md` — rewritten to document the final
  always-visible design decision and the superseded touch-only fix.
