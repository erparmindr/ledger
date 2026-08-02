# LDS-005 — Elevation & Shadows

**Document:** `docs/LDS/LDS-005-Elevation-Shadows.md`
**Status:** Draft for ratification · Foundation-adjacent to LDS-001
**Conforms To:** LDS-001 (z-index scale §21, container/overflow §24, modal tiers §13),
LDS-004 (interaction colors), LDS-003 (spacing around elements)
**Scope:** Depth, elevation tokens, borders+radius, focus rings, overlay layering for dialogs,
dropdowns, hovers, pressed states. No implementation.

---

## 1. Purpose

Elevation communicates depth and hierarchy through shadow, border, and radius, complementing the
z-index scale defined in LDS-001. Three tools build depth: **shadow tokens** (soft independent
relationship), **borders/radius** (definition + rounding), and **focus rings** (accessibility of
interactive depth). The practice: use the smallest elevation that communicates the relationship; do
not stack shadows on shadows.

---

## 2. Z-index baseline (from LDS-001)

| Layer | Token | Value |
|---|---|---|
| base | `--z-0` | 0 |
| sticky / rail | `--z-sticky` | 10 |
| fab | `--z-fab` | 30 |
| sidebar overlay | `--z-overlay` | 40–50 |
| dropdown/pop/dater | `--z-dropdown` | 1000 |
| tooltip | `--z-tooltip` | 900 |
| modal backdrop | `--z-backdrop` | 2000 |
| modal | `--z-modal` | 3000 |
| modal-internal (sheet) | `--z-modal-top` | 4000 |
| toast | `--z-toast` | 5000 |

Elevation maps to z-index: higher z, higher shadow (but a sidebar overlay is only depth 40-50, not a
huge shadow). Do not invent raw z values (LDS-001).

---

## 3. Shadow Tokens

A finite set (**Do not add shadow values ad-lib**):

| Token | Offset | Blur | Shadow | Use |
|---|---|---|---|---|
| `--shadow-1` | 0 1 3 – | 6 | 0.12 | resting cards (subtle) |
| `--shadow-2` | 0 2 8 | 16 | 0.14 | raised cards/hover |
| `--shadow-3` | 0 4 12 | 24 | 0.16 | dropdowns/popovers |
| `--shadow-4` | 0 8 24 | 48 | 0.18–0.20 | dialog/modal |
| `--shadow-top` | 0 -4 12 | 20 | 0.14 | toast/sheet top edge |

Shadows stay **neutral**: black at low opacity (no colored shadow)*, so depth reads predictably
across light/dark. (Optionally a warm dark alpha in dark theme for legibility.)

---

## 4. Border Token + Radius

- **Radius** (same as LDS-001 §3.2 / LDS-003):
  `--radius-sm:6px`, `--radius:10px`, `--radius-md:12px`, `--radius-lg:16px`, `--radius-xl:20px`,
  `--radius-pill:50px`.
- **Mapping to roles** (tokens, not magic):
  - buttons/pills → `--radius-sm`..`pill`;
  - card/panel → `--radius-md`;
  - dropdown/dialog → `--radius-md`..`--radius-lg`;
  - metrics/donut decorations → `--radius-lg`.
  - Use one per component tier (no stacking).
- **Borders** as elevation: a 1px `--border` on surfaces is "flat depth"; elevated elements drop a
  shadow (not a thick border). `border-soft` for quiet hairline. See LDS-004 for tint.

---

## 5. Focus Rings (interaction/a11y)

- **Purpose:** visible keyboard focus indicator that meets WCAG 2.4.7/2.4.11.
- **Token:** `--ring-color` (brass) + `--ring-offset` (2px) + `--ring-width` (2–3px) at
  `box-shadow: 0 0 0 var(--ring-width) var(--ring-color-soft)` pattern (or outline).
- Standard: `box-shadow: 0 0 0 3px var(--brass-soft)` + border-color change to brass on
  `:focus-visible`.
- **Never** hide focus (`outline:none` alone) unless you provide your own ring.
- Focus should *replace* shadow to avoid ambiguous double depth — a focused element drops its
  resting shadow to a simple ring.
- All interactive (`.btn`, `.icon-btn`, `.filters-bar select`, `.cd-trigger`, links, inputs) in the
  codebase already have focus rules; standardize on the ring token when tokenising.

---

## 6. Overlays

- **Backdrop** (`--z-backdrop`, translucent dark `rgba(0,0,0,.5)` in light; stronger in dark); sits
  under modal. Blur optional and performance-conscious; not required.
- Backdrop has `--shadow-none` (no shadow); depth via dim, not via shadow.
- `.modal` itself elevates with `--shadow-4`.
- Backdrop is an elevated entity but content on the backdrop is still in the "modal layer" — modal
  wins stacking.

---

## 7. Dialogs (modal)

- Elevation `--shadow-4`; placed at z `--z-modal` (3000) over backdrop `--shadow-none` dim.
- Subtle top hairline + radius `--radius-lg`; content scrollable (overflow per LDS-001).
- **Do not** give a modal an extra inner shadow or a thick border — border soft only.
- Nested/sheet sub-dialog: `--shadow-4` at `--z-modal-top`.

---

## 8. Dropdowns / Popovers / Date pickers

- Elevation `--shadow-3`; z `--z-dropdown` (1000).
- Slight radius `--radius-md`; clipping handled through scroll container (LDS-001 §24).
- Hover open: no rise change (they open at their layer); a `:hover` can only brighten, not move.
- All popovers must keep the focus ring on when internally keyboard-navigating.

---

## 9. Hover Elevation (cards/rows)

- **Cards:** default `--shadow-1`; hover `--shadow-2`; transition uses the LDS motion timing token (~120ms).
- **Rows (`.tx-row`, `.bill-row` in list):** `background: surface-hi` + subtle inset border rather
  than shadow (elevation of a row, not a card, is a tint). Optional `:hover { background:
  var(--clay-soft) }` for destructive-adjacent rows (e.g., `.icon-btn.danger:hover`) — see LDS-004.
- **hover retention:** don't lift interactive rows with shadow; grids read by the eye.

---

## 10. Pressed State

- **Button press:** reduce/elevate slightly + bring color in (`surface-hi` / interaction color
  lift) and shrink shadow by one `--shadow` step. Feels "pressed".
- Use `:active` (plus `:focus-visible` distinct for keyboard).
- Do not animate beyond the transition token; keep accent-level scale.

---

## 11. Migration / token map

- Replace hardcoded `box-shadow` values, `border-radius` literals (e.g., production `8px`), and
  `rgba(0,0,0, …)` shadows with the tokens above.
- Existing focus shadows (`0 0 0 3px var(--brass-soft)`) → `--ring-*` tokens.
- Ensure z-values update to `--z-*` (per LDS-001) so windows align.

---

## 12. Forbidden Practices (elevation)

- New shadow values outside `--shadow-*` (no per-element shadow).
- Hardcoded z-values above the token stack.
- Applying shadow to every card (use `--shadow-1` base only).
- Dramatic blur/glow; keep functional.
- `box-shadow` on text-heavy backgrounds to fake depth absent semantic need.

---
*End of LDS-005.*