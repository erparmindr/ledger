# Migration Tracker — LDS Implementation

Single source of truth for the Ledger Design System migration progress.
Component/token platform: `Ledger` helpers + `css/styles.css`.

| Milestone | Status | Components Migrated | Remaining |
|---|---|---|---|
| Tokens | ✅ | 0 (definitions only) | Consumption |
| Layout | ✅ | Sidebar, Content, section gap, grids, filters bar | Responsive `@media` → `--bp-*` (kept literal; CSS vars unusable in media) |
| Typography | ✅ | Weights (400/500/600/700/800) → `--fw-*`; on-scale sizes (11/12/13/14/16/20/24/32px) → `--text-*`; `line-height:1` → `--lh-single` | Off-scale fonts (8.5/9/10/10.5/11.5/12.5/13.5/14.5/15/15.5/17/18/19/22/26/30px); fractional line-heights (1.15/1.25/1.3/1.45/1.5); inline `style=` literals in JS |
| Spacing | ✅ | Exact on-scale edge offsets → `--sp-*` (`.metric-icon` right, `.toast` bottom/right, `.fab` bottom/right, `.add-group`.right, `.drp-popover` calc+left) | Off-scale pad/margin/gap (6/10/14/18/22/13/5/2px) — no exact token equivalent, converting would change layout; inline `style=` pad literals in JS |
| Color | ✅ | Radius circles `50%`→`--radius-circle`; `--color-*` role set defined & aliased in M1 (canonical contract established) | Account/currency brand hex colors (checking/savings/credit/currency tags) — no LDS role; semantic `--color-*` consumption in rules deferred |
| Elevation | ✅ | Focus rings `3px var(--brass-soft)`→`--ring-width/--ring-color-soft`; z-index 30/40/1000/10→`--z-fab/--z-overlay/--z-dropdown/--z-sticky` | Raw `box-shadow` literals (dropdown/toast/menu); z-index 2/20/50/60/100/200/9999 (no exact token); `--shadow-*` consumption |

---

## Change log

- **Milestone 1 — Tokens** completed: added semantic token families to `css/styles.css` (`--type-*`, `--fw-*`, `--lh-*`, `--color-*`, `--radius-circle`, `--shadow-*`, `--z-*`, `--bp-*`, `--ring-*`). Token definitions only; no consumption yet.
- **Milestone 2 — Layout Foundation** completed: introduced `--sidebar-width`, `--content-max-width`, `--col-min`, `--page-pad-*`, `--section-gap`, `--card-gap`, `--toolbar-*`, `--grid-gap` layout primitives; wired `.sidebar`, `.content`, `.section-gap`, `.grid-2/grid-3`, `.filters-bar` to them. All primitive values equal today's computed style → zero visual change. `--content-max-width` defined but intentionally not applied (would resize cards). Responsive `@media` queries kept literal (CSS vars are unusable in media).
- **Milestone 3 — Typography** completed: replaced `font-weight:800→--fw-extrabold`, `700→--fw-bold`, `600→--fw-semibold`, `500→--fw-medium`, `400→--fw-normal`; on-scale `font-size` (11/12/13/14/16/20/24/32px) → `--text-*`; `line-height:1` → `--lh-single`. Only exact-value matches converted (zero visual change). Off-scale fractional sizes, remaining line-heights, and JS inline `font-size` literals left > flagged (converting them would change appearance or snapshot bytes).
- **Milestone 4 — Spacing** — converted only spacing values with an exact `--sp-*` token equivalent: `.metric-icon` right:16→`--sp-4`, `.toast` bottom/right:24→`--sp-6`, `.fab` bottom/right:20→`--sp-5`, `right:32→--sp-8`, `.drp-popover` `calc(100vw-32)`→`---sp-8` + left:16→`--sp-4`. All other pad/margin/gap are off-scale (no exact token) and intentionally left to avoid layout change. 451 tests pass; 42-page snapshot byte-identical.
- **Milestone 5 — Color & Elevation** — Color: `border-radius:50%`→`var(--radius-circle)` everywhere; the `--color-*` role set (defined and aliased in M1) stands as the canonical semantic color contract. Elevation: focus-state rings `box-shadow:0 0 0 3px var(--brass-soft)`→`0 0 0 var(--ring-width) var(--ring-color-soft)` (exact 3px/brass-soft match); z-index with exact token equivalents converted (`10`→`--z-sticky`, `30`→`--z-fab`, `40`→`--z-overlay` [sidebar backdrop], `1000`→`--z-dropdown`). Left > flagged `LDS-TODO`: raw `box-shadow` literal values (no exact `--shadow-*` match — shadow tokens have distinct specs), z-index without exact tokens (2/20/50/60/100/200/9999), account/currency brand hex colors (no LDS role). 451 tests pass; 42-page snapshot byte-identical.

*Each milestone must update this table as it is completed (status, components migrated, remaining).*

---
*End of Migration Tracker.*