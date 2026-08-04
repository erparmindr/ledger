# F-003 — Mobile Experience Audit

> Discovery and analysis only. No application code was modified.
> Companion feature spec: `docs/Features/F-003 Mobile Experience.md`
> Screenshots: real renders of the app (demo data, dark theme) captured with headless Chrome at exact widths; see [Appendix B](#appendix-b-screenshot-map).

- **Audited widths:** 360px · 390px · 480px · 768px
- **Breakpoints in code:** `--bp-mobile 480px` · `--bp-sm 610px` · `--bp-tablet 880px` · `--bp-desktop 1200px` (media blocks use literal 480/760/880)
- **Pages audited:** Overview · Transactions (register) · Accounts · Reports · Categories · Payees/People · Scheduled (Recurring) · Settings · all modal dialogs · PWA shell
- **Severity scale:** Critical = blocks use of the page on a phone · High = significant friction or broken affordance · Medium = usability gap · Low = polish

---

## 1. Verification taxonomy (read first)

Every finding below is labelled with **one verification level** so the basis of the claim is explicit. **No inferred observation is presented as visually confirmed.**

| Level | Definition |
|---|---|
| **[Verified]** | Confirmed directly from code, DOM, computed styles, viewport metrics, or automated checks (e.g., a CSS rule sets `opacity:0`; a font-size token is 13px; a meta tag is absent). Not dependent on looking at a rendered screenshot. |
| **[Inferred]** | A conclusion derived from CSS/layout mechanics or platform-documented behavior that has **not** been visually confirmed from the rendered screenshots. Reasoned but unconfirmed visually. |
| **[Manual review]** | Should be visually inspected by a human (rendered PNGs and/or a real device) before implementation. Includes anything whose real-world impact depends on device-specific behavior (iOS zoom, keyboard, notches, pull-to-refresh) or on subjective judgement (readability, "feels abrupt"). |

A finding may combine levels, e.g. **[Verified mechanism + Manual review of outcome]** — the code fact is verified, but its real-world user impact must be confirmed by eye.

**Important scope note:** the auditing model could not view the captured PNGs (no image input). All "Inferred" and "Manual review" items therefore rely on static analysis only. Screenshots are included for **human verification**, not as proof of visual findings.

---

## 2. Executive summary

The app is **fundamentally responsive and usable on mobile** — the register column-collapse, running-balance two-line layout, fullscreen bottom-sheet modals, and off-canvas sidebar are structurally sound (these are Verified from CSS/DOM). The audit found **one Critical systemic issue, four High issues, and a cluster of touch-target/typography/PWA gaps**:

1. **[Critical → Resolved]** Row-level actions (edit / delete / kebab) were revealed only by `:hover` and were effectively undiscoverable on touch. **Fixed:** action buttons are now **always visible** on every device (desktop + mobile), with hover/focus retained as feedback only. See the F1 regression report.
2. **[High] [Verified + Manual review]** iOS Safari auto-zooms when tapping form fields whose font-size is <16px; the app's inputs are 13px.
3. **[High] [Verified absence + Inferred consequence]** No safe-area handling (notch / home indicator) and `100vh` instead of dynamic viewport units.
4. **[High] [Verified computed sizes]** Most touch targets are 26–38px, well below the 44px guideline; only `.icon-btn` meets it.
5. **[High] [Verified mechanism + Inferred height]** The Transactions/Reports filter bar stacks ~10 full-width controls vertically at ≤480px.

Plus a decision-worthy finding: `orientation: portrait-primary` in the manifest locks tablets to portrait.

The phased plan at the end orders fixes by **lowest risk / highest user value**, starting with pure-CSS bug fixes and ending with redesign opportunities. A consolidated **manual review checklist** is in [§14](#14-manual-review-checklist).

---

## 3. Touch target analysis (44px guideline)

`body` base font is **14px**; most interactive controls are smaller than the 44×44px Apple/Google guideline (WCAG 2.5.5 target size 24px is met, but 44px is the mobile ergonomics standard).

**[Verified — computed from declared `padding`/`font-size`/`min-height` values in `css/styles.css`.]**

| Control | Where | Height | vs 44px |
|---|---|---|---|
| `.icon-btn` | tx rows, modals, people | **44px min** (explicit) | ✅ Pass |
| `.fab` (New transaction) | all pages | ~35–40px (`padding:10px 18px` ≤480) | ❌ |
| `.btn` | primary/secondary | ~36px (`padding:10px 18px`) | ❌ |
| `.btn-sm` | filters, empty states, settings, recurring, bulk | ~26px (`padding:6px 12px`) | ❌ |
| `.hamburger` | mobile-topbar | ~33px (`padding:7px 10px`) | ❌ |
| `.nav-item` | sidebar drawer | ~31px (`padding:8px 12px`) | ❌ |
| `.theme-toggle button` | sidebar footer | ~24px (`padding:5px 11px`) | ❌ |
| `.tx-tab` | card tx rows | 38px | ❌ |
| `.kebab-btn` | register rows | 28px min | ❌ |
| `.kb` | accounts tiles | ~26px | ❌ |
| `.icon-btn.sm` | categories rows | ~26px (`padding:5px`) | ❌ |
| `.type-pill` | modals, categories tabs | ~36px; ~29px at ≤480 | ❌ |
| `.grp-check` | bulk select (desktop-only) | 15px | ❌ (but hidden on mobile) |
| `.cd-trigger` | custom dropdowns | 34px (`--col-row-height`); 38px ≤480 | ❌ |
| `.dp-display` | date pickers | ~36px | ❌ |
| `.field input` / `select` | all forms | ~36–38px | ❌ |
| `.cat-add-input` | categories | ~36px | ❌ |
| `.load-earlier` | register | ~47px (`padding:16px`) | ✅ |

**[Verified] Only `.icon-btn` and `.load-earlier` meet the guideline.** Every primary mobile interaction (nav drawer items, hamburger, filters, save buttons, pills, dropdowns, date pickers, kebab) is undersized.

- **Classification:** Improvement (systemic sizing pass, CSS-only, low risk).
- **[Manual review]** Confirm the under-44px controls feel too small in the rendered PNGs / on a device before adjusting (a small change, but a visual confirmation guards against over-correction).

---

## 4. Typography / readability

Sizes below are **[Verified]** from the type tokens in `css/styles.css` (`--text-xs:11px`, `--text-sm:12px`, `--text-base:13px`, `--text-md:14px`).

| Element | Size | Note |
|---|---|---|
| Body base | 14px | Acceptable |
| `.field input`/`select` | **13px** | → **iOS auto-zoom on focus** (see §6), also small |
| `.tx-row .desc` / `.grp-desc` | 13–13.5px | OK |
| `.tx-row .meta` | 11.5px | Small but readable |
| `.chip` | 10.5px | Very small |
| `.bar-label` / `.bar-value` (trend chart) | 10px | Smallest text in app |
| `.tile-meta`, `.div-amount` | 10–11px | Small |
| `.metric .lbl` | 10.5px uppercase | OK as a label |
| `.grp-type` | 11.5px | OK |
| `.report-tabs button` | 13px | OK |

- **[Verified]** Form controls are 13px → below the 16px iOS auto-zoom threshold. **Bump form controls to ≥16px on ≤880px.**
- **[Inferred]** 10–11px micro-copy (chips, bar labels, tile meta) is below comfortable mobile readability. This is a judgement call — **[Manual review]** verify against the rendered PNGs / a device.
- **[Verified]** `font-variant-numeric: tabular-nums` used consistently on amounts — good.

---

## 5. Navigation

**Current model:** ≤880px the sidebar becomes a fixed off-canvas drawer (222px) toggled by a hamburger in a sticky `.mobile-topbar`, with a backdrop. Navigation closes the drawer automatically (app.js:25-30). **[Verified]** This is a sound pattern.

**Issues:**
1. **[Medium] [Verified mechanism + Inferred chrome height]** Double topbar on mobile. At ≤880px **both** the `.mobile-topbar` (hamburger + "Ledger") *and* the desktop `.topbar` (page title + subtitle + search) render — the desktop `.topbar` is never hidden ([Verified]: no `display:none` rule targets it ≤880px). Two stacked bars result; the ~90px chrome figure is **[Inferred]**, **[Manual review]** confirm visually.
   - **Classification:** Improvement (consolidate into one mobile header; fold title/search into it).
2. **[Medium] [Verified absence + Manual review of outcome]** Sidebar has **no `overflow-y:auto`** ([Verified]); on short/landscape viewports the nav + footer may clip with no scroll (outcome **[Manual review]**).
3. **[Low] [Verified absence + Inferred consequence]** Sidebar has no safe-area top padding — the "Ledger" brand can sit under a notch (consequence **[Inferred/Manual review]** on a notched device).

**Screenshots (for manual review):** `overview-360.png`, `overview-390.png`.

---

## 6. Forms and dialogs

**What works well ([Verified] from code/CSS):**
- At ≤480px modals become a **fullscreen bottom-sheet** (`align-items:flex-end`, `width:100vw`, `max-height:92vh`, rounded top, sticky footer) — an excellent mobile pattern.
- `.form-row` collapses to single column at ≤480px.
- Focus is trapped and first field auto-focused (modals.js).
- `Escape` closes; backdrop click closes.
- Date-range picker collapses to a single calendar ≤480px; popover is `width:calc(100vw - 32px)`.

**Issues:**
1. **[Resolved] No hover → invisible actions (applies to modals too where actions are kebab-driven).** Fixed with the always-visible action buttons (see §9 / F1 regression report).
2. **[High] [Verified + Manual review]** iOS auto-zoom: all inputs/selects/date fields are 13px ([Verified]); tapping any field zooms the whole page on iPhone ([Inferred from documented platform behavior], **[Manual review]** on an iOS device).
3. **[Medium] [Verified mechanism + Manual review of outcome]** Keyboard overlap in bottom-sheet modal: `max-height:92vh` + sticky `.modal-foot` at bottom ([Verified]); when the keyboard opens, the footer/save button may be obscured (outcome **[Manual review]** on a device). No `visualViewport` handling or scroll-into-view on focus ([Verified]).
4. **[Low] [Verified]** `input[type=number]` for amount; no `inputmode="decimal"` / `enterkeyhint`.
5. **[Low] [Verified computed sizes]** `.type-pill` group in the tx modal: 4 pills ~29px tall at ≤480px — small targets.

**Screenshot (for manual review):** `modal-390.png`.

---

## 7. Tables and horizontal scrolling

The app **avoids true `<table>` markup** in favor of grid rows, which is the right call for mobile. Register behavior ([Verified] from CSS media blocks):

- **≤880px:** hides type column + checkboxes; keeps Date | Description | Category | Account | Amount | ⋯.
- **≤480px:** collapses to Date | Description | Amount | ⋯ (two-line layout for running balance in single-account view — the Sprint 1/2 work).
- Column headers hide via `nth-child` indexes (with a documented LDS-TODO coupling to `register.js` header order).

**Findings:**
1. **[Medium] [Verified]** Fragile header/row coupling: `.grp-col-header span:nth-child(n)` hiding depends on exact column order in `register.js`; any reorder silently desyncs headers from rows. Documented in CSS (LDS-TODO) but still a real maintenance/regression risk.
2. **[Low] [Verified mechanism + Inferred truncation]** `.grp-date` at ≤480 is `minmax(52px,auto)` with ellipsis — a date like "Dec 31, 2026" can truncate on 360px ([Inferred]; confirm in PNGs).
3. **[Good] [Verified]** No fixed-width columns force horizontal scroll on any audited width. No `overflow-x` rules force scrolling.

**Screenshots (for manual review):** `transactions-360.png`, `transactions-768.png`, `transactions-single-360.png`, `transactions-single-768.png`.

---

## 8. Transactions page

**Strengths (from Sprint 1/2, [Verified] from code/CSS):** running balance renders only for single-account views; two-line mobile layout; empty-state filter chips; kebab keyboard a11y (focus-visible reveals it); row readability pass.

**Issues (highest value page):**
1. **[Resolved] Kebab (⋯) is no longer hidden by hover.** Originally `.kebab-btn` was `opacity:0` and only revealed by `:hover`/`:focus-visible`, making it invisible on touch ([Verified]). **Fixed:** the button is now **always visible** (`opacity:1`) on every device; `:hover`/`:focus-visible` provide background/ring feedback only. Verified via computed styles at desktop, touch, and `body.is-mobile` — all `opacity:1`.
   - **Classification:** Bug (fixed).
2. **[High] [Verified mechanism + Inferred height]** Filter bar becomes a 10-control vertical stack ≤480px — 6 selects (Type, Account, Currency, Category, Subcategory, Date) + search + Clear + Uncat + Auto-categorize + Check duplicates, each 38px tall ([Verified] from the ≤480 block). The ~400px-of-filters figure is **[Inferred]**. Export CSV is correctly desktop-gated ([Verified]).
   - **Classification:** Improvement → candidate for a collapsible "Filters" sheet (redesign-lite).
3. **[Medium] [Verified mechanism + Manual review of outcome]** The desktop `.topbar` search box renders full-width below the page title on mobile (double bar, §5).
4. **[Medium] [Verified computed sizes]** Empty-state CTAs are `.btn-sm` (small) though there are two of them.
5. **[Medium] [Verified computed sizes]** `select` heights 38px ≤480 — workable but below 44px.

**Screenshots (for manual review):** `transactions-390.png`, `transactions-filtered-360.png`, `transactions-single-390.png`.

---

## 9. Dashboard / Overview

**Findings:**
1. **[Resolved] Correction of earlier scope:** Overview/reports/recurring/people use always-visible `.icon-btn` (44px) ✅. The Critical hover-invisibility was **limited to** register rows (`kebab-btn`), accounts tiles (`kb`), categories rows (`.cat-row-actions`), duplicate-check rows (`.dupe-row-actions`), and group chips (`.group-edit/.group-del`) — all originally `opacity:0`/low until `:hover` ([Verified] from CSS). **Fixed:** all six controls are now always visible on every device.
2. **[Verified] Good:** Metrics grid collapses to one column at 360/390 (min 240px); sparkline and donut stack cleanly.
3. **[Low] [Verified computed layout + Manual review of feel]** `.acct-mini-card` min-width:100% at ≤480 ✅; `card-grid` min 180px → 2 columns at 390px+, 1 column at 360px — a 1→2 column jump between 360 and 390 that *may* feel abrupt (judgement **[Manual review]**).
4. **[Medium] [Inferred + Manual review]** The "New transaction" FAB overlapping the bottom card on short screens is a potential concern; content `padding-bottom:60-80px` ([Verified]) likely covers it — confirm visually.

**Screenshots (for manual review):** `overview-360.png`, `overview-390.png`, `overview-768.png`.

---

## 10. Reports

**Findings:**
1. **[Medium] [Verified mechanism + Inferred height]** Same filters-bar vertical stack as Transactions (6 selects + search + clear + Export CSV [desktop-only]) ≤480px.
2. **[Medium] [Verified mechanism + Manual review of feel]** `.grid-3` metric trio collapses to 1 column at 360/390, 2 at 480, 3 at 768; the "Top category" value uses inline `font-size:16px` while others are 24px ([Verified] — cards are visually uneven; confirm in PNGs).
3. **[Good] [Verified]** `.report-tabs` become horizontally scrollable at ≤480px (`overflow-x:auto`).
4. **[Low] [Verified computed layout]** Donut `160px` fixed + legend; at ≤480 the donut wraps above the legend (column). Legend label widths 80px/60px at ≤480 — tight but fits; long category names truncate with ellipsis. ✅ acceptable.
5. **[Low] [Verified sizes]** Trend bar labels 10px — smallest text (§4).

**Screenshots (for manual review):** `reports-360.png`, `reports-390.png`, `reports-768.png`.

---

## 11. Settings

**Findings:**
1. **[Medium] [Verified computed sizes]** All action buttons (Layout mode Auto/Mobile/Desktop, Export backup, Restore, Import CSV, Load demo, Clear all) are `.btn-sm` (~26px).
2. **[Good] [Verified]** Data Protection status banner and backup/restore cards wrap cleanly; `flex-wrap:wrap` on button rows.
3. **[Low] [Verified computed layout]** Demo-status stat cards use inline-flex `min-width:96px` inside a `flex-wrap` container — wraps at 360px.
4. **[Medium] [Verified code path + Inferred outcome]** The **desktop-only** CSV/PDF import cards are hidden on mobile ([Verified] via `.desktop-only`), yet the register empty state offers "Import statement" → Settings where the card is hidden ([Verified] code path). The UX dead-end is **[Inferred/Manual review]**.

**Screenshots (for manual review):** `settings-390.png`, `settings-480.png`.

---

## 12. PWA-specific mobile UX

### 12.1 Safe areas
- **[Verified]** Viewport meta is `width=device-width, initial-scale=1.0` — **no `viewport-fit=cover`**, and no `env(safe-area-inset-*)` anywhere in CSS.
- **[Inferred] Consequences** in standalone (installed) mode on notched iPhones: sticky `.mobile-topbar` under the notch; `.fab`/`.toast`/bottom-sheet modals overlapping the home indicator. **[Manual review]** on a notched device.
- **Classification:** Bug (High). Fix: `viewport-fit=cover` + inset padding on topbar/FAB/toast/modal.

### 12.2 Viewport units
- **[Verified]** `min-height:100vh` on `body` and `.app-shell`; sidebar `height:100vh` (overridden to auto on mobile).
- **[Inferred + Manual review]** With the collapsing mobile URL bar, `100vh` is taller than the visual viewport → bottom content can be cut off / FAB under browser chrome. Use `100dvh`/`100svh` with a `100vh` fallback.
- **Classification:** Improvement (CSS-only, low risk).

### 12.3 Pull-to-refresh
- **[Verified]** No `overscroll-behavior` and no touch handling on the scroll root.
- **[Inferred + Manual review]** In a **browser tab** (non-standalone) on Android Chrome, pulling down at the top reloads the page, losing filter state. Installed PWA mode suppresses it natively, but many users run from the browser.
- **Classification:** Bug (Medium). Fix: `overscroll-behavior-y:contain` on the scrolling root (verify inner lists still scroll — [Manual review]).

### 12.4 Install flow
- **[Verified]** Manifest is complete (name, icons 192/512/maskable, standalone, theme-color) and a service worker exists — **installable today**.
- **[Verified]** No custom install UI (`beforeinstallprompt` not handled), no iOS "Add to Home Screen" guidance, and `theme-color` has no light/dark variants.
- **Classification:** Improvement.

### 12.5 Orientation (decision)
- **[Verified]** Manifest sets `orientation: portrait-primary` — the app forces portrait on installed phones **and tablets**. On a 768px tablet the register could reasonably use landscape, but the lock prevents it.
- **Classification:** Redesign/decision (see Phase 4) — likely split: keep portrait on phones, allow landscape ≥768px.

### 12.6 Fonts/offline
- **[Verified]** Google Fonts (Manrope) + unpkg (lucide) load from the network; the SW APP_SHELL does **not** list web fonts/icons.
- **[Inferred + Manual review]** Offline the app still works (fallback fonts/icons) but loses brand fidelity. Consider self-hosting the font/icon sprite in Phase 3.

---

## 13. Findings register (all severity + classification + verification)

| # | Severity | Page / area | Finding | Class | Verification |
|---|---|---|---|---|---|
| F1 | ~~**Critical**~~ → **Resolved** | Register, Accounts, Categories, Dupes, Groups | Hover-revealed actions invisible on touch (kebab-btn, kb, cat-row-actions, dupe-row-actions, group-edit/del) — **fixed: always visible on all devices** | Bug | Verified (CSS before/after, computed opacity=1 desktop/touch/is-mobile) |
| F2 | **High** | All forms | iOS auto-zoom: input/select font-size 13px < 16px | Bug | Verified (sizes) + Manual review (iOS device) |
| F3 | **High** | PWA shell | No safe-area (viewport-fit/insets): notch + home indicator overlap | Bug | Verified (absence) + Inferred/Manual review (consequence) |
| F4 | **High** | All pages | Touch targets mostly 26–38px vs 44px guideline | Improvement | Verified (computed sizes) + Manual review (feel) |
| F5 | **High** | Register, Reports | Filter bar stacks ~10 controls vertically ≤480px | Improvement | Verified (CSS mechanism) + Inferred (height) |
| F6 | **High** | PWA shell | `100vh` not dynamic (100dvh); bottom cut-off with browser chrome | Improvement | Verified (CSS) + Inferred/Manual review (consequence) |
| F7 | **Medium** | All pages | Double topbar (mobile-topbar + desktop topbar) ≤880px | Improvement | Verified (CSS) + Inferred/Manual review (chrome height) |
| F8 | **Medium** | PWA | Pull-to-refresh reloads in browser tab; no overscroll-behavior | Bug | Verified (absence) + Inferred/Manual review (behavior) |
| F9 | **Medium** | Modals | Keyboard obscures bottom-sheet footer/save on focus | Bug | Verified (mechanism) + Manual review (device) |
| F10 | **Medium** | Register | Header/row column-hiding coupled by `nth-child` index (LDS-TODO) | Improvement | Verified |
| F11 | **Medium** | Sidebar | No overflow-y → may clip on short/landscape viewports | Bug | Verified (absence) + Manual review (outcome) |
| F12 | **Medium** | Settings | Import CTAs hidden on mobile; register empty state dead-ends to hidden card | Bug | Verified (code path) + Inferred (outcome) |
| F13 | **Medium** | Typography | 10–11px micro-copy (chips, bar labels, tile meta) on phones | Improvement | Verified (sizes) + Manual review (readability) |
| F14 | **Low** | Overview/Accounts | 1→2 column card-grid jump between 360px and 390px | Improvement | Verified (grid math) + Manual review (feel) |
| F15 | **Low** | Modals | Type pills ~29px at ≤480; amount lacks inputmode/enterkeyhint | Improvement | Verified |
| F16 | **Low** | PWA | No install prompt / iOS A2HS guidance / theme-color variants | Improvement | Verified |
| F17 | **Low** | PWA | Web fonts/icons not cached offline | Improvement | Verified (SW list) + Inferred (impact) |
| F18 | **Low** | Reports | Uneven metric val sizes ("Top category" 16px vs 24px) | Improvement | Verified (inline style) + Manual review (feel) |
| F19 | **Decision** | PWA | `orientation: portrait-primary` locks tablets to portrait | Redesign | Verified |
| F20 | **Redesign** | Register/Reports | Mobile filter drawer/sheet to replace the vertical stack | Redesign | — (proposal) |
| F21 | **Redesign** | Register | Consider card-list rows with inline swipe/edit actions on phone | Redesign | — (proposal) |

---

## 14. Manual review checklist

Before implementation, a human should visually confirm these items against the rendered PNGs (Appendix B) and, where indicated, a real device:

| # | What to check | PNG / device |
|---|---|---|
| F1 | ~~undiscoverable on touch~~ → **done:** action buttons always visible on all devices (verified opacity=1); confirm visual polish on device | Device (iOS + Android) |
| F2 | iOS auto-zoom on tapping an input/select/date field | iOS device |
| F3 | Notch/home-indicator overlap of topbar, FAB, toast, bottom-sheet modal | Notched iPhone, standalone |
| F4 | That the 26–38px controls feel too small | PNGs + device |
| F5 | Visual height of the stacked filter bar at 360/390/480 | `transactions-*`, `reports-*` PNGs |
| F6 | Bottom cut-off / FAB position with URL bar shown/hidden | Device |
| F7 | Two stacked bars at ≤880px | `overview-360/390` |
| F8 | Pull-to-refresh behavior in a browser tab | Android Chrome |
| F9 | Keyboard covering the modal footer when editing | Device |
| F11 | Sidebar clipping on a short/landscape viewport | Device |
| F12 | Register empty-state → Settings dead-end | Device or PNG |
| F13 | 10–11px text readability | PNGs |
| F14 | 1→2 column card-grid jump between 360 and 390 | `accounts-360/390` |
| F18 | Uneven metric value sizes on Reports | `reports-360/390` |

---

## 15. Phased implementation plan

Ordered by **lowest risk → highest user value**. Phases 1–2 are CSS-only; Phase 3 touches JS. Items that need **[Manual review]** first are called out.

### Phase 1 — Critical bug fixes (pure CSS, ~0 risk, do first)
| Item | Work |
|---|---|
| F1 | **DONE** — action buttons made **always visible** on every device (`.kebab-btn`, `.kb`, `.cat-row-actions`, `.dupe-row-actions`, `.group-edit`, `.group-del`): removed hover-only reveal CSS, base `opacity:1`, hover/focus kept as feedback. Remaining: bump `.kb`/`.kebab-btn` hit area to ≥44px via padding/box (Phase 2 F4). |
| F2 | On ≤880px set `font-size:16px` (with compensating padding) for `.field input`, `select`, `.cat-add-input`, `.search-box input`, `.dp-display`, custom-dropdown triggers — stops iOS zoom. |
| F3 | Add `viewport-fit=cover` to viewport meta; apply `env(safe-area-inset-top)` to `.mobile-topbar`, `env(safe-area-inset-bottom)` to `.fab`, `.toast`, `.modal`, `.modal-foot`. |
| F6 | `min-height:100dvh` (fallback `100vh`) on `body`/`.app-shell`. |

### Phase 2 — Touch-target & readability pass (CSS, low risk)
| Item | Work |
|---|---|
| F4 | Raise interactive controls to ≥44px at ≤880px: `.btn`, `.btn-sm`, `.hamburger`, `.nav-item`, `.theme-toggle button`, `.tx-tab`, `.icon-btn.sm`, `.type-pill`, `.cd-trigger`, `.dp-display`, filter `select`, `.fab`. Use `min-height` + padding adjustments. |
| F13 | Floor 10–11px text to ≥11.5–12px on mobile (chips, bar labels, tile meta). |
| F7 | Consolidate mobile header: hide desktop `.topbar` ≤880px; move title/subtitle + search into the single sticky header. |
| F8 | `overscroll-behavior-y:contain` on the scroll root (verify inner lists still scroll — [Manual review]). |
| F10 | Add data attributes on `grp-col-header` spans and hide by class instead of `nth-child` (de-risk future reorders). |
| F11 | `overflow-y:auto` on mobile sidebar + safe-area top padding. |

### Phase 3 — Structural UX (medium risk, JS + CSS)
| Item | Work |
|---|---|
| F9 | Modal keyboard handling: `visualViewport` resize listener + scroll focused field into view above the keyboard; bottom padding when keyboard open. |
| F20 | Collapsible **Filters sheet** on Register + Reports at ≤480px (tap "Filters" → expandable panel) so the data sits at the top. Highest-value JS work. |
| F12 | Replace settings dead-end: on mobile, surface CSV/PDF import as a one-line "available on desktop" note with a link, or move the import triggers above the fold. |
| F17 | Self-host Manrope + lucide sprite for offline fidelity (cache in SW). |
| F5 (partial) | If Filters sheet lands, the vertical stack disappears; keep Export CSV gated. |

### Phase 4 — Redesign opportunities (higher risk, larger payoff)
| Item | Work |
|---|---|
| F19 | Orientation policy: keep portrait on phones; allow landscape at ≥768px (remove/condition `orientation` in manifest). Re-test register/reports in landscape. |
| F21 | Card-list transaction rows on phones with inline, always-visible actions or swipe-to-act, replacing the dense grid + hidden kebab. |
| F16 | Install experience: custom install button via `beforeinstallprompt`, iOS "Add to Home Screen" hint, light/dark `theme-color`. |
| F14 | Smoother account-grid breakpoint (single `minmax` tuned for 360–480) to avoid the abrupt 1→2 column jump. |

---

## Appendix A — Method

- **Static analysis (source of all [Verified] claims):** `css/styles.css` (all `@media` blocks + control sizing + tokens), `js/pages/*.js`, `js/modals/*.js`, `js/components/*.js`, `js/app.js`, `index.html`, `manifest.json`, `sw.js`. Sizes computed from declared `padding`/`font-size`/`min-height` tokens; breakpoint behavior read directly from media queries; "absence" claims (safe-area, overscroll-behavior, install UI, inputmode) confirmed by absence in source.
- **Rendering (for human review only):** page HTML produced via the same module-loading harness used for snapshots (`%TEMP%\opencode\mobile-shot.mjs`), wrapped in the real app shell + real `styles.css`, then captured with headless Chrome (`C:\Program Files\Google\Chrome`) at window widths **360, 390, 480, 768** (height 900).
- Screenshots use **demo data + dark theme** to match the default install state.
- **Honesty note:** the auditing model could not view raster images. Findings labelled **[Inferred]** are reasoned from CSS/layout/platform behavior and were **not** visually confirmed; findings labelled **[Manual review]** are explicitly left for a human to verify before implementation. No inferred observation is presented as visually verified.

## Appendix B — Screenshot map

Captured PNGs live in `docs/Features/F-003-Mobile-Audit/`. They are provided **for human visual review** of the findings marked [Manual review]; they were not used as visual proof by the model.

| File | Illustrates |
|---|---|
| `overview-360/390/768.png` | Dashboard layout; double topbar (§5); metric stacking |
| `transactions-360/390/768.png` | Register column collapse (§7, §8) |
| `transactions-single-360/390/768.png` | Running-balance two-line mobile layout (§7) |
| `transactions-filtered-360.png` | Empty/filtered state |
| `reports-360/390/768.png` | Filters stack, tabs scroll, metric trio (§10) |
| `accounts-360/390.png` | Tile grid, kebab context (§9, actions now always visible) |
| `settings-390/480.png` | Settings cards, btn-sm buttons (§11) |
| `modal-390.png` | Bottom-sheet modal (§6) |
| `categories-390.png` | Hover-hidden row actions context (§9) |
| `people-390.png` | Person cards / debt rows |
| `recurring-390.png` | Scheduled rows + form |

**All 44 captures (4 widths × 11 pages) are also available at `%LOCALAPPDATA%\Temp\opencode\img\`** if more widths are needed.
