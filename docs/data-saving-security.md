# Data Saving, Backups, and Local Protection

OnePlace saves desktop data under Tauri's per-user app data directory in a `workspace` folder. The logical workspace still has a `workspace.json` manifest plus one folder per notebook under `workspace/notebooks`, but desktop-owned workspace files are now written as encrypted JSON envelopes instead of readable note JSON. Each notebook keeps metadata in `notebook.json`, and each section stores its pages in a JSON file under that notebook's `sections` folder.

On Windows, OnePlace generates a 256-bit workspace key and protects that key with the current user's DPAPI profile. Workspace, notebook, section, rolling backup, and cloud-save package files are encrypted with AES-256-GCM before being written. Older plaintext workspace files are still readable for migration and are rewritten encrypted on the next save. User-triggered notebook exports remain normal JSON so they can be moved or inspected intentionally.

When importing an existing folder tree, OnePlace copies the selected folder's files into the workspace as OnePlace assets and preserves folder paths as notebook sections. The source folder is not changed and is not live-synced after import; imported files are protected by the same encrypted desktop workspace once saved.

## Save and Load Safety

- Workspace saves are written to a hidden sibling staging folder first, then swapped into place. If a save fails while writing the new workspace, the previous workspace remains loadable.
- If the app or computer stops during the final workspace swap, startup checks for a valid hidden staging or backup workspace and restores it before treating the workspace as empty.
- Individual JSON files and notebook folders are also written through temporary paths before replacement.
- Before a successful workspace replacement, OnePlace creates a rolling encrypted snapshot of the previous logical workspace and keeps the most recent 10 snapshots.
- Notebook, section group, and section IDs are encoded before they become path names, so IDs containing slashes, backslashes, `..`, or other path syntax cannot escape the intended workspace folders.
- Stored relative paths are checked during load. Absolute paths, parent-directory segments, and paths that resolve outside the expected workspace or notebook folder are rejected.
- In the desktop app, a load failure stays visible as a load failure. The app does not silently fall back to stale browser storage and then autosave over the real desktop workspace.
- Browser-only development still uses `localStorage` as a convenience fallback, but localStorage data is treated as untrusted and normalized before use.

## Rolling Backup and Restore

Rolling snapshots live beside the workspace in `workspace-backups`. They are encrypted with the same workspace key and can be listed/restored from the Sync Status dialog. Restoring a backup first snapshots the current workspace, then replaces the active workspace with the selected snapshot and reloads the app state from the restored data.

## Autosave Behavior

Normal edits are debounced before saving so frequent typing does not write constantly. The app also flushes pending data before installing an update and makes a best-effort flush on `beforeunload` and `pagehide`. Shutdown-time async work is not guaranteed by every webview, so important close/restart flows should still prefer an explicit save or the normal saved indicator.

## Section Passwords

Section passwords still protect the in-app view for a section. They are not the encryption key for the workspace files. At-rest file protection is workspace-level encryption handled by the desktop storage layer, so protected and unprotected sections are both stored in encrypted workspace envelopes on desktop.

New section password verifiers use salted PBKDF2-SHA-256 hashes. Existing legacy SHA-256 section hashes are still accepted so older protected sections keep working. Use OS account protection and device encryption as additional protection for the app data folder and the user's profile-protected workspace key.

## Cloud Saving

Cloud Save writes an encrypted copy of the workspace into a user-chosen folder under `oneplace-cloud-save`. Choose a folder that is already synced by a provider such as OneDrive, Dropbox, Google Drive, or iCloud Drive. OnePlace does not store provider account tokens or embed cloud credentials in the frontend.

Cloud restore reads that encrypted package, snapshots the current local workspace first, then replaces the active workspace with the cloud-saved workspace. The cloud package is encrypted with the same local workspace key, so it is a cloud backup/sync-folder workflow for this installation rather than a cross-account share link or a permissioned collaboration system.

## Rich Content Safety

Saved rich-text HTML is sanitized before it is rendered back into the editor. The sanitizer uses an allowlist and rejects active URLs such as `javascript:` along with risky data URLs like SVG or HTML attachments in inline render paths. The Tauri CSP also restricts scripts to the app itself and blocks object embedding.
