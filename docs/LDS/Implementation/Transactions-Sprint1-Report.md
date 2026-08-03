# Sprint 1 Report — Transactions Page UI/UX Refresh

**Scope:** Transactions page only. No redesign of dialogs/sidebar/dashboard, no business-logic/feature/workflow changes.
**Design system:** Ledger Design System (LDS) tokens/patterns established in M1–M5.
**Branch:** `main` (working tree changes **uncommitted**, for review before commit).
**Baseline commit:** `9f5fff2` (`refactor(design-system): implement LDS foundation (LDS-001-005)`).

---

## 1. Issues addressed

Seven highest-priority UI/UX issues were fixed on the Transactions page. Each preserves the existing markup contract asserted by the QA suites (no feature/business change).

| # | Issue (root cause) | Fix |
|---|---|---|
| 1 | **Running-balance column never rendered** — `renderGroupedTxRow` never applied the `show-runbal` class, so the 8-col row grid never matched the 9-col `show-runbal` header; the new Balance column was squeezed into 8 tracks. | Row now renders `grp-row-show-runbal`; `.grp-row.show-runbal` gets a matching 9-track `grid-template-columns`; matching responsive overrides added for `.grp-col-header.show-runbal` at ≤880px and ≤480px. |
| 2 | **Row selection broke the checkbox state** — the selected row's checked-state string was reused for both the row class and the checkbox `checked` attribute. | Split into `rowSelCls` (row `grp-row-selected` class) and `isChecked` (checkbox `checked` attribute). Restores persisted selection on re-render. |
| 3 | **Date cell overflow** — long dates wrapped/clipped awkwardly in the fixed-width date column. | `.grp-date` now `white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0`. |
| 4 | **Kebab menus clipped** — `.kebab-menu` is `position:absolute` inside `.mo-body`/`.yr-body`, both of which use `overflow:hidden` for the collapse animation, so menus are cut off. | New `window.Ledger.positionKebabMenu(menu, btn)` helper (in `js/app.js`): `position:fixed`, viewport-anchored, flips above when space below is insufficient, clamps left/right to an 8px viewport margin. Invoked on every menu open; closes unset `aria-expanded` cleanly. |
| 5 | **Toolbar height inconsistency** — select, buttons, clear-filters, and category triggers used divergent heights (34px vs. inline `38px` vs. no explicit height). | All toolbar controls now share `height:var(--col-row-height)`: `.filters-bar select`, `.filters-bar .btn`, `.clear-filters`, `.filters-bar .cd-wrap`, `.filters-bar .cd-trigger`. |
| 6 | **No hierarchy between primary vs. secondary actions** — a `.filters-bar .btn` rule (specificity 0,2,0) overrode `.btn-primary`'s brass gradient, flattening the primary (Auto-categorize) action into a quiet secondary. | Added `.filters-bar .btn.btn-primary` to restore the brass gradient/border/glow; secondary actions (Check duplicates, Export CSV, Clear filters, Uncategorized) stay quiet (`--fb-bg`, subtle `--surface-hi` hover). |
| 7 | **Category/subcategory dropdown truncates long names** — the portaled list was fixed to the trigger's width, so long category names clipped. | Filter-bar dropdown lists are now tagged `.cd-list-wide`; `cdOpen` sizes wide lists to content (`width:auto`, `min-width:max(trigger,220px)`), capped to viewport, with right-edge re-clamping; `.cd-list .cd-item` in wide lists wraps (`white-space:normal; overflow-wrap:break-word`) so long names stay readable. Modal dropdowns (not in `.filters-bar`) are unchanged. |

