# Ledger — Documentation Index

**Document:** `docs/Project/Documentation-Index.md`
**Date:** 2026-08-02
**Type:** Documentation audit (no application code modified)
**Purpose:** Single entry point to every major project document — what it is, who it's for, how current it is, and which documents are authoritative for each decision type.

> Start here. If a document is not listed here, it is either a stub/reserved slot (see §4) or a working file that should not be treated as authoritative.

---

## 1. Purpose and how to use this index

The Ledger repository carries documentation in four places: repo root, `docs/`, and two research folders. Over time two parallel documentation families grew up (**LPA** + **LPDS** from the product-framework milestone, **LDS** from the design-system milestone), which creates ambiguity about which document governs a given decision.

This index resolves that ambiguity by:

1. Listing every major document and its current purpose/status.
2. Flagging what is outdated, duplicated, or missing.
3. Verifying cross-references between LDS, Architecture, Project, and Feature docs.
4. Recommending a long-term structure.
5. Declaring which documents are **authoritative** for each domain.

**Reader guidance:** Consult the *Authoritative Source Map* (§8) first to find the governing document for your task; consult the *Inventory* (§3) for everything else.

---

## 2. Document families at a glance

| Family | Prefix | Location | Answers | Governance status |
|---|---|---|---|---|
| **LPA** — Ledger Product Architecture | `LPA-0xx` | `docs/LPA/` | *Why* the product exists, vision, principles | LPA-001 real (Draft); LPA-002–005 **stubs** |
| **LPDS** — Ledger Product Design System | `LPDS-0xx` | `docs/LPDS/` | *How* components/patterns are specified | LPDS-000 real (Active); LPDS-001–015 **stubs** |
| **LDS** — Ledger Design System | `LDS-0xx` | `docs/LDS/` | *What* the UI contract is (tokens, layout, type, color) | LDS-Index + LDS-001–005 real (Draft-for-ratification) |
| **QA** | — | `docs/QA/` | Release/UI/a11y quality gates | Real |
| **Project** | — | `docs/Project/` | Health & status reports | Real |
| **Root** | — | repo root (`ARCHITECTURE.md`, `PLANS.md`, `README.md`) | Architecture assessment, implementation plans, project readme | Mixed (ARCHITECTURE.md stale) |

---

## 3. Complete inventory

### 3.1 Repository root

| Document | Purpose | Status / Accuracy |
|---|---|---|
| `README.md` | Project readme: positioning, feature list, quick start, deploy. | Current. Minimal, no doc pointers. |
| `ARCHITECTURE.md` | Full technical architecture assessment (layers, store, services, risks, dependency maps, health table). | **OUTDATED** — dated 2026-07-28; still claims "no tests" and lists weaknesses since fixed (bulk delete, shared filter, dedup keys, `skipSave`). See §4.1. |
| `PLANS.md` | Numbered implementation plans (1–6) with status table. | Current — final status table shows Plans 1–5 implemented & approved, Plan 6 deferred. |
| `manifest.json`, `sw.js`, `index.html`, `css/`, `js/`, `tests/` | Application + tests (not documentation, listed for completeness). | — |

### 3.2 `docs/README.md` (top-level documentation index)

| Document | Purpose | Status |
|---|---|---|
| `docs/README.md` | Master index of documentation folders. | **OUTDATED** — lists only `LPA/`, `LPDS/`, `QA/`; **omits `LDS/` and `Project/`**. See §4.1. |

### 3.3 `docs/LPA/` — Product Architecture

| Document | Purpose | Status |
|---|---|---|
| `README.md` | LPA index + status table. | Current (matches stub statuses). |
| `LPA-001-Product-Vision-and-Design-Principles.md` | Vision, philosophy, design principles (the only real LPA doc). | **Draft** — **authoritative for product decisions** until LPA-002–005 land. |
| `LPA-002-Product-Strategy.md` | Strategy. | **Stub** ("Planned"). |
| `LPA-003-Design-DNA.md` | Design DNA. | **Stub**. |
| `LPA-004-Competitive-Analysis.md` | Competitive analysis. | **Stub**. |
| `LPA-005-UX-Philosophy.md` | UX philosophy. | **Stub**. |

