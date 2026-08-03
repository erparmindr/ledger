# F-001 — Data Protection (Backup & Restore)

**Document:** `docs/Features/F-001 Data Protection.md`
**Date:** 2026-08-02
**Status:** Draft (for approval)
**Type:** Feature specification
**Roadmap:** Product Roadmap §5.3 — Priority **P0** (Trust & quality foundation)
**Related docs:** `docs/Project/Data-Model.md` (pending), `docs/LDS/Implementation/Migration-Tracker.md`, `docs/QA/Release-Checklist.md`

---

## 1. Vision

A user's ledger is a **permanent financial record**. Data Protection makes loss impossible to ignore: backups are versioned, restores are safe, and the app proactively reminds the user to protect their data. "Your data is safe" becomes a visible, trustworthy statement, not an assumption.

## 2. Problem Statement

Today the app has working manual JSON export/import (`js/services/backup.js`) and dual persistence (IndexedDB + localStorage), but:

- Backup files have **no schema version**, so a future format change breaks old backups with no migration path.
- Restore validation is **warning-based, not version-based**; there is no upgrade path between versions.
- There is **no automatic export reminder** — protection depends entirely on the user remembering.
- The user has no in-app signal of when data was last backed up or how healthy the backup is.
- The backup format is undocumented (no single source of truth for the schema), which risks drift.

## 3. Goals

- Introduce a **versioned backup format** with forward/backward migration rules.
- Keep restore **safe**: never silently overwrite newer local data without explicit confirmation.
- Add a **configurable auto-export reminder** (periodic nudge) that works offline.
- Surface **backup health status** in Settings (last backup date, entity counts, format version).
- Round-trip guarantee: export → wipe → restore produces equivalent data.
- Lay the **schema foundation** that F-002 (Google Drive Backup) and Device Sync will build on.

## 4. Non-Goals

- No cloud/off-device storage (that is F-002).
- No automatic scheduled uploads or sync.
- No encryption of backup files in this spec (deferred to F-002 / Financial Vault); the local JSON export may remain plaintext but is clearly labeled.
- No change to the in-memory `DB` object shape or the dual-persistence write path.
- No CSV export changes (register/reports CSV export stays as-is).

## 5. User Stories

- As a user, I can export my full ledger to a versioned backup file at any time.
- As a user, I can restore a backup and am told exactly what will be replaced, with counts.
- As a user who restores an old backup, I am informed that it will be migrated to the current format (or told it is unsupported) before proceeding.
- As a user, I am reminded periodically to back up my data so I never lose it silently.
- As a user, I can see in Settings when I last backed up and how healthy that backup is.

## 6. Functional Requirements

**FR-1 Backup export (enhance `exportBackup`):**
- Emit `{ format: "ledger-backup", version: 1, exportedAt: <ISO>, data: <DB snapshot> }`.
- Filename: `ledger-backup-<YYYY-MM-DD>.json` (keep current naming).
- Include a SHA-256 checksum (via Web Crypto) of the serialized payload for integrity verification.

**FR-2 Backup import / restore (enhance `importBackupFile` + `validateBackup`):**
- Parse wrapper; if `version` missing, treat as legacy format → migrate via documented legacy path (current shape maps to `version:1`).
- Validate against the current version; report missing/invalid entity arrays and bad records (reuse existing per-entity checks).
- If backup version < current: run forward-migration transforms, then show a confirmation describing what changed.
- If backup version > current: block restore with a clear "newer than this app" message (no downgrade).
- Always confirm with counts before `replaceAllData`.

**FR-3 Backup health status (Settings):**
- Store `lastBackupAt`, `lastBackupVersion`, and entity counts in `Ledger` settings/localStorage (new `ledger_backup_meta` key).
- Settings shows: last backup date/time, number of accounts/transactions/categories, and format version.
- A "Back up now" button re-runs FR-1 and updates the meta.

**FR-4 Auto-export reminder:**
- User-configurable interval (off / weekly / monthly) persisted in settings.
- A non-intrusive banner/toast appears on the Overview when the interval elapsed and no backup has occurred since.
- Must work fully offline (no server).

