import type { RefObject, ReactNode } from 'react'
import { useState } from 'react'
import type { RibbonTab, SearchFilter, SearchResult, SearchScope } from '../../app/appModel'
import { ribbonTabs } from '../../app/appModel'
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, Menu, MenuContent, MenuItem, MenuTrigger } from '../ui'
import {
  ChevronDownIcon,
  CloudIcon,
  CopyIcon,
  EditIcon,
  FileDownIcon,
  FolderPlusIcon,
  HistoryIcon,
  LightbulbIcon,
  MailIcon,
  RefreshCcwIcon,
  RotateCcwIcon,
  SaveIcon,
  ShareIcon,
} from '../Icons'

type CommandBarProps = {
  activeTab: RibbonTab
  backupSnapshots: DesktopBackupSnapshot[]
  cloudSyncStatus: DesktopCloudSyncStatus
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
  saveStatusText: string
  onChooseCloudFolder: () => Promise<void> | void
  onDisableCloudSync: () => Promise<void> | void
  onExportPage: () => void
  onEmailPage: () => void
  onRefreshBackups: () => Promise<DesktopBackupSnapshot[]> | void
  onRestoreBackup: (backupId: string) => Promise<void> | void
  onRestoreCloud: () => Promise<void> | void
  onSyncCloudNow: () => Promise<void> | void
}

/* OneNote-web command bar (row B): the ribbon tabs, the "Tell me what you
   want to do" box (wired to content search), and the cloud / Editing /
   Share cluster. */
