# F-004 — Import Center (CSV + PDF + Import Presets)

**Document:** `docs/Features/F-004 Import Center.md`
**Date:** 2026-08-02
**Status:** Draft (for approval)
**Type:** Feature specification
**Roadmap:** Product Roadmap §5.2 — Priority **P1** (Data-in & mobile)
**Related docs:** F-001 Data Protection (round-trip data integrity), `docs/Features/Import-System.md` (pending), `docs/Project/Data-Model.md` (pending)

---

## 1. Vision

Getting a user's existing financial history into Ledger is effortless. A single **Import Center** unifies CSV upload, statement-text paste, PDF statement import, and **import presets** (remembered mappings per bank) so that adding data — once or on a schedule — is a one- or two-click act with full preview and control.

## 2. Problem Statement

Today import is functional but fragmented and CSV-only:

- CSV import, statement-text paste, and the preview live in separate modal entry points (`openCsvImportModal`, `openImportPreviewModal`, `openStatementPasteModal`).
- There is **no PDF import**, which excludes a large class of users whose banks export PDF statements.
- There are **no import presets** — the user re-selects destination account, column mappings, and defaults on every import for the same bank.
- Onboarding friction is the top churn point; every extra click reduces completion.

## 3. Goals

- Provide a single, discoverable **Import Center** surface that hosts all import methods.
- Add **PDF statement parsing** for the most common bank statement layouts.
- Add **import presets**: save/load per-source templates (column mapping, destination account, category defaults, currency).
- Keep the proven **preview pipeline** (grouping, dedup via `_dupeKey`, category suggestion) intact and behavior-stable.
- Never commit rows silently: every import shows a preview and a count before commit.

## 4. Non-Goals

