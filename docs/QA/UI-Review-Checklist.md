# UI Review Checklist

**Purpose:** Verify that UI changes conform to the Ledger Product Design System (LPDS) and LPA-001.

Check each change against the LPDS specification that governs the affected component and against these general criteria.

## General

- [ ] Uses design tokens (`--sp-*`, `--text-*`, `--radius-*`) rather than inline literal values.
- [ ] No new inline `style` attributes introduced.
- [ ] Consistent spacing around and inside the component.
- [ ] No layout shift when data loads or view changes.
- [ ] No clipped menus, text, or overlapping elements at any common width.

## Visual Hierarchy

- [ ] Primary information is visually strongest; metadata is de-emphasized.
- [ ] Numbers/amounts are the most legible element in financial views.
- [ ] One clear primary action per dialog/main view.

## Consistency

- [ ] Buttons use the standard `.btn` family roles (no bespoke inline buttons).
- [ ] Typography matches the declared type scale.
- [ ] The component behaves like its published LPDS counterpart.

## Responsive

- [ ] Verified at smallest and largest supported widths.
- [ ] Breakpoints use the documented breakpoint system.
- [ ] Navigation and dialogs remain usable on mobile.

## Behaviour

- [ ] Menus and popovers open where users expect (no clipping).
- [ ] Animations respect `prefers-reduced-motion`.

## Sign-off

- Reviewer:
- Date:
- Checked against LPDS spec(s):
- Result: Pass / Pass-with-notes / Fail