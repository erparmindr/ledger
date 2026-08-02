# LDS-002 — Typography

**Document:** `docs/LDS/LDS-002-Typography.md`
**Status:** Draft for ratification · Companion to LDS-001
**Conforms To:** LDS-001 Layout System (§3.3 typography reference, §23 alignment rules)
**Scope:** Text rendering, type scale, readability, and numeric formatting. Token contract only — no CSS/implementation here.

---

## 1. Purpose

Typography establishes the visual voice, reading rhythm, and numeric clarity of Ledger.
Without it, spacing (LDS-003) and color (LDS-004) have no context, and dense data screens
(register, reports) become unreadable. This spec fixes the **scale**, **family**, **semantic
roles**, and **rules** typography must follow. It references the type sizes already introduced
in LDS-001 §3.3 and formalizes them into semantic tokens.

---

## 2. Font Families

Two families are used together:

| Role | Family | Notes |
|---|---|---|
| Sans (UI) | A system sans stack | Preferred: `Avenir Next`, `Segoe UI`, `Inter`, fallback `sans-serif`. Categories: body, headings, labels, captions, buttons. |
| Numeric | A tabular-metric font for amounts | Preferred: `"SF Mono"`, `"JetBrains Mono"`, fallback `ui-monospace`; **must support `font-variant-numeric: tabular-nums`**. Use for currency figures in tables/register per LDS-001 §23 (amounts RIGHT-aligned, tabular). |

- **No webfont loading is assumed**; the family list is a prioritized native stack so the app
  is fast and works offline. The chosen numeric face must render tabular figures consistently.
- Monospace is **reserved for numbers**, not code/TTY whitespace.

---

## 3. Font Scale (raw sizes)

Ratified baseline tokens (identical to LDS-001 §3.3; kept here for completeness):

| Token | Size |
|---|---|
| `--text-xs` | 11px |
| `--text-sm` | 12px |
| `--text-base` | 13px |
| `--text-md` | 14px |
| `--text-lg` | 16px |
| `--text-xl` | 20px |
| `--text-2xl` | 24px |
| `--text-3xl` | 32px |

Guidance:
- The **base** is `--text-base` (13px). Interactive chrome (buttons, inputs, selects) sits at or
  above base for clarity.
- Use `--text-md`/`--text-lg` for emphasis, **not** fractional sizes. Fractional `12.5px`, `13.5px`,
  `9.5px`, etc., that currently exist in the codebase are **forbidden** going forward (see §15) and
  are flagged by `LDS-TODO` markers.

---

## 4. Semantic Text Tokens

Rather than raw size, produce semantic tokens that map to intent. These are the only values
implementations should consume:

| Token (emitted name) | Size | Weight | Use |
|---|---|---|---|
| `--type-display` | `--text-3xl` | 800 | page hero (rare, dashboards) |
| `--type-h1` | `--text-2xl` | 800 | page title |
| `--type-h2` | `--text-lg` | 700 | card/section titles |
| `--type-h3` | `--text-base` | 700 | sub-groupings, dialogs |
| `--type-body` | `--text-base` | 400 | default prose |
| `--type-body-sm` | `--text-sm` | 400 | secondary prose, hints |
| `--type-label` | `--text-sm` | 600 | form labels, column headers (may uppercase/track) |
| `--type-input` | `--text-base` | 500 | input/select value text |
| `--type-caption` | `--text-xs` | 500 | timestamps, faint notes, helper text |
| `--type-num` | tabular numeric | 800/600 | amounts, balances (see §9 Numeric, §10 Currency) |

---

## 5. Headings

- `h1`–`h3` are the **only** heading elements allowed.
- Heading token map: `h1→--type-h1`, `h2→--type-h2`, `h3→--type-h3`.
- Weight 700–800; **no all-caps by default** except `.card-header` may use a tracked label.
- Spacing: headings use the LDS-001 spacing scale for margins (e.g., `margin: 0 0 var(--sp-2)`) — no
  bespoke values.
- Created via the helpers from the preparation phase (`Ledger.cardHeader` targets `h2`).

---

## 6. Body Text

- Default `--type-body` at 13px, line-height `1.5` (see §13 Line Height).
- Max line length: wrap lists/paragraphs in text containers; long prose preferable at `max-width: 60ch`.
- Color handled by LDS-004 (`--text` / `--text-dim` / `--text-faint`).

---

## 7. Labels