- No OCR for image/scanned statements (PDF text extraction only).
- No automatic background/scheduled imports (that's a future extension).
- No changes to the reconciliation or reporting features.
- No change to transaction CRUD or the `_dupeKey` dedup semantics beyond alignment (already aligned in code).
- No ledger-side cloud storage of imported files.

## 5. User Stories

- As a user, I can open one place to import data and choose CSV, PDF, or pasted statement text.
- As a user, I can save a preset for my bank so the next import is pre-configured.
- As a user, I see a preview with detected duplicates and suggested categories before anything is committed.
- As a user importing a PDF, dates/amounts/descriptions come out correctly without manual cleanup.
- As a user, a malformed row is flagged in the preview, and I can fix or skip it before committing.

## 6. Functional Requirements

**FR-1 Import Center surface:**
- A Settings/Register entry point ("Import") that opens the center with tabs: CSV · PDF · Paste text · (Presets listed alongside).
- Reuses existing parsing + preview services; no new storage of the raw file.

**FR-2 CSV (existing, consolidated):**
- Preserve `parseCsv`, format detection, `normalizeDate`, `csvDetermineType`, `openImportPreviewModal` behavior.
- Wire CSV upload through the same center; no behavior change to parsing.

**FR-3 PDF statements (new):**
- Accept `.pdf` uploads; extract text via a maintained PDF text library (e.g., `pdf.js` — new dependency, requires license/security review).
- Detect statement layout by keywords (date/amount/description headers; multi-column layouts).
- Reuse `normalizeDate`, currency detection, and `suggestCategoryForDescription` for parsed rows.
- Map extracted rows into the same preview pipeline as CSV.

**FR-4 Import presets (new):**
- Preset shape: `{ id, name, source:"csv"|"pdf"|"text", columnMap, accountId, currency, categoryDefaults, dateFormat }`.
- Save a preset from a completed import; load/apply/edit/delete presets in the center.
- Persist presets locally (app settings), versioned alongside Data-Model settings.

**FR-5 Preview & commit:**
- Always show: detected row count, duplicate-flagged count, suggested-category count, and any malformed rows.
- Commit via existing `addTransactionBatch` (single save/render) + category learning (as today).

## 7. Non-Functional Requirements

- **Correctness:** Parsed PDF rows match expected fixtures for ≥3 bank layouts (tested corpus).
- **Performance:** 2,000-row CSV/PDF parses + previews in < 2s on mid-range hardware.
- **Determinism:** Parsing functions are pure where possible; unit-tested with fixtures.
- **Compatibility:** CSV path output is byte-compatible with the current pipeline (no regression).

## 8. UI/UX Requirements

- Import Center is a clear, calm single-screen experience (tabs + preset list + drop-zone).
- Preset cards show name, source, account, last-used date; actions: apply/edit/delete.
- Preview screen unchanged in pattern (grouped rows, per-row checkboxes for skip, category suggestions inline).
- Clear error/warning summary line before the Commit button.

## 9. Data Model Impact

- **New Settings collection:** `importPresets: ImportPreset[]` (see FR-4 shape) — app-level data, not an entity table.
- **No changes** to `transactions`, `accounts`, `categories`, `people`, `groups`, `debtItems`, `recurring`, or learning maps.
- Requires `docs/Features/Import-System.md` + `docs/Project/Data-Model.md` to be authored as canonical references.

## 10. Architecture Impact

- New service `js/services/pdf-import.js` (text extraction + layout detection + row mapping) alongside `csv-import.js`.
- New module `js/services/import-presets.js` (CRUD + persistence of presets).
- New UI entry `js/components/import-center.js` (or extend a page) hosting the tabs.
- Preview/commit stays in `import-preview.js`/`store.js` unchanged.
- `sw.js` + `index.html` updated for new files (cache bump).

## 11. PWA Considerations

- All import processing is local; fully offline.
- PDF text extraction may be CPU-heavy — process in a Web Worker to keep the UI responsive.
- New JS assets added to `APP_SHELL` + `?v=` bump.

## 12. Security & Privacy

- Imported files are read locally and never uploaded (no server).
- PDF library must be audited for parser CVEs; pin a specific version; CSP-compatible.
- Malicious/crafted PDFs must not execute code (extraction in a sandboxed worker; validate output).
- No telemetry about imports.

## 13. Error Handling

- Unreadable/corrupt file → clear toast + no state change.
- PDF layout not recognized → offer CSV/manual guidance; never commit garbage silently.
- Malformed rows → flagged in preview with reason; user can skip or edit before commit.
- Preset referencing a deleted account → invalidate/flag the preset, prompt to reassign.

## 14. Success Criteria

- Import Center reachable and functional from a single entry point.
- PDF fixtures from ≥3 banks parse with ≥95% field-accuracy on date/amount/description (tested).
- Preset save/apply/delete round-trip tested; preset applied to a subsequent import.
- Preview count/duplicate/category summary correct before commit; commit via `addTransactionBatch`.
- 451 existing tests + new import tests pass; snapshot gate clean.

## 15. Dependencies

- `docs/Features/Import-System.md` + `docs/Project/Data-Model.md` (canonical references) — prerequisites.
- Existing `csv-import.js`, `import-preview.js`, `store.js` (`addTransactionBatch`), `constants.js` (suggestion).
- New `pdf.js` dependency (license + security review) — approval required.
- Web Worker support for extraction.

## 16. Future Extensions

- Scheduled/auto-import for preset sources (with user consent).
- OCR for scanned statements.
- Bank-format autodetect library ("who is this statement from") to auto-apply a preset.
- Multi-file batch import.

## 17. Open Questions

- Should presets be exportable/importable alongside the data backup (F-001)? (Spec: include in backup metadata so device migration carries presets.)
- PDF: which specific banks are first-class in the v1 corpus? (Needs product input; spec lists ≥3 common ones.)
- Should Import Center live in Settings or in the Transactions toolbar? (Spec: Settings entry + a toolbar shortcut on the register when empty.)

---

*End of F-004.*
