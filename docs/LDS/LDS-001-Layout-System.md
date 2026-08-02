# LDS-001 — Layout System (Master Specification)

**Document:** `docs/LDS/LDS-001-Layout-System.md`
**Status:** Draft for ratification · Foundational specification
**Scope:** Layout only. This is the master document every future LDS spec builds on.
**Rule:** No implementation code. No application code changes. No component redesign. This defines *contracts*, not shipping UI.

---

## 1. Purpose and Authority

LDS-001 defines how space, structure, and visual rhythm are composed across Ledger's surfaces.
It is the arbiter for:

- geometry of pages, cards, tables, forms, modals, and toolbars;
- the responsive behavior of the shell (sidebar, header, content);
- z-index ordering and stacking;
- scroll, sticky, and overflow behavior;
- alignment and visual hierarchy.

Every subsequent LDS document (Spacing/Tokens, Typography, Components, Data/Table, Forms,
Modals) shall reference this spec for layout quantities and rules rather than inventing its own.
Where a future spec appears to conflict with LDS-001, LDS-001 wins unless explicitly amended.

### Guiding principles

1. **Consistency over cleverness.** One spacing scale, one grid, few z-layers.
2. **Preserve current behavior until tokenized.** All values in `LDS-TODO` current markers map into the tokens defined here as part of ratification.
3. **Responsive by a defined set of breakpoints**, not by ad-hoc media queries.
4. **Content-first.** Content and clear hierarchy are the goal; chrome is subordinate.
5. **Accessibility baseline.** WCAG 2.5.5 (44px targets) and 1.4 (contrast) inform layout decisions.

---

## 2. Layout Philosophy

- **Fluid, content-width surfaces.** The app shell is a single-column content flow; most content sits
  inside cards on a neutral canvas. The layout provides rhythm and containment, not rigid columns
  except where explicitly defined.
- **Left-rail + content shell** is the primary desktop model.
- **Vertical rhythm** is governed by a consistent spacing scale (see §3 spacing tokens) so that
  spacing between sections, cards, and rows reads as a coherent beat.
- **Progressive disclosure:** dense data screens use a computed grid; reading/dashboard screens use
  card flow with generous spacing.
- **No "hard-coded magic numbers"** in UI when a layout behaves with the grid.

---

## 3. Radius + Spacing Tokens (baseline, ratified in LDS-002)

These values are referenced across all layout rules.

### 3.1 Spacing scale (4px base)

| Token | Value | Typical role |
|---|---|---|
| `--sp-1` | 4px | hairlines, tiny gaps |
| `--sp-2` | 8px | compact gaps, inline gutter |
| `--sp-3` | 12px | sub-item padding, control gutter |
| `--sp-4` | 16px | default component padding |
| `--sp-5` | 20px | between controls in a row |
| `--sp-6` | 24px | card inner padding, section gap (small) |
| `--sp-8` | 32px | section spacing (primary) |
| `--sp-10` | 40px | large section / page gap (desktop) |
| `--sp-12` | 48px | page top padding / hero separation |

### 3.2 Radius scale

`--radius-sm:6px`, `--radius:10px`, `--radius-md:12px`, `--radius-lg:16px`, `--radius-xl:20px`, `--radius-pill:50px`.

### 3.3 Typography (reference since rhythm/line-height affects layout)

`--text-xs:11px`, `--text-sm:12px`, `--text-base:13px`, `--text-md:14px`, `--text-lg:16px`, `--text-xl:20px`, `--text-2xl:24px`, `--text-3xl:32px`.

> The full type system (weights, line-height, tracking) is LDS-002. Layout only uses these sizes for intrinsic sizing approximations.

---

## 4. Default content + Box Model Contract

- Every layout-facing rule uses `box-sizing: border-box`.
- Root follows `:root` tokens; the app shell is explicit block layout.
- Flows default to `display: flex` (with `flex-wrap` where collapse needed) or block for text.
- Grids are defined with `display: grid` using **named template columns** rather than positional
  hacks where maintainable.

Container rule:

```
container(main) = min(100% - (2 * page-h-pad), max-content-width)
```

where `page-h-pad` and `max-content-width` are tokens (see §5 Layout Tiers and §9 Max content width).

---

## 5. Page Tiers & Their Containers

| Tier | Container element | Default inner pad | Max content width |
|---|---|---|---|
| Page | `.content` | `--sp-5` desktop, `--sp-4` mobile | `var(--content-max)` (default 1280px) |
| Card | `.card` | `--sp-6` | — |
| Section | `.section` / `section-gap` | inherits card | — |
| Modal | `.modal` | `--sp-6` (tier-dependent) | see §Modal tiers |

`--content-max-width` default: **1280px**. Page content is centered when viewport exceeds it.

