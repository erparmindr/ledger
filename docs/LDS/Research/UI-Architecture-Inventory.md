# Ledger v2 — UI Architecture Inventory

**Type:** Research documentation (pre-LDS)
**Scope:** Current implementation only. No redesign, no code changes, no specifications.
**Method:** Static inspection of `index.html`, `css/styles.css` (1,913 lines), and all JS page/component/module files. Verified layout facts are cited with line numbers.

---

## 1. Application Layout

### 1.1 Overall shell

The application is a **single HTML page** (`index.html`) with an **SPA router**. All layout is composed in the DOM by page render functions (`js/pages/*.js`), each producing an HTML string injected into `#pageContent`. There is no framework; plain DOM strings + event wiring.

```
body[data-theme="dark"]                      ← theme attribute, default "dark"
├── .mobile-topbar                           ← hamburger + brand (hidden on desktop)
├── .sidebar-backdrop                        ← mobile drawer scrim
├── .app-shell                               ← root flex container, min-height:100vh (styles.css:125)
│   ├── .sidebar                             ← 222px fixed column, sticky, full height (styles.css:130)
│   │   ├── .brand
│   │   ├── nav#navList (.nav-item, injected by app.js)
│   │   └── .sidebar-footer (theme toggle)
│   └── .main-col                            ← flex:1, min-width:0 (styles.css:250)
│       ├── .topbar                          ← page title/subtitle + search box (styles.css:251)
│       ├── .content (#pageContent)          ← flex:1, padding:4px 30px 60px (styles.css:318)
│       ├── .fab (New transaction)           ← fixed, bottom:28 right:32, z-index:30 (styles.css:1677)
│       └── footer.app-footer                ← centered, 11px (styles.css:1693)
├── #modalRoot                               ← appended modal backdrops (modals.js)
└── #toastRoot                               ← toast container
```

### 1.2 Sidebar

- Fixed-width **222px** column; `position:sticky; top:0; height:100vh` (styles.css:130).
- Navigation is **data-driven**: `NAV_ITEMS` in `js/app.js:7` renders 8 items (Overview, Transactions, Accounts, Reports, Categories, Payees, Scheduled, Settings) into `#navList`.
- At **≤880px** the sidebar becomes a fixed off-canvas drawer (`translateX(-100%)`, z-index 50, styles.css:146) toggled by the hamburger + `.sidebar-backdrop` (z-index 40).
- Persisted page, theme, and layout mode in `localStorage` (`ledger_page`, `ledger_theme`, `ledger_layout_mode`).

### 1.3 Header

- `.topbar` is flex with `justify-content:space-between`, `padding:22px 30px`, wraps (styles.css:251).
- Left: `.page-title` + `.page-subtitle` (subtitle content is dynamic per page, `app.js:34`).
- Right: `.search-box` — shown **only** on the Transactions page (`.style.display` toggled in `app.js:56`). Contains a global search input wired to `registerFilters.search`.

### 1.4 Main content

- `.content` (`#pageContent`) is the single routing target: `flex:1; padding:var(--sp-1) 30px 60px; width:100%; margin:0 auto` (styles.css:318).
- **No max-width / container** — every page spans full remaining width; horizontal rhythm depends entirely on the 30px gutter.
- The FAB (`#newTxBtn`) is a global fixed element, hidden on the Transactions page via `.fab-hidden`.

### 1.5 Footer

- Single-line `.app-footer`: "Stored locally in this browser only · works fully offline", centered, 11px (styles.css:1693).

---

## 2. Page Inventory

All pages render into `#pageContent` via `window.Ledger.pages.render*Page()`. Per-page event wiring lives in `js/wire/*.js`.

### 2.1 Overview (`js/pages/overview.js:87`)

