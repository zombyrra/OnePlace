import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react'
import { useEffect, useState } from 'react'
import type {
  ContextMenuItem,
  DragState,
  DropTarget,
  Page,
  PageLocation,
  PageSortMode,
  SearchResult,
  Section,
  SectionGroup,
  VisiblePage,
} from '../../app/appModel'
import {
  ChevronDownIcon,
  DeleteIcon,
  EditIcon,
  IndentIcon,
  ListLinesIcon,
  SubpageIcon,
} from '../Icons'

type SnippetParts = { first: string; second: string }
type RecentPageEntry = Omit<SearchResult, 'isSubpage'> & { page: Page }
type DragHandler = (event: ReactPointerEvent<HTMLElement>, nextState: DragState) => void
type DropHandler = (event: ReactPointerEvent<HTMLElement>) => void
type PageDropTargetHandler = (event: ReactPointerEvent<HTMLElement>, pageId: string) => void

type PagesPaneProps = {
  isPagesPaneVisible: boolean
  section?: Section
  sectionGroup?: SectionGroup
  visiblePages: VisiblePage[]
  page?: Page
  pageSortMode: PageSortMode
  pageSortModeLabels: Record<PageSortMode, string>
  isCurrentSectionLocked: boolean
  canPromotePage: boolean
  canDemotePage: boolean
  canDeletePage: boolean
  query: string
  recentPages: RecentPageEntry[]
  dragState: DragState | null
  dropTarget: DropTarget | null
  unlockSection: (id: string) => Promise<void> | void
  addPage: () => void
  addPageWithTitle: (title: string) => void
  addSubpage: () => void
  addSubpageWithTitle: (title: string) => void
  setPageSortMode: (mode: PageSortMode) => void
  promoteCurrentPage: () => void
  demoteCurrentPage: () => void
  deleteCurrentPage: () => void
  togglePageCollapse: (pageId: string) => void
  beginDrag: DragHandler
  allowDrop: DropHandler
  setPageDropTarget: PageDropTargetHandler
  movePage: (pageId: string, position: 'before' | 'after') => void
  consumeSuppressedClick: () => boolean
  selectPage: (pageId: string) => void
  renamePage: (pageId: string) => void
  renamePageTo: (pageId: string, name: string) => void
  saveCurrentPageVersion: (page: Page) => void
  openContextMenu: (event: ReactMouseEvent<HTMLElement>, items: ContextMenuItem[]) => void
  getSnippetParts: (page: Page) => SnippetParts
  hasChildPageSelected: (page: Page, selectedPageId: string) => boolean
  findPageLocation: (pages: Page[], pageId: string) => PageLocation | undefined
  renderHighlightedText: (text: string, query: string) => ReactNode
  openSearchResult: (result: SearchResult) => void
}

