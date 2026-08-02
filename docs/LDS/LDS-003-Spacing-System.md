# LDS-003 — Spacing System

**Document:** `docs/LDS/LDS-003-Spacing-System.md`
**Status:** Draft for ratification · Companion to LDS-001
**Conforms To:** LDS-001 Layout System (§3 spacing scale, §6–§11 container/card/section spacing, §13 modal tiers)
**Scope:** Space, padding, margins, gutters, density. Token contract only — no CSS/implementation.

---

## 1. Purpose

Spacing is the system that makes LDS-001's layout philosophy tangible. It gives every surface,
card, toolbar, table, and dialog a consistent inner/outer beat controlled by a **single 4px-based
scale**. No bespoke pixel values; only tokens.

---

## 2. Spacing Philosophy

- **One scale, everywhere.** `--sp-*` tokens are the only units allowed for padding/margins/gap.
- **4px quantum.** Everything composes from a 4px unit so rhythm stays visually coherent at any
  breakpoint (values divide evenly into the grid).
- **Composition over large jumps.** Prefer compounding spacing (a gap plus an inner pad) over
  inventing new values.
- **White space is intentional hierarchy.** Use the scale to group or separate; never to "fill
  space."
- Refer to LDS-001 container rules (§4) and page/card/section spacing (§9–11).

---

## 3. Spacing Tokens

The canonical list (identical to LDS-001 §3.1; kept here for completeness):

| Token | Value | Primary role |
|---|---|---|
| `--sp-1` | 4px | hairlines, micro-gap, gap between icon+text |
| `--sp-2` | 8px | compact gap, inline layer, chip internal |
| `--sp-3` | 12px | sub-items, control gutter, label-to-field |
| `--sp-4` | 16px | default component padding |
| `--sp-5` | 20px | row of controls, between cards horizontally |
| `--sp-6` | 24px | card inner padding, small section gap |
| `--sp-8` | 32px | primary section gap |
| `--sp-10` | 40px | large page/section gap (desktop) |
| `--sp-12` | 48px | page top spacing |

**Rules:**
- Only these tokens. A justified intermediate value is refused.
- One-dimension each: use `gap` for gutters, `padding` for containment, `margin` for external
  separation — never a shared numeric for all three if the context differs.

---

## 4. Padding

- **Default component padding:** `var(--sp-4)` (16px); floors at `--sp-3` for compact rows.
- **Card padding:** `var(--sp-6)` (24px, per LDS-001 §10).
- **Control padding (button/input/select):** `var(--sp-2) var(--sp-3)` (vert, horiz) baseline.
- **Modal body:** `var(--sp-6)` sides; see §Dialog spacing.
- `padding` *within a* container is boundary space; never share with a gap value of a different role.

---

## 5. Margins

- Margins are for **external separation** (between siblings) and can be negative only for
  alignment, never for compaction.
- Standard pattern: `margin-bottom` on block elements `0` for last child; use `gap` on flex/grid
  parents for internal row spacing (preferred and simpler to reason about).
- Heading margins use the scale: `h1/h2` `margin: 0 0 var(--sp-3)`; `.card-header` bottom gap `--sp-3`.
- **First child of a container** `margin-top:0`; **last child** `margin-bottom:0`.

---

## 6. Component Spacing

- `btn-group` / adjacent buttons: `gap: var(--sp-2)` (8px).
- Icon button inside row: `gap: var(--sp-2)`; touch target 44px (LDS-001 baseline).
- A label above its control: `gap: var(--sp-1)` (4px).
- Tooltip/popover inset from an anchor: `--sp-2`.

---

## 7. Page Spacing

- **Page top** gap from topbar: `var(--sp-10)` desktop, `var(--sp-8)` mobile.
- **Horizontal page padding:** `var(--sp-5)` desktop, `var(--sp-4)` mobile.
- **Between sibling page sections:** `var(--sp-8)` vertical (section-gap).
- First/last normalized (no inflating double vertical rhythm).