| Aspect | Detail |
| --- | --- |
| Layout | Vertical stack: reconciliation banner → `.acct-grid` → cash-flow metrics (`.grid-2`) → side-by-side cards → conditional cards (pending transfers / unlinked refunds) → Upcoming → Recent activity |
| Shared components | `renderTxRow` (recent activity), `.metric` cards, `.card/.card-pad/.card-header`, `.empty-state`, period pill dropdowns, `svgDonut`/`donutLegend` |
| Page-specific | `.acct-grid` (mini account tiles), `.recon-banner`, `.donut-wrap`, `.bill-row` (upcoming list), `.item-row` (pending lists) |
| Dialogs | Tx modal (edit), account modal (tile click), confirm dialogs |
| Notable inline layout | Side-by-side cards use inline `style="flex:1; min-width:280px;"` (overview.js:414-421) rather than a utility class; several `.card-pad` padding overrides; 19 inline style attrs |

### 2.2 Transactions / Register (`js/pages/register.js`, render fn + grouped list)

| Aspect | Detail |
| --- | --- |
| Layout | Toolbar (`.filters-bar`) → column headers (`.grp-col-header`) → year/month collapsible sections (`.yr-section`/`.mo-section`) of grid rows (`.grp-row`), or empty state |
| Shared components | `.filters-bar`, `.grp-row` grid, `renderTxRow` (table mode with `.show-type/.show-cat/.show-acct/.show-runbal`), `.empty-state`, upcoming banner |
| Page-specific | `grp-col-header` column model (8/9 cols desktop), month visibility ("load more months"), running-balance map, multi-select checkboxes |
| Toolbars | `.filters-bar` with 6 native selects + clear/uncategorized/auto-categorize/check-dupes/export buttons |
| Tables | `.grp-row` is a **CSS grid** (not `<table>`): `32px 110px 1fr 80px 120px 100px 100px 32px` (styles.css:1036); `.show-runbal` adds a 9th col |
| Dialogs | Tx modal (new/edit), confirm (delete/link), duplicate-check modal, date-range picker |
| Notable | Column visibility is class-driven; responsive collapse is handled by media queries redefining `.grp-row` and hiding specific columns (see §4.5, §5.6) |

### 2.3 Accounts (`js/pages/accounts.js:5`)

| Aspect | Detail |
| --- | --- |
| Layout | Net-worth banner (`#nwBanner`) → Groups section → `#cardGrid` of `.owner-group` → `.card-grid` → `.tile` cards → "Add account" → Archived card |
| Shared components | `.card/.card-pad`, `.empty-state`, kebab menu (`.kw/.km/.ki`), `icon-btn` |
| Page-specific | `.nw-banner` (per-owner net worth by currency), `.groups-section`, `.tile` account cards with `.tile-init` avatar, `.acct-mini-card` (in modal/edit flows) |
| Toolbars | No filter bar; "Add group" / "Add account" action buttons |
| Tables | None; card grid `repeat(auto-fill, minmax(180px,1fr))` (styles.css:1180) |
| Dialogs | Account modal (edit/update balance), reconcile modal, confirm (delete/archive) |
| Notable | Two distinct account-card visualizations exist: `.tile` (Accounts page) and `.acct-mini-card` (Overview `.acct-grid`) — related but separate class sets |

### 2.4 Reports (`js/pages/reports.js:487` + tab fns)

| Aspect | Detail |
| --- | --- |
| Layout | Filter card (`.filters-bar` inside `.card`) → optional upcoming banner → report card with `.report-tabs` → tab content (per-currency sections) |
| Shared components | `.filters-bar`, `.grid-3`/`.grid-2`, `.metric`, `.donut-wrap`, `.card/.card-header/.card-pad`, `.empty-state`, tab bar |
| Page-specific | `.report-tabs` (4 tabs: expense/income/transfer/refund), per-currency metric sections, `svgDonut`, `htmlBarChart`, monthly-trend cards |
| Toolbars | `.filters-bar` with 6 native selects + an **inline-styled** search input (reports.js:557) + export CSV |
| Tables | None directly; categories rendered as donut + legend, plus transaction drilldown via register |
| Dialogs | Date-range picker, confirm |
| Notable | Metric values are overridden inline (e.g. `style="font-size:16px;"` on a `.val`, reports.js:211); report tabs reuse `.metric` with different content than Overview |

### 2.5 Categories (`js/pages/categories.js:5`)

