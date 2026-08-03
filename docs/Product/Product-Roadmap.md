# Ledger — Product Roadmap

**Document:** `docs/Product/Product-Roadmap.md`
**Date:** 2026-08-02
**Type:** Product planning (no application code changes — this is a roadmap only)
**Predecessors:** `docs/LPA/LPA-001` (product vision & principles), `docs/Project/Project-Health-Report.md`, `docs/Project/Documentation-Index.md`, `docs/Project/Documentation-Roadmap.md`
**Status:** Proposed — awaiting approval before implementation begins

---

## 1. Current project status

Ledger is a **private, offline-first personal finance PWA** — vanilla JavaScript, no frameworks/build tools, IndexedDB + localStorage persistence, installable, and deployed to GitHub Pages.

| Dimension | Status |
|---|---|
| **Maturity** | **Beta** (feature-complete; pre-public-launch hardening remains) |
| **Tests** | 451/451 passing (Vitest; unit, integration, lifecycle, validation, benchmark, stress) |
| **Design system** | LDS foundation (M1–M5) complete; Transactions Refresh (Sprint 1+2) shipped |
| **Core features** | Transactions (expense/income/transfer/refund), multi-account, multi-currency, CSV import, statement-text import, recurring auto-post, reconciliation w/ drift detection, 4 report tabs, category splitting, friend-split debt, full backup/restore, dark/light themes, demo data, PWA |
| **Docs** | LPA/LPDS/LDS/QA/Project frameworks in place; consolidation roadmap approved (pending execution) |
| **Key gaps** | No device sync, no cloud backup, no PDF import, no notifications, no financial vault, no in-toolbar search, no browser E2E automation, manual service-worker versioning |

**Positioning (from LPA-001):** a modern personal financial operating system — a *permanent financial record* that grows with the user. Privacy, accuracy, and trust are the product's identity: **no accounts, no cloud, no tracking** by default. Any cloud feature must preserve that promise (user-controlled, encrypted, optional).

---

## 2. Guiding product principles

These are the non-negotiables every initiative must honor (derived from LPA-001 and the design system):

1. **Privacy by default.** No accounts, no telemetry, no forced cloud. All data stays local unless the user explicitly opts into a privacy-preserving sync/backup feature.
2. **Offline-first.** The app must be fully usable with zero connectivity. Network features are additive, never prerequisites.
3. **Accuracy & trust.** Financial figures must reconcile, transfer pairs must stay correct, and imports must never silently corrupt data. (LPA-001 §4.1, §4.3.)
4. **Clarity & precision.** Information hierarchy, legible numbers, and consistent typography (LDS). No feature ships that degrades readability.
5. **Incremental, verifiable delivery.** Every change is behavior-preserving until intentionally retired; tests + snapshot gates protect regressions (the discipline that carried the LDS foundation and Transactions refresh).
6. **Longevity.** Design for a *permanent* financial record — versioned data, migration paths, documented formats.
7. **Accessibility is not optional.** Keyboard operability, focus management, and WCAG 2.1 AA checks are part of definition-of-done.
8. **Single source of truth.** Every fact (data model, feature behavior, backup format) lives in exactly one canonical document.

---

## 3. Major feature roadmap (prioritized by user value + dependencies)

Legend: **P0** = now/foundational · **P1** = next · **P2** = later · **P3** = strategic/optional

| Priority | Initiative | User value | Key dependencies |
|---|---|---|---|
| **P0** | Data Protection (Backup & Restore) | High — prevents catastrophic data loss; trust cornerstone | Data Model doc, existing `backup.js`, `validateBackup` |
| **P0** | Public Beta readiness | High — quality gate before wider distribution | E2E harness, a11y audit, lint gate, PWA polish, docs |
| **P1** | Mobile Experience Refresh | High — PWA is used primarily on phones | LDS tokens, existing responsive base |
| **P1** | Import Center (CSV + PDF + Import Presets) | High — onboarding friction is the top barrier; data in = value | Import System doc, `csv-import.js`, data model |
| **P1** | Search & Global Navigation improvements | High — daily power-user flow; currently one global box | Filter engine (`filterTransactions`), nav structure |
| **P2** | Financial Vault | Medium–High — privacy differentiator for sensitive users | Web Crypto, Data Model extension, a11y |
| **P2** | Google Drive Backup | Medium — off-device safety for the privacy-conscious | Data Protection, optional OAuth (user-scoped), encryption |
| **P2** | Notifications | Medium — recurring/reconciliation nudges drive engagement | PWA service worker, recurring engine, permission UX |
| **P3** | Device Sync | Medium–High — multi-device continuity | Sync Architecture doc, encryption, Drive backup, conflict resolution |
| **P3** | v1.0 Release readiness | High (gate) | Everything above + migration path + release checklist |

