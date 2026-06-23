import type { RefObject, ReactNode } from 'react'
import type { SearchFilter, SearchResult, SearchScope } from '../../app/appModel'
import {
  ChevronDownIcon,
  SaveIcon,
  SearchIcon,
  UndoIcon,
} from '../Icons'

type TitleBarProps = {
  windowTitle: string
  workspaceName: string
  canGoBack: boolean
  canGoForward: boolean
  onSave: () => void
  onUndo: () => void
  onGoBack: () => void
  onGoForward: () => void
  query: string
  setQuery: (value: string) => void
  titlebarSearchRef: RefObject<HTMLDivElement | null>
  searchInputRef: RefObject<HTMLInputElement | null>
  searchResultsPanelRef: RefObject<HTMLDivElement | null>
  searchScope: SearchScope
  searchScopeLabels: Record<SearchScope, string>
  searchFilter: SearchFilter
  searchFilterLabels: Record<SearchFilter, string>
  onToggleSearchScope: () => void
  onSetSearchFilter: (filter: SearchFilter) => void
  searchResults: SearchResult[]
  openSearchResult: (result: SearchResult) => void
  renderHighlightedText: (text: string, query: string) => ReactNode
}

export function TitleBar(props: TitleBarProps) {
  const {
    windowTitle,
    workspaceName,
    canGoBack,
    canGoForward,
    onSave,
    onUndo,
    onGoBack,
    onGoForward,
    query,
    setQuery,
    titlebarSearchRef,
    searchInputRef,
    searchResultsPanelRef,
    searchScope,
    searchScopeLabels,
    searchFilter,
    searchFilterLabels,
    onToggleSearchScope,
    onSetSearchFilter,
    searchResults,
    openSearchResult,
    renderHighlightedText,
  } = props

  return (
    <header className="titlebar">
      <div className="titlebar-left">
        <div className="titlebar-brand">
          <button className="quick-action icon-only" onClick={onSave} type="button">
            <SaveIcon size={16} />
          </button>
          <button className="quick-action icon-only" onClick={onUndo} type="button">
            <UndoIcon size={16} />
          </button>
          <button className="quick-action icon-only" disabled={!canGoBack} onClick={onGoBack} type="button">
            {'<'}
          </button>
          <button className="quick-action icon-only" disabled={!canGoForward} onClick={onGoForward} type="button">
            {'>'}
          </button>
          <button className="quick-action icon-only small" type="button">
            <ChevronDownIcon size={12} />
          </button>
        </div>
        <div className="titlebar-workspace" title={windowTitle}>
          <span className="workspace-name">{workspaceName}</span>
          <span className="workspace-dot" />
          <span className="workspace-pill">Non-Business</span>
          <span className="workspace-dot" />
          <span className="workspace-app">OnePlace</span>
          <ChevronDownIcon size={11} />
        </div>
      </div>
      <div className="titlebar-search" ref={titlebarSearchRef}>
        <span className="search-icon">
          <SearchIcon size={16} />
        </span>
        <input
          ref={searchInputRef}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          type="search"
          value={query}
        />
        {query.trim() ? (
          <div className="search-results search-results-floating" ref={searchResultsPanelRef}>
            <div className="search-results-toolbar">
              <button className="search-scope-chip" onClick={onToggleSearchScope} type="button">
                {searchScopeLabels[searchScope]}
              </button>
              <div className="search-filter-row">
                {(['all', 'title', 'content', 'tag', 'task'] as SearchFilter[]).map((filter) => (
                  <button
                    key={filter}
                    className={`search-filter-chip ${searchFilter === filter ? 'active' : ''}`}
                    onClick={() => onSetSearchFilter(filter)}
                    type="button"
                  >
                    {searchFilterLabels[filter]}
                  </button>
                ))}
              </div>
            </div>
            <div className="search-results-summary">
              <strong>{searchResults.length}</strong>
              <span>
                result{searchResults.length === 1 ? '' : 's'} in {searchScopeLabels[searchScope].toLowerCase()}
              </span>
            </div>
            <div className="search-results-list">
              {searchResults.length > 0 ? (
                searchResults.slice(0, 8).map((result) => (
                  <button
                    key={result.page.id}
                    className="search-result"
                    onClick={() => openSearchResult(result)}
                    type="button"
                  >
                    <strong>
                      {renderHighlightedText(
                        result.isSubpage ? `${result.page.title} (Subpage)` : result.page.title,
                        query.trim(),
                      )}
                    </strong>
                    <span>{result.notebookName} / {result.groupName} / {result.sectionName}</span>
                    <p>{renderHighlightedText(result.matchSnippet ?? result.page.snippet, query.trim())}</p>
                    <div className="search-result-meta">
                      {(result.matchedFields ?? ['content']).map((field) => (
                        <em key={`${result.page.id}-${field}`}>{searchFilterLabels[field]}</em>
                      ))}
                    </div>
                  </button>
                ))
              ) : (
                <div className="search-results-empty">
                  No matches for this query with the current search scope and filter.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
      <div className="titlebar-right">
        <button className="titlebar-chip" type="button">
          Sticky Notes
        </button>
        <button className="titlebar-share" type="button">
          Share
        </button>
        <div className="profile-chip">SJ</div>
      </div>
    </header>
  )
}
