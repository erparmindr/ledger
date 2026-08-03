# Current Project Health Report — Ledger

**Date:** 2026-08-02
**Author:** Engineering assessment (AI-assisted)
**Scope:** Full project status after completion of the Transactions Refresh (Sprint 1 + 2) and the LDS foundation (M1–M5)
**Method:** Static source inspection, test execution (`vitest run` → 451/451 passing), git history review, and documentation audit. No application code was modified to produce this report.

---

## 1. Executive Summary

Ledger is a **private, offline-first personal finance PWA** built with vanilla JavaScript (no frameworks, no build tools), a single monolithic stylesheet, and IndexedDB + localStorage persistence. It is functionally rich and remarkably well-scoped for its single-user, local-only positioning: four transaction types, multi-account/multi-currency, CSV and statement-text import, recurring auto-post, reconciliation with drift detection, four report tabs, category splitting, friend-split debt tracking, full backup/restore, dark/light themes, demo data, and an installable offline shell.

The project is in a **solid Beta state**. It is feature-complete, ships a comprehensive 451-test suite, has an executed design-system foundation (LDS M1–M5), has completed a focused Transactions Page refresh, and has a mature documentation framework (LPA / LPDS / LDS / QA). It is deployed to GitHub Pages and is genuinely usable by a single user today.

The gaps that separate the project from a **public Beta/public launch** are not feature gaps — they are **engineering rigor** gaps: no end-to-end browser test automation, no lint/type-check gate, manual service-worker cache versioning, stale architectural documentation, partially verified accessibility, and a handful of documented technical-debt items (bulk-delete routing, side-effect-heavy mutations, business logic embedded in the transaction modal). None are blockers for personal use; several are should-fix before wider distribution.

**Overall maturity:** **Beta** (feature-complete, tested, usable — pre-public-launch hardening remains).

---

## 2. Overall Architecture Status

### What it is
- **Stack:** Vanilla JS (ES5-style IIFEs), HTML, single CSS file, IndexedDB + localStorage, GitHub Pages hosting. No framework, no bundler, no npm runtime deps (dev-only: Vitest).
- **Module pattern:** Every file is an IIFE attaching to `window.Ledger`. Load order in `index.html` is the explicit dependency graph. No global leaks.
- **Layers (in practice):** `pages/*` (HTML-string renderers) → `wire/*` (DOM event wiring) → `modals/*` (forms + business rules) → `store.js` (CRUD mutations) → `saveData()` → `storage.js` (IndexedDB + localStorage) → `renderPage()`.
- **Services:** `storage`, `csv-import`, `import-preview`, `recurring`, `backup`, `demo-data`, `demo-status`.
- **Components:** `transaction-row`, `custom-dropdown`, `date-picker`, `date-range-picker`.

### Status
- **Service-oriented in intent, mixed in practice.** `store.js` centralizes CRUD, but validation, transfer-pair logic, category learning triggers, and refund/split construction live inside `modals/tx-modals.js` (690 lines — the single densest file).
- **PLANS.md items 1–5 are implemented and approved** (verified in current code): bulk delete routes through `deleteTransaction()`, recurring auto-post routes through `addTransaction()`, a shared `filterTransactions()` exists in `utils.js`, import-preview now uses `_dupeKey()`, and `skipSave` batch flags exist on the main mutations. Plan 6 (extract validation into a service) is explicitly deferred.
- **Duplication that remains:** date-matching variants across pages (`regMatchesDate`, `reportMatchesDate`, `overviewMatchDate`) and some running-balance/`accountBalance` overlap are documented, stable, low-risk.

### Architecture health by dimension