| Aspect | Detail |
| --- | --- |
| Layout | Single `.card.card-pad`: page head → `.type-pills` tab bar → `.cat-tab-content` (add-row + `.cat-list`) |
| Shared components | `.card`, `.type-pill` tabs, `icon-btn.sm` |
| Page-specific | `.cat-add-row`, `.cat-list`, `.cat-row` (parent with chevron + `.cat-row-sub` indented rows) |
| Toolbars | Type tabs only |
| Tables | `.cat-list` — flex rows with indent/chevron hierarchy (not a table) |
| Dialogs | Category rename/add-sub, delete confirm |
| Notable | Uses `.type-pill` tabs (flex, equal width) unlike `.report-tabs` (overflow-x) — two different tab visual languages |

### 2.6 Payees / People (`js/pages/people.js:5`)

| Aspect | Detail |
| --- | --- |
| Layout | Single `.card.card-pad` with `.person-card` list → optional "Pending splits" card |
| Shared components | `.card/.card-pad`, `.empty-state`, `.icon-btn`, `.avatar` |
| Page-specific | `.person-card` (name, initials avatar, balance per currency, debt items, mark-paid buttons), `.assign-pending-sel` |
| Toolbars | "+ Add person" in an inline-styled header row (people.js:84-87) |
| Dialogs | Person modal (add/edit), confirm (delete) |
| Notable | Heavy inline styling: 19 style attrs; balances use inline `font-size:10px/16px`; rows built with inline flex divs |

### 2.7 Scheduled / Recurring (`js/pages/recurring.js:13`)

| Aspect | Detail |
| --- | --- |
| Layout | Single `.card`: header → `.bill-row` list → inline add form (`.form-row`/`.field`) |
| Shared components | `.card/.card-header/.card-pad`, `.bill-row`, `.empty-state`, `.field/.form-row`, `.icon-btn` |
| Page-specific | Recurring add form (name/amount/frequency/start date/type/account/category/subcategory/post-mode radios) |
| Toolbars | None; form IS the toolbar |
| Dialogs | Confirm-to-post, delete confirm |
| Notable | 15 inline style attrs; repeated `style="margin-top:12px"` between form rows instead of a utility; `.bill-row` reused from Overview "Upcoming" |

### 2.8 Settings (`js/pages/settings.js:5`)

| Aspect | Detail |
| --- | --- |
| Layout | Stack of `.card.card-pad.section-gap` sections (Layout mode, Backup & restore, CSV import, PDF import, Demo data, Demo data status, Reset) |
| Shared components | `.card/.card-pad`, `.section-gap`, `.btn` variants, `.desktop-only` gating |
| Page-specific | Layout-mode buttons, hidden file inputs |
| Toolbars | None |
| Dialogs | Reset confirm, import flows |
| Notable | Most inline-styled markup of any page pattern: every section uses identical inline `h2` (font-size:16px) + `p.muted` (12.5px) + action row (flex/gap) blocks (19 style attrs) — a clear "settings card header" duplication |

---

## 3. Component Inventory

Reusable UI components and their consumers.

| Component | Location | Purpose | Pages using it |
| --- | --- | --- | --- |
| **App shell / router** | `js/app.js` | Nav render, page routing, theme/layout-mode, search, global listeners | All |
| **Transaction row** | `js/components/transaction-row.js` | Renders a tx as card row (`renderTxRow`) with dual output modes (compact list / table layout with columns) | Overview, Register, (Reports drilldown) |
| **Custom dropdown** | `js/components/custom-dropdown.js` | Themed `<select>` replacement (`initCustomDropdowns`, `buildItems`, `cdCreateItem`) | All forms, filters (modal + page) |
| **Date picker** | `js/components/date-picker.js` | Single date field popup | Tx/account/recurring modals |
| **Date range picker** | `js/components/date-range-picker.js` | Preset + custom range popover | Transactions, Reports |
| **Modal system** | `js/modals.js` | `openModal/openSubModal/closeModal` with stacking, focus trap, aria wiring | All |
| **Tx modal** | `js/modals/tx-modals.js` | New/edit transaction form (splits, transfers, persons) | Overview, Register, FAB |
| **Account modal** | `js/modals/account-modals.js` | New/edit account, update balance | Accounts, Overview |
| **Reconcile modal** | `js/modals/utility-modals.js` | Reconciliation flow UI | Accounts |
| **Person modal** | `js/modals/person-modal.js` | New/edit person | People, (splits) |
| **Split modal** | `js/modals/split-modals.js` | Category/person splits editor | Tx modal |
| **Group modal** | `js/modals/group-modals.js` | Owner groups CRUD | Accounts |
| **Toast** | shared (`toastRoot`) | Global feedback (`.toast`) | All (actions) |
| **Confirm dialog** | `window.Ledger.openConfirmModal` (modals.js) | Danger confirmations | All |

