import { useState, type Dispatch, type SetStateAction } from 'react'
import {
  accentPalette,
  buildSnippet,
  ensureSelection,
  plainTextToHtml,
  sanitizePastedHtml,
} from '../../app/appModel'
import type { AppAsset, AppState, Notebook, Page, Section, SectionGroup } from '../../app/appModel'
import {
  importOneNoteExportDirectory,
  pickOneNoteExportDirectory,
  readLocalAssetFile,
} from '../../lib/desktop'

const EXPORT_NOTEBOOK_PREFIX = 'onenote-export-notebook:'
const EXPORT_GROUP_PREFIX = 'onenote-export-group:'
const EXPORT_SECTION_PREFIX = 'onenote-export-section:'
const EXPORT_PAGE_PREFIX = 'onenote-export-page:'
const EXPORT_ASSET_PREFIX = 'onenote-export-asset:'
const IMPORTABLE_HTML_EXTENSIONS = new Set(['htm', 'html', 'mht', 'mhtml'])
const IMPORTABLE_TEXT_EXTENSIONS = new Set(['md', 'txt'])

const stripFileProtocol = (value: string) => value.replace(/^file:\/\/\/?/i, '')

const normalizePath = (value: string) => stripFileProtocol(value).replace(/\\/g, '/')

const splitSegments = (value: string) =>
  normalizePath(value)
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)

const sanitizeIdPart = (value: string) =>
  value
    .trim()
    .replace(/[^a-z0-9._/-]+/gi, '-')
    .replace(/-+/g, '-')

