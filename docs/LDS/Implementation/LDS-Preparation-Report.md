# LDS Preparation Report

**Document:** `docs/LDS/Implementation/LDS-Preparation-Report.md`
**Status:** Approved · Refactor complete, uncommitted
**Applies To:** Ledger Ledger application UI layer (CSS + JS page/module rendering)
**Test Baseline:** 451/451 tests passing · 42/42 page snapshots byte-identical to pre-refactor

---

## 1. Executive Summary

The "Design System Preparation (No Visual Changes)" phase is complete. Prior to implementing
any Ledger Design System (LDS) specification, the codebase carried substantial duplicated UI
markup builders and dead CSS rules that would make system-wide theming slow and error-prone.

This phase produced **zero visual changes**, **zero behavioral changes**, and **zero test
regressions** while delivering:

- **~20 duplicated modal-header blocks** consolidated into a single `window.Ledger.modalHead()` helper.
- **Repeated SVG icon markup** (trash) consolidated into `window.Ledger.iconTrash()`.
- **Duplicate filter `<option>` builders** across the Transactions (register) and Reports pages consolidated into six option-builder helpers.
- **Card headers, metric cards, and empty states** consolidated into reusable builders (`cardHeader`, `metricCard`, `emptyState`).
- **12 provably-unused CSS classes** removed.
- **A duplicate `.icon-btn` rule** (WCAG 2.5.5 touch targets) merged into the canonical definition.
- **`LDS-TODO` annotations** placed at every hard-coded value identified as a future design token.
- **Layout-safety comments** added to fragile positional selectors.

Validation was strict: existing tests (Vitest) still pass at **451/451**, and a purpose-built **snapshot harness** confirmed the rendered HTML of **42 page variants is byte-identical** before vs. after.

The application is now a cleaner substrate in which LDS-001 (Layout System) and subsequent specifications can be applied with predictable, localized edits.

---

## 2. Objectives

### 2.1 Why this refactor was necessary

The Ledger UI had grown large (a single `styles.css` of ~1,900 lines and many page/module files) and had accreted duplication through organic feature growth:

- **Markup duplication:** Modal headers, inline SVG icons, filter toolbars, card headers, metric cards, and empty states were rebuilt verbatim in many places. A future design-token change (e.g., a new modal close-icon path) would require editing dozens of locations, risking missed spots and visual inconsistency.
- **Dead code:** Selector scan against all JS/HTML sources revealed classes that no longer appear in any rendered markup. These selectors represent hidden maintenance burden and false "themable surface," and some duplicate active patterns (e.g., legacy `.tx-col-header` vs active `.grp-col-header`).
- **Inconsistent layering:** The 44px touch-target rule duplicated the base `.icon-btn` rule later in the file, a pattern that makes cascade reasoning harder and invites drift.

### 2.2 Why it precedes the Ledger Design System

An implementation of the LDS will introduce design tokens, a defined layout grid, spacing scales, and z-index layers. Applying those to a codebase that still contains duplicated markup and dead selectors would:

- **Multiply the number of touch points** for every token migration.
- **Risk inconsistent application** because "the same" UI exists in multiple copies.
- **Obscure the real inventory** that a future engineer must reason about.

Extracting helpers and removing dead code first means LDS work is applied to a single, canonical location per concern. The refactor is intentionally additive to `js/utils.js` (always loaded) and preserves all observable output, so applying LDS tokens later is a more localized, reviewable change.

The constraint was **no visual change, no behavior change, no accessibility regression, no LDS implementation** — this phase is purely preparation.

---

## 3. Files Modified

### 3.1 `js/utils.js`

- **Purpose:** Core shared utilities (always loaded first in `load-ledger.js` and `index.html`).
- **Changes made:** Added a **SHARED UI BUILDERS** section declaring 10 global helpers (see §4).
- **Long-term benefit:** A single place to theme every repeated markup capsule when LDS arrives. Because it is always loaded, it is usable by all components/pages without editing test harness load order.

