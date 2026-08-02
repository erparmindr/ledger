# Ledger Design System — Index

**Document:** `docs/LDS/LDS-Index.md`
**Version:** `1.0.0-draft`
**Status:** `Internal`
**Role:** Master index, governance, and entry point for the entire Ledger Design System.

This is where all LDS work begins. Read this document first; it explains how the design
system is organized, how documents depend on one another, the order in which work should
be implemented, and the rules every future contributor must follow.

---

## 1. Overview

### What the Ledger Design System (LDS) is

The Ledger Design System (LDS) is the **single source of truth** for how the Ledger
application looks, is laid out, feels, and behaves. It is, as a set of written
specifications, not code. Each LDS document defines a *contract* (tokens, geometry,
rules, restrictions) that the application must conform to.

### Why it exists

Ledger grew organically and accumulated:

- a single, large stylesheet (~1,900 lines) with duplicated and dead selectors;
- **213 inline style attributes** across 18 JS files encoding font-size/margin/padding decisions;
- repeated markup builders (modal headers, icons, toolbars, cards, metrics, empty states);
- no layout token / breakpoint / z-index / spacing vocabulary to reason about coherently.

These realities make theming, accessibility fixes, and new features costly and error-prone.
The LDS buys back clarity: every visual decision has one canonical home, is named, and is go
verned.

### Its purpose

1. **Standardize** how spacing, typography, color, elevation, and layout are expressed.
2. **Simplify** maintenance — a change applies once, not in twenty copies.
3. **Anchor** accessibility and quality baselines (legibility, contrast, touch targets, focus).
4. **De-risk implementation** — verification-first (tests + snapshots) so design work is
   behavior-preserving.

---

## 2. Current Version

| Field | Value |
|---|---|
| **Version** | `1.0.0-draft` |
| **Status** | `Internal` |

### Revision history

| Version | Date | Status | Summary of changes |
|---|---|---|---|
| `0.1.0-draft` | — | Draft | Initial preparation-phase findings; UI architecture inventory |
| `0.2.0-draft` | — | Draft | LDS-001 Layout System ratified as foundation |
| `0.3.0-draft` | — | Draft | LDS-002 Typography, LDS-003 Spacing, LDS-004 Color, LDS-005 Elevation |
| `1.0.0-draft` | — | Internal | Full written specification set published; index created |

> Version history is maintained here. When a document transitions to `Approved`, this table is
> updated with an "Approved" entry and a dated changelog.

---

## 3. Document Structure

All LDS documents live under `docs/LDS/`.

### Existing documents (LDS-001 … LDS-005)

| Doc | Title | Status | Purpose |
|---|---|---|---|
| **LDS-001** | `LDS-001-Layout-System.md` | Draft-ratified (foundational) | Master layout: grids, breakpoints, sidebar, header, spacing, modal tiers, z-index, scroll/sticky/overflow, alignment, hierarchy. **Everything builds on this.** |
| **LDS-002** | `LDS-002-Typography.md` | Draft | Fonts, scale, semantic text tokens, headings/body/labels/captions, numeric + currency typography, table text, responsive type, a11y, line-height, weights. |
| **LDS-003** | `LDS-003-Spacing-System.md` | Draft | Spacing philosophy, `--sp-*` scale, padding/margins, component/page/card/toolbar/table/dialog spacing, responsive spacing, forbidden values, migration. |
| **LDS-004** | `LDS-004-Color-System.md` | Draft | Semantic colors, surfaces, borders, success/warning/danger/info, text, interactive + hover/focus/disabled, dark mode, contrast, token naming. |
| **LDS-005** | `LDS-005-Elevation-Shadows.md` | Draft | Shadow tokens, borders/radius, focus rings, overlays, dialogs, dropdowns, hover/pressed states. |

### Supporting documents (non-spec)

| Doc | Path | Role |
|---|---|---|
| **Preparation Report** | `docs/LDS/Implementation/LDS-Preparation-Report.md` | Engineering report on the completed no-visual-change refactor (duplication removal, dead CSS, shared helpers). |
| **UI Architecture Inventory** | `docs/LDS/Research/UI-Architecture-Inventory.md` | Research baseline; still-relevant analysis of the pre-LDS codebase. |

### Placeholders for future documents

The following slots are reserved. Numbering continues sequentially. A doc becomes a real entry
only when its charter is ratified by the group that owns it (see §8).

| Planned ID | Working title | Depends on | Topic (direction only) |
|---|---|---|---|
| LDS-006 | Components / Patterns | 001,002,003,004,005 | canonical component anatomy (buttons, inputs, cards, tabs, rows) |
| LDS-007 | Navigation | 001,004,005 | sidebar, topbar, breadcrumbs, page transitions |
| LDS-008 | Data Visualization / Tables | 001,002,004 | chart, spark, donut, register table rules |
| LDS-009 | Forms & Inputs | 001,002,003,004,005 | field layout, validation, disabled/error states |
| LDS-010 | Motion & Interaction | 001,005 | transitions, durations, easing, prop states |
| LDS-011 | Iconography | 004,002 | icon set, sizing, semantics |

