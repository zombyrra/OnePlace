# Data Saving and Local Protection

OnePlace saves desktop data under Tauri's per-user app data directory in a `workspace` folder. The workspace has a `workspace.json` manifest plus one folder per notebook under `workspace/notebooks`. Each notebook keeps metadata in `notebook.json`, and each section stores its pages in a JSON file under that notebook's `sections` folder.

## Save and Load Safety

- Workspace saves are written to a hidden sibling staging folder first, then swapped into place. If a save fails while writing the new workspace, the previous workspace remains loadable.
- Individual JSON files and notebook folders are also written through temporary paths before replacement.
- Notebook, section group, and section IDs are encoded before they become path names, so IDs containing slashes, backslashes, `..`, or other path syntax cannot escape the intended workspace folders.
- Stored relative paths are checked during load. Absolute paths, parent-directory segments, and paths that resolve outside the expected workspace or notebook folder are rejected.
- In the desktop app, a load failure stays visible as a load failure. The app does not silently fall back to stale browser storage and then autosave over the real desktop workspace.
- Browser-only development still uses `localStorage` as a convenience fallback, but localStorage data is treated as untrusted and normalized before use.

## Autosave Behavior

Normal edits are debounced before saving so frequent typing does not write constantly. The app also flushes pending data before installing an update and makes a best-effort flush on `beforeunload` and `pagehide`. Shutdown-time async work is not guaranteed by every webview, so important close/restart flows should still prefer an explicit save or the normal saved indicator.

## Section Passwords

Section passwords protect the in-app view only. They do not encrypt the notebook files on disk.

New section password verifiers use salted PBKDF2-SHA-256 hashes. Existing legacy SHA-256 section hashes are still accepted so older protected sections keep working. Because the page contents are saved as normal JSON, anyone with access to the app data folder or backups can read the notes without using the app UI. Use OS account protection, BitLocker/device encryption, and protected backups for at-rest confidentiality.

## Rich Content Safety

Saved rich-text HTML is sanitized before it is rendered back into the editor. The sanitizer uses an allowlist and rejects active URLs such as `javascript:` along with risky data URLs like SVG or HTML attachments in inline render paths. The Tauri CSP also restricts scripts to the app itself and blocks object embedding.