### CSS-level reusable primitives (used cross-page)

| Primitive | Definition | Notes |
| --- | --- | --- |
| `.card` / `.card-pad` / `.card-header` | styles.css:321-332 | Padding 22px 24px; header flex row |
| `.section-gap` / `.card-gap` | styles.css:334 | Vertical rhythm (24px) |
| `.grid-2` / `.grid-3` | styles.css:335-336 | Auto-fit min-width 240/200px grids |
| `.metric` | styles.css:346 | Money/stat cards (gradient, shadow) |
| `.filters-bar` | styles.css:858 | Toolbar strip (34px control height) |
| `.field` / `.form-row` / `.cols-3` | styles.css:715-720 | Column field + wrap row |
| `.tx-row` / `.tx-tab` / `.tx-col-header` | styles.css:786+ | Register rows + column header row |
| `.grp-row` / `.grp-col-header` | styles.css:1036+ | Register grouped grid rows |
| `.bill-row` | styles.css:1385 | Scheduled/upcoming list row |
| `.item-row` | styles.css:339 | Generic meta list row |
| `.empty-state` | styles.css:844 | Empty/zero-content block |
| `.type-pill` / `.type-pills` | styles.css:735-750 | Tab pills (equal-width) |
| `.report-tabs` | styles.css (~586 markup) | Overflow-x tab strip |
| `.cd-wrap` / `.cd-trigger` / `.cd-list` | styles.css:1698+ | Custom dropdown internals |
| `.icon-btn` | styles.css:816 AND 1888 | Icon buttons (two definitions — see §4.6) |
| `.kebab-menu` family (`.kw/.km/.ki`) | styles.css:1227 area | Row action menus (Accounts) |

---

## 4. CSS Architecture

### 4.1 Files & loading

- **Single stylesheet:** `css/styles.css` (1,913 lines), loaded once in `index.html` with cache-bust `?v=83`.
- No build step, no preprocessor (no SCSS/LESS/PostCSS), no CSS modules.
- External: Manrope font (Google Fonts) + Lucide icons (unpkg), both at runtime.
- **Service worker** (`sw.js`) caches the app; a cache-version bump is required whenever CSS changes take effect for existing users (project history shows `CACHE_NAME` bumps v116→v117 for CSS-related fixes).

### 4.2 Variables / custom properties

All design tokens are CSS custom properties on `:root` (styles.css:5-52) with a dark override block at `[data-theme="dark"]` (styles.css:54-83). Complete token set is enumerated in §5.

### 4.3 Utility classes

Very few true utilities exist. Observed set:
- Layout: `.section-gap`, `.grid-2`, `.grid-3`, `.truncate`
- Theme/gating: `.desktop-only`, `.mobile-only` (gated by `body.is-mobile`), `.num` (tabular figures), `.pos`/`.neg`, `.faint`/`.muted`
- State modifiers: `.is-filtered`, `.active`, `.open`, `.collapsed`, `.show-type/show-cat/show-acct/show-runbal`, `.border-sage`/`.border-clay`
- The system lacks generic spacing/alignment utilities (`.mb-*`, `.px-*`, `.flex`, `.flex-col`, `.gap-*`). **This gap is why pages fall back to inline styles** (see §6.3).

### 4.4 Theme system

- Dual theme via `[data-theme="dark"]` attribute on `<body>` (default `dark` in HTML; JS `applyTheme()` at `app.js:222`).
- Light tokens in `:root`, dark overrides in `[data-theme="dark"]`. Most components use only semantic tokens, so a theme swap is a pure variable change.
- Theme color mirroring to `<meta name="theme-color">` and persistence via `localStorage`.
- Dark mode has **extra tokens** light lacks (`.clay-dark-grad-*`, `.sage-dark-grad-*` gradient stops) and redefines `--shadow-card`/`--shadow-lift`/`--icon-filter`. Glow tokens (`--glow-brass*`) are defined only in light scope (dark inherits them).