---
*New docs must be added to §3 and be ratified via §7 change control before implementation.*

---

## 4. Dependencies

The LDS is a **layered** system. Lower layers are *foundational* (they never depend on higher
ones); higher layers only fill the gaps the lower layers leave.

### Dependency graph (top-down)

```text
              ┌───────────────────────────┐
              │  LDS-001  Layout System   │  ← FOUNDATION (everything hangs here)
              └─────────────┬─────────────┘
        ┌───────────────────┼─────────────────────┐
        ▼                   ▼                     ▼
┌──────────────┐   ┌──────────────────┐   ┌─────────────────────┐
│ LDS-003 Space│   │ LDS-002 Type     │   │ LDS-005 Elevation    │
│ (rhythm/gaps)│   │(voice/scale/nums)│   │ (depth/shadow/z-ring)│
└──────┬───────┘   └────────┬─────────┘   └──────────┬──────────┘
       └────────────────────┼────────────────────────┘
                            ▼
              ┌─────────────────────────┐
              │  LDS-004  Color System  │  ← paints the above; uses all
              └─────────────────────────┘
```

### Foundational documents

- **LDS-001** is the foundation: its `§Layout Grids`, `§Breakpoints`, `§Z-index`, `§Modal
  Tiers`, `§Scroll/Overflow`, and `§Page/Section spacing define the stage everything else
  renders on. All add spec notes and cite LDS-001 first.
- **LDS-003 (Spacing)** and **LDS-002 (Typography)** are co-foundation for *rhythm and voice*;
  each feeds the others' quantities (§13 line-height ↔ spacing; LDS-001 §3.3 ↔ LDS-002 scale).
- **LDS-004 (Color)** and **LDS-005 (Elevation)** are *applied* layers: they decorate the
  structure/spacing/type set. They reference LDS-001 §Z-index/Shadow and LDS-002 contrast.

### Direction of reference

- Lower layers never reference higher layers.
- Higher layers always reference (and conform to) the layers they depend on.
- A spec may add tokens only where no token exists; it must cite the source it extends.

---

## 5. Implementation Order

Design is layered; implementation must be staged to keep risk low and to preserve behavior until
a piece is intentionally retired.

### Phases

| Phase | Scope | Done after |
|---|---|---|
| **1. Foundation** | Establish the token contract (LDS-003 spacing, LDS-002 type scale/rems, LDS-004 color set, LDS-005 elevation/shadow, LDS-001 grid/z/breakpoints tokens). Introduce semantic tokens and utilities without redesigning existing components. | Existing UI renders identically (snapshots + tests unchanged). |
| **2. Core Components** | Primary building blocks — buttons, inputs, chips, cards, modal chrome — swapped to tokens and the shared helpers (from the Preparation Report). | Core components fully token-driven; helper coverage proven |
| **3. Navigation** | Shell navigation — sidebar/topbar/overlay drawer, headers, responsive collapse (LDS-001 §7–8), focus/touch. | Navigation uses tokens; responsive correct. |
| **4. Pages** | Assemble components + layout into pages (register, reports, overview, settings, people, etc.) per LDS-001 page/table specs. | Pages reflect layout/grid; inline-style debt driven toward 0 (the 213 count). |
| **5. Polish** | Motion (LDS-010), iconography (LDS-011), dark-mode verification, focus polish, contrast recheck, visual reconciliation. | Final design-system behavior; governed release. |

### Why this order minimizes risk

1. **Foundation first, but behavior-preserving** — tokens are add-on; swapping via helpers and
   running snapshots means zero visual churn at the most invasive point.
2. **Components before pages** — components centralize the most repeated UI; fixing them once
   reduces page-level rework.
3. **Pages last among functional layers** — by then every building block is stable and tokenized,
   so assembling screens is composition, not improvisation.
4. **Polish last** — the smallest-risk, largest-polish work lands only after structure is sound,
   so it doesn't have to be redone.
5. **Rollback is safe at every stage** — each phase must leave the app byte-identical for visual
   output (snapshot gate) before the next begins.

At each phase gate (QA + snapshot), the phase may be marked *Approved* in the corresponding spec
and/or the index's revision table before the next begins.

---

## 6. Review & Approval Workflow

Every LDS document travels the same lifecycle. Status values are defined in §9.

```text
 Draft ─▶ Review ─▶ Approved ─▶ Implementation ─▶ QA ─▶ Release
  ▲          ▲                                              │
  └──────────┴──────────────────────────────────────────────┘
                       (new change re-enters at Draft)
