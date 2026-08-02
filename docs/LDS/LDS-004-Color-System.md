# LDS-004 — Color System

**Document:** `docs/LDS/LDS-004-Color-System.md`
**Status:** Draft for ratification · Companion to LDS-001
**Conforms To:** LDS-001 (§22 visual hierarchy, §23 alignment), LDS-002 (text/contrast), LDS-005 (focus/interactive)
**Scope:** Semantic color roles, surfaces, text, status, interaction, dark mode, and contrast. Layout-neutral tokens — no implementation.

---

## 1. Purpose

Color in Ledger is **semantic**, not decorative. Every hue has a role (text, surface, border,
status, interaction). Using named roles instead of raw hex keeps theming, dark mode, and future
rebrands local to the token file. Must pass WCAG contrast as a system, and support both light and
dark. This spec derives from LDS-001's principle that hierarchy comes from spacing/type/alignment,
and color is applied sparingly (see LDS-001 §22).

---

## 2. Token Naming Convention

- Format: `--color-<role>-<variant>` (e.g., `--color-text`, `--color-surface-2`,
  `--color-border`, `--color-brass`).
- Semantic-only; no hue names in markup. Roles are what change across themes.
- A "soft" variant = tinted background for a status (e.g., `--color-sage-soft`). A "bright/glow"
  suffix is a stronger accent variant.
- Every color has a **dark-mode counterpart token** (same name, different value under `[data-theme="dark"]`).

---

## 3. Semantic Roles (canonical)

| Role | Light (draft) | Purpose |
|---|---|---|
| `--color-bg` | `#F4F5F8` | app canvas behind cards |
| `--color-surface` | `#FFFFFF` | card/panel background |
| `--color-surface-2` | `#F0F2F6` | nested surface, header rails, hover base |
| `--color-surface-hi` | `#E8EBF1` | pressed/raised surface |
| `--color-border` | `#E2E5EC` | default hairline |
| `--color-border-soft` | `#EBEDF2` | faint hairline |
| `--color-text` | `#181B23` | primary text |
| `--color-text-dim` | `#6B7280` | secondary text |
| `--color-text-faint` | `#7E8594` | tertiary/placeholder |
| `--color-brass` | `#C99A2E` | brand/primary interaction |
| `--color-brass-soft` | `#FBF1D9` | brand tint/active-bg |
| `--color-sage` | `#1F9D6E` | success/positive/income |
| `--color-sage-soft` | `#E3F6ED` | success tint bg |
| `--color-clay` | `#E2502F` | danger/negative/delete/expense accent |
| `--color-clay-soft` | `#FCE6E0` | danger tint bg |
| `--color-blue` | `#2E78D2` | information |
| `--color-blue-soft` | `#E5EFFC` | information tint bg |

These are the *role* set; exact hexes are ratified via the token map (LDS-006 candidate), but every
named semantic token listed here MUST exist in both themes.

---

## 4. Backgrounds & Surfaces

- **Canvas `bg`** is the neutral page color; **surface** is for cards/dialogs — always lighter in
  light theme, darker in dark theme, but *never* equal so cards visibly lift (see LDS-005 for
  shadow, not color).
- Layering: `surface-2` = inset panels (table header strips, input wells, dropdown lists);
  `surface-hi` = hover/pressed state base.
- No color where borders/space already communicate (e.g., avoid adding a box and a border + a tint
  together unless needed).

---

## 5. Borders

- `--color-border` default; `--color-border-soft` for separators that must be quiet.
- Hairlines for row separators and dividers; heavy only for emphasis on interactive frames
  (focus, selected).
- Interaction tint: selected tabs/active border uses `brass`; danger rows `clay`; positive `sage`.

---

## 6. Status / Semantic Feedback

- **Success** → `sage`; **warning** → (`clay`? no—warning amber) defined explicitly below.
- **Danger** → `clay` (delete, unreconciled severe).
- **Information** → `blue`.
- **Warning** → introduce `--color-amber` (e.g., `#B98A2E`) as a distinct fifth status so
  warning ≠ brand. Confirm in token map.

**Mapping to business meaning (Ledger context):**
- Income/positive balances: `sage` (+ sign).
- Expense/negative/down-trend: `clay`.
- Pending/needs-verification/upcoming: `amber`.
- Informational notes/recon hints: `blue`.

---

## 7. Text Colors

