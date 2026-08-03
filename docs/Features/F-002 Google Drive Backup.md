# F-002 — Google Drive Backup

**Document:** `docs/Features/F-002 Google Drive Backup.md`
**Date:** 2026-08-02
**Status:** Draft (for approval)
**Type:** Feature specification
**Roadmap:** Product Roadmap §5.4 — Priority **P2** (Trust extensions)
**Related docs:** F-001 Data Protection (format + foundation), `docs/Features/Sync-Architecture.md` (pending), `docs/Project/Data-Model.md` (pending)

---

## 1. Vision

The user's ledger survives device loss or browser data clearing — **without** creating a Ledger account or sending data through Ledger's servers. Google Drive Backup is an optional, user-initiated, client-side-encrypted off-device safety net: the user's passphrase protects the data, and only the user can read it.

## 2. Problem Statement

Ledger's privacy promise ("no accounts, no cloud") leaves a real gap: if the device is lost or browser storage is cleared, the permanent financial record is gone unless the user manually downloaded a JSON file. Users want off-device redundancy but will not trade it for an account or for data readable by a third party. A Drive-backed, encrypted, optional backup closes that gap while preserving the product's identity.

## 3. Goals

- Allow the user to back up an encrypted copy of the ledger to their own Google Drive.
- Encrypt client-side with a user passphrase (key never leaves the device; Ledger/Google cannot read it).
- Support one-tap restore from Drive, with conflict safety (never overwrite newer local data without confirmation).
- Preserve full offline-first behavior; Drive is strictly opt-in.
- Build on the F-001 versioned backup format.

## 4. Non-Goals

