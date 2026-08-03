# Feature Readiness Review — F-001 to F-004

**Document:** `docs/Features/Feature-Readiness-Review.md`
**Date:** 2026-08-02
**Status:** Draft (for approval)
**Type:** Readiness assessment (documentation only — no application code modified)
**Predecessors:** `docs/Features/F-001…F-004` (approved specs), `docs/Product/Product-Roadmap.md`, `docs/Project/Project-Health-Report.md`
**Baseline facts (verified):** 451/451 tests passing · Vitest is the only devDependency · zero runtime npm deps · `js/services/backup.js`, `js/services/csv-import.js`, `js/services/import-preview.js` exist · `_dupeKey` alignment already shipped · `docs/Project/Data-Model.md`, `docs/Features/Import-System.md`, `docs/Features/Sync-Architecture.md` do **not** exist yet.

---

## 1. Executive summary

All four approved features are implementable against the current codebase, but their readiness differs sharply because they depend on different amounts of existing infrastructure and different missing prerequisites.

- **F-001 Data Protection** is **ready to implement immediately** — it rides on working `backup.js` + dual persistence, and its only hard prerequisite (Data-Model.md) can be produced in the same workstream. Lowest risk, highest strategic value (it unlocks F-002).
- **F-003 Mobile Experience** is **ready to start now** — purely CSS/E2E/UX, no data-schema risk, but it introduces the first new dev dependency (Playwright) which should be sequenced deliberately.
- **F-004 Import Center** is **nearly ready** — the CSV/preview/dedup pipeline already exists; PDF parsing (new `pdf.js` dependency) and Import Presets are the net-new surface. Recommend **multiple phases** to land CSV consolidation first, PDF second.
- **F-002 Google Drive Backup** is **not ready to start immediately** — it requires F-001's versioned format, a Sync Architecture doc, and a decision on the token mechanism (a genuine product/security fork). Recommend deferring until F-001 lands and the OAuth question is resolved.

**Recommended first implementation: F-001 Data Protection.**

---

## 2. Feature-by-feature readiness

### 2.1 F-001 — Data Protection

**Implementation readiness assessment: HIGH — ready to implement immediately.**

**Dependencies already satisfied by the codebase:**
- `js/services/backup.js` provides working `exportBackup`, `validateBackup`, `importBackupFile`, and `_downloadCsv` (verified).
- Dual persistence (IndexedDB + localStorage) already in `js/services/storage.js` with migration on boot.
- Web Crypto API available in all modern browsers (checksum/encryption-ready).
- Existing `openConfirmModal`/`showToast` UI primitives for restore confirmations.
- 451-test baseline + snapshot harness already gate changes.

**Missing prerequisites:**
- `docs/Project/Data-Model.md` (canonical schema) — the spec lists it as prerequisite. It is documentation, producible within the F-001 workstream (see §4 milestone A0).
- Versioned wrapper format + migration framework (new code, in scope).

**Estimated implementation effort: LOW–MEDIUM (~1–2 focused milestones).**
- New pure module (`backup-format.js`): wrapper serialize/parse, `migrateBackup`, checksum.
- Settings card + reminder banner + meta persistence.
- Tests: round-trip, migration fixtures, checksum.

**Technical risks: LOW.**
- No change to entity schemas or the write path; `replaceAllData` path already exercised by restore.
- Migration framework must be kept pure and fixture-tested to avoid silent data change.

**Product risks: LOW.**
- Pure hardening; no new user-visible surface beyond Settings + a reminder banner. Low UX blast radius.

**Recommended implementation order: FIRST (Phase A).**

**Single vs. multiple phases: TWO PHASES (see §4).** Small enough to keep phases tight.

**Recommendation: READY TO IMPLEMENT IMMEDIATELY.**

---

### 2.2 F-002 — Google Drive Backup

**Implementation readiness assessment: LOW — not ready to start now.**

**Dependencies already satisfied by the codebase:**
- Web Crypto API (AES-GCM + PBKDF2 available).
- F-001 versioned format will exist after F-001 lands (required foundation).
- Local storage abstractions for token/meta persistence.

**Missing prerequisites (significant):**
- **F-001 Data Protection must ship first** — the format/migration foundation.
- `docs/Features/Sync-Architecture.md` — defines the adapter boundary + threat model (documentation not yet authored).
- **Open decision: OAuth token mechanism without a Ledger server** (implicit/pkce public client vs. user-hosted gateway vs. Chrome-only identity). This is an unresolved product/security fork that blocks the FR-2 design.
- New `pdf.js`-independent but security-sensitive: Drive REST integration + token storage must be reviewed.