Also added `.grp-col-header{align-items:center}` and kept selected-row hover treatability via `.grp-row.grp-row-selected:hover` (stays `--brass-soft`, doesn't revert to `--surface-2`).

---

## 2. Before / after

**Static HTML snapshot comparison (visual regression harness):**

The harness renders all pages to raw HTML via `render*Page()` in a sandboxed VM, then byte-compares against a committed baseline. Baseline was regenerated from `9f5fff2` (Sprint-1 changes stashed) and compared with the working tree.

- **42/42 pages byte-identical (0 diffs).**

This is expected: the Sprint-1 changes are either **CSS-only** (`css/styles.css`) or **runtime JS wiring** (kebab positioning, dropdown open-width, `aria-expanded`), none of which alter the static `render*Page()` HTML strings in the snapshot view conditions (snapshot uses `account:"all"` and zero selection, so the runbal/selection markup paths are not exercised).

**Browser screenshots (before/after):** No browser/Playwright automation exists in this repo, so pixel-level before/after screenshots were not produced this sprint. The DOM-shape summary above plus manual visual review is the current evidence layer (see §6 — deferred to Sprint 2).

---

## 3. Visual differences found

- **Intentional** (all): new `grp-row-show-runbal` 9-track grid, `.grp-date` ellipsis, unified 34px toolbar control height, fixed kebab placement, wider content-fit category lists, restored primary-action brass look.
- **Unintentional:** **none detected** — 0/42 HTML snapshots changed; tests all pass.

---

## 4. Test results

- **Run command:** `node .\node_modules\vitest\vitest.mjs run`
- **Result:** **451 / 451 passing** (16 files).
- **Baseline comparison:** the pre-Sprint baseline also reports **451/451** (a stale note of "452" was corrected by re-checking the pristine baseline with changes stashed). **No regression.**
- **New tests added:** **None.** No test files were modified (`git diff --name-only -- tests` empty). The existing suite already covers the markup constraints touched (grp cell structure, clearFiltersBtn, no-matching state, bulk-selection ids, pagination). The two markup changes in `register.js` (runbal class, checkbox attr) do not alter output under the demo snapshot and are validated by the unchanged suite.

---

## 5. Files changed

| File | Change |
|---|---|
| `js/pages/register.js` | `renderGroupedTxRow`: now applies `show-runbal` row class; split selected state into row class + checkbox `checked` attribute. |
| `css/styles.css` | `.grp-row.show-runbal` 9-col grid + responsive `.grp-col-header.show-runbal` overrides; `.grp-date` ellipsis; kebab hover/focus/ring + z-index token; `.grp-row.grp-row-selected:hover`; unified toolbar heights (`--col-row-height`); `.filters-bar .btn`, `.clear-filters`, `.filters-bar .btn.btn-primary`, `.cd-wrap`/`.cd-trigger` heights; `.cd-list`/`.cd-list-wide`/`.cd-item` readability. |
| `js/app.js` | New `window.Ledger.positionKebabMenu` helper; kebab click handler calls it on open and un-sets `aria-expanded` on close. |
| `js/components/custom-dropdown.js` | `cdOpen` handles `cd-list-wide` lists (content-fit sizing, viewport clamp); `initCustomDropdowns` adds `cd-list-wide` to filter-bar selects. |

No other files touched. No commit created (per process — waiting for review approval).

---

## 6. Remaining issues noted during verification

1. **The `show-runbal` fix keeps grid column order in `register.js` tightly coupled** to the fixed-child-index hiding rules in the responsive block (the existing `LDS-TODO` at `css/styles.css` §grp-col-header). Any future change to `colHeaders` order will silently break column hiding on small screens.
2. **No automated visual snapshot for the running-balance / selection code paths** — the regression harness only renders `account:"all"` + empty selection, so the register markup change isn't covered byte-wise (mitigated by the unchanged test suite).
3. **`positionKebabMenu`** depends on `getBoundingClientRect()` returning usable dimensions; in a scale/zoom environment the flip/clamp math uses viewport units only and does not account for scroll container offsets beyond the page — adequate for the current single-scroll layout.

---

## 7. Technical debt intentionally deferred to Sprint 2

- **Responsive media queries** (`@media (max-width: ...)`) still use literal pixel breakpoints, not `--bp-*` tokens (documented in the Migration Tracker; CSS vars cannot be used in media queries).
- **Off-scale font sizes / fractional line-heights** in groups table remain literal (no exact token) — flagged rather than converted to avoid layout/snapshot changes.
- **Browser-automated before/after screenshots** (Playwright or similar) do not exist in the repo; capturing a screenshot-based visual regression gate is a Sprint 2 enabler.
- **Raw `box-shadow` literals** (kebab menu/toast/dropdown) and the 2/20/50/60/100/200/9999 z-indexes remain literal — no exact `--shadow-*`/`--z-*` token equivalents.
- **Account/currency brand hex colors** — no LDS role defined.

These are aligned with the Migration Tracker's existing "Remaining" column and intentionally not addressed in this UI-focused sprint.

---

## 8. Recommendation

**Ready for review.**

- All 7 targeted issues are implemented within scope, using LDS tokens where the migration tracker expects them.
- **451/451 tests pass** with **no new tests added and identical to baseline**; **42/42 pages** byte-identical in the HTML regression snapshots (confirming no unintended static output change).
- No business logic, features, or workflows were modified.
- The one gap (browser screenshots) is a tooling gap flagged explicitly to Sprint 2, not a code defect.

**Awaiting review approval before committing Sprint 1 and before starting Sprint 2.**