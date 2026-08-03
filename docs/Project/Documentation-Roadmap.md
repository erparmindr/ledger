# Ledger — Documentation Consolidation Roadmap

**Document:** `docs/Project/Documentation-Roadmap.md`
**Date:** 2026-08-02
**Type:** Planning document (no application code changes; no file reorganization performed — this is a plan only)
**Predecessor:** `docs/Project/Documentation-Index.md` (inventory, staleness/duplication findings, authoritative source map)
**Status:** Proposed — awaiting approval before any reorganization

---

## 1. Purpose

This roadmap defines **how** Ledger's documentation will be consolidated into one maintainable, unambiguous structure. It is the execution plan behind the findings in the Documentation Index:

1. Two parallel design-system families (**LDS** — implemented, governed; **LPDS** — mostly empty stubs plus the valuable **LPDS-000** UI backlog).
2. A stale root `ARCHITECTURE.md` that predates the 451-test suite and PLANS 1–5.
3. Missing documentation (feature specs, data model, test strategy, architecture notes) with no single source of truth.
4. Cross-references (QA/Release checklists) that point at unwritten LPDS specs.

The plan is **phased**, **reference-safe** (existing links never break mid-flight), and **non-destructive** (nothing is deleted until fully absorbed).

**Guiding principles**
- **One authoritative home per fact.** Every topic has exactly one governing document; everything else links to it.
- **Links before deletions.** New canonical homes and redirects ship before old files are removed.
- **Preserve the backlog.** LPDS-000 (UI Problems Register) is the most valuable LPDS artifact and is explicitly preserved.
- **Docs-only.** This plan never touches application code; implementation happens in dedicated documentation passes.

---

## 2. Phased consolidation plan

| Phase | Name | Scope | Exit criteria |
|---|---|---|---|
| **P0** | **Freeze & baseline** | Document current references (grep all `docs/**` + root for `LPA-`, `LPDS-`, `LDS-`, `ARCHITECTURE.md`, `PLANS.md`). Record the link map as a manifest. | Manifest committed; every existing cross-reference enumerated. |
| **P1** | **Create missing canonical homes** | Author the highest-value missing docs (Feature Specs, Data Model, Test Strategy, Architecture refresh) in their final locations so content can be *moved toward* them. | New canonical docs exist (Draft status); no old content deleted. |
| **P2** | **Merge LPDS → LDS** | Adopt LPDS-000 as LDS-000 (UI Problems Register); retire LPDS-001–015 stub slots; remap all QA/Release "LPDS" references to LDS. | LDS is the sole design-system family; zero references to retired LPDS-001–015. |
| **P3** | **Refresh/relocate root docs** | Update `ARCHITECTURE.md` content; move root `ARCHITECTURE.md` + `PLANS.md` under `docs/` with redirect stubs (or leave root as thin pointers). | No stale claims; root pointers resolve. |
| **P4** | **Merge Research folders** | Fold `docs/LPDS/Research/*` into `docs/LDS/Research/` (dedupe overlap with `UI-Architecture-Inventory.md`). | Single Research home; no orphaned research. |
| **P5** | **Regenerate indices** | Refresh `docs/README.md` + `Documentation-Index.md` to the final structure; verify every link. | Index matches reality; link checker clean. |
| **P6** | **Retire & verify** | Remove stubs/redirects only after a full pass confirms nothing links to them; re-run the manifest diff. | Zero broken references; obsolete files deleted with recorded history. |

Each phase is independently reviewable and reversible. Phases may be combined only when their exit criteria are trivially satisfied.

---

## 3. Migration strategy: retiring duplicate LPDS while preserving LPDS-000

**Decision:** LPDS is *not* deleted wholesale. Its one real asset (the UI Problems Register) is promoted; its empty spec slots are retired because LDS-001–005 already govern the same topics with implemented tokens.

### 3.1 What happens to each LPDS artifact

