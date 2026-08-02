# Milestone 5 — Color & Elevation (Report)

**Scope:** Apply semantic color and elevation tokens only where an **exact-equivalent match** exists,
preserving appearance, layering, focus states, and the existing visual hierarchy.

## Color

The `--color-*` role set (introduced in Milestone 1) stands as the canonical semantic color
contract, aliasing the existing base tokens (`--color-bg:var(--bg)`, etc.). Within the rules, the
base token names remain the consumed identifier (renaming every `var(--bg)`→`var(--color-bg)`
would create a self-referential definition in `:root` and add churn without visual change).

The one fully exact-value conversion this milestone, shared with elevation/radii:

| File | Rule | Change |
|---|---|---|
| `css/styles.css` | circle avatars/dots/legends/pods | `border-radius:50%` → `border-radius:var(--radius-circle)` |

## Elevation

### Focus rings (exact match)
Focus-state ring shadows were `0 0 0 3px var(--brass-soft)`. The ring tokens in `:root` are
`--ring-width:3px` and `--ring-color-soft:var(--color-brass-soft)` (⇒ `--brass-soft`). Exact matches:

| Rule | Change |
|---|---|
| focus/`focus-within`/inputs/menus | `box-shadow:0 0 0 3px var(--ring-width) var(--ring-color-soft)` |

### z-index (only exact token matches)
| Value | Token | Where |
|---|---|---|
| `10` | `--z-sticky` | sticky topbar |
| `30` | `--z-fab` | search dropdown, FAB |
| `40` | `--z-overlay` | sidebar backdrop (mobile overlay) |
| `1000` | `--z-dropdown` | account/transaction dropdown menus |

## Elevation tokens consumed
`--radius` (50%), `--ring-width` (3px), `--ring-color-soft` (brass-soft), `--z-sticky`,
`--z-fab`, `--z-overlay`, `--z-dropdown`.

## Hard-coded values removed
`border-radius:50%` literals; `0 0 0 3px var(--brass-soft)` ring shadows ×focus states;
`z-index` literals `10/30/40/1000`.

## Remaining LDS-TODO items (deferred deliberately)
- **Raw `box-shadow` literals** — dropdown/toast/menu shadows do **not** equal any `--shadow-*`
  token spec; converting would change the rendered elevation. `--shadow-*` remains a definitional
  contract for future opt-in.
- **z-index without exact token** (`2`, `20`, `50/60` — sidebar rail 50 sits in the overlay 40–50
  band but no exact token; `100`, `200`, `9999`) — no exact equivalent; mapping changes layering.
- **Account/currency brand hex colors** at lines ~1220–1290 (checking/savings/credit/currency
  tag chips, `.tile-init` initials) — product identity colors, no LDS role role.
- **`--color-*` consumption in rules** — deferred (aliases already resolve; see above).

## Preserved (verified unchanged)
Layering/z-order, focus accessibility rings, circular element geometry, dropdown/popover elevation.

## Test results
- **Test suite:** 451/451 passing (16 files).
- **Visual snapshot:** 0 diffs across all 42 rendered pages (byte-identical).

## Zero-regression summary
Only exact-value substitutions (radius, matched focus-ring, matched z-index); no color/layer/elevation change.

---
*End of Milestone 5 report.*