- `--type-label`: 12px (`--text-sm`), weight 500–600.
- For each `.field` label above an input/`  field**; and buttons use 11–13px weight 700.
- Uppercase + letter-spacing applies only to coarse **section/header** labels (`.page-subtitle`,
  card header hints), not to interactive form labels (which stay sentence-case for scan-ability).

---

## 8. Captions

- `--type-caption`: 11px (`--text-xs`), weight 500.
- Use for: run-balances, dates, faint hints, "next 7 days", helper text, timestamps, secondary meta
  lines in rows.
- Readable even at 11px: ensure family renders legibly at 11px and contrast follows LDS-004.

---

## 9. Numeric Typography

- **Purpose of the family:** currency amounts in register, reports, balances, donuts, transfer legs.
- **Tabular figures** (`font-variant-numeric: tabular-nums`) so columns and rows of money align —
  a core data-quality requirement for the register (reference LDS-001 §Align of right-aligned amounts).
- **Weight:** bold (`800`) for primary totals and table amounts; `600` for running balances / dim.
- Right-aligned to the column edge. See LDS-001 §23 (Alignment).
- Leading `+`/`−` signs included in the value (`.msign`), kept within the numeric cell.

---

## 10. Currency Formatting

Formatting is a **presentation-layer** concern anchored by tokens, so every currency renders
consistently:

- **Use the registered currency symbol/decimal/grouping** from the account model (default USD), not
  hard-coded `$`.
- Amount class = `.num`; it is a *numeric*, right-aligned, tabular, bold.
- Negative indicator: a minus sign (sign token) within the numeric string; color cared for by
  LDS-004 (`.pos`/`.neg`).
- Mill grouping: thousands separators; 2 decimal places; integral whole-number currencies shown
  without trailing `.00` when configured (non-dec). Fractional presentation must be consistent per
  account currency.
- In compact contexts (chart legends, spark labels), a short form `fmtMoneyShort` is allowed; exact
  currency semantics preserved elsewhere.

---

## 11. Table Typography

- Register/table data cells: `--type-num` for amounts; `--type-body` for text columns.
- **Column headers:** `--type-label`, uppercase, tracked, `color: --text-dim`,  maintain baseline.
- **Row density:** row text at 12.5–13px (`--text-base` preferred); single-line cells ellipsize
  (`overflow; text-overflow: ellipsis; white-space:nowrap`) with a `min-width`.
- **Alignment per column** (from LDS-001 §23):
  - date / desc / type / category / account → left;
  - amount / running balance → right;
  - actions → right-most compact group.
- The numeric column and its header share letterspacing baseline.

---

## 12. Responsive Typography

- The **scale is static** (no fluid scaling beyond 3 levels). Responsive impact is via **layout**
  (LDS-001) and spacing (LDS-003), not font-size jumps.
- At `--bp-tablet`/`--bp-mobile`, page title may drop from `--text-2xl`→ but no further **fractional**
  changes.
- Text truncation strategies shoulder the responsive burden: metadata lines collapse first, then
  column text.
- Accessibility: `rem`/`em` relative where feasible so a user's font-size preference is respected;
  avoid sizing body purely in `px` (see §15).

---

## 13. Line Height & Weights

- **Line-height scale:**
  - Body/prose: `1.3–1.4`
  - Labels/buttons: `1` (single line)
  - Numeric/mono: `1.15–1.25` for alignment
  - Headings: `1.1–1.2`
- **Weights:** 400 (body), 500 (input/labels secondary), 600 (run-bal, secondary emphasis), 700
  (emphasis, card titles, buttons, pills), 800 (headings, totals, `.big`). **No 900**; resolve by size/spacing first.

---

## 14. Accessibility Rules (typography)

- **Scale:** no text smaller than `11px` (`--text-xs`). 11px is reserved for captions/short meta
  only, never for essential input or buttons.
- **Contrast:** text must satisfy LDS-004 contrast triples on its background (pass in that spec);
  no text on photographic backgrounds.
- **Line length:** ≤ `60ch` for prose.
- **Spacing:** respect user letter-spacing/line-height preferences where wrappers allow; don't
  fight those overrides.
- **Focus:** visible focus ring (see LDS-005 focus rings) accompanies keyboard navigation for
  links/buttons.
- **Emphasis not color-only:** don't encode meaning solely in color; pair color with icon/weight
  (e.g., `.pos`/`.neg`).

---

## 15. Forbidden Sizes (fractional fragments)

- **Forbidden:** fractional sizes (`-text 12 + .5`, `11.5px`, `9.5px`, `10.5px`, `13.5px`) — the
  current inline style literal quantities in `tx-modals.js` (~23) and other pages.
- **Forbidden:** per-instance magic `font-size` values beyond the semantic scale.
- Patch: only use semantic tokens (`.type-*`).
- Migration via `LDS-TODO` markers and the semantic map in §9.

---

## 16. Semantic Text Token Table (canonical)

Consolidated for implementation:

| Semantic | RAW | Weight | LineH | Use |
|---|---|---|---|---|
| display | 32 | 800 | 1.2 | hero |
| h1 | 24 | 800 | 1.2 | page title |
| h2 | 16 | 700 | 1.2 | card title |
| h3 | 13 | 700 | 1.2 | dialog |
| body | 13 | 400 | 1.35 | prose |
| body-sm | 12 | 400 | 1.35 | secondary |
| label | 12 | 500 | 1.3 | form labels + col-headers |
| input | 13 | 500 | 1.2 | controls |
| caption | 11 | 500 | 1.4 | helper |
| num | 13–14 | 800/600 | 1.2 | amounts |

---

## 17. Migration Direction

- Replace hard-coded `font-size` with `--type-*` semantics and remove fractional.
- Replace literal `font-family` for numeric fields with the numeric token.
- Format helper should centralize currency (single function), not inline `$` strings.

---
*End of LDS-002.*