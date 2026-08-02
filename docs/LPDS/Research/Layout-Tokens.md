# Layout Tokens — Current Implementation

**Type:** Research (not an LPDS specification)
**Purpose:** Enumerate every spatial/type/state token that affects layout, its resolved value, and where it is (and is not) used. This is the input for LPDS-001 token-definition work.

---

# 1. Spacing scale (`--sp-*`)

Base unit = **4px**. All defined under `body{ }` in `css/styles.css:84-95`.

| Token | Value | CSS uses | JS(inline) uses |
| --- | --- | ---: | ---: |
| `--sp-1` | 4 | 39 | 0 |
| `--sp-2` | 8 | 59 | 1 |
| `--sp-3` | 12 | 56 | 0 |
| `--sp-4` | 16 | 28 | 1 |
| `--sp-5` | 20 | 14 | 5 |
| `--sp-6` | 24 | 10 | 0 |
| `--sp-8` | 32 | 4 | 0 |
| `--sp-10` | 40 | 3 | 0 |
| `--sp-12` | 48 | 1 | 0 |

- Scale is **not continuous**: jumps from 6→8 to 12→16 to 20→24 to 32 (missing 64/96). Small-gap uses (5,6,10,14) have no token.
- Convention: vertical rhythm primarily `--sp-3..--sp-6`; card gaps `--sp-4`/`--sp-6`; dense list gaps `--sp-1`/`--sp-2`.
- Only `--sp-2/4/5` leak into JS inline styles (several `var(--sp-5)` margins in page templates). Most JS spacing is literal px (see §5).

---

## 2. Typography (`--text-*`) and font

Defined styles.css:104-112. Body font-size = **14px** (styles.css:120), but base token is 13px.

| Token | Value | CSS uses | Used by |
| --- | --- | ---: | --- |
| `--text-xs` | 11 | 4 | helper/labels |
| `--text-sm` | 12 | 2 | meta text |
| `--text-base` | 13 | 8 | base body size |
| `--text-md` | 14 | 1 | paragraph emphasis |
| `--text-lg` | 16 | 1 | card titles |
| `--text-xl` | 20 | 1 | page/section titles |
| `--text-2xl` | 24 | 2 | `.earn-value`, big numbers |
| `--text-3xl` | 32 | 1 | hero number |

- `--font-sans` (Manrope, fallback Helvetica) and `--font-num` (19 uses, tabular-ish figures for money/amounts; 1 in JS).
- `--text-2xl` is the **only** size (besides `--font-num`) referenced from JS (`rewardModal` big number), i.e. JS reaches into the typography scale almost never.

**Drift:** body = 14px vs `--text-base` = 13px. Component-level override text is often 10–11px (see §5).

---

## 3. Radius (`--radius-*`)

| Token | Value | CSS uses |
| --- | ---: |
| `--radius-sm` | 6 | 13 |
| `--radius` | 10 | 77 |
| `--radius-md` | 12 | 26 |
| `--radius-lg` | 16 | 9 |
| `--radius-xl` | 20 | 3 |
| `--radius-pill` | 50 | 9 |

- `--radius-pill:50` used for circular/icon avatars and `.tx-tab`. Densities: `.tx-tab` 36px square; `.dp-day` 32px square.
- Minor radii `7/8/14px` appear as literals in a few component blocks (not yet exhaustive).

---

## 4. Elevation / transition

| Token | Value | Notes |
| --- | --- | --- |
| `--shadow-card` | `0 1px 2px rgba(0,0,0,.08), 0 2px 8px rgba(0,0,0,.05)` | cards (5 uses) |
| `--shadow-lift` | higher 3-shadow | raised tiles (7 uses) |
| `--transition-fast` | ~.15s ease | 56 uses |
| `--transition-normal` | ~.35s? | accordion/drawer (7 uses) |

No `--z-index-scale` exists. Layers (see Layout-Tokens follow-up below).

---

## 5. Inline-bypass audit (the real work of LPDS-001)

All values below come from **inline `style="…"` attributes in JS templates** — i.e. layout decisions that *bypass the token system entirely*. Data captured by scanning `js/**/*.js`.

**Font-size inline literals (93 total):**
| Value | Count | Token would be |
| --- | ---: | --- |
| 11px | 17 | `--text-xs` (11) |
| 12px | 13 | `--text-sm` (12) |
| 13px | 10 | `--text-base` (13) |
| 16px | 13 | `--text-lg` (16) |
| 10px | 6 | (none) |
| 12.5px/11.5px/13.5px/10.5px/9.5px | 37 | **no token exists** — fractional sizes |
| 18px / 14px | 3 | `--text-md`(14), (none for 18) |

- Fractional .5px sizes (total 37) are a **strong standardization signal**.

**Margin inline values (≈76 total incl. margin-top/bottom/left):**
`0`(12), `12px`(11), `0 0 14px`(8), `0 0 6px`(7), `4px`(5), `var(--sp-5)`(5), `0 0 12px`(4), `2px`(4), `8px`(3), `14px`(2), `16px`(2), others.
- Token gaps obvious only for 4/8/12/16; `6px`, `10px`, `14px` are orphan.

**Padding inline (≈33 incl. padding-top):** `12px`(3), `8px 12px`(3), `10px 12px`(2), `2px 0`(2), `4px 8px`(2), `6px 12px`(2), plus singles `24px 20px`, `9px 0`, `7px 0`, etc. — all literal.

**Gap inline (27):** `8px`(11), `10px`(7), `16px`(3), `12px`(2), `5px`(2), `6px`(1), `14px`(1).

**Width/height/min-width inline:** `width:13px`(3), `min-width:280px`(2), `width:100%`(1), dynamic `'+pct+'%`, `'+size+'px`. Heights `13px`(3) + dynamic.

**Layout-oriented inline props (counts):** `display` 50, `align-items` 20, `justify-content` 13, `flex-wrap` 9, `flex-direction` 7, `position` (present), `transform` (dep. on animation helpers).

**Fixed layout gaps worth token-ing (no token today):** 5, 6, 10, 14, 15, 22, 26.
**Fragmentary types worth token-ing:** `.5px` font sizes; sidebar 222px; content gutter 30px; modal max 800px; heights 38/34px.

---

## 6. Derived spatial constants (candidate tokens)

| Use | Value basis |
| --- | --- |
| Page gutter | `.content` 30px (vs `--sp-8`=32) |
| Card padding | `.card-pad` `22px 24px` |
| Sidebar width | `222px` |
| Modal width | `max-width:800px` |
| Goal: configurator/dropdown anchors | `min-width:280px` |

*End of Layout-Tokens.md.*