| Dimension | Rating | Notes |
|---|---|---|
| Functionality | Good | All core features work; edge cases (cross-currency, splits, refunds) handled. |
| Architecture | Fair→Good | Centralized store + shared filter now; business logic still leaks into modal UI. |
| Maintainability | Fair | Single file per concern helps; dense modal and side-effect coupling hurt. |
| Scalability | Fair | Perfect for single-user/local; not designed for multi-user or cloud sync. |
| Readability | Good | Consistent IIFE pattern, explicit load order, descriptive names. |
| Testability | Fair→Good | 451 tests incl. benchmark/stress/validation; still no real-browser E2E. |
| Documentation | Good | LPA/LPDS/LDS/QA docs exist, but ARCHITECTURE.md is stale (still claims "no tests"). |

---

## 3. Completed Milestones

| Milestone | Status | Evidence |
|---|---|---|
| **Product documentation framework** | ✅ | `docs/LPA/` (vision, strategy, DNA, UX), `docs/LPDS/` (15 design-system specs + UI problems register), `docs/QA/` (release, UI-review, accessibility checklists). Commit `970734a`. |
| **Production readiness audit** | ✅ | Commit `42f3a14` — a11y, error handling, offline, robustness pass. |
| **LDS Foundation M1–M5** | ✅ | `docs/LDS/` tokens (type, weight, color, spacing, radius, shadow, z-index, ring), Layout/Typography/Spacing/Color/Elevation implemented. Commit `9f5fff2` (33 files). |
| **PLANS.md 1–5** (refactor: mutations, filters, dedup, batch flags) | ✅ | Verified in code (`store.js` skipSave; `utils.js` filterTransactions; `import-preview.js` `_dupeKey`; recurring→addTransaction; bulk delete→deleteTransaction). Commit `dd016be` + subsequent. |
| **Transactions Page Refresh — Sprint 1** | ✅ | 7 UI/UX fixes (run-balance render, selection, date ellipsis, kebab clipping, toolbar consistency, hierarchy, dropdown readability). |
| **Transactions Page Refresh — Sprint 2** | ✅ | Running-balance responsive, kebab keyboard accessibility, row readability, self-explanatory empty state. |
| **Transactions Refresh commit** | ✅ | `1eca303` `feat(transactions): refresh transactions page usability and accessibility` (7 files, +585/−42). |
| **Demo data + demo status panel** | ✅ | `a46a968`, `3444bdb`. |
| **Test suites (16 files, 451 tests)** | ✅ | integration, types, splits, math, utils, constants, validation, qa-manual, qa-demo, benchmark, stress, store-and-backup, groups-recon-import-recurring, mobile-gating, custom-dropdown, demo-data. |

---

## 4. Current Strengths of the Codebase

1. **Offline-first, zero-trust-of-cloud design.** No accounts, no analytics, no tracking, no cloud. IndexedDB primary with automatic localStorage fallback/migration ("belt and suspenders"). `saveData()` writes to both stores.
2. **Genuinely comprehensive test suite — 451/451 passing.** Covers unit logic (math/formatting), feature integration, the full import/recurring/reconciliation lifecycle, manual-QA assertions on every page, benchmarks (5000-row render under budget), and a stress render of the transactions page.
3. **Centralized store mutation layer.** Every write to `DB.transactions` goes through `add/update/upsert/delete/deleteByLink/addBatch`. Batch `skipSave` flags prevent N×save loops.
4. **Shared filter engine.** `filterTransactions(state, types, matchDateFn, opts)` in `utils.js` removes the previous register/reports duplication.
5. **Correct cross-currency transfer handling.** `commitLinkedTransferPair` produces two linked rows sharing a `linkId`/`linkRole`, keeping each account's view in its own currency.
6. **Modular category auto-learning.** Suggestion engine in `constants.js` is pure logic, dependency-free, parameterized by DB.
7. **Robust modal system.** Stacking, focus trap, Escape-to-close, backdrop close, focus restoration, sub-modal stacking.
8. **Documented design system with tokens.** Semantic `--*` tokens in a single stylesheet; LDS specs authored before implementation (traceable).
9. **Disciplined sprint workflow.** Issue→plan→implement→verify(tests+snapshots)→report→approve→commit has produced consistently reviewable changes.
10. **Small dependency surface.** Runtime: Google Fonts (Manrope) + lucide via CDN only; everything else is first-party. No runtime npm packages.