---

## 8. Card Spacing

- **Card outer:** gap between stacked cards `var(--sp-5)`; so `.card` siblings separated by
  `--sp-5`.
- **Inner:** `padding: var(--sp-6)`; header `padding-bottom: var(--sp-3)`; `.card-pad` okay.
- **Card-in-card / nested:** reduce to `padding: var(--sp-4)` at indentation for hierarchy.
- Header ("h2) reserved above the body with `gap: var(--sp-6)`.

---

## 9. Toolbar Spacing

- `.filters-bar` / toolbar: `gap: var(--sp-3)` between controls.
- Toolbar bottom margin to content: `var(--sp-4)`.
- Active filter pill adds inline spacing; buttons in toolbar: `padding: 0 var(--sp-3)`.
- Responsive wrap: `flex-wrap: wrap` and full-width at `--bp-sm` (LDS-001 §15).

---

## 10. Table Spacing

- **Cell padding:** `var(--sp-2) var(--sp-3)` (vert, horiz).
- **Colum gutter:** `gap: var(--sp-2)` (grid/flex row), `--sp-3` desktop.
- **Row separation:** `border-bottom: 1px` hairline (LDS-004 border color); no extra vertical margin
  (padding provides height).
- **Register column widths** use tokens per LDS-001 §12 (grid track + column `min-width`).
- Optional columns drop at breakpoints (not positional) — LDS-001 §5.5.

---

## 11. Dialog Spacing

- Sized by LDS-001 modal tiers (§13); inner uses `--sp-6`.
- **Dialog header `.modal-head`:** `padding: var(--sp-4) var(--sp-5)`; title → body gap `--sp-4`.
- Dialog body: `padding: var(--sp-5)`. Inner content gap: `--sp-4`.
- **Dialog footer `.modal-foot`:** `padding: var(--sp-4) var(--sp-5)`; top hairline.
- Between `field` rows in a dialog: `gap: var(--sp-4)`.
- Modals stack above `--z-modal` (LDS-001 z-index).

---

## 12. Responsive Spacing

- At breakpoints (LDS-001 §17) scale **within** the token set only — never fractional.
- `--bp-mobile (480px):` page h-pad `--sp-4`; card pad `--sp-4`; toolbar wraps; grids collapse.
- `--bp-sm (610px):` forms single column (field gap reduces to `--sp-3`).
- Small screens remove *interior* padding where the surrounding `--sp-4` already pads, to conserve
  space; do NOT invent `--sp-5`-less novelties.
- Vertical rhythm may compress by one step (gap `--sp-10`→`--sp-8`) on small viewports.

---

## 13. Forbidden Spacing Values

- **Any value not on the scale** (e.g., `9px`, `14px`, `18px`, `42px`). Current literals flagged
  `LDS-TODO`.
- **Fractional skeleton** (e.g., `gap: 7px`, `padding: 4.5px`).
- **Per-element bespoke gaps.** Use gap on parents.
- **Inconsistent units:** spacing must be `px`-token units only; no relative (em/rem) for interior
  layout (except font-relative line-height, which is type, not spacing).
- **Negative margins** except for deliberate overlap use-cases; justify each.

---

## 14. Migration Strategy

1. Replace hard-coded `padding`/`margin`/`gap` → the nearest semantic token.
2. Remove fractional syntax; floor/ceil to the scale (usually `--sp-3`/`--sp-4`).
3. For the inline `style=` literals (e.g., `tx-modals.js`, `overview`, `settings`) flagged by
   `LDS-TODO`, substitute the relevant scale token. This is a behavior-preserving pass.
4. Add a spacing *lint* (CSS/JS review) that asserts only `--sp-*` are used in layout properties.
5. Convert `margin`/`gap` usages to the parent-`gap` pattern where break points.

---
*End of LDS-003.*