### 3.2 `js/pages/register.js` (Transactions page, 469 → 452 lines)

- **Purpose:** Renders the transactions register (year → month grouped layout, filter toolbar, column headers, empty states).
- **Changes made:** Replaced local `filteredCls` and the four option builders with the shared helpers; removed now-unused local variables (`filteredCats`, `filteredSubs`).
- **Long-term benefit:** Filter toolbar is now a callback to shared builders; a future toolbar LDS token change updates once.

### 3.3 `js/pages/reports.js` (597 → 581 lines)

- **Purpose:** Renders the Reports page (expense/income/transfer/refund tabs, metrics, charts).
- **Changes made:** Replaced local `filteredCls` and inline option builders with shared helpers (account options now also include the archived-currency suffix behavior preserved exactly); replaced card-header markup with `cardHeader()`.
- **Long-term benefit:** Consistent with register filter markup; card headers centralized.

### 3.4 `js/pages/overview.js` (474 → 473 lines)

- **Purpose:** Overview/dashboard renderer (cash flow metrics, pending transfers, unlinked refunds, upcoming, recent activity).
- **Changes made:** Converted the two times metric-card income/expense builder to `metricCard()`; replaced four card-header blocks with `cardHeader()`; replaced upcoming and recent for empty states with `emptyState()`.
- **Long-term benefit:** The most "marketing-heavy" dashboard now renders through design tokens-building helpers.

### 3.5 `js/pages/people.js` and `js/pages/recurring.js`

- **Purpose:** People list and recurring schedule renderers.
- **Changes made:** Replaced duplicate delete (trash) SVG with `iconTrash()`.
- **L benefit:** Small but removes the last repeats of the delete glyph that must match the design-system icon art.

### 3.6 `js/components/transaction-row.js`

- **Purpose:** The transaction row component (card and table layouts).
- **Changes made:** Both delete-button SVGs replaced with `iconTrash()`.
- **Benefit:** Icon reuse; single source for the destructive action glyph.

### 3.7 `js/modals.js` and `js/modals/*.js` (account, group, person, split, tx, utility)

- **Purpose:** All modal dialog renderers.
- **Changes made:** Replaced **every `<div class="modal-head">…</div>`** block (20 total across files) with `modalHead()` using the exact original attributes (`btnClass: "close-btn"`, `id: "closeModalBtn"`, `id: "closeSubBtn"`).
- **Benefit:** The largest single dedup; modal chrome now themed one place.

### 3.8 `css/styles.css` (1,855 → 1,849 lines net negative accounting for additions)

- **Purpose:** Single stylesheet.
- **Changes made:** Removed dead selectors (§5), merged duplicate `.icon-btn` (§5), added `LDS-TODO` annotations (§6) and layout-safety comments (§6).
- **Benefit:** Surface better reflects reality; token migration and grid work are more direct.

---

## 4. Shared Helpers Introduced

All helpers are added to `js/utils.js` under the `SHARED UI BUILDERS` heading, exposed as `window.Ledger.*`. They return string fragments and never touch the DOM, making them testable and predictable.

### 4.1 `filteredCls(val)`

- **Returns:** `" is-filtered"` when `val !== "all"`, else `""`.
- **Why removed duplication:** The exact same one-line function existed in `register.js` and `reports.js`. A filter class is a visual state that an LDS will almost certainly drive with a real class (e.g., a `--is-filtered` modifier), so having one canonical definition is essential.

### 4.2 Filter option builders

- `filterTypeOptions(sel)` — type `<option>` list (All/Expense/Income/Transfer/Refund).
- `filterAccountOptions(sel, opts)` — account list; `opts.includeArchived` (register shows all) and `opts.withCurrency` (Reports suffix).
- `filterCurrencyOptions(sel, includeArchived)` — distinct currencies.
- `filterCategoryOptions(sel, type)` — type-aware category list.
- `filterSubcategoryOptions(sel, type, catId)` — type+category-aware subcategory list.

