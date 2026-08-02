# LPDS-000 — UI Problems Register

**Document ID:** LPDS-000
**Title:** UI Problems Register
**Status:** Active — living document
**Method:** Static source inspection of `css/styles.css`, `js/pages/*`, `js/components/*`, `js/modals/*`, and `js/modals.js`. Items based on rendering behavior are marked *needs browser confirmation*; all other items are directly observable from the source.

This register tracks UI, layout, accessibility, component-consistency, visual-hierarchy, and interaction issues in the current implementation.

**Scope:** UI / UX / visual only. Business-logic defects are intentionally excluded.

---

## Executive Summary

- **Total issues identified:** 10
- **By severity:** Critical 0 · High 2 · Medium 5 · Low 3
- **Core finding:** The design-token foundation (`--sp-*`, `--text-*`, `--radius-*`) is well formed, but implementation frequently bypasses it with inline `style` attributes and ad-hoc values, producing measurable inconsistency across every page.
- **Components requiring refactoring:** number/currency typography, z-index/stacking model, responsive breakpoints.
- **Components requiring refinement:** buttons (variant scope), inputs, dropdowns, dialogs, empty states.

---

## How to read this file

Each entry uses the template below. The **Related LPDS Document** field points to the specification that will govern the fix; many of those specifications are still `Planned` and will be written using this register as input.

```markdown
## LPDS-UI-NNN
**Title**
**Severity**
**Component**
**Page**
**Description**
**Expected Behaviour**
**Current Behaviour**
**Impact**
**Related LPDS Document**
**Status**
```

---

## Issues

## LPDS-UI-001

**Title:** Inline styles bypass the design-token scale.

**Severity:** High

**Component:** All pages and components

**Page:** All

**Description:** The spacing and typography tokens (`--sp-*`, `--text-*`) are defined, but page and modal code repeatedly injects inline `style` attributes with literal values instead of consuming the tokens.

**Expected Behaviour:** Use the token scale everywhere so spacing and type sizes remain consistent and globally adjustable from a single place.

**Current Behaviour:** ~160 inline `style="..."` attributes inject literal `font-size` (10, 11, 12, 13, 14, 16px) and `padding` (5, 7, 9, 24, 30, 36px) values that drift from the token scale.

**Impact:** Conflicts with LPA-001 §4.5 (Longevity) and §7 (Precision); makes future theme and scale changes more costly and risky.

**Related LPDS Document:** LPDS-003, LPDS-004

**Status:** Open

---

## LPDS-UI-002

**Title:** Undocumented ad-hoc z-index values.

**Severity:** High

**Component:** Dropdowns, dialogs, navigation, cards

**Page:** All

**Description:** Stacking has no single owner of `z-index`: values `10`, `20`, `30`, `50`, `60`, `1000`, dynamic `100 + idx` in `modals.js`, and `9999` for the portaled dropdown list are used without a shared scale.

**Expected Behaviour:** A documented, monotonic z-index scale (e.g. dropdown < modal < toast < popover) controls every stacking layer.

**Current Behaviour:** Dropdown lists are portaled to `document.body` at `z-index:9999`, potentially sitting above stacked dialogs while other menus use `20` or `60`. *Needs browser confirmation* for concrete overlap cases.

**Impact:** Struggles LPA-001 §4.3 (Trust) and §8 Principle 4 (Visual stability); stacking can change unpredictably, so a fix in one layer may silently cover another.

**Related LPDS Document:** LPDS-008, LPDS-011, LPDS-012

**Status:** Open

---

## LPDS-UI-003

**Title:** Undocumented responsive breakpoints.

**Severity:** Medium

**Component:** Responsive layout / media queries

**Page:** All

**Description:** Breakpoints exist only as literal pixel values (`480px`, `760px`, `880px`) scattered throughout the stylesheet with no named breakpoint scale.

**Expected Behaviour:** A single named breakpoint system (e.g. `sm`/`md`/`lg`) declared once and reused.

**Current Behaviour:** Multiple `@media` queries repeat raw pixel values independently; changing a breakpoint means editing many rules and risks divergence.

**Impact:** Conflicts with LPA-001 §4.3 (Trust) and §7 (Precision); intermediate-width behaviour is hard to reason about and easy to break accidentally.

**Related LPDS Document:** LPDS-015

**Status:** Open

---

## LPDS-UI-004

**Title:** Very small metadata and number text.

**Severity:** Medium

**Component:** Account cards, transaction rows, upcoming list, badges

**Page:** Overview, Accounts, Register

**Description:** Several text styles fall below the intended body/caption scale at `10px` and `11px` (balance labels, account mini-card meta, the "auto" badge, row timestamps).

**Expected Behaviour:** Metadata uses the smallest accessible caption token and never drops to `10px`.

