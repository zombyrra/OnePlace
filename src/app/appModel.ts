export * from './appTypes'
export * from './appConstants'
export * from './appFormatting'
export * from './appPages'
import type {
  AppAsset,
  AppMeta,
  AppState,
  InkPoint,
  InkStroke,
  Notebook,
  Page,
  PageVersion,
  ReferenceItem,
  ReferencePerson,
  ReferenceSource,
  RecentNotebookEntry,
  Section,
  SectionGroup,
} from './appTypes'
import {
  defaultAppMeta,
  LAST_OPENED_NOTEBOOK_KEY,
  RECENT_NOTEBOOKS_KEY,
} from './appConstants'
import {
  escapeRegExp,
  createId,
  createPage,
  buildSnippet,
} from './appFormatting'
import {
  createSectionGroup,
  findPageById,
} from './appPages'

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const escapeAttribute = (value: string) => escapeHtml(value)

export const linkifyPlainText = (value: string) => {
  const expression = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi
  let cursor = 0
  let html = ''

  for (const match of value.matchAll(expression)) {
    const rawUrl = match[0]
    const index = match.index ?? 0
    html += escapeHtml(value.slice(cursor, index))
    const href = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`
    html += `<a href="${escapeAttribute(href)}" target="_blank" rel="noreferrer">${escapeHtml(rawUrl)}</a>`
    cursor = index + rawUrl.length
  }

  html += escapeHtml(value.slice(cursor))
  return html
}

export const plainTextToHtml = (value: string) =>
  value
    .split(/\n{2,}/)
    .map((block) => `<p>${linkifyPlainText(block.trim()).replace(/\n/g, '<br />')}</p>`)
    .join('')

export const getFloatingMenuStyle = (element: HTMLDivElement | null, width?: number) => {
  if (!element) return undefined
  const rect = element.getBoundingClientRect()

  return {
    left: rect.left,
    minWidth: width ?? rect.width,
    position: 'fixed' as const,
    top: rect.bottom + 2,
  }
}

export const getFloatingPanelStyle = (element: HTMLDivElement | null) => {
  if (!element) return undefined
  const rect = element.getBoundingClientRect()

  return {
    left: rect.left,
    position: 'fixed' as const,
    top: rect.bottom + 2,
    width: rect.width,
  }
}

export const sanitizePastedHtml = (value: string) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(value, 'text/html')
  const allowedTags = new Set([
    'a',
    'audio',
    'b',
    'blockquote',
    'br',
    'code',
    'div',
    'em',
    'figcaption',
    'figure',
    'font',
    'h1',
    'h2',
    'h3',
    'hr',
    'i',
    'iframe',
    'img',
    'input',
    'label',
    'li',
    'ol',
    'p',
    'pre',
    'section',
    'span',
    'strong',
    'sub',
    'sup',
    'table',
    'tbody',
    'td',
    'th',
    'thead',
    'tr',
    'u',
    'ul',
  ])

  const unwrapNode = (node: Element) => {
    const parent = node.parentNode
    if (!parent) return
    while (node.firstChild) {
      parent.insertBefore(node.firstChild, node)
    }
    parent.removeChild(node)
  }

  const scrubNode = (node: Element) => {
    const tag = node.tagName.toLowerCase()
    if (tag === 'script' || tag === 'style' || tag === 'template') {
      node.remove()
      return
    }

    if (node.classList.contains('markmap-render') || node.getAttribute('data-markmap-generated') === 'true') {
      node.remove()
      return
    }

    if (!allowedTags.has(tag)) {
      unwrapNode(node)
      return
    }

    for (const attribute of [...node.attributes]) {
      const attrName = attribute.name.toLowerCase()
      const attrValue = attribute.value

      if (tag === 'a' && attrName === 'href') {
        if (!/^https?:|^mailto:|^#page:/.test(attrValue)) {
          node.removeAttribute(attribute.name)
        } else if (/^https?:|^mailto:/.test(attrValue)) {
          node.setAttribute('target', '_blank')
          node.setAttribute('rel', 'noreferrer')
        }
        continue
      }

      if (tag === 'img' && attrName === 'src') {
        if (!/^data:image\/|^https?:/.test(attrValue)) {
          node.removeAttribute(attribute.name)
        }
        continue
      }

      if (tag === 'audio' && attrName === 'src') {
        if (!/^data:audio\/|^https?:/.test(attrValue)) {
          node.removeAttribute(attribute.name)
        }
        continue
      }

      if (tag === 'audio' && attrName === 'controls') {
        continue
      }

      if (tag === 'iframe' && attrName === 'src') {
        if (!/^data:application\/pdf(?:;base64)?,/i.test(attrValue)) {
          node.removeAttribute(attribute.name)
        }
        continue
      }

      if (tag === 'iframe' && attrName === 'title') {
        continue
      }

      if (tag === 'input' && (attrName === 'type' || attrName === 'checked')) {
        if (attrName === 'type' && attrValue !== 'checkbox') {
          node.removeAttribute(attribute.name)
        }
        continue
      }

      if (tag === 'font' && (attrName === 'face' || attrName === 'size' || attrName === 'color')) {
        continue
      }

      if (attrName === 'class') {
        const allowedClasses = attrValue
          .split(/\s+/)
          .filter((className) =>
            [
              'action-table',
              'audio-note',
              'attachment-card',
              'attachment-meta',
              'attachment-title',
              'checklist',
              'csl-bib-body',
              'csl-entry',
              'csl-indent',
              'csl-left-margin',
              'csl-right-inline',
              'embedded-image',
              'internal-page-link',
              'markmap-card',
              'markmap-card-head',
              'markmap-fallback',
              'page-template-card',
              'printout-caption',
              'printout-card',
              'printout-preview',
              'printout-preview-shell',
              'reference-bibliography',
              'reference-citation',
              'reference-entry',
              'reference-entry-body',
              'reference-entry-meta',
              'template-block',
            ].includes(className),
          )
        if (allowedClasses.length > 0) {
          node.setAttribute('class', allowedClasses.join(' '))
        } else {
          node.removeAttribute('class')
        }
        continue
      }

      if (
        attrName === 'contenteditable' ||
        attrName === 'data-asset-id' ||
        attrName === 'data-page-id' ||
        attrName === 'data-file-name' ||
        attrName === 'data-download-url' ||
        attrName === 'data-markmap-markdown' ||
        attrName === 'data-reference-key' ||
        attrName === 'data-reference-style'
      ) {
        continue
      }

      node.removeAttribute(attribute.name)
    }

    if (tag === 'span' && !node.attributes.length) {
      const text = node.textContent ?? ''
      node.replaceWith(doc.createTextNode(text))
      return
    }

    for (const child of [...node.children]) {
      scrubNode(child)
    }
  }

  for (const child of [...doc.body.children]) {
    scrubNode(child)
  }

  return doc.body.innerHTML
}

export const countTextMatchesInHtml = (value: string, needle: string) => {
  if (!needle.trim()) return 0
  const doc = new DOMParser().parseFromString(`<body>${value}</body>`, 'text/html')
  const text = doc.body.textContent ?? ''
  const matches = text.match(new RegExp(escapeRegExp(needle), 'gi'))
  return matches?.length ?? 0
}

export const replaceTextInHtml = (value: string, needle: string, replacement: string) => {
  if (!needle.trim()) return value
  const doc = new DOMParser().parseFromString(`<body>${value}</body>`, 'text/html')
  const pattern = new RegExp(escapeRegExp(needle), 'gi')
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []

  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node instanceof Text) nodes.push(node)
  }

  nodes.forEach((node) => {
    node.textContent = (node.textContent ?? '').replace(pattern, replacement)
  })

  return doc.body.innerHTML
}

export const normalizeTerminalText = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/\u2022/g, '*')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^\t\n\r -~]/g, '')

export const hydratePageContent = (value: string, assets: Record<string, AppAsset>) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(value, 'text/html')

  for (const image of doc.querySelectorAll<HTMLElement>('[data-asset-id]')) {
    const assetId = image.dataset.assetId
    if (!assetId) continue
    const asset = assets[assetId]
    if (!asset) continue

    if (image instanceof HTMLImageElement) {
      image.src = asset.dataUrl
      continue
    }

    if (image instanceof HTMLAudioElement) {
      image.src = asset.dataUrl
      continue
    }

    if (image.classList.contains('attachment-card') || image.classList.contains('printout-card')) {
      image.dataset.downloadUrl = asset.dataUrl
      image.dataset.fileName = asset.name
    }
  }

  for (const frame of doc.querySelectorAll<HTMLIFrameElement>('iframe[data-asset-id]')) {
    const assetId = frame.dataset.assetId
    if (!assetId) continue
    const asset = assets[assetId]
    if (!asset) continue
    frame.src = asset.dataUrl
  }

  return doc.body.innerHTML
}

export const dehydratePageContent = (value: string) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(value, 'text/html')

  for (const image of doc.querySelectorAll<HTMLElement>('[data-asset-id]')) {
    if (image instanceof HTMLImageElement) {
      image.removeAttribute('src')
      continue
    }

    if (image instanceof HTMLAudioElement) {
      image.removeAttribute('src')
      continue
    }

    if (image.classList.contains('attachment-card') || image.classList.contains('printout-card')) {
      image.removeAttribute('data-download-url')
      image.removeAttribute('data-file-name')
    }
  }

  for (const frame of doc.querySelectorAll<HTMLIFrameElement>('iframe[data-asset-id]')) {
    frame.removeAttribute('src')
  }

  return doc.body.innerHTML
}

export const recordPageVersion = (
  versions: Record<string, PageVersion[]>,
  pageId: string,
  title: string,
  content: string,
  versionId?: string,
) => {
  const existing = versions[pageId] ?? []
  const latest = existing[0]
  if (latest && latest.title === title && latest.content === content) {
    return versions
  }

  return {
    ...versions,
    [pageId]: [
      {
        content,
        id: versionId ?? createId(),
        savedAt: new Date().toISOString(),
        title,
      },
      ...existing,
    ].slice(0, 20),
  }
}

export const hashSecret = async (value: string) => {
  const encoded = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export const accentPalette = ['#3784d6', '#3c9fa7', '#d1629b', '#d77f9c', '#4c75b8', '#b15fab']

export const createStarterState = (): AppState => {
  const createStarterPage = (title: string, accent: string) =>
    createPage(title, '', accent, `<p>${title} notes.</p>`)

  const createStarterSection = (name: string, color: string, pageTitles?: string[]): Section => ({
    color,
    id: createId(),
    name,
    pages: (pageTitles?.length ? pageTitles : ['Untitled Page']).map((title) => createStarterPage(title, color)),
    passwordHash: null,
    passwordHint: '',
  })

  const workNotebook: Notebook = {
    color: '#7e42b3',
    icon: 'book',
    id: createId(),
    name: 'Work Notebook',
    sectionGroups: [
      createSectionGroup('Sections', [
        createStarterSection('Administration', '#4c75b8'),
        createStarterSection('Meetings', '#3c9fa7'),
        createStarterSection('Product Ideas', '#d1629b'),
        createStarterSection('Onboarding', '#d77f9c'),
        createStarterSection('Email List', '#4c75b8'),
        createStarterSection('Customers', '#b15fab'),
        createStarterSection('Schedules', '#3784d6'),
        createStarterSection('Resources', '#4c75b8'),
        createStarterSection('Inventory', '#3c9fa7', [
          'Spokes',
          'Cogs',
          'Saddle Inventory',
          'Tires',
          'Pedals',
          'Rims',
          'Wheels',
          'Down Tubes',
        ]),
        createStarterSection('The Team', '#8b74bb'),
      ]),
    ],
  }

  const travelNotebook: Notebook = {
    color: '#b33f66',
    icon: 'folder',
    id: createId(),
    name: 'Travel Journal',
    sectionGroups: [
      createSectionGroup('Sections', [
        createStarterSection('Wishlist', '#b33f66'),
        createStarterSection('Italy', '#d8763c'),
        createStarterSection('Iceland', '#6387c7'),
      ]),
    ],
  }

  const defaultGroup = workNotebook.sectionGroups[0]
  const defaultSection = defaultGroup.sections[0]
  const defaultPage = defaultSection.pages[0]
  return {
    meta: {
      ...defaultAppMeta(),
      recentPageIds: [defaultPage.id],
    },
    notebooks: [workNotebook, travelNotebook],
    selectedNotebookId: workNotebook.id,
    selectedSectionGroupId: defaultGroup.id,
    selectedSectionId: defaultSection.id,
    selectedPageId: defaultPage.id,
  }
}

export const loadRecentNotebookEntries = (): RecentNotebookEntry[] => {
  try {
    const raw = localStorage.getItem(RECENT_NOTEBOOKS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is RecentNotebookEntry =>
        Boolean(
          item &&
            typeof item === 'object' &&
            'name' in item &&
            typeof item.name === 'string' &&
            'path' in item &&
            typeof item.path === 'string',
        ),
    )
  } catch {
    return []
  }
}

export const saveRecentNotebookEntries = (entries: RecentNotebookEntry[]) => {
  localStorage.setItem(RECENT_NOTEBOOKS_KEY, JSON.stringify(entries.slice(0, 8)))
}

export const loadLastOpenedNotebookPath = () => localStorage.getItem(LAST_OPENED_NOTEBOOK_KEY)

export const saveLastOpenedNotebookPath = (path: string) => {
  localStorage.setItem(LAST_OPENED_NOTEBOOK_KEY, path)
}

export const mergeNotebookIntoState = (current: AppState, openedNotebook: Notebook): AppState =>
  ensureSelection({
    ...current,
    notebooks: current.notebooks.some((item) => item.id === openedNotebook.id)
      ? current.notebooks.map((item) => (item.id === openedNotebook.id ? openedNotebook : item))
      : [...current.notebooks, openedNotebook],
    selectedNotebookId: openedNotebook.id,
  })

export const normalizeAppState = (input: unknown): AppState => {
  if (!input || typeof input !== 'object' || !('notebooks' in input)) {
    return createStarterState()
  }

  const rawState = input as Partial<AppState> & {
    meta?: Partial<AppMeta>
    notebooks?: Array<
      Partial<Notebook> & {
        sectionGroups?: Array<
          Partial<SectionGroup> & {
            sections?: Array<Partial<Section> & { pages?: Array<Partial<Page>> }>
          }
        >
        sections?: Array<Partial<Section> & { pages?: Array<Partial<Page>> }>
      }
    >
  }

  const notebooks = (rawState.notebooks ?? [])
    .map((notebook, notebookIndex): Notebook | null => {
      if (!notebook?.id || !notebook?.name) {
        return null
      }

      const normalizePages = (
        rawPages: Array<Partial<Page>>,
        seed: number,
      ): Page[] =>
        rawPages
          .map((page, pageIndex): Page | null => {
            if (!page?.id || !page?.title) {
              return null
            }

            const content = typeof page.content === 'string' ? page.content : '<p></p>'
            const createdAt = typeof page.createdAt === 'string' ? page.createdAt : new Date().toISOString()
            const updatedAt = typeof page.updatedAt === 'string' ? page.updatedAt : createdAt

            return {
              accent:
                typeof page.accent === 'string'
                  ? page.accent
                  : accentPalette[(seed + pageIndex) % accentPalette.length],
              children: normalizePages(page.children ?? [], seed + pageIndex + 1),
              content,
              createdAt,
              id: page.id,
              inkStrokes: Array.isArray(page.inkStrokes)
                ? page.inkStrokes
                    .filter(
                      (stroke): stroke is InkStroke =>
                        !!stroke &&
                        typeof stroke === 'object' &&
                        typeof stroke.id === 'string' &&
                        typeof stroke.color === 'string' &&
                        typeof stroke.width === 'number' &&
                        Array.isArray(stroke.points),
                    )
                    .map((stroke) => ({
                      ...stroke,
                      points: stroke.points.filter(
                        (point): point is InkPoint =>
                          !!point &&
                          typeof point === 'object' &&
                          typeof point.x === 'number' &&
                          typeof point.y === 'number',
                      ),
                    }))
                : [],
              isCollapsed: typeof page.isCollapsed === 'boolean' ? page.isCollapsed : false,
              snippet:
                typeof page.snippet === 'string' && page.snippet.trim()
                  ? page.snippet
                  : buildSnippet(page.title, content),
              tags: Array.isArray(page.tags)
                ? page.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
                : [],
              task:
                page.task &&
                typeof page.task === 'object' &&
                (page.task.status === 'open' || page.task.status === 'done')
                  ? {
                      dueAt: typeof page.task.dueAt === 'string' ? page.task.dueAt : null,
                      status: page.task.status,
                    }
                  : null,
              title: page.title,
              updatedAt,
            }
          })
          .filter((page): page is Page => page !== null)

      const normalizeSections = (
        rawSections: Array<Partial<Section> & { pages?: Array<Partial<Page>> }>,
        groupIndex: number,
      ) =>
        rawSections
          .map((section, sectionIndex): Section | null => {
            if (!section?.id || !section?.name) {
              return null
            }

            const pages = normalizePages(
              section.pages ?? [],
              notebookIndex + groupIndex + sectionIndex,
            )

            return {
              color:
                typeof section.color === 'string'
                  ? section.color
                  : accentPalette[(notebookIndex + groupIndex + sectionIndex) % accentPalette.length],
              id: section.id,
              name: section.name,
              pages,
              passwordHash: typeof section.passwordHash === 'string' ? section.passwordHash : null,
              passwordHint: typeof section.passwordHint === 'string' ? section.passwordHint : '',
            }
          })
          .filter((section): section is Section => section !== null)

      const rawGroups =
        notebook.sectionGroups && notebook.sectionGroups.length > 0
          ? notebook.sectionGroups
          : [
              {
                id: createId(),
                isCollapsed: false,
                name: 'Sections',
                sections:
                  (notebook as { sections?: Array<Partial<Section> & { pages?: Array<Partial<Page>> }> })
                    .sections ?? [],
              },
            ]

      const sectionGroups = rawGroups
        .map((group, groupIndex): SectionGroup | null => {
          if (!group?.id || !group?.name) {
            return null
          }

          return {
            id: group.id,
            isCollapsed: typeof group.isCollapsed === 'boolean' ? group.isCollapsed : false,
            name: group.name,
            sections: normalizeSections(group.sections ?? [], groupIndex),
          }
        })
        .filter((group): group is SectionGroup => group !== null)

      return {
        color:
          typeof notebook.color === 'string'
            ? notebook.color
            : accentPalette[notebookIndex % accentPalette.length],
        icon: typeof notebook.icon === 'string' ? notebook.icon : 'folder',
        id: notebook.id,
        name: notebook.name,
        sectionGroups,
      }
    })
    .filter((notebook): notebook is Notebook => notebook !== null)

  if (notebooks.length === 0) {
    return createStarterState()
  }

  const normalizeReferencePerson = (person: unknown): ReferencePerson | null => {
    if (!person || typeof person !== 'object') return null
    const candidate = person as Partial<ReferencePerson>
    const firstName = typeof candidate.firstName === 'string' ? candidate.firstName : ''
    const lastName = typeof candidate.lastName === 'string' ? candidate.lastName : ''
    const name = typeof candidate.name === 'string' ? candidate.name : ''
    if (!firstName && !lastName && !name) return null
    return { firstName, lastName, name }
  }

  const normalizeReferenceSource = (source: unknown): ReferenceSource =>
    source === 'BibTeX' || source === 'CSL JSON' || source === 'RIS' || source === 'manual'
      ? source
      : 'manual'

  const references = Array.isArray(rawState.meta?.references)
    ? rawState.meta.references
        .map((reference): ReferenceItem | null => {
          if (!reference || typeof reference !== 'object') return null
          const candidate = reference as Partial<ReferenceItem>
          if (typeof candidate.id !== 'string' || typeof candidate.title !== 'string' || !candidate.title.trim()) {
            return null
          }

          return {
            authors: Array.isArray(candidate.authors)
              ? candidate.authors
                  .map(normalizeReferencePerson)
                  .filter((person): person is ReferencePerson => person !== null)
              : [],
            containerTitle: typeof candidate.containerTitle === 'string' ? candidate.containerTitle : '',
            doi: typeof candidate.doi === 'string' ? candidate.doi : '',
            id: candidate.id,
            itemType: typeof candidate.itemType === 'string' ? candidate.itemType : 'reference',
            publisher: typeof candidate.publisher === 'string' ? candidate.publisher : '',
            source: normalizeReferenceSource(candidate.source),
            title: candidate.title,
            url: typeof candidate.url === 'string' ? candidate.url : '',
            year: typeof candidate.year === 'string' ? candidate.year : '',
          }
        })
        .filter((reference): reference is ReferenceItem => reference !== null)
    : []

  return ensureSelection({
    meta: {
      assets:
        rawState.meta?.assets && typeof rawState.meta.assets === 'object'
          ? Object.fromEntries(
              Object.entries(rawState.meta.assets).filter(
                (entry): entry is [string, AppAsset] =>
                  typeof entry[0] === 'string' &&
                  !!entry[1] &&
                  typeof entry[1] === 'object' &&
                  typeof (entry[1] as AppAsset).id === 'string' &&
                  typeof (entry[1] as AppAsset).dataUrl === 'string' &&
                  typeof (entry[1] as AppAsset).name === 'string',
              ),
            )
          : {},
      pageSortMode:
        rawState.meta?.pageSortMode &&
        ['manual', 'updated-desc', 'updated-asc', 'title-asc', 'title-desc', 'created-desc'].includes(
          rawState.meta.pageSortMode,
        )
          ? rawState.meta.pageSortMode
          : defaultAppMeta().pageSortMode,
      pageVersions:
        rawState.meta?.pageVersions && typeof rawState.meta.pageVersions === 'object'
          ? Object.fromEntries(
              Object.entries(rawState.meta.pageVersions).map(([pageId, versions]) => [
                pageId,
                Array.isArray(versions)
                  ? versions
                      .filter(
                        (version): version is PageVersion =>
                          !!version &&
                          typeof version === 'object' &&
                          typeof version.id === 'string' &&
                          typeof version.title === 'string' &&
                          typeof version.content === 'string' &&
                          typeof version.savedAt === 'string',
                      )
                      .slice(0, 20)
                  : [],
              ]),
            )
          : {},
      recentPageIds: Array.isArray(rawState.meta?.recentPageIds)
        ? rawState.meta?.recentPageIds.filter((item: unknown): item is string => typeof item === 'string').slice(0, 8)
        : [],
      references,
      searchScope:
        rawState.meta?.searchScope && ['section', 'notebook', 'all'].includes(rawState.meta.searchScope)
          ? rawState.meta.searchScope
          : defaultAppMeta().searchScope,
    },
    notebooks,
    selectedNotebookId:
      typeof rawState.selectedNotebookId === 'string' ? rawState.selectedNotebookId : notebooks[0].id,
    selectedSectionGroupId:
      typeof rawState.selectedSectionGroupId === 'string' ? rawState.selectedSectionGroupId : '',
    selectedPageId: typeof rawState.selectedPageId === 'string' ? rawState.selectedPageId : '',
    selectedSectionId: typeof rawState.selectedSectionId === 'string' ? rawState.selectedSectionId : '',
  })
}

export const getSelection = (state: AppState) => {
  const notebook =
    state.notebooks.find((item) => item.id === state.selectedNotebookId) ?? state.notebooks[0]
  const sectionGroup =
    notebook?.sectionGroups.find((item) => item.id === state.selectedSectionGroupId) ??
    notebook?.sectionGroups[0]
  const section =
    sectionGroup?.sections.find((item) => item.id === state.selectedSectionId) ?? sectionGroup?.sections[0]
  const page = section ? findPageById(section.pages, state.selectedPageId) ?? section.pages[0] : undefined

  return { notebook, page, section, sectionGroup }
}

export const ensureSelection = (state: AppState): AppState => {
  const notebook = state.notebooks.find((item) => item.id === state.selectedNotebookId) ?? state.notebooks[0]
  const sectionGroup =
    notebook?.sectionGroups.find((item) => item.id === state.selectedSectionGroupId) ??
    notebook?.sectionGroups[0]
  const section =
    sectionGroup?.sections.find((item) => item.id === state.selectedSectionId) ?? sectionGroup?.sections[0]
  const page = section ? findPageById(section.pages, state.selectedPageId) ?? section.pages[0] : undefined

  if (!notebook || !sectionGroup || !section || !page) {
    return createStarterState()
  }

  return {
    ...state,
    selectedNotebookId: notebook.id,
    selectedSectionGroupId: sectionGroup.id,
    selectedPageId: page.id,
    selectedSectionId: section.id,
  }
}