**Estimated implementation effort: HIGH (~3+ milestones).**
- Encryption/wrapping (pure) + Drive client + metadata listing + restore flow + conflict safety + Settings UX + tests.

**Technical risks: MEDIUM–HIGH.**
- OAuth without a server is the crux; token lifetime/refresh and CSP compatibility need design.
- Encryption bugs are data-loss vectors — requires adversarial testing (ciphertext contains no plaintext).
- Drive API drift / quota / permission UX.

**Product risks: MEDIUM.**
- Must preserve "no Ledger account" promise; a botched auth flow could feel like a forced account.
- Passphrase-loss irrecoverability must be crystal-clear in UX.

**Recommended implementation order: AFTER F-001 (Phase D of roadmap).**

**Single vs. multiple phases: MULTIPLE (3+).**

**Recommendation: NOT READY NOW — unblock by F-001 + Sync Architecture doc + OAuth decision.**

---

### 2.3 F-003 — Mobile Experience

**Implementation readiness assessment: HIGH — ready to start now (with a deliberate sequencing decision).**

**Dependencies already satisfied by the codebase:**
- LDS responsive foundation implemented (`--bp-*`, `desktop-only`, breakpoint media blocks).
- Running-balance two-line mobile layout already exists (Transactions Sprint 2) — verification target, not new build.
- PWA manifest + icons + service worker already present (installability exists).
- Snapshot harness (42 pages) provides a regression baseline.

**Missing prerequisites:**
- **Playwright (new dev dependency)** — first E2E harness in the repo; requires approval to add a dependency and a Test-Strategy doc note.
- Manifest `screenshots`/`shortcuts` additions (small).
- Install-prompt UX module (small, only if hint added).

**Estimated implementation effort: MEDIUM (~2 milestones).**
- E2E scaffold + breakpoint checks + screenshots.
- Touch-target CSS pass + running-balance ≤360px fix + toolbar wrap.
- Install/update UX.

**Technical risks: MEDIUM.**
- Adding the first E2E tooling is an infra change with setup cost (CI-less environment; local-only for now).
- Mobile regressions are only fully caught by the new harness — the risk is *coverage*, not the feature itself.

**Product risks: LOW.**
- High user value (PWA is used on phones); low chance of data or business-logic harm.

**Recommended implementation order: SECOND or PARALLEL with F-001 (Phase B).**

**Single vs. multiple phases: MULTIPLE (2).**

**Recommendation: READY TO START — but sequence Playwright adoption deliberately (see §5).**

---

### 2.4 F-004 — Import Center (CSV + PDF + Presets)

**Implementation readiness assessment: MEDIUM-HIGH — nearly ready; ship in phases.**

**Dependencies already satisfied by the codebase:**
- CSV pipeline exists (`csv-import.js`: `parseCsv`, `normalizeDate`, `csvDetermineType`; `import-preview.js`: `openImportPreviewModal`, `parseStatementText`, category suggestion; `_dupeKey` alignment already shipped).
- `addTransactionBatch` (single save/render) + category learning already in place.
- Statement-text paste already works — part of the Center for free.

**Missing prerequisites:**
- `docs/Features/Import-System.md` + `docs/Project/Data-Model.md` (canonical references) — documentation, producible in-stream.
- **`pdf.js` (new runtime dependency)** — requires license + security review, and a Web Worker for extraction.
- Import presets CRUD + persistence (new code).
- Import Center UI surface (new component/page).

**Estimated implementation effort: HIGH overall, MEDIUM per phase.**

**Technical risks: MEDIUM.**
- PDF parsing accuracy is the main technical risk (layout detection is inherently fragile) — mitigate with a ≥3-bank fixture corpus and ≥95% accuracy gate.
- New runtime dependency (pdf.js) needs supply-chain/security review before merging.
- Malformed-row handling must never commit garbage.

**Product risks: MEDIUM.**
- High value (onboarding) but high expectation — a poor PDF experience could damage trust; phase carefully to keep CSV strong while PDF matures.

**Recommended implementation order: AFTER F-001 + F-003 (Phase B/C of roadmap).**

**Single vs. multiple phases: MULTIPLE (3+).**

**Recommendation: READY TO START THE CSV-CONSOLIDATION SLICE; PDF and Presets in later phases.**

---

## 3. Recommended implementation order (rationale)