---

## 5. Remaining Technical Debt

| ID | Debt | Impact | Priority | Notes |
|---|---|---|---|---|
| TD-A | Business rules in `modals/tx-modals.js` (690 lines) | High | High | Validation, transfer-pair, splits, refund linking, learning triggers live in UI file. Plan 6 (extract `validateTransaction`) deferred. |
| TD-B | Side-effect coupling (mutations call `saveData`+`renderPage`) | Medium | Medium | Mitigated by `skipSave` flags; some per-item loops remain in bulk paths. |
| TD-C | Stringly-typed entity types (`"expense"`, `"account"`, `"out"`, `linkRole`) | Medium | Medium | Typos silently no-op. No type constants. |
| TD-D | Manual service-worker cache bump (`v117`) | Low | Low | Every deploy must hand-bump `CACHE_NAME`; index.html also uses hand-bumped `?v=` on 39 scripts — two manual version systems to keep in sync. |
| TD-E | Stale `ARCHITECTURE.md` | Low | High | Dated 2026-07-28; claims "no tests" and describes weaknesses already fixed (bulk delete, shared filter, dedup keys, skipSave). Misleads future AI contributors. |
| TD-F | LDS residual debt | Low | Low | Media-query literal breakpoints (no `--bp-*`); off-scale fonts/line-heights; raw shadows/z-index `9999`; account/currency brand hex colors. Documented in Migration-Tracker. |
| TD-G | No lint / type-check / formatting gate | Medium | High | No eslint/tsconfig/prettier; style consistency relies on discipline. |
| TD-H | No browser/Playwright E2E harness | High | High | Snapshot gate is HTML-string only; no real-pixel or breakpoint automation. Flagged in Sprint 1 & 2. |
| TD-I | Inline `style=` literals bypass tokens | Medium | Low→Med | ~160 inline style attributes (LDS UI-001); mostly in modals. |
| TD-J | `.gitignore` excludes `package-lock.json` | Low | Low | Dev-environment reproducibility is not pinned in git (node_modules ignored is fine; lockfile ignored is a smell). |

---

## 6. Known Functional Gaps

1. **No in-toolbar search on the Transactions page** — deliberately deferred (Sprint 2 scope change); global top-bar search is the single search entry point today.
2. **No cloud sync / multi-device story** — by design (offline-first), but a gap if the product ever needs device-to-device continuity.
3. **No budgets feature** (validation suite reports "N/A (no budget feature)") — not a regression; simply not built.
4. **No investment/liability tracking beyond debt items** — scope decision, not a defect.
5. **No print/PDF reporting** — reports are on-screen + CSV export only.
6. **No scheduled-report or export scheduling** — recurring auto-post exists, but no recurring exports.
7. **CSV import is single-statement-oriented**; exotic bank formats may need the statement-text path.
8. **Import-preview duplicate detection** was aligned to `_dupeKey` but the strictness change (now includes type+account) can re-flag rows previously accepted — behavior change already shipped, worth a user-facing note if not already present.

---

## 7. Areas That Require Additional Testing

