# F-003 — Mobile Experience

**Document:** `docs/Features/F-003 Mobile Experience.md`
**Date:** 2026-08-02
**Status:** Draft (for approval)
**Type:** Feature specification
**Roadmap:** Product Roadmap §5.1 — Priority **P1** (Data-in & mobile)
**Related docs:** `docs/LDS/LDS-001-Layout-System.md`, `docs/LDS/Research/UI-Architecture-Inventory.md`, `docs/LPDS/Research/Responsive-Inventory.md`, `docs/QA/Accessibility-Checklist.md`

---

## 1. Vision

Ledger is a PWA that people keep on their phones. The mobile experience is as deliberate as the desktop one: comfortable touch targets, legible data rows at every screen size, fast interactions, and a smooth install experience — while staying pixel-consistent with the LDS system on desktop.

## 2. Problem Statement

The app is responsive by construction but has not been verified as a first-class mobile product. Known weak points:

- Running-balance rows use a two-line mobile layout (from Transactions Sprint 2) that has **no real-browser verification** at ≤360px; data-heavy rows risk overflow.
- Some interactive elements (kebab triggers, filter controls, dropdown triggers) may have touch targets below comfortable tap size.
- There is no automated breakpoint/visual regression gate — mobile regressions are caught only by eye.
- Install UX relies on the default browser prompt; no install hint, no iOS/A<sub>1</sub> polish.
- Filter toolbar with up to 7 controls wraps awkwardly at intermediate widths (~480–880px).

## 3. Goals

- Make every page usable and legible at 360 / 480 / 768 / 1024 / 1440px widths.
- Meet touch-target guidance (WCAG 2.5.5 — ≥44px on primary interactive controls).
- Add an automated mobile smoke + screenshot gate so breakpoints never silently regress.
- Improve PWA install discoverability and update UX on iOS and Android.
- Keep visual output byte-identical to the LDS snapshot baseline on desktop (no desktop churn).

## 4. Non-Goals

- No redesign of desktop layout or the LDS token system.
- No new features; this is a polish/responsiveness/verification initiative.
- No per-device detection hacks beyond the existing `--bp-*`/layout-mode approach.
- No native app wrappers (Capacitor/Cordova) — stays a pure PWA.

## 5. User Stories

- As a phone user, I can tap any action comfortably without accidentally tapping neighbors.
- As a phone user, transaction rows (including running balance) are fully readable on a small screen with no cut-off amounts or dates.
- As a phone user, I can install Ledger to my home screen and launch it full-screen.
- As a returning phone user, I get the updated app without stale-cache confusion.
- As a tablet user, the layout uses the available width well rather than stretching or squeezing.

## 6. Functional Requirements

**FR-1 Breakpoint verification harness:**
- A Playwright-based check renders each of the 8 pages at 360/480/768/1024/1440 and asserts no horizontal overflow and presence of key controls.
- Screenshot artifacts stored for visual diff (baseline updated on intentional changes only).

**FR-2 Touch targets:**
- Primary interactive controls (buttons, kebab, checkboxes, tabs, filter triggers) meet ≥44px effective tap area (with padding/box fallback where visual size is smaller).

**FR-3 Running-balance mobile rows:**
- At ≤360px, two-line rows (Date+Amount / Description+Balance) render without overflow; kebab never overlaps Amount (regression test).

**FR-4 Filter toolbar at intermediate widths:**
- The 7-control toolbar wraps cleanly at ~480–880px (predictable order; no clipped dropdowns; each control ≥44px).

**FR-5 PWA install UX:**
- Detect installability; show a one-time "Install Ledger" hint (dismissible) where the browser allows (`beforeinstallprompt` on Android; instructions sheet on iOS).
- On update: clear banner or auto-reload strategy that respects the service-worker update flow.

**FR-6 Tablet layout:**
- Verify two-column-ish composition at ≥768px where the LDS grid supports it; no extreme stretching of `.content`.

## 7. Non-Functional Requirements

- **Performance:** First meaningful paint on a mid-range phone ≤ 3s on localhost/served build; interactions remain responsive (existing 5000-row benchmark stays within budget).
- **Accessibility:** WCAG 2.1 AA; keyboard + screen-reader checks on mobile-equivalent DOM.
- **Consistency:** No divergence from LDS tokens; desktop snapshots unchanged.
- **Testability:** New mobile checks are part of `npm test` (E2E) and are deterministic.

## 8. UI/UX Requirements

- Mobile topbar (hamburger + brand) preserved; no hamburger-only dead zones.
- Modals sized to the viewport (not wider than screen) with scrollable bodies and visible close affordance.
- Toasts/undo don't cover critical controls on small screens.
- Install hint copy is concise and dismissible.

## 9. Data Model Impact

- **None.** This initiative touches layout/CSS/wiring only.
- If install/update hints persist a "dismissed" state, that's a Settings/preferences field (app-level), not entity data.

## 10. Architecture Impact

- New E2E infra (Playwright) under `tests/e2e/` (or equivalent), wired into `npm test`.
- New small module for install-prompt handling (`js/services/install-prompt.js`) if hints are added.
- CSS media blocks under the existing responsive system; no new global layout rewrite.
- `sw.js`/`index.html` bump only if files are added.

## 11. PWA Considerations

- Installability is core: manifest/icons already present; add `screenshots` + `shortcuts` to the manifest for richer install.
- Update flow: keep `skipWaiting` + `clients.claim`; consider an update toast that triggers reload after a new SW activates.
- Offline first: mobile reliability depends on the existing shell cache; verify a mid-session offline reload.

## 12. Security & Privacy

- No new data handling. Install/update hints store only a local "dismissed" flag.
- No permissions introduced (no location/contacts/camera).

## 13. Error Handling

- Install hint when install unavailable → hidden gracefully.
- SW update failure → app continues on cached shell; no error surface needed beyond existing fallback.
- E2E flake handling: stable selectors, wait-for-network idle, screenshots on failure for debugging.

## 14. Success Criteria

- Playwright mobile checks green for all 8 pages at the 5 widths; no horizontal overflow.
- Touch-target audit passes (≥44px) for primary controls (axe + manual list).
- Running-balance two-line rows verified ≤360px with no overlap (screenshot + test).
- Desktop snapshot gate remains clean (no desktop churn).
- 451 existing tests + new E2E pass in `npm test`.

## 15. Dependencies

- LDS-001 responsive/token foundation (already implemented).
- Playwright (new dev dependency) + a docs note in Test Strategy.
- PWA install/update verification environment (can run locally + GitHub Pages preview).

## 16. Future Extensions

- Mobile-specific gesture support (swipe to reveal actions, pull-to-refresh for data changes).
- Low-data mode / lightweight theme toggle.
- Share-sheet import (import a file into Ledger from another app).

## 17. Open Questions

- Should the install hint auto-dismiss after N days or stay until actioned? (Spec: dismissible, re-shown on major version change.)
- Is 360px the true minimum supported, or should 320px (old iPhones) be targeted? (Spec: 360 minimum; 320 best-effort.)
- Table at 768px: reuse desktop table or switch to card list? (Spec: keep table, verify; revisit if cramped.)

---

*End of F-003.*
