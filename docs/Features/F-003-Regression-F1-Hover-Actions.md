# F-003 Regression Report — Hover-only actions invisible on touch (F1)

> Critical regression fix from the F-003 Mobile Audit baseline.
> Scope: resolve the Critical finding **F1** only. No broader mobile improvements were started.

## Root cause

Five classes of row/group action buttons are revealed purely by the `:hover` pseudo-class:

| Control | Surface | Base state |
|---|---|---|
| `.kebab-btn` | register (transactions) rows | `opacity:0`, revealed by `.grp-row:hover` / `:focus-visible` |
| `.kb` | accounts tiles | `opacity:0`, revealed by `.tile:hover` |
| `.cat-row-actions` | categories rows | `opacity:0`, revealed by `.cat-row:hover` |
| `.dupe-row-actions` | duplicate-check rows | `opacity:0`, revealed by `.dupe-row:hover` |
| `.group-edit` / `.group-del` | group chips | `opacity:0.5` / `0.3`, raised on `.group-chip:hover` |

Touch devices do not fire `:hover`, so on phones/tablets the primary Edit/Delete/Reconcile affordances rendered with `opacity:0` and were effectively **undiscoverable** (F-003 F1, Critical). There was no `@media (hover:none)` fallback and no `body.is-mobile` override for these controls.

## Implementation

CSS-only fix in `css/styles.css` (23 lines appended at the end, after the modal-fullscreen block):

1. **`@media (hover: none), (pointer: coarse)`** — forces `opacity:1` on `.kebab-btn`, `.kb`, `.cat-row-actions`, `.dupe-row-actions`, `.group-chip .group-edit`, `.group-chip .group-del` for any device whose primary pointer lacks hover or is coarse (phones, most tablets).
2. **`body.is-mobile …` fallback** — mirrors the app's existing JS-driven mobile detection (app.js sets `body.is-mobile` when `innerWidth <= 768` **or** `ontouchstart`/`maxTouchPoints > 0`), covering devices where `hover:` is reported optimistically but the app still classifies as mobile.

Both paths are additive; desktop hover-reveal behavior is unchanged (a hover-capable desktop keeps `opacity:0` until hover/focus).

## Verification

**Automated (computed style, headless Chrome via CDP):** a probe page loaded the real `styles.css` with sample elements for all five surfaces. Computed `opacity` under three conditions:

| Probe | Desktop baseline | Touch emulation (`hover:none` + coarse) | `body.is-mobile` |
|---|---|---|---|
| `.kebab-btn` | `0` | **`1`** | **`1`** |
| `.kb` | `0` | **`1`** | **`1`** |
| `.cat-row-actions` | `0` | **`1`** | **`1`** |
| `.dupe-row-actions` | `0` | **`1`** | **`1`** |
| `.group-edit` | `0.5` | **`1`** | **`1`** |
| `.group-del` | `0.3` | **`1`** | **`1`** |

Desktop baseline unchanged → hover-reveal behavior preserved on mouse.

**Test suite:** `vitest run` → **469/469 passing** (16 files).

**Snapshot regression:** DOM snapshots re-generated via `snapshot.mjs`; identical to the F-001 commit state (`snap_commit`) for all 42 pages — no DOM/JS change. (CSS-only change; the 3 known F-001 banner pages match the F-001 baseline.)

**Files changed:** `css/styles.css` (+23 lines, CSS only). No JS, no markup, no tests modified.

## Notes / deferred

- Touch **hit-area** enlargement to ≥44px for these controls remains planned in Phase 2 (F-003 audit F4 / F1 plan item) — this regression fix restores visibility but does not resize controls.
- Items F2–F6 (iOS zoom, safe areas, `100dvh`, pull-to-refresh) remain for Phase 1; not started.
