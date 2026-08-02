# Layout Inventory — Current Implementation

**Type:** Research (not an LPDS specification)
**Date:** (working doc)
**Method:** Static source inspection of `index.html`, `css/styles.css`, and page/component JS.
**Purpose:** Establish ground truth about the existing layout so LPDS-001 (Layout System) can be written against real implementation details.

---

# 1. Global Layout

## 1.1 Document structure (`index.html`)

```
body[data-theme="dark"]
├── .mobile-topbar            (hamburger + brand; hidden on desktop)
├── .sidebar-backdrop          (mobile drawer scrim)
├── .app-shell                 (root flex container)
│   ├── .sidebar (aside#sidebar)
│   │   ├── .brand
│   │   ├── .nav-list (#navList)      — nav injected by JS
│   │   └── .sidebar-footer           — theme toggle
│   └── .main-col
│       ├── .topbar
│       │   ├── .page-title / .page-subtitle
│       │   └── .topbar-actions > .search-box
│       ├── .content (#pageContent)   — per-page rendered container
│       ├── .btn.btn-primary.fab (#newTxBtn)
│       └── .app-footer
├── #modalRoot
└── #toastRoot
```

## 1.2 App shell

| Area | Rule | Source |
| --- | --- | --- |
| `.app-shell` | `display:flex; min-height:100vh` | styles.css:125 |
| `.sidebar` | `width:222px; flex-shrink:0; position:sticky; top:0; height:100vh; padding:22px 0; flex column` | styles.css:130 |
| `.main-col` | `flex:1; min-width:0; flex column` | styles.css:250 |
| `.topbar` | `display:flex; space-between; padding:22px 30px; flex-wrap:wrap` | styles.css:251 |
| `.content` | `flex:1; padding:var(--sp-1) 30px 60px; width:100%; margin:0 auto` | styles.css:318 |
| `.app-footer` | centered, `padding:18px 0 6px` | styles.css:1693 |
| `.fab` | `position:fixed; bottom:28px; right:32px; z-index:30` | styles.css:1677 |

**Notes**
- `.content` has **no max-width** — pages span the full remaining width.
- Horizontal gutter is the literal `30px` (not a token; `--sp-8` is 32px).
- **No dedicated top-level `.container` / page-frame wrapper** exists; each page composes its own card grid inside `.content`.
- Mobile drawer: `.sidebar` becomes `position:fixed; translateX(-100%)` at `≤880px` (styles.css:144).

---

# 2. Page Layout

