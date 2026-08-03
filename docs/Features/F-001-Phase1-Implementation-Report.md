# F-001 Data Protection — Phase 1 Implementation Report

**Document:** `docs/Features/F-001-Phase1-Implementation-Report.md`
**Date:** 2026-08-02
**Status:** Awaiting review — **no commit made**
**Scope:** Phase 1 only (foundation). No Google Drive, no sync, no encryption, no scheduling, no automatic backups.
**Spec:** `docs/Features/F-001 Data Protection.md`
**Baseline:** 451/451 tests passing · working tree clean (post Transactions refresh)

---

## 1. Executive summary

Phase 1 delivered the Data Protection foundation exactly as scoped:

1. **Versioned backup format** (`format` / `version` / `exportedAt` / `checksum` / `data`).
2. **SHA-256 integrity verification** on both export and import (pure-JS implementation, no new dependencies).
3. **Backup version metadata + migration framework** (no migrations needed yet; legacy `0 → 1` is identity).
4. **Data Protection status in Settings** — "Local Only (At Risk)" vs "Manual Backup Available" + last-backup metadata.
5. **Non-intrusive warning** on Overview for users who have never created a backup (dismissible).
6. **Full backward compatibility** with existing (legacy, unwrapped) backups — verified by test.

During verification a real latent bug was found and fixed: **`wrapBackup` stored a live reference to `L.DB` instead of a snapshot**, so a backup could be silently altered (and its checksum invalidated) by any post-wrap DB mutation. It is now a true deep copy, with a regression test.

**Tests:** 469/469 passing (18 new + 2 updated). **Snapshots:** 3/42 changed, all intentional (Settings status + Overview banner).

---

## 2. Files changed

| File | Change |
|---|---|
| `js/services/backup-format.js` **(new)** | Versioned wrapper (`wrapBackup` deep-copies data), SHA-256 hex (`sha256hex`), wrapper detection (`unwrapBackup`), integrity check (`verifyBackupChecksum`), migration framework (`migrateBackup`, `_backupMigrations`), backup metadata (`BACKUP_META_KEY`, `getBackupMeta`, `setBackupMeta`). Pure module — no DOM/storage side effects beyond the meta helpers. |
| `js/services/backup.js` | `exportBackup` now wraps the DB and calls `recordBackupExport()`; new `recordBackupExport()` records last-backup meta; `importBackupFile` delegates to new `restoreBackupData`; new `restoreBackupData(parsed)` handles versioned + legacy, newer-version block, checksum-mismatch confirmation, migration, validation, and confirm-then-`replaceAllData`; new `_applyBackup`. `validateBackup` unchanged. |
| `js/pages/settings.js` | Backup & restore card now shows a Data Protection status banner: "Local Only (At Risk)" (never backed up) or "Manual Backup Available — last backup: …" with account/transaction counts from meta. |
| `js/pages/overview.js` | Renders a dismissible "You haven't backed up your ledger yet" banner when no backup meta exists and it hasn't been dismissed. |
| `js/wire/overview.js` | Wires the banner's Dismiss button (persists `ledger_backup_warning_dismissed`) and the "Back up now" nav-link. |
| `index.html` | Added `backup-format.js` script tag before `backup.js`; bumped `backup.js` cache `?v=5 → ?v=6`. |
| `sw.js` | Added `backup-format.js` to `APP_SHELL`; bumped `CACHE_NAME` `v117 → v118`. |
| `tests/helpers/load-ledger.js` | Loads `backup-format.js` before `backup.js`. |
| `tests/store-and-backup.test.js` | New suites: `sha256hex` (4), `wrapBackup/unwrapBackup` (5, incl. true-snapshot regression), `verifyBackupChecksum` (2), `migrateBackup` (2), `backup metadata` (2), `restoreBackupData full round-trip` (3: versioned identical-DB, legacy, newer-version block). |
| `tests/validation.test.js` | Updated the existing backup round-trip test to the new versioned format (unwrap + verify checksum before validating/restoring). |

---

## 3. User-visible changes

- **Settings → Backup & restore** now shows a status banner:
  - **Before any backup:** `Local Only (At Risk)` (red dot) — "your data lives only in this browser. Export a backup to protect it."
  - **After a backup:** `Manual Backup Available` (green dot) — "last backup: <date> (N accounts, M transactions)".
- **Overview** shows a dismissible, non-intrusive warning for users who have never backed up, with a "Back up now" link to Settings and a Dismiss button (dismissal persisted locally).
- Exported backup files are now **versioned and checksummed**; restoring still works exactly as before for both new and old files.

---

## 4. Internal architecture changes

