# Changelog

## Unreleased

- Added encrypted desktop workspace storage, encrypted rolling backup/restore snapshots, and Cloud Save to a user-chosen synced folder.

## 0.1.12 - 2026-03-18

- Refreshed migrated Windows Start Menu and desktop shortcuts after install so upgraded installs pick up the current OnePlace icon instead of preserving stale shortcut icon metadata.

## 0.1.11 - 2026-03-18

- Moved the `To Do Tag`, `Find Outlook Tasks`, `Email Page`, `Meeting Details`, `Dictate`, `Transcribe`, and `Copilot` actions out of Home and into the Insert tab.
- Fixed the floating search results panel so it anchors and layers properly under the search box instead of colliding with the ribbon.

## 0.1.10 - 2026-03-18

- Added local OneNote import support and desktop-side import plumbing for bringing notebook content into OnePlace.
- Added OneNote export/import helpers and supporting desktop integration hooks for the new workflow.
- Refreshed the OnePlace branding and app icons across the web app and Tauri bundles.
- Removed the duplicate toolbar version badge so the version only appears in the intended chrome locations.

## 0.1.9 - 2026-03-17

- Added direct cursor-based image dragging in notes so embedded images can be repositioned more naturally.
- Disabled the browser's blocked native image drag path and routed image movement through the in-editor move flow.

## 0.1.8 - 2026-03-17

- Modularized the app shell, editor actions, file actions, clipboard actions, and shared app model utilities.
- Improved notebook, section-group, and page navigation with more inline creation, rename, and collapse flows.
- Fixed drawing cursor offset and reduced ink lag during long drags.
- Fixed inline paste so single-line pasted text stays on the current line.
- Reworked the Home ribbon styles so heading actions are direct buttons instead of a dropdown.
- Refined the top header/tab chrome to reduce the active highlight and correct tab label alignment.

## 0.1.7 - 2026-03-13

- Improved run-tauri-dev.cmd script with better documentation and dynamic path resolution.

## 0.1.6 - 2026-03-13

- Fixed drag-and-drop for visible sections in the left notebook pane.
- Added drop indicators for section reordering.

## 0.1.5 - 2026-03-12

- Moved the visible app version into the note header beside the page action buttons.
- Kept the status-strip version fallback, but no longer rely on the footer for discoverability.

## 0.1.4 - 2026-03-12

- Always show the app version in the bottom-right status strip.
- Added a frontend build-time version fallback when desktop app info is unavailable.

## 0.1.3 - 2026-03-12

- Fixed automatic update checks so they run even when desktop app metadata is unavailable.
- Added a manual `Check for updates` action in the left pane footer.
- Improved update status messages for no-update and failure cases.

## 0.1.2 - 2026-03-12

- Added in-app update prompts that show the latest release notes before install.
- Published Intel and Apple Silicon macOS release artifacts side by side.
- Added signed updater release automation for Windows and macOS builds.

## 0.1.1 - 2026-03-12

- Added updater support to the Tauri desktop shell.
- Added GitHub Releases publishing for signed updater artifacts.
- Added architecture-specific macOS release packaging.