### 3.4 `docs/LPDS/` — Product Design System

| Document | Purpose | Status |
|---|---|---|
| `README.md` | LPDS index + status table. | Current (marks 001–015 Planned). |
| `LPDS-000-UI-Problems-Register.md` | Living backlog of UI/UX defects (10 issues, severities, expected behavior). | **Active** — authoritative backlog for UI issues. |
| `LPDS-001-Layout-System.md` … `LPDS-015-Responsive-System.md` | Component/pattern specs (layout, grid, spacing, type, color, buttons, inputs, dropdowns, cards, tables, dialogs, nav, animation, a11y, responsive). | **All stubs** ("Planned", 8 lines each). No content authored. |
| `Research/Component-Dependency-Map.md` | Pre-implementation component dependency analysis. | Real, research-only. |
| `Research/Layout-Inventory.md` | Layout inventory (pre-LDS). | Real, research-only. |
| `Research/Layout-Tokens.md` | Layout token survey. | Real, research-only. |
| `Research/Responsive-Inventory.md` | Responsive breakpoint inventory. | Real, research-only. |

### 3.5 `docs/LDS/` — Ledger Design System *(the implemented design system)*

| Document | Purpose | Status |
|---|---|---|
| `LDS-Index.md` | **Master index, governance, dependency graph, lifecycle, change control** for the whole LDS. | **Internal (1.0.0-draft)** — read first. |
| `LDS-001-Layout-System.md` | Layout spec: grids, breakpoints, sidebar, header, spacing, modal tiers, z-index, scroll/overflow. | Draft-for-ratification; foundational. |
| `LDS-002-Typography.md` | Type scale, semantic text tokens, numeric/currency type, responsive type. | Draft-for-ratification. |
| `LDS-003-Spacing-System.md` | `--sp-*` scale, component/page spacing, forbidden values, migration. | Draft-for-ratification. |
| `LDS-004-Color-System.md` | Semantic color roles, surfaces, status, dark mode, contrast. | Draft-for-ratification. |
| `LDS-005-Elevation-Shadows.md` | Shadow tokens, radius, focus rings, overlays. | Draft-for-ratification. |
| `Research/UI-Architecture-Inventory.md` | Pre-LDS research baseline (1,913-line CSS audit, layout facts). | Real, research-only, historical. |
| `Implementation/LDS-Preparation-Report.md` | Approved no-visual-change refactor report (shared helpers, dead CSS removal). | Approved; historical. |
| `Implementation/Migration-Tracker.md` | **Single source of truth for LDS migration progress** (tokens→consumption). | Current — authoritative for design-system migration status. |
| `Implementation/LDS-M2..M5-*.md` | Milestone implementation reports (Layout, Typography, Spacing, Colors/Elevation). | Real; historical milestone records. |
| `Implementation/Transactions-Sprint1-Report.md` | Sprint 1 report (7 UI/UX fixes). | Real; historical. |
| `Implementation/Transactions-Sprint2-Report.md` | Sprint 2 report (a11y, running balance, empty state). | Real; historical. |
| `Implementation/Transactions-Refresh-Summary.md` | Combined Sprint 1+2 summary + user-visible improvements + follow-ups. | Real; current summary of the refresh. |

> **Numbering note:** LDS-Index reserves **LDS-006 … LDS-011** (Components, Navigation, Data Visualization/Tables, Forms & Inputs, Motion, Iconography). None are authored yet.

### 3.6 `docs/QA/` — Quality Assurance

| Document | Purpose | Status |
|---|---|---|
| `README.md` | QA index. | Current. |
| `Accessibility-Checklist.md` | WCAG 2.1 AA-aligned a11y gates. | Real. |
| `UI-Review-Checklist.md` | Visual/interaction review against LPDS + LPA-001. | Real (references LPDS stubs — see §6). |
| `Release-Checklist.md` | Pre-release gates incl. LPDS-000 / LPDS-UI-001 checks. | Real (references LPDS — see §6). |

### 3.7 `docs/Project/`

| Document | Purpose | Status |
|---|---|---|
| `Project-Health-Report.md` | Current engineering health assessment: maturity (Beta), strengths, debt, roadmap, top-10 pre-beta items. | Current (2026-08-02). |
| `Documentation-Index.md` | This document. | Current. |

