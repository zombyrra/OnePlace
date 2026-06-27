import { createId, ensureSelection, normalizeAppState } from '../../app/appModel'
import type { AppAsset, AppState, Notebook, Page, Section, SectionGroup } from '../../app/appModel'

const assetIdExpression = /data-asset-id=["']([^"']+)["']/g
const pageHrefPrefix = '#page-'
const pageHrefColonPrefix = '#page:'

const collectPageAssetIds = (value: string) =>
  [...value.matchAll(assetIdExpression)]
    .map((match) => match[1])
    .filter(Boolean)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object')

const collectImportedIds = (items: unknown[]) =>
  new Set(
    items.flatMap((item) =>
      isRecord(item) && typeof item.id === 'string' ? [item.id] : [],
    ),
  )

const collectImportedAssetMap = (assets: unknown[]) =>
  Object.fromEntries(
    assets.flatMap((asset) =>
      isRecord(asset) && typeof asset.id === 'string' ? [[asset.id, asset]] : [],
    ),
  )

const reserveUniqueId = (id: string, usedIds: Set<string>, idMap: Map<string, string>) => {
  if (!usedIds.has(id)) {
    usedIds.add(id)
    return id
  }

  let nextId = createId()
  while (usedIds.has(nextId)) {
    nextId = createId()
  }
  usedIds.add(nextId)
  idMap.set(id, nextId)
  return nextId
}

const collectNotebookEntityIds = (notebook: Notebook, ids: Set<string>) => {
  ids.add(notebook.id)
  for (const group of notebook.sectionGroups) {
    ids.add(group.id)
    for (const section of group.sections) {
      ids.add(section.id)
      const visit = (pages: Page[]) => {
        for (const page of pages) {
          ids.add(page.id)
          visit(page.children)
        }
      }
      visit(section.pages)
    }
  }
}

const collectCurrentIds = (state: AppState) => {
  const ids = new Set<string>()
  state.notebooks.forEach((notebook) => collectNotebookEntityIds(notebook, ids))
  Object.entries(state.meta.assets).forEach(([assetId, asset]) => {
    ids.add(assetId)
    ids.add(asset.id)
  })
  return ids
}

const reserveNotebookEntityIds = (
  notebook: Notebook,
  usedIds: Set<string>,
  notebookIdMap: Map<string, string>,
  sectionGroupIdMap: Map<string, string>,
  sectionIdMap: Map<string, string>,
  pageIdMap: Map<string, string>,
) => {
  reserveUniqueId(notebook.id, usedIds, notebookIdMap)
  for (const group of notebook.sectionGroups) {
    reserveUniqueId(group.id, usedIds, sectionGroupIdMap)
    for (const section of group.sections) {
      reserveUniqueId(section.id, usedIds, sectionIdMap)
      const visit = (pages: Page[]) => {
        for (const page of pages) {
          reserveUniqueId(page.id, usedIds, pageIdMap)
          visit(page.children)
        }
      }
      visit(section.pages)
    }
  }
}

const rewriteImportedContentIds = (
  content: string,
  assetIdMap: Map<string, string>,
  pageIdMap: Map<string, string>,
) => {
  if (assetIdMap.size === 0 && pageIdMap.size === 0) return content

  const doc = new DOMParser().parseFromString(content, 'text/html')
  for (const element of doc.querySelectorAll<HTMLElement>('[data-asset-id]')) {
    const assetId = element.dataset.assetId
    const nextAssetId = assetId ? assetIdMap.get(assetId) : undefined
    if (nextAssetId) {
      element.dataset.assetId = nextAssetId
    }
  }
  for (const element of doc.querySelectorAll<HTMLElement>('[data-page-id]')) {
    const pageId = element.dataset.pageId
    const nextPageId = pageId ? pageIdMap.get(pageId) : undefined
    if (nextPageId) {
      element.dataset.pageId = nextPageId
    }
  }
  for (const anchor of doc.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    const href = anchor.getAttribute('href')
    if (!href) continue
    if (href.startsWith(pageHrefPrefix)) {
      const nextPageId = pageIdMap.get(href.slice(pageHrefPrefix.length))
      if (nextPageId) anchor.setAttribute('href', `${pageHrefPrefix}${nextPageId}`)
      continue
    }
    if (href.startsWith(pageHrefColonPrefix)) {
      const nextPageId = pageIdMap.get(href.slice(pageHrefColonPrefix.length))
      if (nextPageId) anchor.setAttribute('href', `${pageHrefColonPrefix}${nextPageId}`)
    }
  }

  return doc.body.innerHTML
}