### 4.5 Responsive rules

Three numeric breakpoints, all literal, no abstraction:
- `@media (max-width: 880px)` — sidebar→drawer (144), grouped-row column reduction (1112), importer preview width tuning (1566)
- `@media (max-width: 760px)` — tx-row wraps (826), filters-bar wraps (1897), modal shrink + modal padding (833-841)
- `@media (max-width: 480px)` — content/topbar padding, filters column-stack, form-row column, grp-row 4-col (1132), account grid `minmax(160px)`, modals become bottom-sheet full-screen (1910), DRP single calendar (1904)
- `@media (prefers-reduced-motion: reduce)` — global `.001ms` animation/transition override (styles.css:88)
- **Touch target rule** (styles.css:1888): `.icon-btn { min-width/min-height:44px }` applied unconditionally (not scoped to `.is-mobile` or pointer media)

### 4.6 Duplicated patterns in CSS

1. **`.icon-btn` defined twice** (styles.css:816 and styles.css:1888). The second rule adds 44px min touch sizing globally — including desktop.
2. **Native `select[data-no-cd]` (867) vs `.cd-trigger` (1704)** are near-identical controls (same chevron data-URI, padding `10px 36px 10px 14px`, border/radius/font) — the "native fallback" and "custom dropdown" duplication. The chevron SVG data-URI is repeated 4× (light+dark for both blocks).
3. **Three row primitives** — `.tx-row` (786), `.bill-row` (1385), `.item-row` (339) — all flex rows with border-bottom, but each with its own padding/font stack.
4. **Two tab systems** — `.type-pill` (735, equal-width flex) and `.report-tabs` (overflow-x strip).
5. **Two account card designs** — `.tile` (1188) and `.acct-mini-card` (1256) with overlapping semantics.
6. **`.card-pad` padding overridden inline** in many places (`padding-top:4px`, `padding:24px 20px`, etc.) rather than via responsive variants.
7. **Header/hint text patterns** repeated: `.card-header h2` (15.5px) vs inline `h2 style="font-size:16px"` in settings/people.

---

## 5. Design Token Audit

### 5.1 Spacing (styles.css:6)

| Token | Value | CSS uses | Notes |
| --- | --- | ---: | --- |
| `--sp-1` | 4px | 39 | |
| `--sp-2` | 8px | 59 | |
| `--sp-3` | 12px | 56 | |
| `--sp-4` | 16px | 28 | |
| `--sp-5` | 20px | 14 | also used in JS (5×) |
| `--sp-6` | 24px | 10 | |
| `--sp-8` | 32px | 4 | |
| `--sp-10` | 40px | 3 | |
| `--sp-12` | 48px | 1 | |

Base unit 4px; scale is **non-continuous** (no 28/36/56/64…). Common literal gaps 5/6/10/14px have **no token**.

### 5.2 Typography (styles.css:8)

| Token | Value | CSS uses | Notes |
| --- | --- | ---: | --- |
| `--text-xs` | 11px | 4 | |
| `--text-sm` | 12px | 2 | |
| `--text-base` | 13px | 8 | **body font-size is 14px (styles.css:90), not 13px — base mismatch** |
| `--text-md` | 14px | 1 | |
| `--text-lg` | 16px | 1 | |
| `--text-xl` | 20px | 1 | |
| `--text-2xl` | 24px | 2 | also in JS (1×) |
| `--text-3xl` | 32px | 1 | |
| `--font-sans` | Manrope/Helvetica | | |
| `--font-num` | Manrope (tabular) | 19 | |

Font families: Manrope via Google Fonts (weights 500-800). Money uses `--font-num` + `font-variant-numeric:tabular-nums` (repeated per component rather than a shared `.num` base).

### 5.3 Colors (styles.css:12-40 light, 55-82 dark)