- Primary `text`, secondary `text-dim`, tertiary `text-faint`.
- Interactive text uses the interaction color (§9) at readable contrast.
- Numeric +/− carry semantic sign color; do not color entire row (`text`), only the `.num`
  (LDS-002 numeric).

---

## 8. Interactive Colors (brand/primary)

- Primary action color: `brass` (brand). Its `glow` variant for hover; `soft` for selected
  background.
- `--color-brass-bright` used on hover over primary surfaces.
- Buttons/links use `brass` for the primary intent; neutral chrome uses `text-dim`/`surface`.
- Interactive text on a brass button: `--text-on-brass`.

---

## 9. Hover / Focus / Disabled

- **Hover:** background/border adjacent tint (surface-hi/border) + interaction color for
  text; `transition` from LDS-005 timing.
- **Focus rings:** controlled by LDS-005 (§focus-ring tokens); they use `brass`.
- **Disabled:** reduce opacity `0.4` OR swap to muted surface + `faint` text; also
  `pointer-events:none` per control. Must still read as disabled *against* both themes.
- Click/pressed: use `surface-hi` + slight interaction color lift.

---

## 10. Access

- Contrast must meet:
  - **Text (normal):** ≥ 4.5:1 against its background.
  - **Large text (18px+ or 14px bold):** ≥ 3:1.
  - **UI components / focus indicators:** ≥ 3:1 against adjacent surfaces.
- `--text` on `--surface`: ~14-ish ratio (safe). `--text-dim` on `--surface`: verify ≥4.5:1
  when used for body.
- Do NOT place text directly on bright saturated `sage/clay/blue` fills — use the *-soft`
  background or a near-black text with `*-bright` accents; never inverse contrast for mid-content.
Expose a contrast report for every token in the theme file (e.g., table of ratios), rechecked when
colors change.

---

## 11. Dark Mode

- Fallback exists via `[data-theme="dark"]` (in production today). Ensure **every** color token has
  a dark value; a missed one shows oddly in dark.
- Dark strategy: `--color-bg` near-black (`#101216`); `--color-surface` dark gray; keep statuses'
  *-soft* rebalanced to dark-equivalent tints; brass stays but brightened; text inverted to `#f4`.
- **Do not** invert only some surfaces (unbalanced contrast).
- The existing CSS has `[data-theme="dark"]` at top of the file and a signature `[data-theme="light"]`
  — ratified rule: dark uses the SAME token identifiers, different mapped values. Never create
  `dark-*` prefixed roles.

---

## 12. Contrast compliance (consolidated)

Use a checklist for any new color usage:

1. Token exists on the list; otherwise classify then add.
2. Compute contrast; pass 4.5:1 text / 3:1 UI.
3. Provide the dark variant.
4. Don't couple meaning to color only (pair with icon/weight).
5. A visual test `qa-manual`/`No broken UI` must still pass (existing tests cover this).

---

## 13. Token Catalog (by role)

Consolidated semantic list for the token map:

| Semantic | Light | Dark | Roles |
|---|---|---|---|
| `bg` | #F4F5F8 | #101216 | page canvas |
| `surface` | #FFFFFF | #1B1E25 | cards/dialog |
| `surface-2` | #F0F2F6 | #23262F | well, layer |
| `surface-hi` | #E8EBF1 | #2B2F3A | hover base |
| `border` | #E2E5EC | #333844 | hairline |
| `border-soft` | #EBEDF2 | #262A33 | faint hairline |
| `text` | #181B23 | #F2F4F8 | primary |
| `text-dim` | #6B7280 | #9AA3B2 | secondary |
| `text-faint` | #7E8594 | #7D8594 | tertiary |
| `text-on-brass` | #241A02 | #241A02 | on brand |
| `brass` | #C99A2E | #E3B13C | brand/primary |
| `brass-soft` | #FBF1D9 | #3A2F12 | selected bg |
| `sage` | #1F9D6E | #34C08B | success/income |
| `sage-soft` | #E3F6ED | #0F3326 | success tint |
| `clay` | #E2502F | #FF6B4A | danger/expense |
| `clay-soft` | #FCE6E0 | #3A1717 | danger tint |
| `blue` | #2E78D2 | #5B9EE0 | info |
| `blue-soft` | #E5EFFC | #10233B | info tint |
| `amber` | #C4532B | #E4A72E | warning |

> *`amber`* is added at spec; confirm final hex in the coded token map before implementation.

---
*End of LDS-004.*