1. **Real-browser end-to-end (highest priority).** No Playwright/Cypress exists. Add a smoke E2E covering: boot → demo load → add/edit/delete each tx type → import CSV → backup/restore → theme toggle → PWA install/offline.
2. **Cross-browser matrix.** Verify Chromium, Firefox, Safari (incl. iOS) for: IndexedDB, custom dropdown, date pickers, focus trap, PWA install.
3. **Cross-device responsive verification.** Manual/automated at 360 / 768 / 1024 / 1440px for every page (transactions running-balance two-line layout is the newest, least-browser-tested surface).
4. **Keyboard accessibility audit on non-transactions pages.** Only the transactions kebab menu has explicit keyboard/ARIA behavior verified. Overview, accounts, categories, settings, and all modals need the same pass (QA accessibility checklist exists but isn't automated).
5. **CSV import format coverage.** Add table-driven tests for all supported date/currency/description formats and malformed-row edge cases (`normalizeDate` noted in ARCHITECTURE.md as untested — verify current status).
6. **Category-suggestion ranking tests.** Verify `suggestCategoryForDescription`/`rankCategorySuggestions` scoring against a fixed corpus.
7. **Concurrency / rapid-interaction fuzz.** Rapid clicks on bulk-apply/bulk-delete/import commit to confirm no double-render or state corruption.
8. **Storage-full / blocked-storage behavior.** The toast path exists ("Could not save — browser storage is full or blocked") — verify end-to-end.
9. **PWA update flow.** Old-tab vs new-cache behavior after a cache bump (skipWaiting + clients.claim already used).

---

## 8. Mobile Experience Status

**Overall: Good, with a documented verification gap.**

- **Working:** Responsive layout across pages; mobile top-bar + hamburger/sidebar; `desktop-only` gating (bulk bar, export button, checkboxes) verified by tests; transactions rows collapse columns by breakpoint; the newest change gives single-account running-balance a **two-line stack on phones** (Date+Amount / Description+Balance) rather than a squeezed 5th column; kebab is touch-accessible.
- **Gaps:** No automated or pixel-verified mobile rendering; the two-line running-balance layout is CSS-reviewed but not browser-tested; focus targets may be small on some tappable elements; no mobile-specific viewport/perf tuning verified on low-end devices.
- **Recommendation:** Add mobile breakpoint checks to the E2E harness (see §7) before a public mobile-first claim.

---

## 9. PWA Readiness

**Status: Installable and offline-capable — near-ready, minor polish outstanding.**

| Aspect | Status |
|---|---|
| `manifest.json` | ✅ name, short_name, description, start_url, scope, standalone display, portrait orientation, theme/background colors, 192 + 512 + 512-maskable icons |
| Service worker | ✅ registered (`sw.js`) with HTTPS/localhost guard; `skipWaiting` + `clients.claim`; network-first for HTML/CSS/JS; cache-first for assets with navigate→index fallback |
| Offline shell | ✅ full app shell cached (all 39 JS files + CSS + index + manifest + icons) |
| Meta tags | ✅ theme-color, apple-touch-icon, mobile-web-app-capable, apple tags, viewport |
| Install prompt UX | ⚠️ No custom `beforeinstallprompt` handling (default browser prompt only) — acceptable, optional to add |
| Update versioning | ⚠️ Manual: `CACHE_NAME = v117` + 39 `?v=` script query strings, both hand-bumped. Risk of stale-cache if one is missed. (TD-D) |
| Screenshots in manifest | ⚠️ Optional `screenshots` field absent (recommended for richer install UX on Android) |
| External deps offline | ⚠️ Fonts (Google) + lucide (unpkg) are SW-cache-first so they work offline after first load, but a hard-blocked CDN on first visit degrades appearance — acceptable |

**Verdict:** Installable + offline working today. Add screenshot entries and consider auto-versioning before public release.

---

## 10. Performance Observations

- **Payload:** ~424 KB JS across 39 files (no minification, no bundling), ~101 KB single CSS (1940 lines). First-load is script-heavy but all local.
- **Rendering:** `renderPage()` rebuilds the current page's HTML string on every state change; transactions page re-renders on every filter change, checkbox toggle, and bulk action. Benchmark suite confirms a **5000-row render within budget (~570 ms)** and search/filter/sort in single-digit ms — fine for personal-scale data.
- **Mutation cost:** Bulk operations now use `skipSave`/batch paths, avoiding N×saves. Watch future bulk-update loops.
- **No build step:** No minification, hashing, or code-splitting. Fine for this scale; becomes a real cost only if the app grows.
- **IndexedDB writes** are async/non-blocking; localStorage write is sync (small JSON, negligible at personal scale).
- **No obvious hot loops or runaway re-renders** observed in tests; stress test exercises `renderTransactionsPage`.

**Verdict:** Performance is appropriate for the target user (single user, hundreds–thousands of transactions). Optimize only if data volumes grow or a real bottleneck appears.

---

## 11. Security / Privacy Observations

**Strong posture by design.**

- ✅ **No server, no accounts, no cloud, no telemetry.** All data stays in the browser. This is the product's core privacy value (LPA-001).
- ✅ No login/credential handling, no cross-origin data calls in app code.
- ✅ No secrets in repo (`.env` gitignored; no keys found in source).
- ⚠️ **Data at rest is unencrypted** in IndexedDB/localStorage (browser-level only). This is inherent to a local-only PWA and acceptable for a personal tool, but should be documented in the UI/privacy note.
- ⚠️ **Backup files are plaintext JSON** — the user is warned only via the restore confirmation; a short note that backups contain all financial data would help.
- ⚠️ **No Content-Security-Policy meta header.** External CDNs (fonts.googleapis.com, unpkg) are loaded directly. A CSP would harden against injected scripts; may be deferred given no user-generated HTML is rendered unsafely (output is `escapeHtml`'d).
- ⚠️ **XSS surface is small but present** — rendering is string-built HTML; escapeHtml is used for user text in rows/options (tests assert no `undefined`/`NaN` leaks). A CSP + a dedicated XSS fuzz test would close this out.
- ✅ **Privacy copy exists** in footer: "Stored locally in this browser only · works fully offline."

---

## 12. Backup & Data Protection Status

**Good, manual-only.**

- ✅ **Full JSON backup export** with timestamped filename; **restore with validation** (`validateBackup`), stats summary, and warning-driven confirm; **CSV export** for register and reports.
- ✅ **Dual persistence:** every `saveData()` writes localStorage (immediate) + IndexedDB (async). Boot migrates localStorage→IDB if IDB is empty.
- ✅ **Demo data** is isolated from real data (demo-status service); reset-all and demo-load exist in Settings.
- ⚠️ **No automatic/scheduled backups** — protection depends on the user manually exporting.
- ⚠️ **No encrypted or versioned backup format** — validation covers shape/warnings, not tamper resistance or format versioning across app upgrades.
- ⚠️ **`.gitignore` ignores `package-lock.json` and backup artifacts** — good for not leaking data, but note that `_backups/` and `backup-*/` folders in the repo are dev snapshot copies, not user data.

**Recommendation:** Add a periodic auto-export reminder (or a downloadable "backup now" nudge) and a backup-format version field before public beta.

---

## 13. Accessibility Status

**Foundation laid; verification incomplete.**

- ✅ **Architecture:** Focus-trapped, Escape-to-close modals with focus restoration; custom dropdowns maintain combobox/listbox roles; theme toggle; `aria-` attributes across dialogs.
- ✅ **Transactions refresh (Sprint 2):** row kebab menus are now fully keyboard-operable (`Tab`→trigger, `Enter`/`Space` open, arrows/Home/End navigate, `Escape` closes + returns focus, `role="menu"/menuitem/separator`, `aria-expanded` synced). Verified via 22 static + 16 behavioral checks.
- ✅ **Docs:** LPDS-014 Accessibility spec and `docs/QA/Accessibility-Checklist.md` exist.
- ⚠️ **Not yet audited per page:** keyboard navigation and focus order on Overview, Accounts, Categories, People, Recurring, Settings, Reports, and every modal form (only the transactions kebab menu has behavioral coverage).
- ⚠️ **No automated a11y testing** (no axe-core or similar) in the test suite.
- ⚠️ **Color contrast** is theme-dependent and only manually checked.
- ⚠️ Small 10px/11px text instances exist on some metadata (LDS UI-004) — legibility debt.

---

## 14. Recommended Roadmap (ordered by priority)

### Critical
1. **Add a real-browser E2E harness (Playwright).** Smoke test core user journeys + desktop/tablet/mobile breakpoints + PWA install/offline. This is the single highest-leverage addition and unblocks the other browser-verified items below.
2. **Refresh `ARCHITECTURE.md`** to reflect current reality (tests exist, PLANS 1–5 shipped, Transactions refresh complete). Stale docs actively misdirect future contributors.
3. **Add a lint/type-check gate** (ESLint + optionally JSDoc-driven check; consider minimal bundler only if needed) so the 451-test suite is backed by a style/robustness gate.

### High
4. **Extract business rules from `modals/tx-modals.js`** (Plan 6: `validateTransaction`, move transfer-pair/split/refund construction to a service) — unlocks reuse and reduces regression risk.
5. **Accessibility audit + automated checks** across all non-transactions pages and modals (axe-core in tests; keyboard pass per page; fix 10/11px legibility).
6. **Backup hardening:** add backup-format version, optional encryption, and an auto-export reminder; document plaintext nature in UI.
7. **CSV import + category-suggestion test coverage** (normalizeDate formats, malformed rows, scoring corpus).

### Medium
8. **PWA polish:** manifest `screenshots`, install-prompt UX, and de-risk cache versioning (single-source cache manifest or auto-bump).
9. **Add CSP meta header** and an XSS fuzz test for the string-built renderers.
10. **LDS debt reduction** (media-query breakpoints, off-scale type, shadow/z-index, brand colors) in dedicated design-system sprints.

### Low
11. **Type constants** for stringly-typed entity values; **print/PDF reports**; **in-toolbar search** redesign (needs the future search/filter sprint); **minification/bundling** only if payload matters.

---

## 15. Overall Project Maturity Assessment

**Assessment: BETA**

**Justification — what it has (Alpha thresholds exceeded):**
- Feature-complete across its intended scope; four transaction types, import, recurring, reconciliation, reports, splits, debt, backup, themes, PWA.
- 451 automated tests passing, including integration, lifecycle, validation, benchmark, and stress suites.
- Real design-system foundation (LDS tokens + specs), authored documentation (LPA/LPDS/QA), disciplined sprint history.
- Already deployed to GitHub Pages and functional as an installable offline app.

**Why not "public beta / 1.0" yet:**
- No browser-level E2E automation or cross-browser verification (the most important remaining gate).
- Accessibility verified only on a subset of pages; no automated a11y checks.
- No lint/type-check gate; stale architecture doc; manual cache versioning.
- Business logic still embedded in the transaction modal (regression risk on the most important feature).
- Backup is manual and unversioned.

**Why not "Alpha":** It has long since passed Alpha — it is not pre-feature or rough; it is a tested, usable application. **Beta** is the honest label until the Critical/High roadmap items land, after which it can claim **1.0-ready**.

---

## 16. Top 10 Recommendations Before Considering a Public Beta

1. **Ship a Playwright E2E suite** covering the 8 core journeys + breakpoint checks (Critical, blocks everything browser-verified).
2. **Refresh `ARCHITECTURE.md` and the Migration Tracker** to current state (Critical, cheap, protects contributors).
3. **Add ESLint + a quality gate** wired into `npm test` (Critical, cheap).
4. **Extract `validateTransaction` and modal business rules** into services (High, reduces the #1 regression risk).
5. **Full accessibility audit + axe automation** across all pages and modals (High, public-claim requirement).
6. **Backup format versioning + auto-export reminder + privacy note** in UI (High, trust requirement).
7. **Complete CSV-import and category-suggestion test coverage** (High).
8. **PWA: add manifest screenshots, de-risk SW cache versioning, verify update flow** (Medium, install polish + correctness).
9. **Add CSP header + XSS fuzz test** (Medium, security hardening).
10. **Verify on a real phone + at 360px** the two-line running-balance layout and touch targets (Medium, newest UI surface, zero browser coverage).

If items 1–3 (Critical) and 4–7 (High) are complete and green, the project is credible as a **public Beta**. Items 8–10 are recommended before a wider launch announcement.

---

*End of Project Health Report. Engineering assessment only — no application code was modified.*
