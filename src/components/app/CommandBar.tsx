import type { RefObject, ReactNode } from 'react'
import type { RibbonTab, SearchFilter, SearchResult, SearchScope } from '../../app/appModel'
import { ribbonTabs } from '../../app/appModel'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../ui'
import { ChevronDownIcon, CloudIcon, EditIcon, LightbulbIcon, ShareIcon } from '../Icons'

type CommandBarProps = {
  activeTab: RibbonTab
  setActiveTab: (tab: RibbonTab) => void
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

/* OneNote-web command bar (row B): the ribbon tabs, the "Tell me what you
   want to do" box (wired to content search), and the cloud / Editing /
   Share cluster. */
export function CommandBar(props: CommandBarProps) {
  const {
    activeTab,
    setActiveTab,
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
    <div className="op-command-bar">
      <nav className="tab-row op-tab-row">
        {ribbonTabs.map((item) => (
          <button
            key={item}
            className={`tab-button ${item === activeTab ? 'active' : ''}`}
            onClick={() => setActiveTab(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="op-tellme" ref={titlebarSearchRef}>
        <LightbulbIcon size={16} />
        <input
          ref={searchInputRef}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tell me what you want to do"
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

      <div className="op-command-right">
        <button aria-label="Sync status" className="op-header-icon" type="button">
          <CloudIcon size={18} />
        </button>
        <Menu>
          <MenuTrigger asChild>
            <button className="op-editing-chip" type="button">
              <EditIcon size={15} />
              <span>Editing</span>
              <ChevronDownIcon size={12} />
            </button>
          </MenuTrigger>
          <MenuContent align="end">
            <MenuItem icon={<EditIcon size={16} />}>Editing</MenuItem>
            <MenuItem icon={<CloudIcon size={16} />}>Viewing</MenuItem>
          </MenuContent>
        </Menu>
        <button className="op-share" type="button">
          <ShareIcon size={15} />
          <span>Share</span>
        </button>
      </div>
    </div>
  )
}