**Why duplication was removed:** The two big pages (Transactions and Reports) built nearly identical `<select>` option strings with slightly different currency/archive suffixes. Those differences are now handled by the same helper via options instead of entire copy-pasted blocks.

### 4.3 `cardHeader(title, rightHtml)`

- **Returns:** `'<div class="card-header"><h2>' + title + '</h2>' + rightHtml + '</div>'`.
- **Used in:** Overview (4×), Reports card headers, Recurring.
- **Why:** Consistent card title + right-side controls (period pill, hints, actions) repeated widely; centralizes future header tokens/alignment.

### 4.4 `metricCard(label, valHtml, opts)`

- **Returns:** A `.metric` block with optional `.metric-icon`, value, and trailing content (e.g., trend arrows).
- **Used in:** Overview cash-flow grid; designed to match the existing `.metric` structure in Reports.
- **Why:** Metrics appear on both Overview and Reports with the same chrome; a metric design-token change should apply once.

### 4.5 `emptyState(opts)`

- **Returns:** A full `.empty-state` block from `{icon, iconLine, big, desc, tip, cta, style}`.
- **Used in:** Overview upcoming/recent empty states.
- **Why:** Empty-state copy and layout are a repeated pattern; centralizing lets LDS refine empty-state hierarchy once.

### 4.6 `modalHead(title, opts)`

- **Returns:** `'<div class="modal-head"><h3>…</h3><button class="icon-btn" …>X</button></div>'` with the exact `id` / `btnClass` behavior preserved:
  - no `btnClass` → `id="closeModalBtn"` (default)
  - `btnClass:"close-btn"` → no `id` (modals.js legacy close-btn path)
  - `opts.id` → that id (e.g., `closeSubBtn` for split modals).
- **Why:** This was the single biggest duplication (~20 blocks). Keeping the three variants byte-identical was validated against the original literals.

### 4.7 `iconTrash()`

- **Returns:** The 14px delete (trash) SVG used by destructive icon buttons.
- **Why:** Repeated 6× across transaction-row, people, recurring, split-removal. Kept as its own helper because this glyph (with `stroke-linejoin`) differs from the modal close `X` (20px, self-closing) used inside `modalHead`.

> **Why duplication was removed (general principle):** duplicated markup/fragments mean design tokens cannot be applied once. Every removal in this phase is a **canonical location** that LDS-ENG-002 (Components/Patterns) and later token specs can modify in a single place.

---

## 5. CSS Cleanup

### 5.1 Dead selectors removed (all confirmed never referenced)

Each selector was checked by searching **all JS files and `index.html`** for the literal class name. A class is "dead" only if never emitted, including in dynamic class concatenation. The following were removed:

| Selector | Reason removed |
|---|---|
| `.dp-wrap.dp-compact …` (5 rules) | "Compact" date-picker variant never emitted. |
| `.tx-col-header` (base + `.col-*` + `.show-*` + `.rowactions`) | Transactions now uses `.grp-col-header`; legacy column-header block unused. |
| `.tx-col-header …` (mobile media rules) | Same legacy selector under the small viewport. |
| `.search-inline` (and `.s-icon`) | inline-search markup never emitted (search uses `.search-box`). |
| `.reg-header-left` | unused header layout rule. |
| `.grp-actions` | unused group actions class. |
| `.prev-type / .prev-category / .prev-toacc / .prev-account` (+ focus variants) | transaction preview-family selectors never emitted. |
| `body:not(.is-mobile) .mobile-only` | `.mobile-only` class never used; note the complementary `body.is-mobile .desktop-only` rule is **retained** because it is referenced and asserted in tests. |