---

## 4. Proposed implementation order & rationale

**Phase A — Trust & quality foundation (P0).**
*Data Protection hardening + Public Beta readiness.*
> Rationale: nothing else matters until (a) a user's data cannot be silently lost and (b) the app is stable enough to attract early adopters without eroding trust. These two unlock every later initiative (Drive backup and Sync both build on Data Protection; Beta gates the audience).

**Phase B — Get data in, everywhere (P1).**
*Import Center + Mobile Experience Refresh.*
> Rationale: the two highest-friction surfaces. Users either already have financial data (import) or use the app on a phone (mobile). Fixing onboarding + the primary form factor yields the fastest visible product value.

**Phase C — Find it faster (P1).**
*Search & Global Navigation improvements.*
> Rationale: after data is in, daily usage is retrieval. Better search/navigation amplifies every other feature's value; low risk, moderate effort.

**Phase D — Trust extensions (P2).**
*Financial Vault + Google Drive Backup + Notifications.*
> Rationale: differentiated privacy features that extend trust. Vault and Drive Backup share encryption groundwork; Notifications rides on the existing recurring/reconciliation engine. Sequenced after A–C so the foundation is stable.

**Phase E — Multi-device continuity (P3).**
*Device Sync.*
> Rationale: the most complex and privacy-sensitive initiative. It depends on the Sync Architecture doc, encryption, Drive Backup, conflict resolution, and a stable Data Model. Doing it last avoids building sync on a moving schema and lets earlier phases validate the storage abstraction.

**Phase F — Launch gate (P3).**
*v1.0 Release readiness.*
> Rationale: v1.0 is a *gate*, not a feature. It passes only when the feature set, stability, migration path, and release checklist are all green.

---

## 5. Initiative breakdowns

Each initiative below specifies Goal, User value, Dependencies, Complexity, Priority, and Success criteria.

---

### 5.1 Mobile Experience Refresh

- **Goal:** Make every page and interaction excellent on phones and tablets — layout, touch targets, performance, and PWA install UX — while preserving the LDS system and desktop parity.
- **User value:** The app is a PWA; most usage is on mobile. Currently responsive but with gaps (two-line running-balance layout, kebab touch targets, ≤360px data-heavy rows). A polished mobile experience is the difference between "it works" and "I use it daily."
- **Dependencies:** LDS tokens; responsive inventory (`docs/LPDS/Research/Responsive-Inventory.md`); Transactions refresh already demonstrates the pattern.
- **Estimated complexity:** **Medium**
- **Recommended priority:** **P1**
- **Success criteria:**
  - Browser-verified layouts at 360/768/1024/1440px for all 8 pages (Playwright smoke).
  - Touch targets ≥ 44px on primary interactive elements (WCAG 2.5.5).
  - Running-balance two-line rows legible at ≤360px with no overflow.
  - Install banner/custom install prompt working on iOS + Android.
  - No regression in the 451-test suite; snapshot gate clean.

### 5.2 Import Center (CSV + PDF + Import Presets)

- **Goal:** A single "Import Center" that unifies CSV import, statement-text paste, **PDF statement import**, and **import presets** (remembered column mappings, category defaults, and destination accounts per bank).
- **User value:** Onboarding is the top churn point. One-click re-imports for recurring banks + PDF support remove the biggest friction to having a complete ledger.
- **Dependencies:** Import System doc; `services/csv-import.js`; `services/import-preview.js`; Data Model; optional `pdf.js`-class parser (new dependency — needs license/security review).
- **Estimated complexity:** **High**
- **Recommended priority:** **P1**
- **Success criteria:**
  - PDF statements from ≥3 common banks import with correct date/amount/description extraction (tested corpus).
  - Import presets saved/edited/deleted and applied to one-click re-import.
  - Import preview dedup + category suggestion unchanged in behavior (`_dupeKey` alignment verified by tests).
  - Malformed-row handling never drops or corrupts existing data; preview always shows count before commit.