---

## 4. Outdated documentation

1. **`ARCHITECTURE.md` (root)** — the most consequential stale doc. It predates the 451-test suite and the PLANS 1–5 refactors; it asserts "no test coverage for critical paths" and lists weaknesses already fixed. **Risk:** future contributors (human or AI) will act on wrong assumptions. **Action:** refresh against current code, or retire and fold current state into a new architecture note under `docs/Project/` (recommended — see §7).
2. **`docs/README.md`** — the top-level index omits `LDS/` and `Project/` folders and does not mention the Documentation Index. **Action:** regenerate the folder table (a fix to this file is warranted; see §9).
3. **`docs/LDS/Research/UI-Architecture-Inventory.md`** — labeled "pre-LDS" and historical, so not broken; keep as historical baseline but do not rely on its line numbers (CSS has since changed).

## 5. Duplicate documentation

The single largest structural issue: **two parallel design-system families that overlap in scope.**

| Topic | LPDS (Product Design System) | LDS (Ledger Design System) | Overlap |
|---|---|---|---|
| Layout | LPDS-001 (stub) + Research/Layout-Inventory | LDS-001 (real, implemented tokens) | Yes |
| Typography | LPDS-004 (stub) | LDS-002 (real) | Yes |
| Spacing | LPDS-003 (stub) + Research/Layout-Tokens | LDS-003 (real) | Yes |
| Color | LPDS-005 (stub) | LDS-004 (real) | Yes |
| Components/Patterns | LPDS-006…015 (stubs) | LDS-006…011 (reserved, not authored) | Yes |
| **UI problem backlog** | LPDS-000 (real, Active) | *(none)* | — |

**Conclusion:** LDS is the implemented, token-backed, governed design system. LPDS exists mostly as reserved stubs plus the LPDS-000 backlog. The LPDS-000 register is genuinely valuable and should survive; the LPDS-001–015 spec slots duplicate LDS-001–005/LDS-006–011. **Recommendation:** collapse to one system (see §7).