- **Light:** `--bg, --surface, --surface-2, --surface-hi, --border, --border-soft, --fb-bg, --text, --text-dim, --text-faint, --text-on-brass, --brass, --brass-bright, --brass-soft, --sage, --sage-soft, --clay, --clay-soft, --blue, --blue-soft, --text-on-dark` + subtles/glows.
- **Dark:** same core names redefined + dark-gradient stops (`--clay-dark-grad-*`, `--sage-dark-grad-*`).
- Hard-coded `rgba()` colors remain inside several component blocks (shadow literals e.g. styles.css:1189 `box-shadow:0 8px 24px rgba(0,0,0,0.2)`, modal drop shadows, backdrop `rgba(8,9,13,0.6)`, toast shadow). These are elevation/shadow literals, not color tokens.

### 5.4 Radius (styles.css:10)

| Token | Value | CSS uses |
| --- | ---: |
| `--radius-sm` | 6px | 13 |
| `--radius` | 10px | 77 |
| `--radius-md` | 12px | 26 |
| `--radius-lg` | 16px | 9 |
| `--radius-xl` | 20px | 3 |
| `--radius-pill` | 50px | 9 |

Minor literal radii exist inline (e.g. `8px` in `.icon-btn`, modal sub-elements).

### 5.5 Elevation / shadows

| Token | Value |
| --- | --- |
| `--shadow-card` | soft 2-layer (light) / heavy dark (dark) |
| `--shadow-lift` | large drop (light/dark differ) |
| `--glow-brass`, `--glow-brass-inset`, `--glow-brass-sm`, `--glow-brass-pill`, `--glow-brass-pill-hover` | brass glow kit (used by primary buttons, FAB) |

Shadow **literals** remain in a handful of blocks (`.km`, `.tile:hover`, `.modal`, `.toast`, `.cd-list`) instead of tokens.

### 5.6 z-index — NO TOKEN LAYER (risk)

Stacking is scattered literals with no scale:

| Layer | Value | Location |
| --- | ---: | --- |
| Context z's | 2 / 10 / 20 | `.acct-card-*` (1239-40), `.km` menu (1227), filter/date overlays (1067) |
| FAB | 30 | styles.css:1681 |
| Sidebar drawer | 50 | styles.css:146 |
| Backdrop (drawer) | 40 | styles.css:149 |
| Custom dropdown menu | 60 (`.dp-menu` 1319), **9999** (`.cd-list` 1747) | |
| Modal backdrop | 100 | styles.css:1514 |
| Modal stack | `100 + idx` (dynamic) | `js/modals.js:44` |
| Toast | 200 | styles.css:1591 |
| Popover (date-range) | 1000 (css) / **10000** (JS) | styles.css:444; `date-range-picker.js:281` |

The 9999/10000 literals in dropdown/popover compete with the dynamic modal stack — a real future stacking hazard.

### 5.7 Animation / motion (styles.css:49-50, 88)

| Token | Value | Uses |
| --- | ---: | --- |
| `--transition-fast` | 0.15s cubic-bezier | 56 |
| `--transition-normal` | 0.2s cubic-bezier | 7 |
| Keyframes | `modal-in` (1525), `toast-in` (1595), `cd-in` (1758) | |
| Literal durations | 0.3s / 0.2s / 0.12s in a few blocks (`.tx-section`, `.cat-row-chevron`, `.pill-menu`) | |
| Reduced motion | global `.001ms` override (styles.css:88) | |

### 5.8 Breakpoints — NO TOKEN LAYER

`480`, `760`, `880` appear as literals in 11 media queries (see §4.5). No `--bp-*` variables, no media-query constants.

### 5.9 Hard-coded values bypassing tokens (summary)

**In CSS:** 222px sidebar; 30px content/topbar gutter; 38px mobile-topbar spacer; modal `max-width:800px` / `88vh` / `92vh`; FAB offsets 28/32px; `.tx-tab` 38px; filter control height 34px; a few rgba shadows/colors; literal transition durations.

**In JS inline styles (213 `style="…"` attributes total, by file):**