const formatSizeLabel = (size: number) => {
  if (size >= 1024 * 1024) {
    return `${Math.max(1, Math.round((size / (1024 * 1024)) * 10) / 10)} MB`
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`
}

const looksLikeExternalUrl = (value: string) => /^(?:https?:)?\/\//i.test(value) || /^data:/i.test(value)

const createPlaceholderPage = (title: string, accent: string, pageId: string): Page => {
  const now = new Date().toISOString()
  const content = '<p></p>'
  return {
    accent,
    children: [],
    content,
    createdAt: now,
    id: pageId,
    inkStrokes: [],
    isCollapsed: false,
    snippet: buildSnippet(title, content, now),
    tags: [],
    task: null,
    title,
    updatedAt: now,
  }
}

const decodeQuotedPrintable = (value: string) =>
  value
    .replace(/=\r?\n/g, '')
    .replace(/=([A-Fa-f0-9]{2})/g, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))

const extractHtmlFromMhtml = (contents: string) => {
  const boundaryMatch = contents.match(/boundary="?([^"\r\n;]+)"?/i)
  if (!boundaryMatch) return contents

  const boundary = boundaryMatch[1]
  const chunks = contents.split(`--${boundary}`)

  for (const chunk of chunks) {
    if (!/content-type:\s*text\/html/i.test(chunk)) continue
    const [, rawBody = ''] = chunk.split(/\r?\n\r?\n/, 2)
    if (/content-transfer-encoding:\s*base64/i.test(chunk)) {
      try {
        return atob(rawBody.replace(/\s+/g, ''))
      } catch {
        return rawBody
      }
    }

    if (/content-transfer-encoding:\s*quoted-printable/i.test(chunk)) {
      return decodeQuotedPrintable(rawBody)
    }

    return rawBody
  }

  return contents
}

const resolveSiblingPath = (filePath: string, relativePath: string) => {
  const normalizedRelativePath = stripFileProtocol(relativePath)
  if (/^[A-Za-z]:[\\/]/.test(normalizedRelativePath) || normalizedRelativePath.startsWith('/')) {
    return normalizedRelativePath.replace(/\\/g, '/')
  }

  const absoluteSegments = splitSegments(filePath)
  absoluteSegments.pop()
  const nextSegments = [...absoluteSegments]

  for (const segment of splitSegments(decodeURIComponent(normalizedRelativePath))) {
    if (segment === '.') continue
    if (segment === '..') {
      if (nextSegments.length > 0) {
        nextSegments.pop()
      }
      continue
    }
    nextSegments.push(segment)
  }

  const joined = nextSegments.join('/')
  if (/^[A-Za-z]:$/.test(nextSegments[0] ?? '')) {
    return `${nextSegments[0]}/${nextSegments.slice(1).join('/')}`
  }

  return joined
}

const createAttachmentCard = (doc: Document, asset: AppAsset) => {
  const card = doc.createElement('div')
  card.className = 'attachment-card'
  card.setAttribute('contenteditable', 'false')
  card.dataset.assetId = asset.id
  card.dataset.downloadUrl = asset.dataUrl
  card.dataset.fileName = asset.name

  const title = doc.createElement('strong')
  title.className = 'attachment-title'
  title.textContent = asset.name

  const meta = doc.createElement('span')
  meta.className = 'attachment-meta'
  meta.textContent = asset.sizeLabel

  card.append(title, meta)
  return card
}

const createPrintoutCard = (doc: Document, asset: AppAsset) => {
  const card = doc.createElement('section')
  card.className = 'printout-card'
  card.setAttribute('contenteditable', 'false')
  card.dataset.assetId = asset.id
  card.dataset.downloadUrl = asset.dataUrl
  card.dataset.fileName = asset.name

  const previewShell = doc.createElement('div')
  previewShell.className = 'printout-preview-shell'

  const frame = doc.createElement('iframe')
  frame.className = 'printout-preview'
  frame.dataset.assetId = asset.id
  frame.src = asset.dataUrl
  frame.title = asset.name

  const caption = doc.createElement('div')
  caption.className = 'printout-caption'
  caption.textContent = `${asset.name} - ${asset.sizeLabel}`

  previewShell.append(frame)
  card.append(previewShell, caption)
  return card
}

const createAudioNote = (doc: Document, asset: AppAsset) => {
  const figure = doc.createElement('figure')
  figure.className = 'audio-note'
  figure.setAttribute('contenteditable', 'false')

  const audio = doc.createElement('audio')
  audio.controls = true
  audio.dataset.assetId = asset.id
  audio.src = asset.dataUrl

  const caption = doc.createElement('figcaption')
  caption.textContent = asset.name

  figure.append(audio, caption)
  return figure
}

const inferAssetKind = (mimeType: string): AppAsset['kind'] => {
  const normalized = mimeType.toLowerCase()
  if (normalized.startsWith('image/')) return 'image'
  if (normalized.startsWith('audio/')) return 'audio'
  if (normalized === 'application/pdf') return 'printout'
  return 'file'
}

const replaceWithAssetNode = (doc: Document, node: Element, asset: AppAsset) => {
  if (asset.kind === 'image') {
    node.setAttribute('data-asset-id', asset.id)
    node.setAttribute('src', asset.dataUrl)
    node.setAttribute('draggable', 'false')
    return
  }

  if (asset.kind === 'audio') {
    node.replaceWith(createAudioNote(doc, asset))
    return
  }

  node.replaceWith(asset.kind === 'printout' ? createPrintoutCard(doc, asset) : createAttachmentCard(doc, asset))
}

const importHtmlPage = async (file: ImportedOneNoteFile, assetBaseId: string, rootPath: string) => {
  const extension = file.extension.toLowerCase()
  const rawHtml =
    extension === 'mht' || extension === 'mhtml'
      ? extractHtmlFromMhtml(file.contents)
      : file.contents
  const doc = new DOMParser().parseFromString(rawHtml, 'text/html')
  const assets: AppAsset[] = []
  let assetIndex = 0

  const importLocalAsset = async (rawPath: string) => {
    if (!rawPath || rawPath.startsWith('#') || looksLikeExternalUrl(rawPath)) return null

    try {
      const resolvedPath = resolveSiblingPath(file.absolutePath, rawPath)
      const importedAsset = await readLocalAssetFile(resolvedPath, rootPath)
      const kind = inferAssetKind(importedAsset.mimeType)
      const asset: AppAsset = {
        createdAt: file.modifiedAt,
        dataUrl: importedAsset.dataUrl,
        id: `${assetBaseId}:${assetIndex++}`,
        kind,
        mimeType: importedAsset.mimeType,
        name: importedAsset.name,
        sizeLabel: formatSizeLabel(importedAsset.size),
      }
      assets.push(asset)
      return asset
    } catch {
      return null
    }
  }

  for (const image of [...doc.querySelectorAll('img[src]')]) {
    const asset = await importLocalAsset(image.getAttribute('src') ?? '')
    if (asset) {
      replaceWithAssetNode(doc, image, asset)
    }
  }

  const embeddedSelectors = [
    ...doc.querySelectorAll('audio[src]'),
    ...doc.querySelectorAll('iframe[src]'),
    ...doc.querySelectorAll('embed[src]'),
    ...doc.querySelectorAll('object[data]'),
    ...doc.querySelectorAll('video[src]'),
  ]

  for (const node of embeddedSelectors) {
    const rawPath = node.getAttribute('src') ?? node.getAttribute('data') ?? ''
    const asset = await importLocalAsset(rawPath)
    if (asset) {
      replaceWithAssetNode(doc, node, asset)
      continue
    }

    const label = node.getAttribute('title')?.trim() || node.getAttribute('data')?.trim() || 'Embedded file'
    const paragraph = doc.createElement('p')
    paragraph.textContent = label
    node.replaceWith(paragraph)
  }

  for (const link of [...doc.querySelectorAll('a[href]')]) {
    const href = link.getAttribute('href') ?? ''
    if (looksLikeExternalUrl(href) || href.startsWith('#page:') || href.startsWith('#')) continue

    const asset = await importLocalAsset(href)
    if (asset) {
      if (asset.kind === 'file') {
        link.replaceWith(createAttachmentCard(doc, asset))
      } else {
        link.setAttribute('href', asset.dataUrl)
        link.setAttribute('target', '_blank')
        link.setAttribute('rel', 'noreferrer')
        link.textContent = asset.name
      }
      continue
    }

    link.removeAttribute('href')
  }

  for (const node of [...doc.querySelectorAll('script, style, link, meta, title, base')]) {
    node.remove()
  }

  const content = sanitizePastedHtml((doc.body.innerHTML || '<p></p>').trim() || '<p></p>')
  return {
    assets,
    content: content || '<p></p>',
  }
}

const importTextPage = (file: ImportedOneNoteFile) => ({
  assets: [] as AppAsset[],
  content: plainTextToHtml(file.contents.trim() || file.name),
})

const importPageFile = async (file: ImportedOneNoteFile, rootPath: string) => {
  const extension = file.extension.toLowerCase()
  const pageId = `${EXPORT_PAGE_PREFIX}${sanitizeIdPart(file.relativePath)}`
  const assetBaseId = `${EXPORT_ASSET_PREFIX}${sanitizeIdPart(file.relativePath)}`
  const imported = IMPORTABLE_HTML_EXTENSIONS.has(extension)
    ? await importHtmlPage(file, assetBaseId, rootPath)
    : importTextPage(file)
  const title = file.name.replace(/\.[^.]+$/, '').trim() || 'Imported Page'

  const page: Page = {
    accent: '',
    children: [],
    content: imported.content,
    createdAt: file.modifiedAt,
    id: pageId,
    inkStrokes: [],
    isCollapsed: false,
    snippet: buildSnippet(title, imported.content, file.modifiedAt),
    tags: [],
    task: null,
    title,
    updatedAt: file.modifiedAt,
  }

  return {
    assets: imported.assets,
    page,
  }
}

const groupFilesIntoNotebookBuckets = (directory: ImportedOneNoteDirectory) => {
  const buckets = new Map<string, ImportedOneNoteFile[]>()

  for (const file of directory.files) {
    const segments = splitSegments(file.relativePath)
    const notebookName = segments.length > 1 ? segments[0] : directory.name
    const currentBucket = buckets.get(notebookName) ?? []
    currentBucket.push(file)
    buckets.set(notebookName, currentBucket)
  }

  return [...buckets.entries()]
}

const buildSectionName = (file: ImportedOneNoteFile, notebookName: string, directoryName: string) => {
  const relativeSegments = splitSegments(file.relativePath)
  const notebookSegments = notebookName === directoryName ? [] : [notebookName]
  const sectionSegments = relativeSegments.slice(notebookSegments.length, -1)
  return sectionSegments.length > 0 ? sectionSegments.join(' / ') : 'Imported Pages'
}

const importNotebookBucket = async (
  notebookName: string,
  files: ImportedOneNoteFile[],
  directoryName: string,
  rootPath: string,
  notebookIndex: number,
  onProgress: (message: string) => void,
) => {
  const sectionsByName = new Map<string, ImportedOneNoteFile[]>()
  for (const file of files) {
    const sectionName = buildSectionName(file, notebookName, directoryName)
    const bucket = sectionsByName.get(sectionName) ?? []
    bucket.push(file)
    sectionsByName.set(sectionName, bucket)
  }

  const assets: AppAsset[] = []
  const sections: Section[] = []

  for (const [sectionIndex, [sectionName, sectionFiles]] of [...sectionsByName.entries()].entries()) {
    const accent = accentPalette[(notebookIndex + sectionIndex) % accentPalette.length]
    const importedPages = await Promise.all(
      sectionFiles
        .slice()
        .sort((left, right) => left.relativePath.localeCompare(right.relativePath))
        .map(async (file) => {
          onProgress(`Importing ${notebookName} / ${sectionName} / ${file.name}`)
          const imported = await importPageFile(file, rootPath)
          imported.page.accent = accent
          return imported
        }),
    )

    sections.push({
      color: accent,
      id: `${EXPORT_SECTION_PREFIX}${sanitizeIdPart(`${notebookName}/${sectionName}`)}`,
      name: sectionName,
      pages: importedPages.length > 0 ? importedPages.map((entry) => entry.page) : [createPlaceholderPage(sectionName, accent, `${EXPORT_PAGE_PREFIX}${sanitizeIdPart(`${notebookName}/${sectionName}`)}:placeholder`)],
      passwordHash: null,
      passwordHint: '',
    })

    assets.push(...importedPages.flatMap((entry) => entry.assets))
  }

  const sectionGroups: SectionGroup[] = [
    {
      id: `${EXPORT_GROUP_PREFIX}${sanitizeIdPart(notebookName)}`,
      isCollapsed: false,
      name: 'Imported Sections',
      sections,
    },
  ]

  return {
    assets,
    notebook: {
      color: accentPalette[notebookIndex % accentPalette.length],
      icon: 'book',
      id: `${EXPORT_NOTEBOOK_PREFIX}${sanitizeIdPart(notebookName)}`,
      name: notebookName,
      sectionGroups,
    } satisfies Notebook,
  }
}

const mergeImportedNotebooksIntoState = (
  current: AppState,
  importedNotebooks: Notebook[],
  importedAssets: AppAsset[],
) => {
  const importedNotebookIds = new Set(importedNotebooks.map((item) => item.id))
  const nextNotebooks = [
    ...current.notebooks.filter((item) => !importedNotebookIds.has(item.id)),
    ...importedNotebooks,
  ]
  const nextAssets = {
    ...Object.fromEntries(
      Object.entries(current.meta.assets).filter(([assetId]) => !assetId.startsWith(EXPORT_ASSET_PREFIX)),
    ),
    ...Object.fromEntries(importedAssets.map((asset) => [asset.id, asset])),
  }
  const firstImportedNotebook = importedNotebooks[0]
  const firstImportedGroup = firstImportedNotebook?.sectionGroups[0]
  const firstImportedSection = firstImportedGroup?.sections[0]
  const firstImportedPage = firstImportedSection?.pages[0]

  return ensureSelection({
    ...current,
    meta: {
      ...current.meta,
      assets: nextAssets,
    },
    notebooks: nextNotebooks,
    selectedNotebookId: firstImportedNotebook?.id ?? current.selectedNotebookId,
    selectedPageId: firstImportedPage?.id ?? current.selectedPageId,
    selectedSectionGroupId: firstImportedGroup?.id ?? current.selectedSectionGroupId,
    selectedSectionId: firstImportedSection?.id ?? current.selectedSectionId,
  })
}

type UseOneNoteExportImportArgs = {
  setActiveTab: (tab: 'Home') => void
  setAppState: Dispatch<SetStateAction<AppState>>
  setSaveLabel: (value: string) => void
}

export const useOneNoteExportImport = ({
  setActiveTab,
  setAppState,
  setSaveLabel,
}: UseOneNoteExportImportArgs) => {
  const [isImportingOneNoteExport, setIsImportingOneNoteExport] = useState(false)

  const importOneNoteExport = async () => {
    if (isImportingOneNoteExport) return

    const selectedPath = await pickOneNoteExportDirectory()
    if (!selectedPath) return

    setIsImportingOneNoteExport(true)
    try {
      setSaveLabel('Scanning OneNote export folder...')
      const directory = await importOneNoteExportDirectory(selectedPath)
      const importableFiles = directory.files.filter(
        (file) =>
          IMPORTABLE_HTML_EXTENSIONS.has(file.extension.toLowerCase()) ||
          IMPORTABLE_TEXT_EXTENSIONS.has(file.extension.toLowerCase()),
      )

      if (importableFiles.length === 0) {
        const message =
          'No importable OneNote export pages were found in that folder. Pick an exported notebook folder that contains HTML, MHTML, Markdown, or text page files.'
        setSaveLabel(message)
        window.alert(message)
        return
      }

      const notebookBuckets = groupFilesIntoNotebookBuckets({
        ...directory,
        files: importableFiles,
      })

      const importedNotebooks: Notebook[] = []
      const importedAssets: AppAsset[] = []

      for (let index = 0; index < notebookBuckets.length; index += 1) {
        const [notebookName, files] = notebookBuckets[index]
        const imported = await importNotebookBucket(
          notebookName,
          files,
          directory.name,
          directory.path,
          index,
          (message) => setSaveLabel(message),
        )
        importedNotebooks.push(imported.notebook)
        importedAssets.push(...imported.assets)
      }

      setAppState((current) => mergeImportedNotebooksIntoState(current, importedNotebooks, importedAssets))
      setActiveTab('Home')
      setSaveLabel(
        `Imported ${importedNotebooks.length} OneNote notebook${importedNotebooks.length === 1 ? '' : 's'} from local export`,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setSaveLabel(`OneNote export import failed: ${message}`)
      window.alert(`OneNote export import failed.\n\n${message}`)
    } finally {
      setIsImportingOneNoteExport(false)
    }
  }

  return {
    importOneNoteExport,
    isImportingOneNoteExport,
  }
}