export function PagesPane(props: PagesPaneProps) {
  const {
    isPagesPaneVisible,
    section,
    sectionGroup,
    visiblePages,
    page,
    pageSortMode,
    pageSortModeLabels,
    isCurrentSectionLocked,
    canPromotePage,
    canDemotePage,
    canDeletePage,
    query,
    recentPages,
    dragState,
    dropTarget,
    unlockSection,
    addPage,
    addPageWithTitle,
    addSubpage,
    addSubpageWithTitle,
    setPageSortMode,
    promoteCurrentPage,
    demoteCurrentPage,
    deleteCurrentPage,
    togglePageCollapse,
    beginDrag,
    allowDrop,
    setPageDropTarget,
    movePage,
    consumeSuppressedClick,
    selectPage,
    renamePage,
    renamePageTo,
    saveCurrentPageVersion,
    openContextMenu,
    getSnippetParts,
    hasChildPageSelected,
    findPageLocation,
    renderHighlightedText,
    openSearchResult,
  } = props
  const [editingPageId, setEditingPageId] = useState<string | null>(null)
  const [pageTitleDraft, setPageTitleDraft] = useState('')
  const [creatingPageMode, setCreatingPageMode] = useState<'page' | 'subpage' | null>(null)
  const [newPageDraft, setNewPageDraft] = useState('')

  const startPageRename = (targetPage: Page) => {
    setEditingPageId(targetPage.id)
    setPageTitleDraft(targetPage.title)
  }

  const stopPageRename = () => {
    setEditingPageId(null)
    setPageTitleDraft('')
  }

  const startPageCreate = (mode: 'page' | 'subpage') => {
    setCreatingPageMode(mode)
    setNewPageDraft(mode === 'subpage' ? 'New Subpage' : 'Untitled Page')
  }

  const stopPageCreate = () => {
    setCreatingPageMode(null)
    setNewPageDraft('')
  }

  const handlePageRenameKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>, pageId: string) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      renamePageTo(pageId, pageTitleDraft)
      stopPageRename()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      stopPageRename()
    }
  }

  const handlePageCreateKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (creatingPageMode === 'subpage') {
        addSubpageWithTitle(newPageDraft)
      } else {
        addPageWithTitle(newPageDraft)
      }
      stopPageCreate()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      stopPageCreate()
    }
  }

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key !== 'F2' || !page || isCurrentSectionLocked) return
      const target = event.target
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      if (isEditable) return
      event.preventDefault()
      startPageRename(page)
    }

    window.addEventListener('keydown', handleShortcut)
    return () => {
      window.removeEventListener('keydown', handleShortcut)
    }
  }, [isCurrentSectionLocked, page])

  return (
    <aside className="pages-pane" hidden={!isPagesPaneVisible}>
      <div className="pages-header">
        <div className="pages-heading-copy">
          <span className="pane-kicker">PAGES</span>
          <h2>{section?.name ?? 'Pages'}</h2>
          <span className="pages-context">
            {sectionGroup?.name ?? 'Sections'} | {visiblePages.length}
          </span>
        </div>
        <div className="pages-actions">
          <div className="pages-actions-primary">
            <button
              className="pages-action-pill primary"
              disabled={isCurrentSectionLocked}
              onClick={() => startPageCreate('page')}
              type="button"
            >
              <ListLinesIcon size={15} />
              <span>Add page</span>
            </button>
            <button
              className="pages-action-pill"
              disabled={isCurrentSectionLocked || !page}
              onClick={() => startPageCreate('subpage')}
              type="button"
            >
              <EditIcon size={15} />
              <span>Subpage</span>
            </button>
          </div>
          <div className="pages-actions-secondary">
            <select
              className="pages-sort-picker"
              onChange={(event) => setPageSortMode(event.target.value as PageSortMode)}
              value={pageSortMode}
            >
              {Object.entries(pageSortModeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              disabled={isCurrentSectionLocked || !canPromotePage}
              onClick={promoteCurrentPage}
              title="Promote page"
              type="button"
            >
              <IndentIcon size={16} />
            </button>
            <button
              disabled={isCurrentSectionLocked || !canDemotePage}
              onClick={demoteCurrentPage}
              title="Make subpage"
              type="button"
            >
              <SubpageIcon size={16} />
            </button>
            <button
              className="danger"
              disabled={isCurrentSectionLocked || !canDeletePage}
              onClick={deleteCurrentPage}
              title="Delete page"
              type="button"
            >
              <DeleteIcon size={16} />
            </button>
          </div>
        </div>
      </div>
      {creatingPageMode ? (
        <div className="tree-inline-editor-shell">
          <input
            autoFocus
            className="tree-inline-editor"
            onBlur={() => {
              if (creatingPageMode === 'subpage') {
                addSubpageWithTitle(newPageDraft)
              } else {
                addPageWithTitle(newPageDraft)
              }
              stopPageCreate()
            }}
            onChange={(event) => setNewPageDraft(event.target.value)}
            onKeyDown={handlePageCreateKeyDown}
            type="text"
            value={newPageDraft}
          />
        </div>
      ) : null}
      {isCurrentSectionLocked ? (
        <div className="section-lock-panel">
          <strong>{section?.name ?? 'Protected section'}</strong>
          <span>{section?.passwordHint ? `Hint: ${section.passwordHint}` : 'This section is password protected.'}</span>
          <button onClick={() => void unlockSection(section?.id ?? '')} type="button">
            Unlock Section
          </button>
        </div>
      ) : (
        <div className="page-cards">
          {visiblePages.length === 0 ? (
            <div className="pages-empty-state">
              <strong>No pages yet</strong>
              <span>Create your first page in this section to get started.</span>
              <button className="pages-action-pill primary" onClick={() => startPageCreate('page')} type="button">
                <ListLinesIcon size={15} />
                <span>Add page</span>
              </button>
            </div>
          ) : null}
          {visiblePages.map((entry) => {
            const snippet = getSnippetParts(entry.page)
            const hasChildren = entry.page.children.length > 0
            const hasSelectedChild = hasChildren && hasChildPageSelected(entry.page, page?.id ?? '')
            const pageLocation = section ? findPageLocation(section.pages, entry.page.id) : undefined
            const canPromoteEntry = Boolean(pageLocation?.parentId)
            const canDemoteEntry = Boolean(pageLocation && pageLocation.index > 0)
            const isActivePage = entry.page.id === page?.id
            return (
              <div
                key={entry.page.id}
                className={`page-row ${entry.depth > 0 ? 'subpage-row' : ''}`}
                style={{ marginLeft: `${entry.depth * 24}px` }}
              >
                {hasChildren ? (
                  <button
                    aria-label={entry.page.isCollapsed ? 'Expand subpages' : 'Collapse subpages'}
                    className={`page-disclosure ${entry.page.isCollapsed ? 'collapsed' : ''}`}
                    onClick={() => togglePageCollapse(entry.page.id)}
                    type="button"
                  >
                    <ChevronDownIcon size={12} />
                  </button>
                ) : (
                  <span className="page-disclosure-placeholder" />
                )}
                <div
                  className={`page-card ${entry.page.id === page?.id ? 'active' : ''} ${entry.depth > 0 ? 'subpage-card' : ''} ${hasSelectedChild ? 'has-selected-child' : ''} ${dragState?.type === 'page' && dragState.pageId === entry.page.id ? 'dragging' : ''} ${dropTarget?.type === 'page' && dropTarget.pageId === entry.page.id && dropTarget.position === 'before' ? 'drop-before' : ''} ${dropTarget?.type === 'page' && dropTarget.pageId === entry.page.id && dropTarget.position === 'after' ? 'drop-after' : ''}`}
                  onPointerDown={(event) => beginDrag(event, { type: 'page', pageId: entry.page.id })}
                  onPointerEnter={allowDrop}
                  onPointerMove={(event) => setPageDropTarget(event, entry.page.id)}
                  onPointerUp={() => {
                    if (dropTarget?.type === 'page' && dropTarget.pageId === entry.page.id) {
                      movePage(entry.page.id, dropTarget.position)
                    }
                  }}
                  onClick={() => {
                    if (consumeSuppressedClick()) return
                    selectPage(entry.page.id)
                  }}
                  onDoubleClick={() => startPageRename(entry.page)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    selectPage(entry.page.id)
                  }}
                  onContextMenu={(event) => {
                    selectPage(entry.page.id)
                    openContextMenu(event, [
                      { label: 'Rename page', onSelect: () => renamePage(entry.page.id) },
                      { label: 'New page', onSelect: addPage },
                      { label: 'New subpage', onSelect: addSubpage },
                      {
                        disabled: !canPromoteEntry,
                        label: 'Promote page',
                        onSelect: () => {
                          selectPage(entry.page.id)
                          window.setTimeout(promoteCurrentPage, 0)
                        },
                      },
                      {
                        disabled: !canDemoteEntry,
                        label: 'Make subpage',
                        onSelect: () => {
                          selectPage(entry.page.id)
                          window.setTimeout(demoteCurrentPage, 0)
                        },
                      },
                      { label: 'Save page version', onSelect: () => saveCurrentPageVersion(entry.page) },
                      {
                        danger: true,
                        disabled: !canDeletePage,
                        label: 'Delete page',
                        onSelect: () => {
                          selectPage(entry.page.id)
                          window.setTimeout(deleteCurrentPage, 0)
                        },
                      },
                    ])
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="page-accent" style={{ backgroundColor: entry.page.accent }} />
                  <div className="page-card-body">
                    {editingPageId === entry.page.id ? (
                      <input
                        autoFocus
                        className="tree-inline-editor tree-inline-editor-compact"
                        onBlur={() => {
                          renamePageTo(entry.page.id, pageTitleDraft)
                          stopPageRename()
                        }}
                        onChange={(event) => setPageTitleDraft(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => handlePageRenameKeyDown(event, entry.page.id)}
                        type="text"
                        value={pageTitleDraft}
                      />
                    ) : (
                      <strong>
                        {query.trim()
                          ? renderHighlightedText(entry.depth > 0 ? `- ${entry.page.title}` : entry.page.title, query.trim())
                          : entry.depth > 0
                            ? `- ${entry.page.title}`
                            : entry.page.title}
                      </strong>
                    )}
                    <span className="page-date">
                      {snippet.first}
                    </span>
                    <span className="page-snippet">
                      {query.trim() ? renderHighlightedText(snippet.second, query.trim()) : snippet.second}
                    </span>
                  </div>
                  {isActivePage ? (
                    <div className="page-inline-actions">
                      <button
                        aria-label="Rename page"
                        className="page-inline-action"
                        onClick={(event) => {
                          event.stopPropagation()
                          startPageRename(entry.page)
                        }}
                        type="button"
                      >
                        <EditIcon size={14} />
                      </button>
                      <button
                        aria-label="Add subpage"
                        className="page-inline-action"
                        disabled={isCurrentSectionLocked}
                        onClick={(event) => {
                          event.stopPropagation()
                          addSubpage()
                        }}
                        type="button"
                      >
                        <SubpageIcon size={14} />
                      </button>
                      <button
                        aria-label="Delete page"
                        className="page-inline-action danger"
                        disabled={isCurrentSectionLocked || !canDeletePage}
                        onClick={(event) => {
                          event.stopPropagation()
                          deleteCurrentPage()
                        }}
                        type="button"
                      >
                        <DeleteIcon size={14} />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {recentPages.length > 0 ? (
        <div className="recent-pages-panel">
          <div className="recent-pages-heading">
            <span>Recent</span>
          </div>
          <div className="recent-pages-list">
            {recentPages.slice(0, 4).map((item) => (
              <button
                key={item.page.id}
                className={`recent-page-item ${item.page.id === page?.id ? 'active' : ''}`}
                onClick={() =>
                  openSearchResult({
                    ...item,
                    isSubpage: false,
                  })
                }
                type="button"
              >
                <strong>{item.page.title}</strong>
                <span>{item.sectionName}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  )
}
