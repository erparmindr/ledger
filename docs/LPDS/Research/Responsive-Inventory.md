# Responsive Inventory — Current Implementation

**Type:** Research (not an LPDS specification)
**Purpose:** Document the existing breakpoints, how components change at each, mobile-preference gating, and known inconsistencies for LPDS-001.

---

# 1. Breakpoint table

Only three numeric breakpoints are used, plus two state-driven patterns. There is **no named `--bp-*` token or SCSS/postcss abstraction** — all are raw `@media` queries in `css/styles.css`.

| Breakpoint | Direction | Primary changes | Sample lines |
| --- | --- | --- | --- |
| **≤880px** | drawer + register/grid collapse | Sidebar→hidden drawer; mobile-topbar shown; `.main-col` full width; register 8-col → 6-col; some grids stack | 144, 1112, 1566 |
| **≤760px** | tablet/portrait | Rows wrap; modal width shrinks; tx-row wraps; filters stack | 826, 1897 |
| **≤480px** | small phone | Heavy stacking; controls column; grids→1 col; modals full-screen bottom-sheet; FAB smaller; touch targets | 1132, 1571, 1656, 1822, 1904, 1910 |
| **`prefers-reduced-motion`** | a11y | disables/calm transitions (accordion, modals) | present |

State gating (not width): 
- `body.is-mobile` toggles `mobile-only`/`desktop-only` element visibility (topbar vs full sidebar) via JS feature detection; JS adds `.touch` for touch-specific hit-testing. These are **feature gating**, not layout breakpoints.

---

# 2. What each breakpoint changes

## 2.1 ≤880px
- `.sidebar` → `position:fixed; top:0; left:0; height:100vh; transform:translateX(-100%)`; `.sidebar-backdrop` shown; opened via `.open` on a `~` sibling / class toggle (styles.css:144-).
- `.mobile-topbar` becomes visible; full `.topbar` search box hides behind nav.
- `.main-col` no longer offset (full width).
- Register `.grp-row` 8-col → 6-col (drops balance-type inheritance of 2 columns).
- Importer preview category/sub category stacks.

## 2.2 ≤760px
- `.tx-row` switches from row to internal wrapping (`flex-wrap`), hides `.tx-tab` maybe; smaller `.tx-meta`.
- Modals `max-width: calc(100vw - 32px)`.
- `.filters-bar select` / controls go `width:100%` or wrap; row/pill filters become 2-up.

## 2.3 ≤480px
- `.content` horizontal padding drops; `.topbar` becomes single column.
- `.form-row` children `flex:1 1 100%` (full-width inputs); `.cols-3` `min-width` reduced.
- Register `.grp-row` 6-col → 4-col (drops further columns).
- Account `.owner-group .card-grid` `minmax(180px,1fr)` → `minmax(160px,1fr)` (still 2 cards, gap reduces).
- Modals: bottom-sheet full-width (`width:100vw`), taller (92vh).
- FAB shrinks (smaller icon button), corners rounded.
- Date-range picker goes single calendar; .dp-grid still 7-cols but smaller.
- Touch: increased spacing on `.nav`, `.btn` touch targets.

---

# 3. Dependency problems (matter for LPDS-001 spec)

1. **Column-count coupling is fragile.** Register responsive relies on hiding specific `.grp-col-header` children by numbered `nth-child`/`nth-last-child` selectors that must stay in sync with the 8→6→4 column grid (`.grp-row`/`.grp-col-header`/`.show-runbal` all re-defined at 880 and 480). Adding/removing a column can break two media queries.
2. **Hard-pixel paddings** on `.content` (30px) and `.topbar` don't scale with the `--sp-*` scale at any breakpoint (only content padding reduced at 480; 880 keeps 30px which is edge-heavy on a drawer layout).
3. **No `--bp-*` abstraction** — every vendor/override hardcodes the numbers; a global change requires editing many queries.
4. **`.sidebar` fixed 222px** at ≤880 becomes a full-height drawer (fine) but there is no half-width/compact "mini-rail" state, so tablets ≥? rely on drawer for all ≤880.
5. **Modal sizing** isn't a single scale: base `max-width:800px` → `calc(100vw-32px)` → `100vw` bottom sheet, with `max-height` 88vh→92vh. Small "form-dialog" (e.g. date-range) reuses the same `.modal`, so no compact variant gets tested.
6. **Reduced-motion** disables transitions but is implemented per-animation, not via a shared transformer, so coverage is uneven (toast/sth still animate).

---

# 4. Mobile/motion preference tokens

| Preference | Implementation | Notes |
| --- | --- | --- |
| Drawer nav | `.sidebar` + `.sidebar-backdrop` translateX | ~.35s transition |
| `.is-mobile` | JS adds on touch/UA; gates `.mobile-only`/`.desktop-only` | type-gating |
| `.touch` | JS adds on coarse pointers; grows hit targets | pointer-gating |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` | partial |

*End of Responsive-Inventory.md.*