```

| Stage | Owner | Gate to exit |
|---|---|---|
| **Draft** | Author / steward | Content exists, sections complete, referenced specs cited |
| **Review** | Design + Engineering + Accessibility | Stake passes; no open blockers; risks documented |
| **Approved** | Approver(s) | Sign-off recorded; status flips `Approved` (or `Approved-draft` if provisional) |
| **Implementation** | Engineering | Feature branch implements against the spec |
| **QA** | QA + automation | Automated tests (451+), snapshot diff= base, manual check |
| **Release** | Release/ltd | Shipped; changelog + version bump; doc marked `Internal`/`Approved` |

> A spec that is only partially implemented may be marked `Internal-Partial`. Nothing ships
> `Approved+Implemented` without QA green.

---

## 7. Change Control

The LDS is versioned and governed. **Any change to a spec, or any new spec, enters through
this process.**

### How to propose a change

1. **File a change request** (issue/ticket) referencing the target spec `LDS-0xx` (or "new").
2. **Optional**: a one-pager describing the proposed contract.
3. The request is triaged, reviewed against §4 dependencies, and either approved back to **Draft**
   or the implementation stage.

### Required information for every change request

| Field | Requirement |
|---|---|
| **Spec** | The LDS document (or "new spec") affected |
| **Change description** | What the token/rule/business changes |
| **Rationale** | Why it's necessary (accessibility, consistency, bug, new feature) |
| **Behavioral impact** | Is this a *new* rule, or does it *change* an existing one? |
| **Dependency impact** | Which other docs/layers must change to keep the graph consistent |
| **Risk / rollback** | What could break; how to revert |
| **Migration** | For changed values: how existing usage is updated |
| **QA evidence** | How visual/output equivalence (or intended change) is confirmed |

---

## 8. Governance

- **LDS is the single source of truth** for the Ledger UI  reachable decisions off (spacing,
  typography, color, elevation, layout, type).
- **No UI changes without referencing an LDS specification.** Every visual change must be
  traceable to a spec clause + the associated token. Helpless magic values are not permitted.
- **Future contributors extend the LDS rather than bypass it.** If a design need falls outside a
  spec, *extend the spec* (via §7 change control), do not fork the pattern ad hoc.
- **Familiar, useful defaults:** prefer existing tokens/patterns over introducing one-off styles.
- **Version discipline** — token changes are versioned; readers must be able to see what changed.

Violating any of these is treated as a design-system debt item filed under §7, and the fix is a
spec- or the implementation brings alignment into the spec.

---

## 9. Appendix

### 9.1 Glossary

- **Token** — a named, reusable value (`--sp-2`, `--type-body`, `--z-modal`) that encodes a
  design decision. (Formalized in the future token map / LDS-004 & LDS-003 & LDS-002.)
- **Semantic token** — a token named by intent (text/body/surface) rather than a raw display value.
- **LDS-###** — a numbered spec document in this index.
- **Foundation** — the spec layer everything else builds on (chiefly LDS-001).
- **Components** — reusable UI exposed via shared helpers (see Preparation Report) and tokens.
- **Responsive breakpoint** — the viewsize threshold where layout reconfigures (`--bp-*`).
- **Z-index stack** — the disjoint `--z-*` layering used by overlays/modals/toasts.
- **Snapshots** — rendered DOM capture compared byte-for-byte to validate no-visual-change.

### 9.2 Naming conventions

- **Documents:** `LDS-0NN-Title.md` (zero-padded 3-digits), e.g., `LDS-005-Elevation-Shadows.md`.
- **Tokens:** kebab-case with a `--` prefix for CSS custom properties; group by category
  (`--color-*`, `--sp-*`, `--radius-*`, `--text-*/--type-*`, `--shadow-*`, `--z-*`, `--bp-*`).
- **Semantic tokens:** intent-leading (e.g., `--color-surface-2`, `--type-body-sm`); a variant
  suffix (`-soft`, `-hi`, `-bright`) indicates a tinted/raised/accent state, not a new hue.
- **Dark mode:** the same names, different mapped values under `[data-theme="dark"]`; never a
  `dark-*` prefixed role.

### 9.3 Document status definitions

| Status | Meaning |
|---|---|
| `Draft` | Written, content exists; subject to review; not yet a ruling standard |
| `Review` | Officially in review; awaiting sign-off |
| `Approved` | Signed-off; authoritative to implement against |
| `Approved-draft` | Provisional adoption, may be edited by the reviewing table |
| `Internal` | In use within the project but not yet released/ratified externally |
| `Internal-Partial` | Partially implemented; gaps tracked |
| `Accepted` | Implemented and released; the canonical version |
| `Deprecated` | Superseded; final implementation must not reference |

---

*The Ledger Design System is the shared recipe for building Ledger. Start here, trust the index,
and extend it deliberately.*

*End of LDS Index.*