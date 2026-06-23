import type { ChangeEvent, Dispatch, SetStateAction } from 'react'
import type {
  CopilotMessage,
  Page,
  PageVersion,
  ReferenceItem,
  ReviewScope,
  SearchScope,
  TagResult,
  TaskResult,
  TaskStatusFilter,
} from '../../app/appModel'
import {
  getReferenceCreatorSummary,
  getReferencePreview,
  referenceStyleOptions,
} from '../../features/app/referenceManager'
import { countMarkmapTreeNodes, type MarkmapTreeNode } from '../../features/app/markmapFeature'
import { MarkmapPreview } from './MarkmapPreview'
import { MarkmapTreeEditor } from './MarkmapTreeEditor'

type PageTemplate = {
  id: string
  label: string
  html: string
}

type TagCatalogEntry = {
  tag: string
  count: number
}

type TaskSummary = {
  open: number
  done: number
  all: number
}

export type SidePanesProps = {
  isCurrentSectionLocked: boolean
  hasSidePane: boolean
  page?: Page

  isTemplatePaneOpen: boolean
  setIsTemplatePaneOpen: Dispatch<SetStateAction<boolean>>
  pageTemplates: PageTemplate[]
  selectedTemplate?: PageTemplate
  setSelectedTemplateId: Dispatch<SetStateAction<string>>
  insertSelectedTemplate: () => void

  isMarkmapPaneOpen: boolean
  setIsMarkmapPaneOpen: Dispatch<SetStateAction<boolean>>
  markmapTree: MarkmapTreeNode
  setMarkmapTree: Dispatch<SetStateAction<MarkmapTreeNode>>
  markmapMarkdown: string
  canInsertMarkmap: boolean
  seedMarkmapFromPage: () => void
  insertMarkmapBlock: () => void

  isAudioPaneOpen: boolean
  setIsAudioPaneOpen: Dispatch<SetStateAction<boolean>>
  isRecordingAudio: boolean
  isAudioPaused: boolean
  audioRecordingSeconds: number
  formatElapsedTime: (value: number) => string
  audioDevices: { deviceId: string; label: string }[]
  selectedAudioDeviceId: string
  setSelectedAudioDeviceId: Dispatch<SetStateAction<string>>
  startAudioRecording: () => Promise<void> | void
  stopAudioRecording: () => Promise<void> | void
  toggleAudioPause: () => void

  isReferencesPaneOpen: boolean
  setIsReferencesPaneOpen: Dispatch<SetStateAction<boolean>>
  references: ReferenceItem[]
  filteredReferences: ReferenceItem[]
  referenceQuery: string
  setReferenceQuery: Dispatch<SetStateAction<string>>
  referenceStyle: string
  setReferenceStyle: (value: string) => void
  referenceImportDraft: string
  setReferenceImportDraft: Dispatch<SetStateAction<string>>
  referenceImportSummary: string
  canInsertReference: boolean
  importReferenceText: (value: string) => void
  insertReferenceCitation: (item: ReferenceItem) => void
  insertReferenceEntry: (item: ReferenceItem) => void
  insertReferenceBibliography: () => void
  removeReference: (referenceId: string) => void

  isMeetingDetailsOpen: boolean
  setIsMeetingDetailsOpen: Dispatch<SetStateAction<boolean>>
  meetingTitleDraft: string
  meetingDateDraft: string
  meetingTimeDraft: string
  meetingLocationDraft: string
  meetingAttendeesDraft: string
  meetingAgendaDraft: string
  setMeetingTitleDraft: Dispatch<SetStateAction<string>>
  setMeetingDateDraft: Dispatch<SetStateAction<string>>
  setMeetingTimeDraft: Dispatch<SetStateAction<string>>
  setMeetingLocationDraft: Dispatch<SetStateAction<string>>
  setMeetingAttendeesDraft: Dispatch<SetStateAction<string>>
  setMeetingAgendaDraft: Dispatch<SetStateAction<string>>
  insertMeetingDetails: () => void

  isHistoryPaneOpen: boolean
  setIsHistoryPaneOpen: Dispatch<SetStateAction<boolean>>
  currentPageVersions: PageVersion[]
  selectedHistoryVersion?: PageVersion
  historyPreviewText: string
  restoreSelectedHistoryVersion: () => void
  setSelectedHistoryVersionId: Dispatch<SetStateAction<string>>
  formatDate: (value: string) => string
  extractSnippetText: (value: string) => string

  isReviewPaneOpen: boolean
  setIsReviewPaneOpen: Dispatch<SetStateAction<boolean>>
  reviewScope: ReviewScope
  setReviewScope: Dispatch<SetStateAction<ReviewScope>>
  reviewScopeLabels: Record<ReviewScope, string>
  reviewFind: string
  reviewReplace: string
  setReviewFind: Dispatch<SetStateAction<string>>
  setReviewReplace: Dispatch<SetStateAction<string>>
  reviewMatchCount: number
  replaceInReviewScope: () => void

  isTagPaneOpen: boolean
  setIsTagPaneOpen: Dispatch<SetStateAction<boolean>>
  tagPaneScope: SearchScope
  setTagPaneScope: Dispatch<SetStateAction<SearchScope>>
  searchScopeLabels: Record<SearchScope, string>
  selectedTagFilter: string
  setSelectedTagFilter: Dispatch<SetStateAction<string>>
  tagCatalog: TagCatalogEntry[]
  addSelectedTagToCurrentPage: () => void
  customTagDraft: string
  setCustomTagDraft: Dispatch<SetStateAction<string>>
  addCustomTagToCurrentPage: () => void
  tagResults: TagResult[]
  toggleTagOnPage: (pageId: string, tag: string) => void
  openTagResult: (result: TagResult) => void

  isTaskPaneOpen: boolean
  setIsTaskPaneOpen: Dispatch<SetStateAction<boolean>>
  taskPaneScope: SearchScope
  setTaskPaneScope: Dispatch<SetStateAction<SearchScope>>
  taskSummary: TaskSummary
  taskStatusFilter: TaskStatusFilter
  setTaskStatusFilter: Dispatch<SetStateAction<TaskStatusFilter>>
  taskStatusLabels: Record<TaskStatusFilter, string>
  taskResults: TaskResult[]
  toggleTaskForPage: (pageId: string) => void
  openTaskResult: (result: TaskResult) => void
  setTaskDueDateForPage: (pageId: string) => void
  clearTaskForPage: (pageId: string) => void
  formatDueDate: (value: string) => string

  isCopilotOpen: boolean
  setIsCopilotOpen: Dispatch<SetStateAction<boolean>>
  copilotDraft: string
  setCopilotDraft: Dispatch<SetStateAction<string>>
  copilotMessages: CopilotMessage[]
  setCopilotMessages: Dispatch<SetStateAction<CopilotMessage[]>>
  submitCopilotDraft: () => void
  suggestedPrompts: string[]
  runCopilotPrompt: (prompt: string) => void
}