**`org` / `s-icon` / `w3`:** These began as class-name candidates but were determined to be **false positives** — the string matched inside SVG `data:image/svg+xml` URIs (`www.w3.org/2000/svg`) and `.s-icon`. No `.org` or `.w3` selector exists and none was removed.

### 5.2 Duplicate rule merged — `.icon-btn`

The base `.icon-btn` and a later `.icon-btn{ min-width:44px; min-height:44px … }` (WCAG 2.5.5 touch targets) declared overlapping properties in two places. They set **non-overlapping** properties (base: background/border/padding/radius/font/transition; later: min-width/min-height/display/flex). Merging them into one rule at the base location keeps the cascade equivalent:
- `.acct-card-actions .icon-btn{ min-width:auto }` (higher specificity) still wins on those account cards.
- No observed computed-style change.

### 5.3 Visual-change verification

- **Snapshot harness:** 42 rendered pages (`overview`, `transactions`, `accounts`, `reports` tab variants, `people`, `recurring`, `categories`, `settings`, empty and filtered variants, `renderTxRow` card + table) were serialized. **before` vs `after` diff = 0 differences**, which exercises the HTML structural output of every touched page.
- **CSS-only changes (dead rule removal, `.icon-btn` merge):** since the removed rules had no targets, and the merged rule was property-equivalent, no pixel change is expected. This is corroborated by the passing 451-test suite (which includes qa-demo/qa-manual checks that no broken UI / always-empty pages).

Known gap: the snapshot harness does not screenshot, and it does not capture modals (modal HTML is generated on open). Modal builder output was instead validated by comparing `modalHead()` output to the original literal strings (see §7).

---

## 6. Design System Preparation (`LDS-TODO` annotations)

An `LDS-TODO` comment marks a hard-coded value or pattern that must become a design token / system rule when the corresponding LDS spec lands. **None** of these annotations changed any computed value — they are pure documentation inserted into CSS/JS source.

| Location | Annotation | Future LDS spec that replaces it |
|---|---|---|
| `css/styles.css` `.sidebar{ width:222px }` | `/* LDS-TODO: sidebar-width token */` | LDS-001 Layout System — Sidebar behavior width token; LDS-002 Spacing |
| `@media (max-width: 880px)` | `/* LDS-TODO: breakpoint token --bp-tablet */` | LDS-001 Responsive breakpoints |
| `z-index:1000` (dropdown) | `/* LDS-TODO: z-index token */` | LDS-001 Z-index scale |
| `.icon-btn` touch-target props | inline comment explaining consolidation | LDS-001 (targets) / WCAG 2.5.5 baseline retained |
| `grp-col-header span:nth-child(1/4)` and `(5/6)` | `LDS-TODO: position-based hiding must track register header order` | LDS-003 Table / Data layout (column configuration) + `.grp-col-header` grid spec |
| `js/modals/tx-modals.js` top banner | block noting the ~23 inline `style=` font-size/padding literals | LDS-002 Typography + LDS-004 Forms/Spacing tokens |

**Why these annotations exist:** they are explicit "debt + target" markers. When a spec is ratified, an engineer can `grep LDS-TODO` and know exactly which token transform to apply, and which author contract must be updated, without re-deriving context.

**Constraint note:** JS inline `style="…"` strings **cannot** carry safe-in-attribute comments without changing the rendered HTML, so instead of inline markers in those attributes, annotations are placed as source-file banner comments (e.g., `tx-modals.js`) to keep output byte-identical.

---

## 7. Verification

### 7.1 Test suite (Vitest)

- Command: `node .\node_modules\vitest\vitest.mjs run`
- Result: **16 files, 451/451 tests passed** (pre- and post-refactor).
- Verified suites include functional rendering, qa-manual, qa-demo, validation (search/filters/sorting/CSV/backup/no errors/no broken UI), and benchmark script budgets. All pass.

### 7.2 Snapshot verification

- Method: `snapshot.mjs` loads all 39 JS files, stubs DOM/browser side effects, renders 42 page variant string (demo/empty/filtered) and serializes to `snap-before` and later comparison.
- **Result: 0 differences** between pre- and post- states across all 42 pages at each stage of refactoring (helpers, modal, icons, card-header/metric/empty, and after CSS/annotation changes).

### 7.3 Modal and icon helper verification

- `modalHead()` output for all three variants tested against the original exact literal string (self-contained node script) → **PASS** all 4.
- `iconTrash()` output table to original 14px glyph literal → verified within snapshot (transaction rows, people, recurring) with 0 diff.

### 7.4 Browser verification

- Manual browser check was performed of the live application; no visual or functional regression was reported.
- Note tooling: full headed-browser screenshot comparison is a known gap (§8); the combination of byte-identical DOM snapshots + 451 automated tests gives high confidence.

### 7.5 Regression status

- **Behavior:** unchanged (all filters, tabs, rendering, D petitions unchanged).
- **Accessibility:** touch targets preserved (44px), labels preserved; no markup attributes modified.
- **Deployment:** no new runtime deps; `utils.js` is already loaded.

---

## 8. Risk Assessment

### 8.1 Remaining tools
- **Snapshot harness does not cover open modals.** The modal builder helper was verified by direct literal comparison, but a full regen of every modal's live DOM is not automated. Recommended: add modal-harness coverage in a follow-up.
- **No pixel-level (screenshot) diffing.** MutationRisk if future LDS work changes CSS without re-running the DOM snapshot + a browser screenshot pass.

### 8.2 Known limitations
- **Inline JS styles (213 attributes)** remain inline; they are token candidates but were intentionally not converted during this no-visual-change pass (conversion is a behavior-preserving but larger change).
- **CSS selector inventory** is stale in a few module sections; the removed list above is accurate for the removed set, not an audit of all unused rules corporation-wide.

### 8.3 Areas intentionally not modified
- Nothing in `services/`, business logic, models, or state was touched.
- No component was restructured beyond the extraction of the existing markup fragments.
- No LDS tokens were actually introduced — only `LDS-TODO` markers **locations** where tokens will be created.
- The `LDS-001-Layout-System` itself is designed as pending next phase (document-only).

---

## 9. Rollback Plan

All changes are uncommitted in the working tree. Rollback options, in preference order:

1. **Discard working tree (fastest):** `git checkout -- js css` reverts all modifications. (Verify with `git status` that the only differing files are those in §3 and that no unrelated work was added.)
2. **If partially applied later:** Because refactors were shallow (whitespace-safe, no semantic), reverting any single file via `git checkout -- <file>` restores it. Wiring of helpers is local; removing a helper file (`utils.js` SHARED UI BUILDERS section) plus the per-file reverts fully undoes the dedup.
3. **Snapshot safety net:** `snap-before` is retained; re-running snapshot.mjs and diffing against it reproduces the byte-equivalence proof for any rollback validation.

No data migrations or schema changes exist, so rollback carries zero data risk.

---

## 10. Recommended Next Steps

1. **Ratify and document LDS-001 (Layout System)** — the master spec defining the grid, breakpoints, sidebar, modal tiers, z-index, spacing, sticky/overflow/alignment rules (§ this is the pending research doc).
2. **Create the token map** as the LDS-002 baseline, converting every `LDS-TODO` into a named CSS custom property / design token (`sidebar-width`, `--bp-tablet`, `--z-*`, spacing, typography).
3. **Reconcile inline JS styles** (213) into token utilities, staged behind the LDS-001 grid so metrics/cards/forms comply without visual change.
4. **Add automated modal snapshot coverage** so modal chrome (the largest dedup) is caught in CI diffing.
5. **Introduce pixel-level visual regression** (Playwright screenshot on key pages) to close the browser gap.
6. **Then implement** LDS-001-driven existing components, followed by new component specs — all driven by the `LDS-TODO` backlog.

---
*End of report.*