- **Not** a Ledger cloud account, sync service, or server.
- **Not** two-way continuous sync (that is Device Sync, P3).
- **Not** sharing backups with other users.
- **Not** encrypting the local backup file (that remains F-001's labeled plaintext local export).
- **Not** key recovery: a lost passphrase means the backup is unrecoverable (documented).

## 5. User Stories

- As a privacy-conscious user, I can back up my ledger to my own Google Drive so a lost phone doesn't mean lost data.
- As a user, my backup is unreadable to anyone without my passphrase, including Ledger and Google.
- As a user who lost a device, I can restore my encrypted backup from Drive by entering my passphrase.
- As a user, I am never forced to use Drive; the app works fully offline without it.
- As a user, if my local data is newer than the Drive backup, I am warned before a restore overwrites it.

## 6. Functional Requirements

**FR-1 Encryption (Web Crypto):**
- Passphrase-derived key via PBKDF2 (SHA-256, high iteration count, random salt).
- Encrypt the F-001 `ledger-backup` payload with AES-GCM (random IV); store salt+IV+authTag+version alongside ciphertext.
- Everything stored on Drive is ciphertext + non-secret metadata (salt, IV, KDF params, app id, format version, timestamp).

**FR-2 Drive upload:**
- OAuth to Google Drive scoped to the user's own files (e.g., `drive.file`), via a user-controlled token (see Security).
- Upload one blob per backup under an app folder named `Ledger Backups`.
- Keep a small metadata file (ciphertext + timestamps + entity counts) for list/health display.
- Cap: retain the most recent N backups (default 5) with simple cleanup.

**FR-3 Drive restore:**
- List available backups (from metadata), showing date + entity counts (counts are plaintext metadata).
- User selects one and enters passphrase; decrypt and validate via F-001 format.
- Before applying, compare `lastBackupAt` against local `lastBackupAt` (F-001 meta): if local is newer, warn and require explicit confirmation.

**FR-4 Status & lifecycle:**
- Settings shows Drive connection state (not connected / connected), last Drive backup time, and a "Back up now" action.
- Disconnect clears stored tokens; local data unaffected.

**FR-5 Offline behavior:**
- All encryption/decryption local. Upload/restore require connectivity; failures surface as non-blocking toasts.
- If offline, the "Back up to Drive" action is disabled with a clear hint (manual JSON export still available).

## 7. Non-Functional Requirements

- **Security:** Threat model documented (see §12). KDF iteration count chosen for acceptable latency (~<1s) and strong protection.
- **Reliability:** Upload/restore of a 5,000-transaction dataset succeeds; partial-failure (network) leaves no corrupt state and reports cleanly.
- **Testability:** Encryption/decryption + backup-wrapping are pure functions unit-tested independent of the OAuth/network layer (mocked).
- **Compatibility:** Uses F-001 format so a Drive restore and a local file restore accept the same payload.

## 8. UI/UX Requirements

- **Settings → Data → Google Drive:** connection status, connect/disconnect, backup-now, last-backup, and a "Learn how encryption works" expander.
- **Connect flow:** OAuth consent handled via a popup/redirect that returns a token without a Ledger server (see §12 options).
- **Restore flow:** picker (date + counts) → passphrase prompt → confirm modal (counts + conflict warning) → apply → toast.
- **Passphrase UX:** strength meter; explicit warning that the passphrase cannot be recovered.

## 9. Data Model Impact

- **No change to entity schemas.** Uses F-001 wrapper.
- **New Settings meta:** `driveConnected`, `driveLastBackupAt`, `driveMaxRetained` (default 5).
- New non-secret metadata object shape for Drive listing: `{ id, formatVersion, exportedAt, salt, iv, authTag, kdf:{alg,iterations}, counts }`.

## 10. Architecture Impact

- New service `js/services/drive-backup.js` (encrypt/decrypt + Drive API calls + metadata).
- New `js/services/oauth.js` for the user-scoped token flow (must not introduce a Ledger server; see Open Questions).
- `F-001`'s `backup-format.js` reused for wrapping/migration.
- `sw.js` + `index.html` gain the new files (cache bump).
- No change to `store.js`/`storage.js` core write path.

## 11. PWA Considerations

- Fully offline for local use; Drive features degrade gracefully when offline.
- OAuth requires network; the token is stored locally (IndexedDB/localStorage) with a short lifetime.
- Service worker must not cache Google API tokens; keep auth out of the cache.

## 12. Security & Privacy

- **Threat model:** attacker with access to the Drive backup gets ciphertext + non-secret metadata only. Confidentiality relies solely on the passphrase (PBKDF2+AES-GCM). Ledger has no server, so no server-side exposure.
- **Tokens:** stored locally; user can disconnect/revoke. Prefer short-lived tokens refreshed only when the user acts.
- **No telemetry.** Drive usage is not reported anywhere.
- **Key loss:** documented irrecoverable (user must keep passphrase or re-export).
- **Metadata leak:** timestamps/counts are plaintext — acceptable, documented trade-off.

## 13. Error Handling

- OAuth denied/revoked → toast + status "Not connected".
- Upload failure (offline/quota/permission) → toast; local data untouched; retry button.
- Decrypt failure (wrong passphrase / tampered data) → clear error, no partial write.
- Restore conflict (local newer) → blocking confirm before overwrite.
- Backup list empty → "No backups found".

## 14. Success Criteria

- Encrypt→upload→list→download→decrypt round-trip green (unit + mocked integration).
- A test proves ciphertext contains no recoverable financial plaintext (search payload for known strings).
- Conflict-warning path covered by tests.
- Settings statuses accurate across connect/disconnect/offline states.
- 451 existing tests + new tests pass.

## 15. Dependencies

- **F-001 Data Protection** (versioned format + meta) — prerequisite.
- `docs/Features/Sync-Architecture.md` — defines the adapter boundary and threat model.
- Web Crypto API; Google Drive REST API; a token mechanism (see Open Questions).
- `docs/Project/Data-Model.md` for the payload schema.

## 16. Future Extensions

- Multiple storage providers (Dropbox/OneDrive) via a provider-agnostic adapter.
- Passphrase change with re-encryption in place.
- Optional biometric/passphrase-manager integration (keychain) so a single unlock covers Vault + Drive.

## 17. Open Questions

- **Token mechanism without a Ledger server:** options are (a) OAuth implicit/pkce with a public client id, (b) a tiny user-hosted gateway, or (c) Chrome-only identity APIs. Spec assumes (a) with `drive.file` scope; needs confirmation.
- Should encryption be mandatory for Drive backups, or offered plaintext for power users? (Spec: mandatory.)
- Passphrase storage: prompt every restore, or cache in session only? (Spec: prompt each restore.)
- Should F-001 local export and Drive share the same F-001 wrapper, or should Drive add extra metadata? (Spec: same wrapper + Drive metadata file.)

---

*End of F-002.*