| File | Inline styles | File | Inline styles |
| --- | ---: | --- | ---: |
| `modals/tx-modals.js` | 23 | `pages/recurring.js` | 15 |
| `pages/reports.js` | 21 | `services/demo-status.js` | 15 |
| `services/import-preview.js` | 20 | `services/csv-import.js` | 15 |
| `pages/overview.js` | 19 | `modals/split-modals.js` | 12 |
| `pages/people.js` | 19 | `components/transaction-row.js` | 9 |
| `pages/settings.js` | 19 | `modals/account-modals.js` | 8 |
| | | `pages/register.js` | 7 |

Property distribution across those 213 attrs: `font-size` 93, `display` 50, margins (~76 incl. `margin-bottom/top/left`), `padding` (~33), `gap` 27, `align-items` 20, `justify-content` 13, `flex-wrap` 9, `flex-direction` 7, `width` 7, `height` 6, `min-width` 5, plus `border-radius`, `text-transform`, `letter-spacing`, `background`, `opacity` etc.

Notable inline font-size literals (no token): **9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 16, 18px** — 37 occurrences are fractional (`.5px`) sizes with no CSS-token equivalent. Common inline margin/padding/gap literals without tokens: 5, 6, 10, 14, 22, 26px.

---

## 6. Design Debt

Severity key: 🔴 High (architectural risk / broad blast radius) · 🟠 Medium (visible inconsistency / repeated effort) · 🟡 Low (polish).

### 6.1 z-index / stacking layering — 🔴
No z-index scale; 13+ distinct literal values incl. `9999`/`10000` that can fight the modal stack (`100 + idx`). Every new overlay re-introduces guesswork. **Fixing is low-effort, high-value** (see §7.1).

### 6.2 Inline style sprawl — 🔴
**213 inline style attributes** across 18 JS files, encoding font-size/margin/padding/flex decisions that duplicate — and sometimes contradict — tokens and classes. Compounds with the utility-class gap (§4.3). This is the single largest barrier to future LDS token adoption.

### 6.3 Duplicated row/list primitives — 🟠
`.tx-row`, `.bill-row`, `.item-row`, `.grp-row` overlap in semantics (flex row + border-bottom). Row changes require multi-point edits.

### 6.4 Duplicated control styling — 🟠
Native `select[data-no-cd]` and `.cd-trigger` share ~90% of their visual spec, plus a 4×-repeated chevron data-URI. `.icon-btn` defined twice (816/1888) with the 44px touch rule leaking to desktop.

### 6.5 Inconsistent spacing — 🟠
Literal gaps 5/6/10/14px exist alongside the token scale; content gutter is a bare `30px`; `.card-pad` is frequently overridden inline; `.section-gap` (24px) is used inconsistently vs inline margins.

### 6.6 Inconsistent typography — 🟠
Body 14px ≠ `--text-base` 13px; fractional inline sizes (9.5–13.5px) have no token; heading sizes drift (`.card-header h2` 15.5px vs inline 16px); meta-label sizes 10/10.5/11/11.5/12px all appear.

### 6.7 Inconsistent sizing — 🟡
Metric values sized differently per context (token default vs inline 16px override); `.acct-mini-card` vs `.tile` differ; icon button density differs desktop/mobile due to the unconditional 44px rule.

### 6.8 Hard-coded values — 🟡
Breakpoints (480/760/880), modal widths/heights, sidebar width, filter heights, FAB offsets, and the z-index list are all literals with no token or constant.

### 6.9 Duplicated layouts — 🟡
- Two tab systems (`.type-pill` vs `.report-tabs`).
- Two account-card designs.
- Settings' repeated inline "card section header" blocks (~7 copies of identical `h2`+`p`+action-row markup).

### 6.10 Cache/version fragility — 🟡
CSS changes need manual `?v=` bump (currently `?v=83`) + service-worker `CACHE_NAME` bump, or users see stale UI. No automation.

---

## 7. Modernization Opportunities

Architecture-only recommendations that would materially simplify LDS adoption. No visual redesign is proposed.

1. **Introduce a z-index scale token layer.** Define semantic tokens (`--z-base`, `--z-fab`, `--z-drawer`, `--z-modal`, `--z-dropdown`, `--z-toast`) and route every stacking value through them; replace the JS dynamic `100 + idx` and the `9999`/`10000` literals. Single-file, zero visual change, removes the highest-risk area.