**Other duplication:** none material — the two *Research/* folders are complementary (LDS holds a UI inventory; LPDS holds component/layout/token/responsive inventories) but should be merged or cross-linked to avoid divergence.

## 6. Missing documentation

| Gap | Impact | Where it should live |
|---|---|---|
| **Feature specifications** (per-feature behavior/specs) | No doc authoritatively defines expected behavior for a feature (import, recurring, reconciliation, transfers). Tests partly cover it; docs do not. | `docs/Features/` or `docs/Specs/` (new) |
| **Data model / schema doc** | Fields for `transactions`, `accounts`, `debtItems`, `recurring` are undocumented. | `docs/Project/` or `docs/Architecture/` |
| **Import lifecycle doc** | CSV/statement → parse → preview → dedup → commit flow not written down. | `docs/Features/` |
| **Transfer-pair lifecycle doc** | Cross-currency link creation/update/delete not documented. | `docs/Features/` |
| **Test strategy doc** | What scenarios are covered vs. manual; how to extend. QA checklists exist but no strategy. | `docs/QA/` |
| **Release/versioning note** | `sw.js` cache-bump + `?v=` versioning is manual with no written procedure. | `docs/QA/Release-Checklist.md` |
| **LDS-006…011 content** | Component/Nav/DataViz/Forms/Motion/Iconography specs reserved but unwritten. | `docs/LDS/` |

## 7. Recommended long-term documentation structure

Consolidate into a single, clear tree with one index (this file) and unambiguous ownership.

```text
docs/
├── README.md                        ← regenerated top index (folder table + pointer to Documentation-Index)
├── Project/
│   ├── Documentation-Index.md       ← THIS FILE (entry point)
│   ├── Project-Health-Report.md
│   ├── Architecture.md              ← NEW: refreshed successor to root ARCHITECTURE.md (or update in place)
│   └── (future: Data-Model.md, Roadmap.md)
├── Product/                         ← renamed from LPA/ (keeps LPA-001 as canonical product doc)
│   └── LPA-001…005
├── Design-System/                   ← single system; merge LPDS into LDS (see below)
│   ├── LDS-Index.md
│   ├── LDS-000-UI-Problems-Register.md   ← adopt LPDS-000 content here, retire LPDS-000 stub slot
│   ├── LDS-001…005 (existing)
│   ├── LDS-006…011 (to be authored)
│   ├── Research/                    ← merge both Research/ folders
│   └── Implementation/              ← keep (Migration-Tracker, M2–M5, Sprint reports, Refresh-Summary)
├── Features/                        ← NEW: one spec per feature (import, recurring, reconciliation, transfers…)
├── QA/
│   ├── README.md
│   ├── Accessibility-Checklist.md
│   ├── UI-Review-Checklist.md
│   └── Release-Checklist.md
└── PLANS.md, ARCHITECTURE.md        ← root copies migrate into docs/ (PLANS.md → docs/Project/ or docs/Features/)
```

**Key structural decisions:**

1. **Merge LPDS into LDS.** Because LDS-001–005 are real, implemented, and governed, make **LDS** the single design-system family. Adopt **LPDS-000**'s content as **LDS-000** (UI Problems Register) and retire the fifteen empty LPDS-001–015 slots (or repurpose their titles under LDS-006…011). Update every reference in `docs/QA/*` that says "LPDS" to point at LDS.
2. **Rename LPA → Product** (optional; low value). At minimum keep LPA-001 as the authoritative product document and stop treating LPA-002–005 stubs as anything but reserved slots.
3. **Introduce `docs/Features/`** for the currently-missing feature specifications.
4. **Move root `ARCHITECTURE.md` and `PLANS.md` under `docs/`** so documentation lives in one place; refresh ARCHITECTURE.md content.

---

## 8. Authoritative source map

For any decision, the governing document is:

| Decision type | **Authoritative source** | Notes |
|---|---|---|
| **Product decisions** | `docs/LPA/LPA-001-Product-Vision-and-Design-Principles.md` | Only real LPA doc; LPA-002–005 are stubs. No UI/UX may contradict LPA-001. |
| **Architecture** | `ARCHITECTURE.md` (root) — **currently stale; needs refresh** | Successor should live in `docs/Project/Architecture.md`. Dependency maps in `docs/LPDS/Research/Component-Dependency-Map.md` are a supporting artifact. |
| **Design System (specs + tokens)** | `docs/LDS/LDS-Index.md` + `LDS-001…005` | **LDS is the governing design system.** LPDS-001–015 are empty stubs and must NOT be treated as authoritative. |
| **Design System (migration status)** | `docs/LDS/Implementation/Migration-Tracker.md` | What is migrated vs remaining. |
| **UI problem backlog** | `docs/LPDS/LPDS-000-UI-Problems-Register.md` | Active register; recommend re-homing as LDS-000. |
| **Feature specifications** | *(none exist)* | **Gap.** Until `docs/Features/` is written, behavior is defined only by code + tests. |
| **Implementation reports** | `docs/LDS/Implementation/` (M2–M5, Sprint 1/2, Refresh-Summary) + `PLANS.md` | Historical records; Refresh-Summary is the current authoritative summary of the Transactions work. |
| **Testing** | `docs/QA/` checklists + `tests/` (Vitest suite) | `tests/` is the runnable source of truth; QA checklists are the process gates. `docs/Project/Project-Health-Report.md` §7 lists coverage gaps. |
| **Project status / health** | `docs/Project/Project-Health-Report.md` | Current engineering assessment; supersedes ARCHITECTURE.md's health table. |

---

## 9. Minimal fixes applied / to apply

Per the audit's constraint (update docs only to fix broken references or obvious inconsistencies), the only file edited in this pass is **`docs/README.md`** (regenerate the folder table to include `LDS/` and `Project/` and to point at this index). No application code was touched.

**Recommended follow-up doc changes (not done here, each is an obvious-inconsistency fix when scheduled):**
1. Refresh/replace root `ARCHITECTURE.md` (stale claims).
2. Decide the LDS↔LPDS merge and update all `docs/QA/*` "LPDS" references accordingly.
3. Migrate `PLANS.md` status into `docs/` and keep it updated as plans land.
4. Author the missing feature specs + data-model doc listed in §6.

---

*End of Documentation Index. Read this first, then the authoritative source for your task.*