|Page|Primary structure|Grid used|
| --- | --- | --- |
| Overview | metric cards row → 2-col cards → recent items | `.grid-2` (`auto-fit,minmax(240px,1fr)`); `#cardGrid` (flex column, `gap:var(--sp-6)`) |
| Register | filters toolbar → year/month sections → grouped rows | CSS grid `.grp-row` (8 cols) |
| Accounts | owner groups → `.card-grid` (`auto-fill,minmax(180px,1fr)`) of `.acct-mini-card` tiles | `repeat(auto-fill,…)` |
| Reports | filter bar + tab bar → metric cards → 2-col card grids (`document/grid-3`)| `.grid-3`, `.grid-2` |
| People | toolbar → list card (`item-row`s | flex |
| Recurring | `.field`/`.form-row` add form + table/list card | flex row forms |
| Categories | tab bar → nested category list | flex list + indents |
| Settings | stacked cards of forms; `.section-gap` | flex column |

- No per-page horizontal margin wrapper; all pages rely on `.content` padding.
- Section separation uses `.section-gap` = `margin-top:var(--sp-6)`.
- Vertical rhythm between cards is inconsistent: `#cardGrid` uses `gap:var(--sp-6)` (24px) on Overview; Accounts uses `gap:10`; Reports stacks via `.section-gap`.

---

# 3. Grid System

CSS Grid is used for three purposes only:

**Integer content grids**
- `.grid-3` `repeat(auto-fit, minmax(200px,1fr))`, gap `--sp-4` (styles.css:335)
- `.grid-2` `repeat(auto-fit, minmax(240px,1fr))`, gap `--sp-4` (styles.css:336)
- `.owner-group .card-grid` `repeat(auto-fill, minmax(180px,1fr))`, gap 10px (styles.css:1180)

**Fixed table grids** (register)
- `.grp-row` / `.grp-col-header`: `32px 110px 1fr 80px 120px 100px 100px 32px` (styles.css:1036,1088)
- `.grp-col-header.show-runbal`: `… 100px 100px 100px 32px` (styles.css:1093)
- Responsive re-definitions: 880px `minmax(60px,auto) 1fr minmax(80px,120px) minmax(70px,100px) minmax(80px,110px) 28px`; 480px 4-col (styles.css:1113,1133)

**Micro grids**
- `.dp-grid`: `repeat(7,1fr)` date picker (styles.css:484)
- `grid-area` for calendar range picker: `repeat(4,1fr)` (styles.css:621)

**Breadth:** Flexbox is the dominant layout mechanism (rows, bars, toolbars); grid reserved for card columns and the register grid. No 12/16-column responsive grid system exists.

---

# 4. Cards

| Class | Padding | Border-radius | Shadow | Fill |
| --- | --- | --- | --- | --- |
| `.card-pad` | `22px var(--sp-6)` | (inherits) | (none default) | surface |
| `.card-header` | `14px 18px` | – | – | – |
| `.metric` | `18px var(--sp-5)` | `--radius` (10px) | `--shadow-card` | surface→surface-2 gradient |
| `.acct-mini-card`/`.tile` | `padding:14px` | `--radius-md`/`--radius-lg` | lifted | surface gradient |
| `.tile` | `14px` | `--radius-md` | lifted | gradient |

**Card spacing:** Overview `.earn-card` gap `--sp-6`; owner-group card grids gap 10px; section gaps via `.section-gap`/`.card-gap`.

---

# 5. Tables / Lists

The app does **not** use HTML `<table>` for register data (only CSV preview at `csv-import.js:134`).

- **Standard list:** `.tx-row` is flex (`gap:14px; padding:13px 18px`) with `.tx-tab` (38px bubble), `.main{desc,meta}`, `.amt`, optional `.runbal`, `.rowactions` (styles.css:786).
- **Table-layout mode:** `.tx-row.show-type` with fixed-width columns `.col-date(120) .col-desc(flex:1) .col-type(140) .col-cat(130) .col-acct(100) .col-amt(140) .col-runbal(100)` and a matching `.tx-col-header` toolbar (styles.css:947-981).
- **Grouped rows:** `.grp-row` (grid, 8 cols) with `.grp-col-header`; year/month collapsible sections (`.yr-section`, `.mo-section`).
- **Header size:** `.tx-col-header` `padding:10px 18px`, uppercase 10.5px (styles.css:948).
- **Row sizing:** `.tx-row` `padding:13px 18px`; `.grp-row` `padding:9px 18px`; hover states on both.
- **Sticky headers:** None currently (no `position:sticky` on any table/card header).
- **Scroll behavior:** grouped `.yr-body`/`.mo-body` animate `max-height` for collapse; no horizontal scroll utility except `overflow-x:auto` on `.report-tabs`. Long descs use ellipsis.

---

# 6. Forms

- **Layout:** `.field` is a flex column (`display:flex;flex-direction:column;gap:var(--sp-2)`) with uppercase label (styles.css:715). `.form-row` is flex with `flex-wrap:wrap`; children `flex:1; min-width:140px` (styles.css:718-720); `.cols-3` min-width 120px.
- **Label alignment:** labels sit above inputs (column layout), not left-aligned; search/toolbar controls are left-inline.
- **Input spacing:** inputs/date fields `padding:10px 14px`, radius `--radius-md` (styles.css:386).
- **Buttons:** `.btn` `padding:10px 18px`; `.btn-sm` `6px var(--sp-3)`; form footers right-aligned (`.modal-foot` flex, `justify-content:flex-end`).
- **Modal widths:** base `.modal` `max-width:800px; width:100%; max-height:88vh` (styles.css:1518). Mobile: ≤760 `calc(100vw - 32px)`; ≤480 fullscreen `width:100vw` bottom-sheet.

---

# 7. Key Measurements Reference (current, non-token)

| Value | Where |
| --- | --- |
| 222px | sidebar width |
| 30px | `.content` / `.topbar` horizontal padding |
| 300px / min 210px | topbar `.search-box` |
| 800px | modal max width |
| 88vh / 92vh | modal max height (desktop/mobile) |
| 38px, 34px | icon-btn / filter control heights |
| 32px / 36px | `.dp-day` / `.tx-tab` squares |

*End of Layout-Inventory.md.*