export function CommandBar(props: CommandBarProps) {
  const {
    activeTab,
    backupSnapshots,
    cloudSyncStatus,
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
    saveStatusText,
    onChooseCloudFolder,
    onDisableCloudSync,
    onExportPage,
    onEmailPage,
    onRefreshBackups,
    onRestoreBackup,
    onRestoreCloud,
    onSyncCloudNow,
  } = props
  const [isSyncOpen, setIsSyncOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const formatStatusDate = (value?: string | null) => {
    if (!value) return 'Never'
    return new Date(value).toLocaleString()
  }
  const cloudSummary = cloudSyncStatus.enabled
    ? cloudSyncStatus.lastError
      ? `Cloud failed: ${cloudSyncStatus.lastError}`
      : `Last cloud save ${formatStatusDate(cloudSyncStatus.lastSyncedAt)}`
    : 'Not connected'

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
              <div className="search-filter-divider" />
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
              <span className="search-results-count">
                <strong>{searchResults.length}</strong>{' '}
                result{searchResults.length === 1 ? '' : 's'}
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
                    <div className="search-result-header">
                      <strong>
                        {renderHighlightedText(
                          result.isSubpage ? `${result.page.title} (Subpage)` : result.page.title,
                          query.trim(),
                        )}
                      </strong>
                      <div className="search-result-meta">
                        {(result.matchedFields ?? ['content']).map((field) => (
                          <em key={`${result.page.id}-${field}`}>{searchFilterLabels[field]}</em>
                        ))}
                      </div>
                    </div>
                    <span>{result.notebookName} / {result.groupName} / {result.sectionName}</span>
                    <p>{renderHighlightedText(result.matchSnippet ?? result.page.snippet, query.trim())}</p>
                  </button>
                ))
              ) : (
                <div className="search-results-empty">
                  No pages match &ldquo;{query.trim()}&rdquo;
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="op-command-right">
        <button
          aria-label="Sync status"
          className="op-header-icon"
          onClick={() => setIsSyncOpen(true)}
          type="button"
        >
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
        <button className="op-share" onClick={() => setIsShareOpen(true)} type="button">
          <ShareIcon size={15} />
          <span>Share</span>
        </button>
      </div>

      <Dialog onOpenChange={setIsSyncOpen} open={isSyncOpen}>
        <DialogContent title="Sync Status">
          <DialogBody>
            <div className="op-sync-status">
              <div className="op-sync-status-icon">
                <SaveIcon size={32} />
              </div>
              <div className="op-sync-status-detail">
                <strong>Local Storage</strong>
                <span>{saveStatusText}</span>
              </div>
            </div>
            <div className="op-sync-status">
              <div className="op-sync-status-icon">
                <CloudIcon size={32} />
              </div>
              <div className="op-sync-status-detail">
                <strong>Cloud Save</strong>
                <span>{cloudSummary}</span>
                {cloudSyncStatus.path ? <span>{cloudSyncStatus.path}</span> : null}
              </div>
            </div>
            <div className="op-share-options">
              <button className="op-share-option" onClick={() => void onChooseCloudFolder()} type="button">
                <FolderPlusIcon size={20} />
                <div>
                  <strong>{cloudSyncStatus.enabled ? 'Change cloud folder' : 'Choose cloud folder'}</strong>
                  <span>Use a synced folder such as OneDrive or Dropbox</span>
                </div>
              </button>
              <button
                className="op-share-option"
                disabled={!cloudSyncStatus.enabled}
                onClick={() => void onSyncCloudNow()}
                type="button"
              >
                <RefreshCcwIcon size={20} />
                <div>
                  <strong>Sync now</strong>
                  <span>{formatStatusDate(cloudSyncStatus.lastSyncedAt)}</span>
                </div>
              </button>
              <button
                className="op-share-option"
                disabled={!cloudSyncStatus.enabled}
                onClick={() => void onRestoreCloud()}
                type="button"
              >
                <RotateCcwIcon size={20} />
                <div>
                  <strong>Restore cloud save</strong>
                  <span>Current workspace is backed up first</span>
                </div>
              </button>
              <button
                className="op-share-option"
                disabled={!cloudSyncStatus.enabled}
                onClick={() => void onDisableCloudSync()}
                type="button"
              >
                <CloudIcon size={20} />
                <div>
                  <strong>Disconnect cloud save</strong>
                  <span>Local saving stays on</span>
                </div>
              </button>
            </div>
            <div className="op-backup-list">
              <div className="op-backup-list-head">
                <strong>Rolling Backups</strong>
                <button className="op-btn op-btn-secondary" onClick={() => void onRefreshBackups()} type="button">
                  Refresh
                </button>
              </div>
              {backupSnapshots.length > 0 ? (
                backupSnapshots.slice(0, 6).map((backup) => (
                  <button
                    className="op-backup-item"
                    key={backup.id}
                    onClick={() => void onRestoreBackup(backup.id)}
                    type="button"
                  >
                    <HistoryIcon size={18} />
                    <span>{formatStatusDate(backup.createdAt)}</span>
                  </button>
                ))
              ) : (
                <div className="op-backup-empty">No backup snapshots yet</div>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <button className="op-btn op-btn-primary" type="button">Close</button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setIsShareOpen} open={isShareOpen}>
        <DialogContent title="Share">
          <DialogBody>
            <div className="op-share-options">
              <button
                className="op-share-option"
                onClick={() => { onEmailPage(); setIsShareOpen(false) }}
                type="button"
              >
                <MailIcon size={20} />
                <div>
                  <strong>Email page</strong>
                  <span>Send this page as an email</span>
                </div>
              </button>
              <button
                className="op-share-option"
                onClick={() => { onExportPage(); setIsShareOpen(false) }}
                type="button"
              >
                <FileDownIcon size={20} />
                <div>
                  <strong>Export page</strong>
                  <span>Save as a file on your device</span>
                </div>
              </button>
              <button
                className="op-share-option"
                onClick={() => {
                  void navigator.clipboard.writeText(window.location.href)
                  setIsShareOpen(false)
                }}
                type="button"
              >
                <CopyIcon size={20} />
                <div>
                  <strong>Copy link</strong>
                  <span>Copy a link to this page</span>
                </div>
              </button>
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <button className="op-btn op-btn-secondary" type="button">Cancel</button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
