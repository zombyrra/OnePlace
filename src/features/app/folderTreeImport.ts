import {
  accentPalette,
  buildSnippet,
  ensureSelection,
  escapeAttribute,
  escapeHtml,
} from '../../app/appModel'
import type { AppAsset, AppState, Notebook, Page, Section } from '../../app/appModel'

const FOLDER_IMPORT_NOTEBOOK_PREFIX = 'folder-tree-notebook:'
const FOLDER_IMPORT_GROUP_PREFIX = 'folder-tree-group:'
const FOLDER_IMPORT_SECTION_PREFIX = 'folder-tree-section:'
const FOLDER_IMPORT_PAGE_PREFIX = 'folder-tree-page:'
const FOLDER_IMPORT_ASSET_PREFIX = 'folder-tree-asset:'

export type FolderTreeImportBuild = {
  assetPrefix: string
  assets: AppAsset[]
  notebook: Notebook
}

const normalizePath = (value: string) => value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')

const splitPath = (value: string) =>
  normalizePath(value)
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)

const sanitizeIdPart = (value: string) =>
  (value.trim() || 'root')
    .replace(/[^a-z0-9._/-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^[-/]+|[-/]+$/g, '') || 'root'

const formatSizeLabel = (size: number) => {
  if (size >= 1024 * 1024) {
    return `${Math.max(1, Math.round((size / (1024 * 1024)) * 10) / 10)} MB`
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`
}

const sectionNameForPath = (relativeDir: string) => {
  const parts = splitPath(relativeDir)
  return parts.length > 0 ? parts.join(' / ') : 'Root Folder'
}

const addPathAndParents = (paths: Set<string>, value: string) => {
  const parts = splitPath(value)
  for (let index = 1; index <= parts.length; index += 1) {
    paths.add(parts.slice(0, index).join('/'))
  }
}

const buildAssetPrefix = (importId: string) => `${FOLDER_IMPORT_ASSET_PREFIX}${importId}:`
const buildAssetId = (importId: string, relativePath: string) =>
  `${buildAssetPrefix(importId)}${sanitizeIdPart(relativePath)}`
const buildPageId = (importId: string, relativePath: string) =>
  `${FOLDER_IMPORT_PAGE_PREFIX}${importId}:${sanitizeIdPart(relativePath)}`
const buildSectionId = (importId: string, relativeDir: string) =>
  `${FOLDER_IMPORT_SECTION_PREFIX}${importId}:${sanitizeIdPart(relativeDir || 'root')}`

const createAttachmentCard = (asset: AppAsset) => `
  <div class="attachment-card" contenteditable="false" data-asset-id="${escapeAttribute(asset.id)}" data-download-url="${escapeAttribute(asset.dataUrl)}" data-file-name="${escapeAttribute(asset.name)}">
    <strong class="attachment-title">${escapeHtml(asset.name)}</strong>
    <span class="attachment-meta">${escapeHtml(asset.sizeLabel)}</span>
  </div>
`

const createPrintoutCard = (asset: AppAsset) => `
  <section class="printout-card" contenteditable="false" data-asset-id="${escapeAttribute(asset.id)}" data-download-url="${escapeAttribute(asset.dataUrl)}" data-file-name="${escapeAttribute(asset.name)}">
    <div class="printout-preview-shell">
      <iframe class="printout-preview" data-asset-id="${escapeAttribute(asset.id)}" src="${escapeAttribute(asset.dataUrl)}" title="${escapeAttribute(asset.name)}"></iframe>
    </div>
    <div class="printout-caption">${escapeHtml(asset.name)} - ${escapeHtml(asset.sizeLabel)}</div>
  </section>
`

const createImageFigure = (asset: AppAsset) => `
  <figure class="embedded-image" contenteditable="false">
    <img alt="${escapeAttribute(asset.name)}" data-asset-id="${escapeAttribute(asset.id)}" draggable="false" src="${escapeAttribute(asset.dataUrl)}" />
    <figcaption>${escapeHtml(asset.name)} - ${escapeHtml(asset.sizeLabel)}</figcaption>
  </figure>
`

const createAudioNote = (asset: AppAsset) => `
  <figure class="audio-note" contenteditable="false">
    <audio controls data-asset-id="${escapeAttribute(asset.id)}" src="${escapeAttribute(asset.dataUrl)}"></audio>
    <figcaption>${escapeHtml(asset.name)} - ${escapeHtml(asset.sizeLabel)}</figcaption>
  </figure>
`

const createAssetMarkup = (asset: AppAsset) => {
  if (asset.kind === 'image') return createImageFigure(asset)
  if (asset.kind === 'audio') return createAudioNote(asset)
  if (asset.kind === 'printout') return createPrintoutCard(asset)
  return createAttachmentCard(asset)
}

const createFilePage = (importId: string, file: ImportedFolderFile, asset: AppAsset, accent: string): Page => {
  const title = file.name.trim() || 'Imported File'
  const content = `
    <section class="template-block">
      <h3>${escapeHtml(title)}</h3>
      <p><strong>Folder path:</strong> ${escapeHtml(file.relativePath)}</p>
      ${createAssetMarkup(asset)}
    </section>
  `

  return {
    accent,
    children: [],
    content,
    createdAt: file.modifiedAt,
    id: buildPageId(importId, file.relativePath),
    inkStrokes: [],
    isCollapsed: false,
    snippet: buildSnippet(title, content, file.modifiedAt),
    tags: [],
    task: null,
    title,
    updatedAt: file.modifiedAt,
  }
}

const createEmptyFolderPage = (importId: string, relativeDir: string, accent: string): Page => {
  const now = new Date().toISOString()
  const title = sectionNameForPath(relativeDir)
  const content = `
    <section class="template-block">
      <h3>${escapeHtml(title)}</h3>
      <p>No files were found in this folder when it was imported.</p>
    </section>
  `

  return {
    accent,
    children: [],
    content,
    createdAt: now,
    id: `${FOLDER_IMPORT_PAGE_PREFIX}${importId}:${sanitizeIdPart(relativeDir)}:empty`,
    inkStrokes: [],
    isCollapsed: false,
    snippet: buildSnippet(title, content, now),
    tags: [],
    task: null,
    title,
    updatedAt: now,
  }
}

export const buildFolderTreeImport = (directory: ImportedFolderTreeDirectory): FolderTreeImportBuild => {
  const importId = sanitizeIdPart(directory.path || directory.name)
  const assetPrefix = buildAssetPrefix(importId)
  const files = [...directory.files].sort((left, right) => left.relativePath.localeCompare(right.relativePath))
  const paths = new Set<string>()
  for (const dir of directory.directories) {
    addPathAndParents(paths, dir)
  }
  for (const file of files) {
    addPathAndParents(paths, file.relativeDir)
  }

  const rootFiles = files.filter((file) => normalizePath(file.relativeDir) === '')
  const orderedSectionPaths = [
    ...(rootFiles.length > 0 || paths.size === 0 ? [''] : []),
    ...[...paths].sort((left, right) => left.localeCompare(right)),
  ]

  const assetByPath = new Map<string, AppAsset>()
  const assets = files.map((file) => {
    const asset: AppAsset = {
      createdAt: file.modifiedAt,
      dataUrl: file.dataUrl,
      id: buildAssetId(importId, file.relativePath),
      kind: file.kind,
      mimeType: file.mimeType,
      name: file.name,
      sizeLabel: formatSizeLabel(file.size),
    }
    assetByPath.set(file.relativePath, asset)
    return asset
  })

  const sections: Section[] = orderedSectionPaths.map((relativeDir, index) => {
    const accent = accentPalette[index % accentPalette.length]
    const sectionFiles = files.filter((file) => normalizePath(file.relativeDir) === relativeDir)
    const pages =
      sectionFiles.length > 0
        ? sectionFiles.map((file) => createFilePage(importId, file, assetByPath.get(file.relativePath)!, accent))
        : [createEmptyFolderPage(importId, relativeDir, accent)]

    return {
      color: accent,
      id: buildSectionId(importId, relativeDir),
      name: sectionNameForPath(relativeDir),
      pages,
      passwordHash: null,
      passwordHint: '',
    }
  })

  const notebookName = directory.name.trim() || 'Imported Folder'
  const notebook: Notebook = {
    color: accentPalette[0],
    icon: 'folder',
    id: `${FOLDER_IMPORT_NOTEBOOK_PREFIX}${importId}`,
    name: notebookName,
    sectionGroups: [
      {
        id: `${FOLDER_IMPORT_GROUP_PREFIX}${importId}`,
        isCollapsed: false,
        name: 'Imported Folder Tree',
        sections,
      },
    ],
  }

  return { assetPrefix, assets, notebook }
}

export const mergeFolderTreeImportIntoState = (
  current: AppState,
  imported: FolderTreeImportBuild,
): AppState => {
  const firstGroup = imported.notebook.sectionGroups[0]
  const firstSection = firstGroup?.sections[0]
  const firstPage = firstSection?.pages[0]

  return ensureSelection({
    ...current,
    meta: {
      ...current.meta,
      assets: {
        ...Object.fromEntries(
          Object.entries(current.meta.assets).filter(([assetId]) => !assetId.startsWith(imported.assetPrefix)),
        ),
        ...Object.fromEntries(imported.assets.map((asset) => [asset.id, asset])),
      },
    },
    notebooks: [
      ...current.notebooks.filter((notebook) => notebook.id !== imported.notebook.id),
      imported.notebook,
    ],
    selectedNotebookId: imported.notebook.id,
    selectedPageId: firstPage?.id ?? current.selectedPageId,
    selectedSectionGroupId: firstGroup?.id ?? current.selectedSectionGroupId,
    selectedSectionId: firstSection?.id ?? current.selectedSectionId,
  })
}
