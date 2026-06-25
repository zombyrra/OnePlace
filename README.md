# OnePlace

OnePlace is a desktop note-taking app inspired by OneNote, built with React, TypeScript, Vite, and Tauri.

It is designed around fast notebook navigation, rich-page editing, desktop-friendly workflows, and a layout that feels familiar if you like section/page based note apps.

## What OnePlace Does

- Notebook, section group, section, and page organization
- Inline page and section rename/create flows
- Rich text editing with a ribbon-style UI
- Image, file, audio note, and printout insertion
- Drawing / ink layer support
- Review, history, tagging, and task workflows
- Desktop packaging through Tauri for Windows

## Current Direction

Recent work has focused on making the app feel more like a practical desktop notebook:

- more modular app structure
- easier notebook and page management
- improved ribbon UX
- better drawing behavior
- direct image movement inside notes

See the latest shipped changes in [CHANGELOG.md](./CHANGELOG.md).

## Download

The latest public Windows builds are on GitHub Releases:

- [OnePlace Releases](https://github.com/kernal201/OnePlace/releases)

For most Windows users, the file to download is:

- `OnePlace_<version>_x64-setup.exe`

That is the installer. End users do not need this repo, Node.js, Rust, or the source tree.

## Development

### Requirements

- Node.js 20+
- Rust toolchain
- Visual Studio C++ build tools on Windows

### Run locally

```bash
npm install
npm run dev
```

This starts the Tauri desktop app and uses the Vite frontend in development mode.

### Run the built web output locally

```bash
npm run build:web
npm run preview
```

### Run checks

```bash
npm test
npm run lint
```

### Data saving and local protection

See [docs/data-saving-security.md](./docs/data-saving-security.md) for the encrypted desktop save layout, rolling backup/restore behavior, Cloud Save workflow, section password limits, and local data protection expectations.

## Build

### Build the desktop app

```bash
npm run build
```

This produces:

- desktop executable: `src-tauri/target/release/oneplace.exe`
- NSIS installer: `src-tauri/target/release/bundle/nsis/OnePlace_<version>_x64-setup.exe`
- MSI installer: `src-tauri/target/release/bundle/msi/OnePlace_<version>_x64_en-US.msi`

### Build a signed updater release

This repo includes a signed updater release flow, but it requires a configured Tauri private signing key.

```bash
npm run build:release
npm run release:publish
```

If the signing key is not configured, normal desktop bundles can still be built and published manually as standard GitHub release assets.

## Release Notes

- Version is defined in:
  - `package.json`
  - `src-tauri/tauri.conf.json`
  - `src-tauri/Cargo.toml`
- Release notes are sourced from `CHANGELOG.md`
- GitHub releases currently publish to:
  - `https://github.com/kernal201/OnePlace`

## Tech Stack

- React 19
- TypeScript
- Vite
- Tauri 2
- Rust

## Repo Notes

- Frontend source lives under `src/`
- Tauri / Rust source lives under `src-tauri/`
- The app is actively being refactored toward smaller, more modular features and components