### 5.3 Data Protection (Backup & Restore)

- **Goal:** Harden the existing JSON backup/restore into a complete data-protection story: format versioning, validation/repair warnings, an automatic export reminder, and a clear in-app "your data is safe" status.
- **User value:** Prevents catastrophic loss of a *permanent financial record*. Trust is the product's identity; this is the trust cornerstone.
- **Dependencies:** Data Model doc (backup schema = data model snapshot); `services/backup.js` (`exportBackup`, `validateBackup`, `importBackupFile`); Release-Checklist.
- **Estimated complexity:** **Low–Medium**
- **Recommended priority:** **P0**
- **Success criteria:**
  - Backup file carries a schema version; restore validates version + warns on mismatch with clear migration path.
  - Auto-export reminder (periodic nudge) implemented and toggleable.
  - Round-trip test: export → wipe → restore → byte-identical data (or documented, safe normalization).
  - CSV export for register/reports unaffected.

### 5.4 Google Drive Backup

- **Goal:** Optional, encrypted, user-initiated backup to Google Drive so data survives device loss — **without** creating a Ledger account or sending data to Ledger's servers.
- **User value:** Off-device redundancy for privacy-conscious users who won't use an app account. Peace-of-mind safety net.
- **Dependencies:** Data Protection (format versioning); Sync Architecture doc; Web Crypto (client-side encryption); optional OAuth scoped to the user's own Drive.
- **Estimated complexity:** **High**
- **Recommended priority:** **P2**
- **Success criteria:**
  - Backup encrypted client-side (user passphrase, key never leaves device) before upload.
  - One-tap backup/restore with clear status; restore never overwrites newer local data without confirmation.
  - Full offline usage preserved; Drive is opt-in and clearly labeled optional.
  - Data cannot be read by Ledger or Google (documented threat model).

### 5.5 Device Sync

- **Goal:** End-to-end encrypted synchronization of the ledger across the user's own devices, with conflict resolution — still no Ledger account.
- **User value:** Multi-device continuity (phone + laptop) with the same private, offline-first ethos.
- **Dependencies:** Sync Architecture doc; Data Protection; Google Drive Backup (as transport); Web Crypto; stable Data Model; conflict-resolution strategy (documented + tested).
- **Estimated complexity:** **High**
- **Recommended priority:** **P3**
- **Success criteria:**
  - Two devices converge to identical data after simultaneous edits, with deterministic conflict handling (documented).
  - Sync is end-to-end encrypted; no server-side plaintext.
  - Offline edits queue and sync when connectivity returns, without data loss.
  - Reconcile/transfer-pair invariants hold across devices (tested).

### 5.6 Financial Vault

- **Goal:** A privacy layer that hides sensitive accounts/balances behind a device-level lock (PIN/biometric) — e.g., a hidden vault or "privacy mode" for the whole ledger.
- **User value:** Differentiates the product for users who need to keep finances private on a shared device. Aligns with the privacy-first identity.
- **Dependencies:** Web Crypto; Data Model extension (vault metadata); a11y (focus/announcement); security review.
- **Estimated complexity:** **Medium–High**
- **Recommended priority:** **P2**
- **Success criteria:**
  - Vault-flagged data hidden from overview/accounts/register until unlocked.
  - Unlock via PIN + optional biometric; failed attempts lockout behavior defined.
  - No vault data leaked in backups, CSV export, or DOM when locked.
  - Accessible (keyboard unlock; clear announcements).

### 5.7 Notifications

- **Goal:** Local, on-device notifications for recurring bills due, reconciliation reminders, and (optionally) vault-lock alerts — no cloud push.
- **User value:** Keeps users on top of bills and reconciliations without opening the app; drives healthy recurring usage.
- **Dependencies:** PWA service worker; recurring engine (`services/recurring.js`); reconciliation status (`needsVerification`); notification permission UX.
- **Estimated complexity:** **Medium**
- **Recommended priority:** **P2**
- **Success criteria:**
  - Recurring-due and recon-reminder notifications fire correctly (tested time logic).
  - Notifications are local-only (no server), opt-in, and easily configurable/silenced.
  - Permission flow is non-intrusive and graceful when denied.

### 5.8 Search & Global Navigation improvements

