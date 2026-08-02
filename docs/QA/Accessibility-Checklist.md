# Accessibility Checklist

**Purpose:** Gate all UI work against WCAG 2.1 AA and LPA-001 §4.3 (Trust).

## Semantic & Structure

- [ ] Interactive elements are native controls or have the correct `role`.
- [ ] Page has one `h1` and a logical heading order.
- [ ] Icon-only buttons have `aria-label` or visible accessible name.
- [ ] Tables use `th scope="col"` for headers.

## Forms & Inputs

- [ ] Every input has a programmatically associated label (via `for`/`id` or `aria-label`).
- [ ] Errors are announced and associated with the relevant field.
- [ ] Autocomplete/suggestions are exposed via `combobox/listbox` roles with `aria-activedescendant`.

## Keyboard

- [ ] All functionality is operable with keyboard only.
- [ ] Visible focus indicator is present on all interactive elements.
- [ ] Dialogs trap focus while open and restore focus on close.
- [ ] Menus/dropdowns support Arrow, Home/End, Enter/Space, and Escape.

## Colour & Contrast

- [ ] Text contrast meets 4.5:1 (large text 3:1) in both light and dark themes.
- [ ] Meaning is not conveyed by colour alone (spend/income also differ by sign or symbol).
- [ ] Focused and selected states are visible beyond color changes.

## Motion & Text

- [ ] `prefers-reduced-motion` respected (already present at `styles.css:88`).
- [ ] No text dropped below ~11px.
- [ ] Text does not rely on a fixed font size that prevents browser zoom reflow.

## Announcements

- [ ] Success/error feedback uses live regions or a toast that is announced.

## Sign-off

- Evaluator:
- Date:
- Result: Pass / Pass-with-notes / Fail