| LPDS artifact | Disposition | Mechanism |
|---|---|---|
| **LPDS-000 UI Problems Register** | **Preserved and promoted → LDS-000** | Rename file to `LDS-000-UI-Problems-Register.md`; update the header (title, doc ID, "Related LPDS Document" fields become "Related LDS Document"); keep all 10 issues, severities, and statuses verbatim; append an audit note that the ID changed. |
| **LPDS-001 … LPDS-015 (stubs)** | **Retired** | Each is an 8-line "Planned" placeholder with zero content. The topics are already covered by LDS-001–005 (layout/type/spacing/color/elevation) and reserved LDS-006–011 (components, nav, data-viz, forms, motion, iconography). Stubs are deleted **only after** all references are remapped (Phase P2). |
| **LPDS README.md** | **Superseded** | Content absorbed into the LDS index + `docs/README.md`; file retired. |
| **LPDS Research/ (4 files)** | **Moved** | Component-Dependency-Map, Layout-Inventory, Layout-Tokens, Responsive-Inventory → `docs/LDS/Research/` (dedupe with `UI-Architecture-Inventory.md`; merge overlapping tables, keep one file per topic). |

### 3.2 Reference remap (who points at LPDS today)

- **`docs/QA/README.md`** — "review against the LPDS and LPA-001" → "review against the LDS and LPA-001".
- **`docs/QA/UI-Review-Checklist.md`** — "Ledger Product Design System (LPDS)" → "Ledger Design System (LDS)"; "LPDS spec(s)" → "LDS spec(s)".
- **`docs/QA/Release-Checklist.md`** — "LPDS-000" → "LDS-000"; "LPDS-UI-001" → "LDS-UI-001"; "LPDS README updated" → "LDS README updated".
- **`docs/LPDS/LPDS-000-UI-Problems-Register.md`** — self-references and "Related LPDS Document" fields → LDS equivalents (done during the promote step).
- **`docs/LDS/Implementation/Transactions-Sprint2-Report.md`** — mentions "LPDS" in scope wording; these are historical statements, leave as-is (historical records are not rewritten).

### 3.3 Backlog continuity (the key requirement)

The UI backlog is the *living* artifact. To guarantee no issue is lost:

1. Create **LDS-000** as a byte-for-byte copy first (Phase P1/P2 boundary).
2. Update the register's internal "Related" fields to the new LDS IDs.
3. Point all new issue submissions at LDS-000 (update the LDS-Index §governance text to say the backlog lives at LDS-000).
4. Only then delete the old LPDS-000 file (Phase P6), after a diff confirms the new file is a superset.

---

## 4. Proposed final documentation structure

```text
docs/
├── README.md                       ← top index: folder table + pointer to Documentation-Index
├── Project/
│   ├── Documentation-Index.md      ← entry point (every doc, status, authoritative map)
│   ├── Documentation-Roadmap.md    ← THIS FILE
│   ├── Project-Health-Report.md
│   ├── Architecture.md             ← refreshed successor to root ARCHITECTURE.md
│   ├── Data-Model.md               ← NEW (see §5)
│   └── Roadmap.md                  ← product/feature roadmap (future)
├── Product/                        ← renamed from LPA/ (LPA-001 stays canonical)
│   ├── README.md
│   ├── LPA-001-Product-Vision-and-Design-Principles.md   ← AUTHORITATIVE: product decisions
│   └── LPA-002…005 (authored as needed; stubs until then)
├── Design-System/                  ← single design system (merged from LDS + LPDS)
│   ├── LDS-Index.md                ← AUTHORITATIVE: design system governance
│   ├── LDS-000-UI-Problems-Register.md   ← promoted from LPDS-000
│   ├── LDS-001-Layout-System.md    ← AUTHORITATIVE: layout
│   ├── LDS-002-Typography.md
│   ├── LDS-003-Spacing-System.md
│   ├── LDS-004-Color-System.md
│   ├── LDS-005-Elevation-Shadows.md
│   ├── LDS-006…011 (authored later: Components, Nav, Data-Viz, Forms, Motion, Iconography)
│   ├── Research/                   ← merged (UI inventory + component/layout/token/responsive inventories)
│   └── Implementation/             ← Migration-Tracker, LDS-M2…M5, Sprint 1/2, Refresh-Summary
├── Features/                       ← NEW: one spec per feature (see §5)
│   ├── Transaction-Engine.md
│   ├── Import-System.md
│   ├── Backup-Restore.md
│   ├── Sync-Architecture.md
│   ├── PWA-Architecture.md
│   └── (Recurring.md, Reconciliation.md, Reports.md, People/Debt.md as needed)
├── QA/
│   ├── README.md
│   ├── Accessibility-Checklist.md
│   ├── UI-Review-Checklist.md
│   ├── Release-Checklist.md
│   └── Test-Strategy.md            ← NEW (see §5)
└── PLANS.md                        ← moved from root; implementation plans (historical + active)
```