| Order | Feature | Why this position |
|---|---|---|
| **1** | **F-001 Data Protection** | Lowest risk, pure hardening, unlocks F-002, builds on existing backup.js. Trust foundation (roadmap P0). |
| **2** | **F-003 Mobile Experience** | No schema risk, high user value, but adopts new E2E tooling — land early so later features get the harness. |
| **3** | **F-004 Import Center** (CSV slice first) | Highest onboarding value; rides existing pipeline; PDF/presets phased after CSV consolidation. |
| **4** | **F-002 Google Drive Backup** | Highest risk + biggest open decision; only sensible after F-001 format + Sync Architecture doc exist. |

Rationale: **risk-adjusted value.** F-001 gives the most value-per-risk and de-risks everything cloud. F-003 establishes the verification harness the later features will need. F-004 delivers the biggest onboarding win once the harness exists to protect it. F-002 waits on the format + a resolved OAuth decision.

---

## 4. Proposed milestones

### F-001 Data Protection (2 phases)

- **F1-M1 — Format & round-trip:** `backup-format.js` (wrapper + checksum), legacy→v1 migration, `exportBackup`/`importBackupFile` upgrade, round-trip + migration unit tests. *Exit: 451 + new tests green; restore of a legacy file works.*
- **F1-M2 — Health & reminders:** Settings "Backup & Restore" card (health status, Back up now, reminder interval), auto-reminder banner, meta persistence, snapshot gate. *Exit: all F-001 success criteria met.*

*(A0 — author `docs/Project/Data-Model.md` as an explicit prerequisite, produced at the start of F1-M1.)*

### F-002 Google Drive Backup (3+ phases, not immediate)

- **F2-M1 — Prereqs:** Sync Architecture doc + OAuth decision.
- **F2-M2 — Encryption core:** pure encrypt/decrypt (PBKDF2+AES-GCM) + adversarial tests.
- **F2-M3 — Drive client:** upload/list/download + metadata + Settings connect UX.
- **F2-M4 — Restore & conflict safety + hardening.**

### F-003 Mobile Experience (2 phases)

- **F3-M1 — E2E foundation:** Playwright scaffold + 5-breakpoint smoke + screenshot diffs + touch-target audit harness. *Exit: harness green; desktop snapshots unchanged.*
- **F3-M2 — Polish:** running-balance ≤360px verification/fix, toolbar wrap at 480–880px, install-prompt UX, manifest `screenshots`/`shortcuts`, accessibility pass.

### F-004 Import Center (3+ phases)

- **F4-M1 — Consolidate:** single Import Center surface hosting existing CSV + paste; presets CRUD for CSV. *Exit: CSV behavior unchanged; preset round-trip tested.*
- **F4-M2 — PDF:** `pdf.js` adoption (license/security review) + Web Worker extraction + ≥3-bank fixture corpus + accuracy gate.
- **F4-M3 — Polish & edge cases:** malformed-row UX, preset auto-detect, backup-metadata integration (presets in F-001 backup).

---

## 5. Dependency-adoption note (affects F-003 and F-004)

Both F-003 (Playwright, dev) and F-004 (pdf.js, runtime) introduce the project's **first external dependencies beyond Vitest**. This is a meaningful change to the zero-dependency philosophy. Recommendation: adopt Playwright first (F-003) as a deliberate, reviewed step — it pays for itself by protecting F-004's parser changes — and gate pdf.js behind a formal license + security + CSP review before merging.

---

## 6. Final recommendation

**Implement F-001 Data Protection first.**

**Why:**
- **User value:** protects the *permanent financial record* — the product's core promise (LPA-001). No feature matters if the data can be lost.
- **Risk:** lowest of the four — rides on working `backup.js` + dual persistence; pure hardening; no schema or OAuth risk.
- **Architectural dependencies:** F-001 is the foundation for F-002 (Google Drive Backup) and Device Sync; every later cloud feature consumes its versioned format.
- **Current project maturity:** Beta — the natural next step after the Transactions refresh is *trust hardening* (roadmap Phase A, P0).
- **Existing roadmap:** F-001 is the designated first P0 item; it also produces `docs/Project/Data-Model.md`, which is a prerequisite for F-004's deeper work and for Sync.

**Order after F-001:** F-003 (Mobile + E2E harness) → F-004 (Import Center, CSV first) → F-002 (Drive Backup, once OAuth is decided).

**Bottom line:** F-001 is the only feature that is simultaneously lowest-risk, highest-trust-value, and a dependency of the rest. Begin with F1-M1, with `docs/Project/Data-Model.md` authored first.

---

*End of Feature Readiness Review. Documentation only — no application code was modified.*