export function SidePanes(props: SidePanesProps) {
  const {
    isCurrentSectionLocked,
    hasSidePane,
    page,
    isTemplatePaneOpen,
    setIsTemplatePaneOpen,
    pageTemplates,
    selectedTemplate,
    setSelectedTemplateId,
    insertSelectedTemplate,
    isMarkmapPaneOpen,
    setIsMarkmapPaneOpen,
    markmapTree,
    setMarkmapTree,
    markmapMarkdown,
    canInsertMarkmap,
    seedMarkmapFromPage,
    insertMarkmapBlock,
    isAudioPaneOpen,
    setIsAudioPaneOpen,
    isRecordingAudio,
    isAudioPaused,
    audioRecordingSeconds,
    formatElapsedTime,
    audioDevices,
    selectedAudioDeviceId,
    setSelectedAudioDeviceId,
    startAudioRecording,
    stopAudioRecording,
    toggleAudioPause,
    isReferencesPaneOpen,
    setIsReferencesPaneOpen,
    references,
    filteredReferences,
    referenceQuery,
    setReferenceQuery,
    referenceStyle,
    setReferenceStyle,
    referenceImportDraft,
    setReferenceImportDraft,
    referenceImportSummary,
    canInsertReference,
    importReferenceText,
    insertReferenceCitation,
    insertReferenceEntry,
    insertReferenceBibliography,
    removeReference,
    isMeetingDetailsOpen,
    setIsMeetingDetailsOpen,
    meetingTitleDraft,
    meetingDateDraft,
    meetingTimeDraft,
    meetingLocationDraft,
    meetingAttendeesDraft,
    meetingAgendaDraft,
    setMeetingTitleDraft,
    setMeetingDateDraft,
    setMeetingTimeDraft,
    setMeetingLocationDraft,
    setMeetingAttendeesDraft,
    setMeetingAgendaDraft,
    insertMeetingDetails,
    isHistoryPaneOpen,
    setIsHistoryPaneOpen,
    currentPageVersions,
    selectedHistoryVersion,
    historyPreviewText,
    restoreSelectedHistoryVersion,
    setSelectedHistoryVersionId,
    formatDate,
    extractSnippetText,
    isReviewPaneOpen,
    setIsReviewPaneOpen,
    reviewScope,
    setReviewScope,
    reviewScopeLabels,
    reviewFind,
    reviewReplace,
    setReviewFind,
    setReviewReplace,
    reviewMatchCount,
    replaceInReviewScope,
    isTagPaneOpen,
    setIsTagPaneOpen,
    tagPaneScope,
    setTagPaneScope,
    searchScopeLabels,
    selectedTagFilter,
    setSelectedTagFilter,
    tagCatalog,
    addSelectedTagToCurrentPage,
    customTagDraft,
    setCustomTagDraft,
    addCustomTagToCurrentPage,
    tagResults,
    toggleTagOnPage,
    openTagResult,
    isTaskPaneOpen,
    setIsTaskPaneOpen,
    taskPaneScope,
    setTaskPaneScope,
    taskSummary,
    taskStatusFilter,
    setTaskStatusFilter,
    taskStatusLabels,
    taskResults,
    toggleTaskForPage,
    openTaskResult,
    setTaskDueDateForPage,
    clearTaskForPage,
    formatDueDate,
    isCopilotOpen,
    setIsCopilotOpen,
    copilotDraft,
    setCopilotDraft,
    copilotMessages,
    setCopilotMessages,
    submitCopilotDraft,
    suggestedPrompts,
    runCopilotPrompt,
  } = props
  const handleReferenceFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    importReferenceText(await file.text())
  }

  if (!hasSidePane) return null

  return (
    <div className="side-pane-stack">
      <aside className="template-pane" hidden={!isTemplatePaneOpen}>
        <div className="task-pane-toolbar">
          <strong>Page Templates</strong>
          <span className="copilot-pane-spacer" />
          <button onClick={() => setIsTemplatePaneOpen(false)} type="button">
            x
          </button>
        </div>
        <div className="template-pane-body">
          <div className="template-pane-list">
            {pageTemplates.map((template) => (
              <button
                key={template.id}
                className={`template-pane-card ${selectedTemplate?.id === template.id ? 'active' : ''}`}
                onClick={() => setSelectedTemplateId(template.id)}
                type="button"
              >
                <strong>{template.label}</strong>
                <span>{extractSnippetText(template.html).slice(0, 110)}</span>
              </button>
            ))}
          </div>
          {selectedTemplate ? (
            <div className="template-pane-preview">
              <strong>{selectedTemplate.label}</strong>
              <p>{extractSnippetText(selectedTemplate.html).slice(0, 220)}</p>
              <div className="template-pane-actions">
                <button disabled={isCurrentSectionLocked} onClick={insertSelectedTemplate} type="button">
                  Insert Template
                </button>
                <button onClick={() => setIsTemplatePaneOpen(false)} type="button">
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </aside>
      <aside className="markmap-pane" hidden={!isMarkmapPaneOpen}>
        <div className="task-pane-toolbar">
          <strong>Mind Map</strong>
          <span className="copilot-pane-spacer" />
          <button onClick={() => setIsMarkmapPaneOpen(false)} type="button">
            x
          </button>
        </div>
        <div className="markmap-pane-body">
          <div className="markmap-pane-status">
            <strong>{markmapTree.label || 'Mind Map'}</strong>
            <span>{countMarkmapTreeNodes(markmapTree)} nodes</span>
          </div>
          <MarkmapTreeEditor disabled={isCurrentSectionLocked} setTree={setMarkmapTree} tree={markmapTree} />
          <div className="markmap-pane-actions">
            <button disabled={!page} onClick={seedMarkmapFromPage} type="button">
              Use Page
            </button>
            <button disabled={!canInsertMarkmap || !markmapTree.label.trim()} onClick={insertMarkmapBlock} type="button">
              Insert Map
            </button>
          </div>
          <div className="markmap-preview-shell">
            <MarkmapPreview markdown={markmapMarkdown} />
          </div>
        </div>
      </aside>
      <aside className="audio-pane" hidden={!isAudioPaneOpen}>
        <div className="task-pane-toolbar">
          <strong>Audio Note</strong>
          <span className="copilot-pane-spacer" />
          <button onClick={() => setIsAudioPaneOpen(false)} type="button">
            x
          </button>
        </div>
        <div className="audio-pane-body">
          <div className="audio-pane-status">
            <strong>{isRecordingAudio ? (isAudioPaused ? 'Paused' : 'Recording') : 'Ready'}</strong>
            <span>{formatElapsedTime(audioRecordingSeconds)}</span>
          </div>
          <label className="review-pane-field">
            <span>Input Device</span>
            <select
              className="audio-pane-select"
              disabled={isRecordingAudio}
              onChange={(event) => setSelectedAudioDeviceId(event.target.value)}
              value={selectedAudioDeviceId}
            >
              {audioDevices.length === 0 ? (
                <option value="default">Default microphone</option>
              ) : (
                audioDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))
              )}
            </select>
          </label>
          <div className="audio-pane-actions">
            <button
              disabled={isCurrentSectionLocked}
              onClick={() => void (isRecordingAudio ? stopAudioRecording() : startAudioRecording())}
              type="button"
            >
              {isRecordingAudio ? 'Stop and Insert' : 'Start Recording'}
            </button>
            <button disabled={!isRecordingAudio} onClick={toggleAudioPause} type="button">
              {isAudioPaused ? 'Resume' : 'Pause'}
            </button>
          </div>
          <div className="review-pane-summary">
            <strong>{audioDevices.length || 1}</strong>
            <span>microphone source{audioDevices.length === 1 ? '' : 's'} available</span>
          </div>
        </div>
      </aside>
      <aside className="references-pane" hidden={!isReferencesPaneOpen}>
        <div className="task-pane-toolbar">
          <strong>Zotero</strong>
          <span className="copilot-pane-spacer" />
          <button onClick={() => setIsReferencesPaneOpen(false)} type="button">
            x
          </button>
        </div>
        <div className="references-pane-body">
          <div className="references-pane-status">
            <strong>Zotero library</strong>
            <span>
              {references.length === 0
                ? 'Import Zotero BibTeX, RIS, or CSL JSON exports to build a local reference library.'
                : `${references.length} saved reference${references.length === 1 ? '' : 's'}`}
            </span>
          </div>
          <label className="review-pane-field">
            <span>Import Zotero Export</span>
            <textarea
              onChange={(event) => setReferenceImportDraft(event.target.value)}
              placeholder="@article{...}, TY  - JOUR, or CSL JSON"
              rows={5}
              value={referenceImportDraft}
            />
          </label>
          <div className="references-pane-actions">
            <button disabled={!referenceImportDraft.trim()} onClick={() => importReferenceText(referenceImportDraft)} type="button">
              Import Text
            </button>
            <label className="references-file-button">
              File
              <input accept=".bib,.ris,.json,.csljson,.txt" onChange={handleReferenceFileImport} type="file" />
            </label>
          </div>
          <div className="references-pane-status">
            <strong>Import status</strong>
            <span>{referenceImportSummary}</span>
          </div>
          <label className="review-pane-field">
            <span>Search References</span>
            <input
              onChange={(event) => setReferenceQuery(event.target.value)}
              placeholder="Title, creator, or year"
              type="text"
              value={referenceQuery}
            />
          </label>
          <label className="review-pane-field">
            <span>Citation Style</span>
            <select
              className="audio-pane-select"
              onChange={(event) => setReferenceStyle(event.target.value)}
              value={referenceStyle}
            >
              {referenceStyleOptions.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.label}
                </option>
              ))}
            </select>
          </label>
          <div className="references-pane-actions">
            <button disabled={!canInsertReference || filteredReferences.length === 0} onClick={insertReferenceBibliography} type="button">
              Insert Bibliography
            </button>
          </div>
          <div className="references-list">
            {filteredReferences.length === 0 ? (
              <div className="task-pane-empty">
                {references.length === 0
                  ? 'Import references to cite them in your notes.'
                  : 'No references match this search.'}
              </div>
            ) : (
              filteredReferences.map((item) => (
                <article key={item.id} className="reference-card">
                  <div className="reference-card-head">
                    <strong>{item.title}</strong>
                    <span>{item.year || item.itemType || 'Reference'}</span>
                  </div>
                  <p>{getReferencePreview(item).slice(0, 220)}</p>
                  <div className="reference-card-meta">
                    <span>{getReferenceCreatorSummary(item)}</span>
                    <span>{item.containerTitle || item.publisher || item.source}</span>
                  </div>
                  <div className="reference-card-actions">
                    <button disabled={!canInsertReference} onClick={() => insertReferenceCitation(item)} type="button">
                      Cite
                    </button>
                    <button disabled={!canInsertReference} onClick={() => insertReferenceEntry(item)} type="button">
                      Reference
                    </button>
                    <button onClick={() => removeReference(item.id)} type="button">
                      Remove
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </aside>
      <aside className="meeting-pane" hidden={!isMeetingDetailsOpen}>
        <div className="task-pane-toolbar">
          <strong>Meeting Details</strong>
          <span className="copilot-pane-spacer" />
          <button onClick={() => setIsMeetingDetailsOpen(false)} type="button">
            x
          </button>
        </div>
        <div className="meeting-pane-body">
          <label className="review-pane-field">
            <span>Title</span>
            <input onChange={(event) => setMeetingTitleDraft(event.target.value)} type="text" value={meetingTitleDraft} />
          </label>
          <div className="meeting-pane-grid">
            <label className="review-pane-field">
              <span>Date</span>
              <input onChange={(event) => setMeetingDateDraft(event.target.value)} type="date" value={meetingDateDraft} />
            </label>
            <label className="review-pane-field">
              <span>Time</span>
              <input onChange={(event) => setMeetingTimeDraft(event.target.value)} type="time" value={meetingTimeDraft} />
            </label>
          </div>
          <label className="review-pane-field">
            <span>Location</span>
            <input
              onChange={(event) => setMeetingLocationDraft(event.target.value)}
              placeholder="Room, link, or location"
              type="text"
              value={meetingLocationDraft}
            />
          </label>
          <label className="review-pane-field">
            <span>Attendees</span>
            <input
              onChange={(event) => setMeetingAttendeesDraft(event.target.value)}
              placeholder="Comma-separated names"
              type="text"
              value={meetingAttendeesDraft}
            />
          </label>
          <label className="review-pane-field">
            <span>Agenda</span>
            <textarea
              className="meeting-pane-textarea"
              onChange={(event) => setMeetingAgendaDraft(event.target.value)}
              placeholder="One topic per line"
              value={meetingAgendaDraft}
            />
          </label>
          <div className="meeting-pane-actions">
            <button disabled={isCurrentSectionLocked} onClick={insertMeetingDetails} type="button">
              Insert Meeting Block
            </button>
            <button onClick={() => setIsMeetingDetailsOpen(false)} type="button">
              Cancel
            </button>
          </div>
        </div>
      </aside>
      <aside className="history-pane" hidden={!isHistoryPaneOpen}>
        <div className="task-pane-toolbar">
          <strong>Page Versions</strong>
          <span className="copilot-pane-spacer" />
          <button onClick={() => setIsHistoryPaneOpen(false)} type="button">
            x
          </button>
        </div>
        <div className="history-pane-body">
          <div className="history-pane-summary">
            <strong>{currentPageVersions.length}</strong>
            <span>saved version{currentPageVersions.length === 1 ? '' : 's'} for this page</span>
          </div>
          {selectedHistoryVersion ? (
            <div className="history-pane-preview">
              <div className="history-pane-preview-head">
                <strong>{selectedHistoryVersion.title}</strong>
                <span>{formatDate(selectedHistoryVersion.savedAt)}</span>
              </div>
              <p>{historyPreviewText || 'This version has no text preview.'}</p>
              <div className="history-pane-actions">
                <button disabled={isCurrentSectionLocked} onClick={restoreSelectedHistoryVersion} type="button">
                  Restore Selected
                </button>
                <button onClick={() => setSelectedHistoryVersionId(currentPageVersions[0]?.id ?? '')} type="button">
                  Jump to Latest
                </button>
              </div>
            </div>
          ) : (
            <div className="task-pane-empty">No saved versions for this page yet.</div>
          )}
          <div className="history-pane-list">
            {currentPageVersions.map((version, index) => (
              <button
                key={version.id}
                className={`history-pane-entry ${selectedHistoryVersion?.id === version.id ? 'active' : ''}`}
                onClick={() => setSelectedHistoryVersionId(version.id)}
                type="button"
              >
                <div className="history-pane-entry-head">
                  <strong>{index === 0 ? 'Latest version' : `Version ${currentPageVersions.length - index}`}</strong>
                  <span>{formatDate(version.savedAt)}</span>
                </div>
                <div className="history-pane-entry-title">{version.title || 'Untitled Page'}</div>
                <p>{extractSnippetText(version.content).slice(0, 120) || 'No text preview available.'}</p>
              </button>
            ))}
          </div>
        </div>
      </aside>
      <aside className="review-pane" hidden={!isReviewPaneOpen}>
        <div className="task-pane-toolbar">
          <strong>Find and Replace</strong>
          <span className="copilot-pane-spacer" />
          <button
            onClick={() =>
              setReviewScope((current) =>
                current === 'page' ? 'section' : current === 'section' ? 'notebook' : current === 'notebook' ? 'all' : 'page',
              )
            }
            type="button"
          >
            {reviewScopeLabels[reviewScope]}
          </button>
          <button onClick={() => setIsReviewPaneOpen(false)} type="button">
            x
          </button>
        </div>
        <div className="review-pane-body">
          <label className="review-pane-field">
            <span>Find</span>
            <input
              onChange={(event) => setReviewFind(event.target.value)}
              placeholder="Text to find"
              type="text"
              value={reviewFind}
            />
          </label>
          <label className="review-pane-field">
            <span>Replace With</span>
            <input
              onChange={(event) => setReviewReplace(event.target.value)}
              placeholder="Replacement text"
              type="text"
              value={reviewReplace}
            />
          </label>
          <div className="review-pane-summary">
            <strong>{reviewMatchCount}</strong>
            <span>matches in {reviewScopeLabels[reviewScope].toLowerCase()}</span>
          </div>
          <div className="review-pane-actions">
            <button disabled={!reviewFind.trim()} onClick={replaceInReviewScope} type="button">
              Replace All
            </button>
            <button onClick={() => { setReviewFind(''); setReviewReplace('') }} type="button">
              Clear
            </button>
          </div>
        </div>
      </aside>
      <aside className="tag-pane" hidden={!isTagPaneOpen}>
        <div className="task-pane-toolbar">
          <strong>Tag Summary</strong>
          <span className="copilot-pane-spacer" />
          <button onClick={() => setTagPaneScope((current) => (current === 'all' ? 'notebook' : current === 'notebook' ? 'section' : 'all'))} type="button">
            {searchScopeLabels[tagPaneScope]}
          </button>
          <button onClick={() => setIsTagPaneOpen(false)} type="button">
            x
          </button>
        </div>
        <div className="tag-pane-body">
          <div className="tag-pane-actions">
            <button disabled={!page || !selectedTagFilter || isCurrentSectionLocked} onClick={addSelectedTagToCurrentPage} type="button">
              Apply selected tag
            </button>
            <div className="tag-pane-custom">
              <input
                onChange={(event) => setCustomTagDraft(event.target.value)}
                placeholder="Custom tag"
                type="text"
                value={customTagDraft}
              />
              <button disabled={!page || !customTagDraft.trim() || isCurrentSectionLocked} onClick={addCustomTagToCurrentPage} type="button">
                Add
              </button>
            </div>
          </div>
          <div className="tag-pane-catalog">
            {tagCatalog.map((entry) => (
              <button
                key={entry.tag}
                className={selectedTagFilter === entry.tag ? 'active' : ''}
                onClick={() => setSelectedTagFilter(entry.tag)}
                type="button"
              >
                <span>{entry.tag}</span>
                <strong>{entry.count}</strong>
              </button>
            ))}
          </div>
          <div className="tag-pane-results">
            {selectedTagFilter ? (
              <>
                <div className="tag-pane-results-title">
                  {selectedTagFilter} {'\u00c2\u00b7'} {tagResults.length} match{tagResults.length === 1 ? '' : 'es'}
                </div>
                {tagResults.length === 0 ? (
                  <div className="task-pane-empty">
                    No pages match this tag in {searchScopeLabels[tagPaneScope].toLowerCase()}.
                  </div>
                ) : (
                  tagResults.map((result) => (
                    <article key={`${result.page.id}-${result.matchedTag}`} className="task-pane-card">
                      <div className="task-pane-card-row">
                        <button onClick={() => toggleTagOnPage(result.page.id, result.matchedTag)} type="button">
                          Remove
                        </button>
                        <button className="task-pane-link" onClick={() => openTagResult(result)} type="button">
                          {result.page.title}
                        </button>
                      </div>
                      <p>{result.sectionName} {'\u00c2\u00b7'} {result.notebookName}</p>
                      <div className="task-pane-card-meta">
                        <span>{formatDate(result.page.updatedAt)}</span>
                        <span>{result.page.tags.join(', ')}</span>
                      </div>
                    </article>
                  ))
                )}
              </>
            ) : (
              <div className="task-pane-empty">Select a tag to see matching pages.</div>
            )}
          </div>
        </div>
      </aside>
      <aside className="task-pane" hidden={!isTaskPaneOpen}>
        <div className="task-pane-toolbar">
          <strong>Task Finder</strong>
          <span className="copilot-pane-spacer" />
          <button onClick={() => setTaskPaneScope((current) => (current === 'all' ? 'notebook' : current === 'notebook' ? 'section' : 'all'))} type="button">
            {searchScopeLabels[taskPaneScope]}
          </button>
          <button onClick={() => setIsTaskPaneOpen(false)} type="button">
            x
          </button>
        </div>
        <div className="task-pane-body">
          <div className="task-pane-summary">
            <div>
              <strong>{taskSummary.open}</strong>
              <span>Open</span>
            </div>
            <div>
              <strong>{taskSummary.done}</strong>
              <span>Done</span>
            </div>
            <div>
              <strong>{taskSummary.all}</strong>
              <span>Total</span>
            </div>
          </div>
          <div className="task-pane-filters">
            {(['open', 'all', 'done'] as TaskStatusFilter[]).map((filter) => (
              <button
                key={filter}
                className={taskStatusFilter === filter ? 'active' : ''}
                onClick={() => setTaskStatusFilter(filter)}
                type="button"
              >
                {taskStatusLabels[filter]}
              </button>
            ))}
          </div>
          <div className="task-pane-list">
            {taskResults.length === 0 ? (
              <div className="task-pane-empty">
                No tasks in {searchScopeLabels[taskPaneScope].toLowerCase()}.
              </div>
            ) : (
              taskResults.map((result) => (
                <article key={result.page.id} className={`task-pane-card ${result.isOverdue ? 'overdue' : ''}`}>
                  <div className="task-pane-card-row">
                    <button onClick={() => toggleTaskForPage(result.page.id)} type="button">
                      {result.page.task?.status === 'done' ? 'Reopen' : 'Done'}
                    </button>
                    <button className="task-pane-link" onClick={() => openTaskResult(result)} type="button">
                      {result.page.title}
                    </button>
                  </div>
                  <p>{result.sectionName} {'\u00c2\u00b7'} {result.notebookName}</p>
                  <div className="task-pane-card-meta">
                    <span>{result.page.task?.dueAt ? `Due ${formatDueDate(result.page.task.dueAt)}` : 'No due date'}</span>
                    <span>{result.page.task?.status === 'done' ? 'Completed' : result.isOverdue ? 'Overdue' : 'Open'}</span>
                  </div>
                  <div className="task-pane-card-actions">
                    <button onClick={() => setTaskDueDateForPage(result.page.id)} type="button">
                      Set due date
                    </button>
                    <button onClick={() => clearTaskForPage(result.page.id)} type="button">
                      Remove task
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </aside>
      <aside className="copilot-pane" hidden={!isCopilotOpen}>
        <div className="copilot-pane-toolbar">
          <span className="copilot-pane-icon">=</span>
          <span className="copilot-pane-status">o</span>
          <span className="copilot-pane-spacer" />
          <button onClick={() => setCopilotMessages([])} type="button">Clear</button>
          <button onClick={() => setIsCopilotOpen(false)} type="button">x</button>
        </div>
        <div className="copilot-pane-body">
          <div className="copilot-orb" />
          <h3>Try 'Organize my Notes'</h3>
          <div className="copilot-compose">
            <span>Message Copilot</span>
            <textarea
              onChange={(event) => setCopilotDraft(event.target.value)}
              placeholder="Ask Copilot to organize, rewrite, summarize, or draft."
              value={copilotDraft}
            />
            <div className="copilot-compose-actions">
              <button disabled={!copilotDraft.trim()} onClick={submitCopilotDraft} type="button">Insert</button>
              <button onClick={() => setCopilotDraft('Organize my notes into sections with next steps')} type="button">Prompt</button>
            </div>
          </div>
          <div className="copilot-prompts">
            {suggestedPrompts.map((item) => (
              <button key={item} className="copilot-prompt-card" onClick={() => runCopilotPrompt(item)} type="button">
                {item}
              </button>
            ))}
          </div>
          {copilotMessages.length > 0 ? (
            <div className="copilot-results">
              {copilotMessages.map((entry) => (
                <article key={entry.id} className="copilot-result-card">
                  <strong>{entry.prompt}</strong>
                  <p>{extractSnippetText(entry.response).slice(0, 140)}</p>
                </article>
              ))}
            </div>
          ) : (
            <button className="copilot-show-more" onClick={() => runCopilotPrompt('Organize my notes into sections with next steps')} type="button">
              Insert Organizer
            </button>
          )}
        </div>
      </aside>
    </div>
  )
}