> **Renaming LPA → Product** is optional cosmetic value. The critical moves are: (a) merge LPDS→LDS, (b) create `docs/Features/`, (c) relocate/refresh root architecture + plans.

---

## 5. Prioritized missing documentation to create

Authoritative homes, ordered by value-to-cost. All are new docs (Draft status) — none require deleting existing content.

| # | Document | Priority | Where it lives | What it must specify |
|---|---|---|---|---|
| 1 | **Feature Specifications** (index + per-feature) | **Critical** | `docs/Features/` | One doc per feature defining expected behavior, inputs, edge cases, and acceptance criteria (import, recurring, reconciliation, transfers, reports, people/debt). Currently behavior exists only in code + tests. |
| 2 | **Data Model** | **Critical** | `docs/Project/Data-Model.md` | Full schema for `transactions`, `accounts`, `categories`/`subcategories`, `people`, `groups`, `debtItems`, `recurring`, `subcategoryLearning`/`categoryLearning`; field types, defaults, invariants, and the stringly-typed enums (`type`, `fromType`, `linkRole`). |
| 3 | **Test Strategy** | **High** | `docs/QA/Test-Strategy.md` | What the 451-test suite covers, what is manual-only, how to add tests, and the snapshot/E2E gap (per Project-Health-Report §7). |
| 4 | **Transaction Engine** | **High** | `docs/Features/Transaction-Engine.md` | Lifecycle: create/edit/delete, validation, category splits, friend splits, refund linking, and the `commitLinkedTransferPair` cross-currency pair flow. |
| 5 | **Import System** | **High** | `docs/Features/Import-System.md` | CSV parse → normalize → preview → dedup (`_dupeKey`) → category suggestion → batch commit → learning; supported formats; malformed-input handling. |
| 6 | **Backup & Restore** | **Medium** | `docs/Features/Backup-Restore.md` | JSON export/import, `validateBackup`, CSV export, dual persistence, and the manual/auto-export recommendation. |
| 7 | **Sync Architecture** | **Medium** | `docs/Features/Sync-Architecture.md` | Current state = no sync (offline-only). Define the adapter boundary (`Storage` interface in `storage.js`), what a future Google Drive adapter must satisfy, and conflict/merge constraints. |
| 8 | **PWA Architecture** | **Medium** | `docs/Features/PWA-Architecture.md` | `manifest.json`, service-worker cache strategy (network-first shell), the manual `v117`/`?v=` versioning procedure, installability, and offline behavior. |

**Suggested authoring order:** Data Model → Transaction Engine → Import System (they reference each other, so author together) → Feature index → Test Strategy → Backup/Restore → PWA → Sync. All new docs should be marked **Draft** and reviewed before promotion.

---

## 6. Safe migration sequence (no broken references)

The invariant: **at every step, every existing link in the repo resolves to a real, meaningful file.**

1. **P0 — Snapshot the reference manifest.** Record every file that references `LPA-`, `LPDS-`, `LDS-`, `ARCHITECTURE.md`, `PLANS.md`, and every `docs/**` markdown link. This is the diff baseline for P6.
2. **P1 — Create the missing canonical docs** in their final locations (§5), status `Draft`. No old file is touched yet.
3. **P2 — Promote LPDS-000 → LDS-000.** Copy file; update header + internal "Related" fields; add "moved from LPDS-000" note. Do **not** delete the original yet.
4. **P2b — Remap references.** Update `docs/QA/README.md`, `UI-Review-Checklist.md`, `Release-Checklist.md`, and LDS-Index governance text from LPDS IDs to LDS IDs. Commit this as one "reference remap" change so it is atomic and reviewable.
5. **P3 — Refresh/relocate root docs.** Rewrite `ARCHITECTURE.md` content into `docs/Project/Architecture.md` (mark current). Move `PLANS.md` under `docs/`. Add thin root stubs (`ARCHITECTURE.md` → "see docs/Project/Architecture.md") if root files must stay for discoverability.
6. **P4 — Merge Research folders.** Move the four LPDS Research files into `docs/LDS/Research/`; merge overlapping tables with `UI-Architecture-Inventory.md`; update any in-doc references.
7. **P5 — Regenerate indices.** Rewrite `docs/README.md` folder table + `Documentation-Index.md` to the final tree. Run a link checker across `docs/**` and root.
8. **P6 — Retire only the dead weight.** After P5 confirms nothing references them, delete the LPDS-001–015 stubs and the old LPDS-000 file (after verifying LDS-000 is a superset). Record deletions in `Documentation-Index.md` history. Re-run the P0 manifest diff — must be clean.

