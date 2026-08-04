# F-003 Regression Report — Row action buttons always visible (F1)

> Resolution of the Critical finding **F1** from the F-003 Mobile Audit baseline:
> row/group action buttons were revealed purely by `:hover` and were undiscoverable on
> touch devices with no hover.
>
> **Final design decision:** action buttons are now **always visible** on every device
> (desktop and mobile). Hover/focus remain as secondary *feedback* only — they no longer
> control visibility. This supersedes the earlier touch-only fix (see history below).

## Root cause

Five classes of row/group action buttons were revealed purely by the `:hover` pseudo-class:

| Control | Surface | Original base state |
|---|---|---|
| `.kebab-btn` | register (transactions) rows | `opacity:0`, revealed by `.grp-row:hover` / `:focus-visible` |
| `.kb` | accounts tiles | `opacity:0`, revealed by `.tile:hover` |
| `.cat-row-actions` | categories rows | `opacity:0`, revealed by `.cat-row:hover` |
| `.dupe-row-actions` | duplicate-check rows | `opacity:0`, revealed by `.dupe-row:hover` |
| `.group-edit` / `.group-del` | group chips | `opacity:0.5` / `0.3`, raised on `.group-chip:hover` |

Touch devices do not fire `:hover`, so on phones/tablets the primary Edit/Delete/Reconcile
affordances rendered with `opacity:0` and were effectively **undiscoverable** (F-003 F1,
Critical).

## Implementation

CSS-only change in `css/styles.css` (no JS, no markup, no tests).

### Always-visible base state

Each control now has an always-visible visual baseline (no `opacity:0` and no
`:hover`-/`:focus`-based reveal):

| Control | New base state |
|---|---|
| `.kebab-btn` | `opacity:1`; `:hover` = `background:var(--surface-2); color:var(--text)`; `:focus-visible` ring kept; `min-width/height:28px` kept |
| `.kb` | `opacity:1`; added `.kb:hover` background/color and `.kb:focus-visible` ring |
| `.cat-row-actions` | `opacity:1` (kept `flex:1`/right-aligned layout) |
| `.dupe-row-actions` | `opacity:1` |
| `.group-edit` | `opacity:1`, subtle: `border-radius:4px; padding:2px 3px`; `:hover` background `var(--surface-2)` |
| `.group-del` | `opacity:1`, subtle: `border-radius:4px; padding:2px 3px`; `:hover` background `var(--clay-soft)` |

### Removal of hover-hiding CSS

Removed every rule that relied on hover/focus to reveal (or raise) these controls:
- `.grp-row:hover .kebab-btn, .kebab-btn:focus-visible { opacity:1 }` reveal
- `.tile:hover .kb { opacity:1 }`
- `.cat-row:hover .cat-row-actions { opacity:1 }`
- `.dupe-row:hover .dupe-row-actions { opacity:1 }`
- `.group-chip:hover` opacity-raise for `.group-edit` / `.group-del`

Hover/focus rules that provide **feedback without controlling visibility** were retained/added
(background, color, focus ring).

### Superseded touch-only override removed

The earlier `@media (hover:none), (pointer:coarse)` + `body.is-mobile { opacity:1 }` block was
removed as redundant — the base state is already always visible, so no touch-specific override
is needed.

## Verification

**Automated (computed style, headless Chrome via CDP):** a probe page loaded the real
`styles.css` with sample elements for all five surfaces. Computed `opacity` under three states:

| Probe | Desktop baseline | Touch emulation (`hover:none` + coarse) | `body.is-mobile` |
|---|---|---|---|
| `.kebab-btn` | **`1`** | **`1`** | **`1`** |
| `.kb` | **`1`** | **`1`** | **`1`** |
| `.cat-row-actions` | **`1`** | **`1`** | **`1`** |
| `.dupe-row-actions` | **`1`** | **`1`** | **`1`** |
| `.group-edit` | **`1`** | **`1`** | **`1`** |
| `.group-del` | **`1`** | **`1`** | **`1`** |

Buttons are always visible at `opacity:1` on desktop, touch, and the app's mobile path —
satisfying the requirement for desktop, tablet, and mobile.

**CSS sanity:** braces balanced (`820` open / `820` close); no `opacity:0` remains on the six
action controls.

**Test suite:** `vitest run` → **469/469 passing** (16 files).

**Snapshot regression:** CSS-only change; no DOM/markup/JS modified, so page structures are
unchanged from the F-001 baseline.

**Files changed:** `css/styles.css` (action-control rules rewritten). No JS, no markup, no
tests modified.

## Design notes

- Buttons are intentionally **visually secondary** (subtle background on hover, no constant
  emphasis) while remaining discoverable and clickable at all times.
- Keyboard accessibility preserved: `:focus-visible` ring retained on `.kebab-btn` / `.kb`.
- Touch usability preserved: controls are tappable without needing hover.

## History

1. `fix(mobile)`: touch-only fix — `@media (hover:none)` + `body.is-mobile` forcing `opacity:1`
   while desktop kept hover-reveal. Shipped and verified live, but desktop still hid buttons by
   default.
2. **Final:** requirement changed to always-visible on both desktop and mobile (this report).

## Notes / deferred

- Touch **hit-area** enlargement to ≥44px for these controls remains planned in Phase 2
  (F-003 audit F4 / F1 plan item) — visibility is fixed; control sizing is out of scope here.
- Items F2–F6 (iOS zoom, safe areas, `100dvh`, pull-to-refresh) remain for Phase 1; not started.