**Current Behaviour:** Values of `10px` and `11px` appear in `.am-meta`, `.bal-lbl`, and inline styles, below comfortable legible body text.

**Impact:** Reduces legibility and contradicts LPA-001 §4.2 (Clarity).

**Related LPDS Document:** LPDS-004, LPDS-014

**Status:** Open

---

## LPDS-UI-005

**Title:** Inconsistent number typography scale.

**Severity:** Medium

**Component:** Currency figures, balances

**Page:** All

**Description:** Monetary figures are styled through parallel, inconsistent mechanisms: the `.num` class, inline `font-size:13px` overrides, and card-specific `16px`/`19px` values.

**Expected Behaviour:** One official number style shared across every financial figure so amounts align and size uniformly.

**Current Behaviour:** Number rendering is re-implemented per row type, so currency figures are not sized or aligned consistently across cards, register rows, and reports.

**Impact:** Undermines LPA-001 §4.1 (Accuracy) and §8 Principle 1 (Hierarchy); numerals are the product, so inconsistent sizing erodes trust at a glance.

**Related LPDS Document:** LPDS-004, LPDS-010

**Status:** Open

---

## LPDS-UI-006

**Title:** Base type scale discontinuity.

**Severity:** Low

**Component:** Typography tokens (`:root`)

**Page:** All

**Description:** The next token steps `12px / 13px / 14px` (`--text-sm`, `--text-base`, `--text-md`) are not from a clean modular scale, and the smallest token `--text-xs` is `11px`.

**Expected Behaviour:** A deliberate modular type scale with evenly increasing steps.

**Current Behaviour:** The `13px` base and `11px` smallest size create awkward gaps that encourage inline overrides (see LPDS-UI-001).

**Impact:** Minor; compounds the drift identified in LPDS-UI-001.

**Related LPDS Document:** LPDS-004

**Status:** Open

---

## LPDS-UI-007

**Title:** Spacing values drift from the spacing scale.

**Severity:** Low

**Component:** Empty states, empty search state

**Page:** Overview, Register, Reports, Transfers

**Description:** Empty-state paddings use literal values (`24px 20px`, `30px`, `36px 20px`) instead of `--sp-*` tokens.

**Expected Behaviour:** Empty states use consistent spacing tokens.

**Current Behaviour:** The literal paddings will not respond to future spacing-token changes.

**Impact:** Small but recurring inconsistency; conflicts with LPA-001 §7 (Precision).

**Related LPDS Document:** LPDS-003

**Status:** Open

---

## LPDS-UI-008

**Title:** CSS token formatting inconsistency.

**Severity:** Low

**Component:** `:root` and dark-theme token block

**Page:** Global

**Description:** The `--text-faint` declaration (lines 21 and 64 of `css/styles.css`) has a leading-space indent out of step with neighbouring tokens.

**Expected Behaviour:** All token declarations share identical formatting for legible diffs.

**Current Behaviour:** A single cosmetic misalignment; no value difference.

**Impact:** Negligible functionally; a minor violation of §7 (Precision).

**Related LPDS Document:** LPDS-005

**Status:** Open

---

## LPDS-UI-009

**Title:** Dropdown portaled list and focus management.

**Severity:** Medium

**Component:** Custom dropdown system

**Page:** All

**Description:** When opened, the dropdown option list is portaled to `document.body` while the ARIA `combobox/listbox` relationship and `aria-activedescendant` are maintained on the trigger.

**Expected Behaviour:** Keyboard navigation is predictable and the list stays within the modal's focus scope when opened inside a dialog.

**Current Behaviour:** The list is positioned at the `body` level and outside the modal's focus containment. *Needs browser confirmation* of focus order, especially with stacked dialogs.

**Impact:** Affects LPA-001 §4.3 (Trust) and accessibility; keyboard focus in stacked dialogs can be unpredictable.

**Related LPDS Document:** LPDS-008, LPDS-014

**Status:** Open

---

## LPDS-UI-010

**Title:** Button-variant scope is unclear.

**Severity:** Low

**Component:** Buttons

**Page:** All

**Description:** The stylesheet defines a consistent `.btn / .btn-primary / .btn-danger / .btn-sm / .icon-btn` family, but additional inline-styled buttons and a `.primary-key` variant coexist.

**Expected Behaviour:** A small, well-defined set of button roles (primary, secondary, danger, icon).

**Current Behaviour:** `.icon-btn`, `.primary-key`, and some inline-styled buttons coexist, so the call-to-action hierarchy is not always clear.

**Impact:** Minor; the primary action is not always obvious, touching LPA-001 §8 Principle 1.

**Related LPDS Document:** LPDS-006

**Status:** Open

---

*End of register. Re-evaluate after each LPDS specification is authored.*