- **New module boundary:** `backup-format.js` owns the format contract (wrap/unwrap/checksum/migration) as pure functions; `backup.js` owns I/O (Blob/FileReader/UI/confirm) and the new meta-recording. This separation means future migrations and encryption (F-001 Phase 2 / F-002) plug into `backup-format.js` without touching I/O.
- **Migration framework:** `_backupMigrations` maps source-version → step function (empty today). `migrateBackup(data, from, to)` applies steps in sequence. Legacy files are treated as version `0`; the `0 → 1` step is identity because `normalizeData` performs field backfill on restore — verified by the round-trip tests.
- **Meta storage:** `ledger_backup_meta` lives in `localStorage` (not inside `DB`) so it is not part of the backed-up payload (per F-001 spec decision).

---

## 5. Test results

- **Command:** `node .\node_modules\vitest\vitest.mjs run`
- **Result:** **469 / 469 passing** (16 files) — up from 451 baseline.
- **New tests:** 18 added; **updated:** 2 (validation round-trip; wrapBackup reference→deep-copy assertion).
- Coverage includes: SHA-256 known test vectors, wrapper round-trip through JSON, checksum valid/tampered, migration identity, meta round-trip, and **full restore round-trips** (versioned + legacy) asserting identical transaction count, account count, recurring count, and **all account balances**.

---

## 6. Backward compatibility verification

- **Legacy (unwrapped) backups:** `unwrapBackup` returns `{ version: 0, data: <raw DB> }`; `migrateBackup(0 → 1)` is identity; validation/restore path unchanged. Verified by a dedicated test that wipes data and restores a legacy backup to an identical database (counts + balances).
- **Existing UI flow:** Export and Restore buttons, file picker, confirm modal, and toasts all preserved.
- **Round-trip:** export → wipe → restore produces identical DB (accounts, transactions, recurring, categories, debtItems, balances) — verified by test and by the final verification harness.

---

## 7. Root-cause resolution: restore verification issue

**Symptom:** an ad-hoc harness check reported that a versioned restore left only the default 2 accounts instead of the demo 6.

**Investigation:**
- The initial "failure" was traced to **test-harness ordering**: the harness loaded demo data with the real `renderPage` active before stubs were installed, so a render throw left state inconsistent. Installing stubs first made the sequence pass — but a deeper, *real* defect surfaced at the same time.
- **Real defect:** `wrapBackup(db)` stored `data: db` — a **live reference** to the in-memory DB. In the harness, the DB was wiped *after* wrapping but *before* cloning, so the wrapper's `data` silently became the wiped state and its checksum no longer matched. In the app this is latent (export serializes immediately), but it violates the F-001 contract (`data: <DB snapshot>`) and would break any code that wraps then mutates.

**Fix (application bug, not a workaround):** `wrapBackup` now deep-copies via `JSON.parse(JSON.stringify(db))`, so the wrapper is a true snapshot immune to later DB mutations. A regression test ("keeps a true snapshot…") covers the exact scenario. Production code required no other change.

**Verification of the fix:** full suite 469/469; final harness asserts versioned and legacy restores both reproduce identical databases including all account balances.

---

## 8. Snapshot / visual regression

- Regenerated the 42-page HTML snapshot vs the committed (Sprint 2) baseline.
- **Changed: 3/42** — `overview.demo.html`, `overview.empty.html`, `settings.demo.html`.
- **All intentional:** Settings Backup card gains the Data Protection status banner; Overview gains the never-backed-up warning banner. No other page changed; transactions/register output identical.

---

## 9. Remaining work for Phase 2

Per the F-001 spec, Phase 2 (not implemented here) includes:
- **Backup health + auto-export reminder** (periodic non-intrusive nudge, configurable interval, respects last-backup time).
- **Format versioning in the UI** (surface the backup's format version during restore; show migration notes).
- **Backup comparison/verification UX** (optional in-app integrity report).
- **Encryption groundwork** (currently plaintext by design — F-002 will add passphrase/AES-GCM).
- **Drive upload** (F-002, depends on Phase 2's format stability).

**Not in scope and not implemented:** Google Drive, sync, encryption, scheduling, automatic backups.

---

## 10. Verification checklist (final)

- ✅ Full suite: 469/469 passing.
- ✅ Versioned backup → restore reproduces an **identical database** (tx count, account count, recurring, categories, debtItems, balances).
- ✅ **Account balances** identical after restore.
- ✅ **Recurring items** identical after restore.
- ✅ **Settings** render correctly in both status states (At Risk / Manual Backup Available).
- ✅ **Metadata** (`ledger_backup_meta`: lastBackupAt, version, counts) recorded on export and read on Settings.
- ✅ **Checksum verification** passes for valid backups, fails for tampered backups, prompts confirmation on mismatch.
- ✅ **Legacy backup compatibility** verified end-to-end.
- ✅ Snapshot diffs limited to the 3 intended pages.

**No commit made — awaiting review.**

---

*End of F-001 Phase 1 Implementation Report.*
