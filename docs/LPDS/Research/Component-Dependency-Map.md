# Component Dependency Map — Current Implementation

**Type:** Research (not an LPDS specification)
**Purpose:** Map which layout-bearing components exist, what classes drive them, and which pages depend on each. Input for LPDS-001 to decide what to formalize (and where to add regression hooks).

Counts = occurrence of the string in each `js/pages/*.js`.

---

# 1. Layout-bearing components inventory

| Component | CSS anchor | Used by pages |
| --- | --- | --- |
| **Shell/drawer** | `.app-shell`, `.sidebar`, `.mobile-topbar`, `.sidebar-backdrop` | all (index.html, not per-page) |
| **Topbar** | `.topbar`, `.page-title`, `.page-subtitle`, `.search-box` | all (index.html) |
| **Metric card** | `.metric`, `.metric-inner`, `.metric-label`, `.metric-value`, `.metric-change` | overview, reports (register lists) |
| **Generic card** | `.card`, `.card-pad`, `.card-header` | all |
| **Register row grid** | `.grp-row`, `.grp-col-header`, `.mo-section`, `.yr-section` | register, recurring |
| **Transaction row** | `.tx-row`, `.tx-tab`, `.tx-main`, `.tx-meta`, `.tx-amt`, `.tx-runbal`, `.rowactions` | register, all (tx list) |
| **Account tile grid** | `#cardGrid`, `.owner-group`, `.card-grid`, `.acct-mini-card`, `.tile` | accounts |
| **Filter bar** | `.filters`, `.filters-bar`, pill `.filter-pill` | register, reports |
| **Tab bar** | `.tab`, `.tabs`, `.tab-group` | categories, reports, settings, register |
| **FAB** | `.fab`, `.fab-spacer` | page (new tx) |
| **Modal** | `.modal`, `.modal-backdrop`, `.modal-head`, `.modal-body`, `.modal-foot` | modalRoot (all) |
| **Dropdown** | `.dropdown`, custom `buildItems`, `.dp-menu` | accounts/recurring (custom) |
| **Context menu / toast** | `.toast`, `.ctx-menu` | toastRoot/global |

(*fragment partially auto-extracted; confirm exact classes in step "Page → component usage"*)

---

---

# 2. Page → component usage (from static scan; counts = string occurrences)

| Page | card | card-header | filters-bar | empty-state | grid-2/3 | section-gap | item-row | metric | donut | upcoming | tab |
| --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| overview.js | 17 | 6 | – | 4 | 1 | 6 | 6 | ~ | 7 | 8 | – |
| register.js | – | – | 2 | 2 | – | – | – | – | – | 9 | 2 |
| reports.js | 15 | 8 | 5 | 5 | grid-3×4 | 12 | – | 12 | 31 | 6 | 21 |
| accounts.js | 5 | – | 1 | – | 2 (grid) | 1 | – | – | – | – | – |
| recurring.js | 4 | 1 | 1 | – | – | – | – | – | – | – | – |
| categories.js | 1 | – | – | – | – | – | – | – | – | – | 12 |
| people.js | 2 | – | 1 | – | – | 1 | – | – | – | – | – |
| settings.js | 7 | – | – | – | – | 6 | – | – | – | – | 1 |

**Read-outs from the counts:**
- **Metric/donut** is report-centric: reports has 12 metric refs + 31 donut refs (donut charts), overview has 7 donut + metric driven. Register drives the `grp-row` grid.
- **`.tab`** dominates reports (21) and categories (12) — these are tab-heavy layouts.
- **`.card-header`** is the main heading primitive for carded pages (overview 6, reports 8).
- **`.empty-state`** everywhere (register/reports highest) — needs consistent responsive treatment.
- **`.section-gap`** (vertical rhythm) is central to reports (12) and overview (6) — a token-backed spacing to formalize.
- Categories relies on **`grp-row`-style tab + nested list**; simply nested, no table grid.

---

# 3. Non-page components (shared, single source)

| Component | File | Affects layout |
| --- | --- | --- |
| nav injection | `js/app.js` | shell sidebar |
| toast | `js/ui.js`/shared toaster | toast positioning |
| custom dropdown | `js/components/custom-dropdown.js` | anchor width (`min-width:280px`), `.dp-menu` calc |
| date/number inputs | `js/ui.js` date/num | form field sizing |
| `tx-row` render | `js/pages/*.js` buildTxRow | shared tx row (uses layout classes) |
| account card grid | `js/pages/accounts.js` | `#cardGrid` + `.owner-group` + `.card-grid` |
| calendar range | `js/... range` | `.dp-grid` grid (7 cols) / range 4 cols |

---

# 4. Dependency graph (high level)

```
app-shell/ topbar/ content/ footer            (index.html, static)
   ├─ Sidebar/nav   ← nav.js
   ├─ #pageContent  ← page router renders page module
   │     ├─ Overview  → metrics, cardGrid(grid-2), tx-row, empty-state
   │     ├─ Register  → filters, tabs, grp-row(8col) sections, tx-row
   │     ├─ Accounts  → accordion owner-group > card-grid > acct tiles
   │     ├─ Reports   → metric cards, grid-3 cards, charts, tabs
   │     ├─ People / Recurring / Categories / Settings
   └─ modalRoot/#toastRoot ← shared modal + dropdown
```

**Coupling to watch:**
- `grp-row` grid definitions are in the **register** CSS but reused by recurring; a columns change must keep `nth-child` header rules in sync (see Responsive-Inventory §3).
- Modal/dropdown/toast are **global shared chrome**; their z-index/stacking is the only cross-layer coupling (see Layout-Tokens).
- Split-desktop account cards reuse `.tile`/`.radius-md` (tokens), but overall width depends on `.card-grid repeat(auto-fill)` metric (180px).
- Plans: `sw.js` cache versioning must be bumped when CSS changes (layout work will land a new cache w → both CSS / token changes) v116→v117 currently.

---

# 5. "New layout touchpoints" to formalize

| Component | Formalization target |
| --- | --- |
| Panel/section gap | free variable → push to `--sp` token |
| Row/column breakpoint | hardcoded 880/760/480 → `--bp-*` or struct |
| Modal sizing tiers | base 800 / calc / fullscreen → `--modal-width-*`? |
| Card padding | `.card-pad 22px` etc. → token variable |
| Inline by-passes | the 37 `.5px` font sizes + literal margins/padding → tokens |

*End of Component-Dependency-Map.md.*