const remapImportedNotebook = (
  notebook: Notebook,
  notebookIdMap: Map<string, string>,
  sectionGroupIdMap: Map<string, string>,
  sectionIdMap: Map<string, string>,
  pageIdMap: Map<string, string>,
  assetIdMap: Map<string, string>,
): Notebook => {
  const remapPage = (page: Page): Page => ({
    ...page,
    children: page.children.map(remapPage),
    content: rewriteImportedContentIds(page.content, assetIdMap, pageIdMap),
    id: pageIdMap.get(page.id) ?? page.id,
  })

  const remapSection = (section: Section): Section => ({
    ...section,
    id: sectionIdMap.get(section.id) ?? section.id,
    pages: section.pages.map(remapPage),
  })

  const remapGroup = (group: SectionGroup): SectionGroup => ({
    ...group,
    id: sectionGroupIdMap.get(group.id) ?? group.id,
    sections: group.sections.map(remapSection),
  })

  return {
    ...notebook,
    id: notebookIdMap.get(notebook.id) ?? notebook.id,
    sectionGroups: notebook.sectionGroups.map(remapGroup),
  }
}

export const collectNotebookPackageAssets = (
  notebook: Notebook,
  assets: Record<string, AppAsset>,
): AppAsset[] => {
  const ids = new Set<string>()
  for (const group of notebook.sectionGroups) {
    for (const section of group.sections) {
      const visit = (pages: typeof section.pages) => {
        for (const page of pages) {
          collectPageAssetIds(page.content).forEach((assetId) => ids.add(assetId))
          visit(page.children)
        }
      }
      visit(section.pages)
    }
  }

  return [...ids].flatMap((assetId) => {
    const asset = assets[assetId]
    return asset ? [asset] : []
  })
}

export const mergeOnePlacePackageIntoState = (
  current: AppState,
  imported: ImportedOnePlacePackage,
): AppState => {
  const importedNotebookIds = collectImportedIds(imported.notebooks)
  if (importedNotebookIds.size === 0) return current

  const importedAssetMap = collectImportedAssetMap(imported.assets)
  const normalizedImported = normalizeAppState({
    ...current,
    meta: {
      ...current.meta,
      assets: importedAssetMap,
    },
    notebooks: imported.notebooks,
  })
  const importedNotebooks = normalizedImported.notebooks.filter((item) =>
    importedNotebookIds.has(item.id),
  )
  if (importedNotebooks.length === 0) return current

  const sanitizedImportedAssets = Object.fromEntries(
    Object.entries(normalizedImported.meta.assets).filter(([assetId]) =>
      assetId in importedAssetMap,
    ),
  )
  const usedIds = collectCurrentIds(current)
  const assetIdMap = new Map<string, string>()
  const notebookIdMap = new Map<string, string>()
  const sectionGroupIdMap = new Map<string, string>()
  const sectionIdMap = new Map<string, string>()
  const pageIdMap = new Map<string, string>()
  const remappedImportedAssets = Object.fromEntries(
    Object.values(sanitizedImportedAssets).map((asset) => {
      const id = reserveUniqueId(asset.id, usedIds, assetIdMap)
      return [id, { ...asset, id }]
    }),
  )
  importedNotebooks.forEach((notebook) =>
    reserveNotebookEntityIds(
      notebook,
      usedIds,
      notebookIdMap,
      sectionGroupIdMap,
      sectionIdMap,
      pageIdMap,
    ),
  )
  const remappedImportedNotebooks = importedNotebooks.map((notebook) =>
    remapImportedNotebook(
      notebook,
      notebookIdMap,
      sectionGroupIdMap,
      sectionIdMap,
      pageIdMap,
      assetIdMap,
    ),
  )
  const firstNotebook = remappedImportedNotebooks[0]
  const firstGroup = firstNotebook?.sectionGroups[0]
  const firstSection = firstGroup?.sections[0]
  const firstPage = firstSection?.pages[0]

  return ensureSelection({
    ...current,
    meta: {
      ...current.meta,
      assets: {
        ...current.meta.assets,
        ...remappedImportedAssets,
      },
    },
    notebooks: [...current.notebooks, ...remappedImportedNotebooks],
    selectedNotebookId: firstNotebook?.id ?? current.selectedNotebookId,
    selectedPageId: firstPage?.id ?? current.selectedPageId,
    selectedSectionGroupId: firstGroup?.id ?? current.selectedSectionGroupId,
    selectedSectionId: firstSection?.id ?? current.selectedSectionId,
  })
}