**Rollback:** because P1/P2 create new files before touching old ones, every phase is reversible by restoring the reference manifest from P0.

---

## 7. Never-duplicate-again register (single source of truth)

The following topics must each have exactly **one** authoritative home. All other files link there and never restate the facts.

| Topic | Single source of truth | Duplicates to avoid |
|---|---|---|
| **Product vision / principles** | `docs/Product/LPA-001` (currently `docs/LPA/LPA-001`) | Any per-feature or per-page restatement of "why" |
| **Design system tokens & specs** | `docs/Design-System/LDS-Index.md` + `LDS-001…005` | The 15 LPDS stub slots; any new `colors.css`-style ad-hoc token doc |
| **UI problem backlog** | `docs/Design-System/LDS-000` (promoted from LPDS-000) | A second problems register anywhere |
| **Design-system migration status** | `docs/Design-System/Implementation/Migration-Tracker.md` | Milestone reports may *summarize* but never replace the tracker |
| **Architecture** | `docs/Project/Architecture.md` (refreshed) | Root `ARCHITECTURE.md` once moved; page-level architecture notes |
| **Data model / schema** | `docs/Project/Data-Model.md` | Field lists scattered in per-feature specs (they *reference* the model, never redefine it) |
| **Feature behavior** | `docs/Features/<feature>.md` (one per feature) | Business rules duplicated in page/modal code comments and multiple specs |
| **Import lifecycle** | `docs/Features/Import-System.md` | The inline-key and dedup logic described in two places (already unified in code; keep docs single) |
| **Transfer-pair lifecycle** | `docs/Features/Transaction-Engine.md` | A separate transfer doc (fold into the engine) |
| **Backup format / procedure** | `docs/Features/Backup-Restore.md` | Versioning notes scattered in Release-Checklist |
| **Test strategy / coverage** | `docs/QA/Test-Strategy.md` | Coverage claims restated in sprint reports (they may report, not define) |
| **Release process / versioning** | `docs/QA/Release-Checklist.md` | The manual `sw.js` cache-bump + `?v=` procedure must be written here and referenced, not duplicated in commit messages |
| **Project status / maturity** | `docs/Project/Project-Health-Report.md` | The health table currently duplicated in `ARCHITECTURE.md` |

**Enforcement rule:** any new document that must state one of the above facts adds a *link* to the canonical home instead of a copy. The Documentation-Index §8 (Authoritative Source Map) is the enforced lookup table.

---

## 8. Open questions / decisions needed before execution

1. **Rename LPA → Product?** Low-value, cosmetic; default is *keep LPA naming* to avoid churn.
2. **Delete LPDS-001–015 stubs vs. repurpose their titles under LDS-006…011?** Recommend *retire*, since LDS-006–011 already reserve the slots — but confirm no external tooling expects the LPDS filenames.
3. **Keep root `ARCHITECTURE.md`/`PLANS.md` as thin pointers after relocation?** Recommend yes for GitHub discoverability; confirm preference.
4. **Do historical docs (sprint reports, M2–M5) get rewritten?** **No** — historical records are immutable; only their cross-references may be annotated.

---

## 9. Definition of done

The consolidation is complete when:
- [ ] `docs/` has the structure in §4 with no orphaned folders.
- [ ] LDS is the **only** design-system family; LPDS-001–015 are gone; LDS-000 holds the backlog.
- [ ] No reference to `LPDS-00` or the old root `ARCHITECTURE.md` claims remains (historical report prose excepted).
- [ ] All §5 missing docs exist as Drafts in `docs/Features/`, `docs/Project/`, `docs/QA/`.
- [ ] `docs/README.md` + `Documentation-Index.md` reflect the final tree and pass a link check.
- [ ] P0 reference-manifest diff is clean at P6.

---

*End of Documentation Consolidation Roadmap. Planning only — no files were moved and no application code was modified.*