2. **Introduce breakpoint tokens / a single responsive-constants source.** Replace `480/760/880` literals with `--bp-*` custom properties (or a constants module) so the three breakpoints are defined once.

3. **Add a small spacing/typography utility layer.** A handful of utilities (`.mt-*`, `.gap-*`, `.flex`, `.flex-col`, `.align-*`, `.text-*`, `.w-*`) would eliminate most of the 213 inline styles without any redesign — turning inline literals into token-referencing classes.

4. **Consolidate the control spec.** Extract the shared native-select/custom-dropdown visual into one definition (kill the 4× chevron duplication) and collapse the duplicate `.icon-btn` rules; scope 44px touch sizing to `.is-mobile`/coarse-pointer media so desktop density is preserved.

5. **Unify row primitives.** Define one base `.row` (flex, border-bottom) with semantic variants (`.row--tx`, `.row--bill`, `.row--meta`, `.row--grid`) so future LDS row theming is one place instead of four.

6. **Normalize `.card-pad` responsively.** One breakpoint override instead of page-level inline padding overrides (removes the `padding-top:4px`/`24px 20px` specials).

7. **Adopt JS-side token constants.** Expose spacing/type constants (`Ledger.tokens = {sp:…, text:…}`) for the template layer so JS stops emitting `12.5px`/`14px` literals; fractional sizes collapse to the scale.

8. **Align base typography.** Resolve body `14px` vs `--text-base:13px` so there is one base size (one-line change).

9. **Introduce a settings/people "card section header" component.** Replace the repeated inline `h2`+`p`+action-row blocks with one markup helper.

10. **Formalize page-frame primitives.** Add a content frame with an optional max-width and standardized `.grid` split (replacing the inline `flex:1; min-width:280px` pattern in Overview).

11. **Automate cache versioning.** Bump `sw.js CACHE_NAME` + `?v=` from the build/test step so CSS/layout changes always reach users (project already relies on manual bumps).

---

## Executive Summary

Ledger v2 has a **deliberately minimal, well-organized CSS architecture**: a single 1,913-line stylesheet, a clean `:root`/`[data-theme="dark"]` token system covering spacing, typography, color, radius, elevation, and motion, and a small set of honest reusable components (modal system, custom dropdown, transaction row, date pickers). Pages are plain template functions feeding one `#pageContent` router, with per-page wiring separated into `js/wire/*.js`.

The cost of this simplicity is that **layout decisions increasingly leak out of the stylesheet**: 213 inline styles in JS, literal px values where tokens exist, duplicated row/control primitives, and — most seriously — **no z-index scale and no breakpoint abstraction**. The token system itself is well designed but has real gaps (5/6/10/14px spacing, fractional font sizes, body 14px vs `--text-base` 13px). None of this blocks the LDS effort; the fixes below are architectural and low-risk.

## Highest-Risk Areas

1. **Stacking/z-index chaos** — `9999`/`10000` overlays vs dynamic modal stack `100+idx`; future overlay work will hit real bugs.
2. **Inline style sprawl (213 attributes)** — the primary source of drift from tokens and the biggest LDS-migration cost.
3. **Responsive column collapse** — the register's 8→6→4 column grid is hard-coded in three media queries plus class-gated header visibility; a column change breaks multiple places.

## Highest-Impact Improvements

1. **z-index scale tokens** (§7.1) — eliminates a whole bug class for near-zero effort.
2. **Spacing/typography utility layer** (§7.3) — collapses the inline-style surface area without redesign.
3. **Breakpoint tokens** (§7.2) — makes the responsive system maintainable.
4. **Control + row consolidation** (§7.4-7.5) — halves future theming work.

## Suggested Implementation Order

1. z-index scale tokens (safety)
2. Breakpoint tokens (foundation)
3. Spacing/typography utilities → inline-style reduction (biggest surface-area win)
4. Base row primitive + settings/people section-header component (duplication win)
5. `.card-pad` responsive normalization
6. JS token constants + fractional size collapse
7. Base typography alignment (14 vs 13)
8. Control consolidation (select/trigger + icon-btn/touch scoping)
9. Cache-version automation

*End of UI-Architecture-Inventory.md.*