---

## 5. Desktop, Tablet, Mobile Grids

### 5.1 Desktop (≥1200px)

- **Shell:** `.app-shell` = sidebar rail (fixed width token, default `--sidebar-width:222px`) + content at flex `1`.
- **Content grid:** `grid-template-columns: repeat(auto-fit, minmax(var(--col-min, 240px), 1fr))` for card flows; dashboard emphasis-grids use `.grid-2`/`.grid-3` (two/three equal tracks) as present today.
- **Row gaps:** `--sp-5`? vertically between primary items; horizontal `--sp-5`.
- **Data grid (register):** 6-track layout: `[check] [date] [desc] [type/cat/acct] [amount] [runbal/actions]`, with optional show/hide columns. Column hiding must be explicit (`.show-*`), **not positional `nth-child`** (see §5.6).

### 5.2 Tablet (760–1199px) — breakpoint `--bp-tablet: 880px`?

The sidebar collapses:

- **Breakpoint `880px`** is the collapse/media point for the sidebar and shell (side rail → overlay). This is the `--bp-tablet` marker (LDS-TODO #2.
- On-screen stabilizer: at ≤880px, `.sidebar` becomes a fixed overlay drawer (see §7 Sidebar).
- `.grid-3` collapses to `.grid-2`; `.grid-2` wraps to single column.

### 5.3 Mobile (≤ 870px entity)

- Cap content pad to `--sp-4`.
- Toolbars wrap; all form rows collapse to single column (see §15 and §17).
- Data grids drop optional columns (see §12 and §5.5).

**Implemented point (current, informational):** the product today uses `@media (max-width: 880px)` for shell collapse and `@media (max-width: 480px)` for tiny-screen column drops. These become the ratified tokens `--bp-*` below, but existing selectors are not moved in this doc.

### 5.4 Breakpoints (ratified tokens)

| Token | Value | Meaning |
|---|---|---|
| `--bp-mobile` | 480px | tiny screens: hide optional columns; stack grids |
| `--bp-sm` | 610px | forms collapse |
| `--bp-tablet` | 880px | sidebar collapses to overlay; 2-col grids |
| `--bp-desktop` | 1200px | full rail + desktop grid |

Media queries should use these tokens (or inline equivalents pending CSS variables in media queries).

### 5.5 Data/registered column drop rules

- Optional columns (Type, Category, Account, Running balance) are hidden by **explicit state classes** (`.show-type`, `.show-cat`, `.show-acct`, `.show-runbal`) and/or their responsive column config.
- **Forbidden:** hiding via `:nth-child`/fixed child indices in header cells—those index the header child sequence and silently break if header order changes. Use the column-visible class contract.

(see `LDS-TODO:` comments currently in `styles.css` at the `grp-col-header span:nth-child(…)` rules—those are flagged for replacement.)

---

## 6. Max Content Width

- Token: `--content-max-width: 1280px`.
- Page content centers via `margin-inline:auto` inside `.content`.
- Data-dense pages (register, reports) may use `--content-max-width--dense: 1440px` to reduce wasted horizontal space, but this must be an explicit token, not a hard-coded number.

---

## 7. Sidebar Behavior

- **Desktop:** static rail, `width: var(--sidebar-width,222px)`, full height, not scrollable on mobile (only content). Sticky in place when page scrolls because it's part of `.app-shell` block layout.
- **Tablet/mobile (breakpoint):** becomes a fixed overlay drawer:
  - `position: fixed; inset: 0 0 0 auto` (or `left:0` per current pattern), `z-index` overlays content but below modal stack.
  - Opens with a `.sidebar-backdrop`; body scroll locked while open.
- **Collapse behavior is token-driven**; the current hard-coded `222px` and `z-index:50` get `LDS-TODO` token names (`--sidebar-width`, `--z-sidebar`).

---

## 8. Header Layout

- **App topbar** spans content width, floating above content with `sticky: top` and a `z-index`.
- Contains: menu/nav control (mobile), brand, global actions/search, user/personal controls; a top-right actions cluster.
- **Page header** = title (`h1`-style) + optional subtitle + primary action row (right). Uses `section` gap from the content.
- `.topbar` heal is part of the shell; when scrolled, remains pinned (sticky) above content stacking.

---

## 9. Page Spacing

- **Top spacing** from `topbar` to first content: `--sp-10` desktop, `--sp-8` mobile.
- **Horizontal page padding**: `--sp-5` desktop, `--sp-4` mobile.
- **Between sibling sections**: `--sp-8` (`.section-gap`).
- **First/last margin normalization**: no margin on first/last child of a flow (`:first-child` margin-top:0, `:last-child` margin-bottom:0 patterns preserved).

---

## 10. Card & Section Spacing

- **Card:** `padding: var(--sp-6)`; radius `var(--radius-md)`; outer `gap` between stacked cards `--sp-5`.
- **`.card-header`**: flex row; `h2` + (hint / period pill / actions) at baseline; a `.card-header-right` cluster; `padding-bottom: var(--sp-3)`.
- **`.card-pad`** modifiers: `padding-top`/`padding-bottom` adjustments are allowed and token-driven (only when semantically needed, documented).
- **Section (`section-gap`)**: container gap: `var(--sp-8)` vertical between card/sections; the two-col content blocks use `--sp-5` horizontal gutter + `flex-wrap`.

---

## 11. Section Spacing

- Sections are `--sp-8` apart (e.g., 32px).
- Within a card, subsections are separated by `row-gap: var(--sp-5)`, or a `---hairline` (border-bottom) for hierarchies.
- Reduction at mobile: sections use `--sp-6` (24px) vertical gap.

---

## 12. Table Layout

- **Grid-driven tables** (`.grp-col-header` + `.grp-row`) use an explicit set of grid columns; no `<table>` semantics—it's "grid" of cells (the row is a `display:grid`/`flex`).
- **Column contract:** `[check] [date] [desc] [category] [account] [amount] [run/actions]` with per-column width tokens (`grp-col-*` replaced with real column-width tokens on ratification.
- **Row layout:** `display:grid; grid-template-columns: ...; gap: var(--sp-2); align-items:center; padding: var(--sp-2) var(--sp-3)`.
- **Column hiding:** by state classes, not by index (see §5.5).
- **Sticky header concept:** `thead`/header row sticky under the sticky app bar (see §20).
- **Empty-state is the 0-row case**: when no rows, render `.empty-state` (see §16) instead of an empty header+dummy row.

---

## 13. Modal Sizing Tiers

Modal size tiers are defined via `--modal-width-*` tokens:

| Tier | Token | Purpose |
|---|---|---|
| S | `--modal-sm: 360px` | quick confirm / small prompt |
| M | `--modal-md: 460px` | standard edit forms (tx, account, category, person) |
| L | `--modal-lg: 620px` | split forms, larger editing surfaces |
| XL | `--modal-xl: 820px` | complex multi-pane surfaces |

Rules:
- Modals are **centered** (flex overlay), `max-height: calc(100vh - var(--sp-10))`, content scrolls (`overflow-y:auto`).
- On mobile (`≤ --bp-sm`), max width = `calc(100vw - 32px)`; never full-bleed unless explicitly a "sheet".
- `.modal-head` = tier-consistent header with title + close (the `modalHead()` produced markup).

---

## 14. Form Layout

- Form rows use `display:flex; gap: --sp-5; flex-wrap: wrap`. Groups of fields inside `.form-row`.
- Field columns:
  - `cols-3` (three equal fields) on desktop,
  - `cols-2` mid,
  - single column `<= 610px`.
- **Label** above input (stack layout) is the rule; label + input with `gap:4px` and `font-sm`.
- Two action bands: `.modal-foot` (right-aligned primary) and page-level forms (left/space-between).
- `field` groups: margin `--sp-3` spacing mid between; a last child margin 0.
- Row spacing same spacing scale.

---

## 15. Toolbar Layout

- `.filters-bar` / toolbar: `display:flex; align-items:center; gap: var(--sp-3); flex-wrap:wrap; margin-bottom: var(--sp-4)`.
- Filters are pills/selects; active filter adds `is-filtered` (see `filteredCls()`).
- On `<= --bp-sm`, the toolbar wraps to full width; controls flex `1 1 auto` and buttons `flex:0 0 auto`.
- Right-most primary action uses `margin-left:auto` (or via grid alignment) for correct side.

---

## 16. Empty States

- `.empty-state`: `text-align:center; padding: var(--sp-8) var(--sp-6); color: var(--text-dim)`.
- Content order: optional `.empty-icon` (round), `.big` (title, `--text-lg`, weight 800), `.desc`, optional `.tip` (faint), optional `.cta` (button row).
- **Metric vs table empty:** table/data empty returns the empty-state (structured). Dashboard empties (`All clear`, recent) use same structure.
- Centering: horizontally centered within its container; `.empty-cta` is a flex, wrapped, gap-sm row.

---

## 17. Responsive Breakpoints

Summarized here (canonical from §5.4):

1. `--bp-mobile` @ 480px — drop optional columns; collapse grids.
2. `--bp-sm` @ 610px — single-col forms; toolbar full width.
3. `--bp-tablet` @ 880px — sidebar → overlay; 2-col; modal small.
4. `--bp-desktop` @ 1200px — full rail layout.

Rules are **very hardest part**: prefer a mobile-first rise where possible but these are fallbacks documented unific for co.

---

## 12 (second). Z-index Scale

The z-index is a explicit scale token stack:

| Layer | Token | Value |
|---|---|---|
| base | `--z-0` | 0 |
| sticky/rail | `--z-sticky` | 10 |
| custom dropdown/date popovers | `--z-dropdown` | 1000 |
| sidebar overlay / backdrop | `--z-overlay` | 40–50 |
| tooltip | `--z-tooltip` | 900 |
| modal backdrop | `--z-backdrop` | 2000 |
| modal | `--z-modal` | 3000 |
| modal sheet top | `--z-modal-top` | 4000 |
| toast | `--z-toast` | 5000 |

- Use tokens, not raw numbers.
- Current hard-coded values (e.g., dropdown `1000`, sidebar `50`, fab `30`) receive token aliases in LDS-002 and get the fence: **do not use brand-new z-values**; reuse smallest sufficient.

---

## 20–21. Sticky Elements + Scroll Behavior

### Scroll behavior
- `.safe-scroll` allowed **only** within scroll (") containers: modal bodies, dropdown lists, table body, long forms.
- Default page body scroll is normal full-page scroll.
- `overflow` rules (see §24.) set the scroll contexts.

### Sticky elements
- **App topbar:** `position: sticky; top:0; z-index: --z-sticky`.
- **Data table header (inside a scroll container):** `position: sticky; top: 0` within the table scroll container; must be the first grid row.
- **Sidebar** is not sticky on desktop layout (it's full-height block), but pinned via `inset:0` in overlay mode.
- Preserve scroll-position determinism: sticky must be within a dedicated scroll parent.

---

## 24. Overflow Rules

- **Page**: `overflow-x: hidden` on body prevent horizontal scroll; content allowed vertical scroll.
- **Cards**: `overflow: visible` by default; virtual values must be capped with `max-height` + internal scroll.
- **Tables**: horizontal overflow handled by the grid `min-width` + `overflow-x:auto` at container when a column set exceeds, or column drop.
- **Modals**: `overflow-y:auto` on the modal body, `overflow:hidden` on the backdrop.
- **Dropdowns/popovers**: `position:absolute; overflow:visible;` clipped by ancestor if `overflow:hidden` ancestor—avoid clip by setting them outside the clip container (portal) or use scroll positions.

---

## 23. Alignment Rules

- **Vertical baseline** (numeric) uses `font-variant-numeric: tabular-nums` for amounts across tables/register(`.num` class). Numbers right-aligned; labels left.
- **Flex containers** default `align-items:center` unless full-height stretch; `justify-content` only toward a stated edge.
- **In a label/value pair**, label follow value-below by row; numeric values use the `.num` right alignment.
- **Butt n header row**: column header labels match column alignment of cells (amount right, text left).

---

## 22. Visual Hierarchy

Ordered approach for any doc-level content:

1. **Prose/majors** — `h1`–`h3`, spacing removed.
2. **Semantic color-encoding** used sparingly (`.pos`/`.neg`, `.num`).
3. **Consistent density** — a single pad scale controls all whitespace so hierarchy emerges from type scale + alignment, not random spacing.
4. **Focus & touch targets** at 44px interactive for reachable chrome.

---

## 25. Other Layout Rules Not Yet Local (to fold into this doc)

- flex `gap` values are the spacing token values only.
- `minmax()` column calculations use tokens only (`--col-min`, `--content-max-width`).

---

## 26. Migration Gateway (for ratification)

Designs ratifying this spec commit to the following mechanical transitions, **in a later implementation phase, not now**:

1. Replace hard-coded numbers with the tokens signaled by `LDS-TODO`.
2. Replace `.grp-col-header span:nth-child(…)` hiding with explicit column classes.
3. Move `@media (max-width: …)` literals onto the token breakpoints above.
4. Adopt `.show-*` contract for optional data columns.

Until that phase, existing selectors/styles operate as-is; this document is the **target contract**.

---

## 27. Update → Version History / Ownership

Each new LDS doc must:

- state it conforms to LDS-001;
- list its own tokens to be added to the token map (LDS-002);
- be reviewed for layout/zig against this spec.

Suggested ownership: one maintainer owns "layout contract" sign-off on all specs.

---

## Appendix A — Salient checklist for implementers

- No raw pixel spacing outside the scale or tokens.
- Every z-index a token; every breakpoint a token.
- Data columns hidden by class, never by child index.
- Modals sized by tier tokens; content scrolls internally.
- Empty state used for 0-row data; sticky only over a scroll parent.
- Modal/sidebar z-below top toast; no brand-new values.

---
*End of LDS-001 Layout System.*