- **Goal:** One powerful, discoverable search (global top bar + optional per-page refinements) and clearer navigation, surfacing amounts, categories, accounts, and dates alongside descriptions.
- **User value:** Daily retrieval flow. Current global search only matches description+notes on the transactions page; power users need structured search (amount/date/category) and quick page navigation.
- **Dependencies:** `filterTransactions` engine; nav structure (`NAV_ITEMS`); global search box in `index.html`; Search & Filter redesign (deferred scope from Transactions refresh).
- **Estimated complexity:** **Medium**
- **Recommended priority:** **P1**
- **Success criteria:**
  - Structured search (e.g., `amount>50`, `cat:groceries`, `this month`) returns accurate, testable results.
  - Search results show matches across transactions, accounts, and categories with a count; zero-results state is actionable (already improved for transactions).
  - Keyboard-first navigation (faster page switching); no regression in filter tests.

### 5.9 Public Beta readiness

- **Goal:** Close the engineering-rigor gaps that gate wider distribution: browser E2E automation, full a11y audit, lint/type gate, PWA polish, documentation refresh, and privacy/security hardening.
- **User value:** A public Beta must not erode trust via crashes, a11y failures, stale-cache bugs, or untested flows. Quality gate directly protects the brand.
- **Dependencies:** Playwright E2E (new dev dependency); axe-core a11y; ESLint; PWA install/update polish; docs (ARCHITECTURE refresh).
- **Estimated complexity:** **Medium**
- **Recommended priority:** **P0**
- **Success criteria:**
  - E2E suite covers 8 core journeys + breakpoints (360/768/1024/1440) + PWA offline/install.
  - axe-core passes with zero critical/serious violations; keyboard pass on all pages/modals.
  - `npm test` green (451+ incl. new E2E); lint gate wired and clean.
  - Manual SW cache-versioning documented + verified update flow.

### 5.10 v1.0 Release readiness

- **Goal:** The gate that declares Ledger ready for a stable public release: feature set frozen, migration path proven, release checklist green, and a documented backup/restore + upgrade story.
- **User value:** A dependable 1.0 that users can trust with a *permanent financial record* — including future upgrades.
- **Dependencies:** Public Beta readiness; Data Protection; Data Model + migration paths; Feature specs; Release-Checklist.
- **Estimated complexity:** **Medium** (effort, not feature)
- **Recommended priority:** **P3**
- **Success criteria:**
  - Feature set + public-API/data-format freeze documented.
  - Migration path from any prior data shape proven by test (restore older backup → v1.0).
  - Release-Checklist fully green; known-issues list published.
  - Backup/restore and offline behavior verified end-to-end at release cut.

---

## 6. Consolidated roadmap summary

| Order | Phase | Initiative | Complexity | Priority |
|---|---|---|---|---|
| A | Trust & quality | Data Protection | Low–Med | P0 |
| A | Trust & quality | Public Beta readiness | Med | P0 |
| B | Data-in & mobile | Import Center (CSV+PDF+Presets) | High | P1 |
| B | Data-in & mobile | Mobile Experience Refresh | Med | P1 |
| C | Find faster | Search & Global Navigation | Med | P1 |
| D | Trust extensions | Financial Vault | Med–High | P2 |
| D | Trust extensions | Google Drive Backup | High | P2 |
| D | Trust extensions | Notifications | Med | P2 |
| E | Multi-device | Device Sync | High | P3 |
| F | Launch gate | v1.0 Release readiness | Med | P3 |

---

## 7. Cross-cutting workstreams

The following underpin every initiative and are tracked in the Documentation/Health roadmaps (not features, but dependencies):
- **Data Model specification** (Critical, `docs/Project/Data-Model.md`) — prerequisite for Import Center, Data Protection, Drive Backup, Sync.
- **Feature specifications** (Critical, `docs/Features/*`) — Transaction Engine, Import System, Backup & Restore, Sync Architecture, PWA Architecture.
- **Documentation consolidation** — the Documentation Roadmap (P0–P6) may proceed opportunistically when restructuring is *required* by an implementation, per the freeze.
- **Test strategy** — every initiative above adds tests before merge; E2E harness is a Phase A deliverable.

---

## 8. Definition of done for this roadmap

- [ ] Roadmap approved by the product owner; priorities and phasing locked for the next cycle.
- [ ] Each initiative can be decomposed into concrete, independently reviewable milestones at kickoff.
- [ ] No application code changes were made to produce this document.

---

*End of Product Roadmap. Planning only — no application code was modified.*
