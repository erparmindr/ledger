# Release Checklist

**Purpose:** Pre-release quality gates for Ledger.

## Functionality

- [ ] Full test suite passes (`npm test`).
- [ ] No new console errors on any page.
- [ ] No regressions in the UI Problems Register (LPDS-000): each touched issue is resolved or annotated.

## UI Consistency

- [ ] UI Review Checklist (QA folder) completed for changed components.
- [ ] Accessibility Checklist (QA folder) completed for changed components.
- [ ] No new inline-style drift added (see LPDS-UI-001).

## Offline & PWA

- [ ] Service worker cache version bumped if shell or assets changed (**`sw.js` `CACHE_NAME`**).
- [ ] Offline reload verified after the new cache is active.

## Data & Accuracy

- [ ] No financial aggregation changed without re-running reconciliation/integration tests.
- [ ] Amounts unaffected by visual changes (LPA-001 §4.1 Accuracy).

## Documentation

- [ ] LPDS README updated if the component set changed.
- [ ] Any new UI defect added to LPDS-000, not just fixed silently.

## Release

- Release number / date:
- Signed off by:
- Status: Go / No-go