**FR-5 Legacy & future migration framework:**
- A `migrateBackup(data, fromVersion, toVersion)` chain where each version step is a pure function.
- Migration steps are unit-tested against sample fixtures.

## 7. Non-Functional Requirements

- **Reliability:** Round-trip export→restore is byte-equivalent for supported versions (tested).
- **Performance:** Backup of 5,000-transaction dataset serializes + hashes in < 1s.
- **Compatibility:** Backup file is valid JSON that a human can inspect; version wrapper is forward-compatible (new fields optional).
- **Testability:** Pure functions (`validateBackup`, `migrateBackup`, checksum) isolated for unit tests; existing 451-test suite stays green.

## 8. UI/UX Requirements

- **Settings → Data:** a "Backup & Restore" card grouping export, import, auto-reminder selector, and health status.
- **Restore confirm modal:** entity counts, version note ("will be migrated from v1 to v2"), and an explicit irreversible-replace warning.
- **Reminder banner:** dismissible, quiet, links to Settings.
- **Toasts:** reuse existing `showToast` for success/failure.

## 9. Data Model Impact

- **New Settings fields** (app-level, not per-entity): `backupReminderInterval` (`"off"|"weekly"|"monthly"`), `lastBackupAt`, `lastBackupVersion`, `lastBackupCounts`.
- **Backup file wrapper** is a new document shape (see FR-1) — the `DB` snapshot inside is unchanged for `version:1`.
- No changes to `transactions`, `accounts`, `categories`, `people`, `groups`, `debtItems`, `recurring`, or learning maps.
- Requires `docs/Project/Data-Model.md` to be authored as the canonical schema (dependency).

## 10. Architecture Impact

- New service file `js/services/backup-format.js` (pure: wrapper serialize/parse, `migrateBackup`, checksum) kept separate from `js/services/backup.js` (download/FileReader/UI).
- `storage.js` dual-persistence path is **unchanged**.
- `sw.js` app-shell list gains the new JS file (and its `?v=` bump in `index.html`).
- Settings page gains the new Data card + wiring.

## 11. PWA Considerations

- Backup/restore and reminders are 100% local — fully functional offline.
- The auto-reminder uses local time logic; no push required.
- New `backup-format.js` must be added to the service-worker `APP_SHELL` list and cache-bumped (`CACHE_NAME` + `?v=`).

## 12. Security & Privacy

- Backup file is plaintext JSON (user-controlled local file); clearly labeled as containing all financial data.
- Checksum ensures corruption detection, not confidentiality.
- No data leaves the device; no telemetry about backups.
- Restore only ever runs user-initiated from a user-selected file.

## 13. Error Handling

- Invalid/corrupt JSON → toast "is it a valid backup?" (existing behavior preserved).
- Structural validation failures → list first N warnings, block restore.
- Checksum mismatch → warn before allowing restore.
- Version > current → block with explanatory message.
- Reminder storage failure → silently disable banner (non-blocking).

## 14. Success Criteria

- Round-trip export→restore test green (byte-equivalent for v1 and a migrated v1→v2 fixture).
- Migration framework covered by unit tests (at least legacy→v1 and a synthetic v1→v2 step).
- Settings shows health status + reminder control; reminder banner appears on schedule.
- 451 existing tests + new tests pass; snapshot gate clean for Settings page.

## 15. Dependencies

- `docs/Project/Data-Model.md` (canonical schema) — **prerequisite**.
- Existing `js/services/backup.js`, `storage.js`, `store.js`.
- Web Crypto API (checksum) — available in all modern browsers.
- F-002 (Google Drive Backup) and Device Sync build on this spec's format.

## 16. Future Extensions

- Encryption (passphrase) of backup files (prepares F-002).
- Scheduled auto-export to a user-chosen local location (if browser APIs allow).
- Backup comparison/diff view.

## 17. Open Questions

- Should the legacy (pre-versioning) format be auto-migrated silently or with a warning modal? (Spec assumes warning + counts.)
- Where should `ledger_backup_meta` live — inside `DB` (so it backs up) or as a separate localStorage key? (Spec assumes separate key so health meta isn't circular.)
- Should reminders count "data changed since last backup" to avoid nagging? (Deferred; basic interval first.)

---

*End of F-001.*
