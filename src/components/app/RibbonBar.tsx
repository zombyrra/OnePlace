import type { Dispatch, RefObject, SetStateAction } from 'react'
import type {
  Page,
  PageSortMode,
  PageWidthMode,
  RecentNotebookEntry,
  RibbonTab,
} from '../../app/appModel'
import {
  ribbonTabs,
  fontFamilies,
  fontSizes,
  stylePresets,
} from '../../app/appModel'
import {
  AlignLeftIcon,
  AttachmentIcon,
  BoldIcon,
  BrushIcon,
  BulletsIcon,
  ChevronDownIcon,
  CopyIcon,
  CutIcon,
  EditIcon,
  FolderIcon,
  FormatMotivationIcon,
  ImageIcon,
  IndentIcon,
  InsertFormattingIcon,
  ItalicIcon,
  LinkIcon,
  ListLinesIcon,
  NotebookStackIcon,
  PasteIcon,
  PenIcon,
  ProjectIcon,
  SaveIcon,
  SearchIcon,
  SectionBookIcon,
  ShowIcon,
  SortIcon,
  TableIcon,
  TagsIcon,
  TextSizeDownIcon,
  TextSizeUpIcon,
  UnderlineIcon,
  UndoIcon,
} from '../Icons'

type RibbonBarProps = {
  activeTab: RibbonTab
  setActiveTab: (tab: RibbonTab) => void
  canGoBack: boolean
  canGoForward: boolean
  goBack: () => void
  goForward: () => void
  recentNotebookEntries: RecentNotebookEntry[]
  loadNotebookFromPath: (path: string) => void
  openNotebook: () => void
  importOneNoteExport: () => Promise<void> | void
  isImportingOneNoteExport: boolean
  saveNotebookAs: () => Promise<void> | void
  exportCurrentPage: () => Promise<void> | void
  saveNow: () => Promise<void> | void
  addPage: () => void
  addSubpage: () => void
  canPromotePage: boolean
  canDemotePage: boolean
  canDeletePage: boolean
  promoteCurrentPage: () => void
  demoteCurrentPage: () => void
  deleteCurrentPage: () => void
  promptCreateSection: (groupId?: string) => void
  addSectionGroup: () => void
  createNotebook: () => void
  insertChecklist: () => void
  insertTable: () => void
  insertExternalLink: () => void
  insertInternalPageLink: () => void
  openImagePicker: () => void
  openPrintoutPicker: () => void
  openAudioPane: () => void
  openAttachmentPicker: () => void
  applyPageTemplate: () => void
  insertTemplate: (html: string) => void
  isRecordingAudio: boolean
  setDrawColor: (value: string) => void
  clearInkStrokes: () => void
  saveCurrentPageVersion: () => void
  restoreSavedPageVersion: () => void
  setIsHistoryPaneOpen: Dispatch<SetStateAction<boolean>>
  isHistoryPaneOpen: boolean
  setQuery: (value: string) => void
  addTagToCurrentPage: () => void
  toggleCurrentTask: () => void
  isCurrentSectionLocked: boolean
  page: Page | undefined
  setCurrentTaskDueDate: () => void
  toggleCurrentTaskComplete: () => void
  setIsReviewPaneOpen: Dispatch<SetStateAction<boolean>>
  isReviewPaneOpen: boolean
  setIsTaskPaneOpen: Dispatch<SetStateAction<boolean>>
  isTaskPaneOpen: boolean
  pageSortMode: PageSortMode
  setPageSortMode: (mode: PageSortMode) => void
  adjustEditorZoom: (delta: number) => void
  setEditorZoom: (value: number) => void
  editorZoom: number
  setPageWidthMode: Dispatch<SetStateAction<PageWidthMode>>
  pageWidthMode: PageWidthMode
  setShowRuleLines: Dispatch<SetStateAction<boolean>>
  showRuleLines: boolean
  setIsNotebookPaneVisible: Dispatch<SetStateAction<boolean>>
  isNotebookPaneVisible: boolean
  setIsPagesPaneVisible: Dispatch<SetStateAction<boolean>>
  isPagesPaneVisible: boolean
  editorRef: RefObject<HTMLDivElement | null>
  pasteFromClipboard: () => void
  copySelection: () => void
  runEditorCommand: (command: string, value?: string) => void
  fontMenuRef: RefObject<HTMLDivElement | null>
  fontMenuPanelRef: RefObject<HTMLDivElement | null>
  isFontMenuOpen: boolean
  setIsFontMenuOpen: Dispatch<SetStateAction<boolean>>
  selectedFontFamily: string
  applyFontFamily: (fontFamily: string) => void
  fontSizeMenuRef: RefObject<HTMLDivElement | null>
  fontSizeMenuPanelRef: RefObject<HTMLDivElement | null>
  isFontSizeMenuOpen: boolean
  setIsFontSizeMenuOpen: Dispatch<SetStateAction<boolean>>
  selectedFontSize: string
  applyFontSize: (command: string, label: string) => void
  applyStylePreset: (html: string) => void
  emailCurrentPage: () => void
  openMeetingDetailsPane: () => void
  startDictation: () => void
  startSpeechTranscription: () => void
  isDictating: boolean
  isTranscribing: boolean
  setIsCopilotOpen: Dispatch<SetStateAction<boolean>>
  isReferencesPaneOpen: boolean
  setIsReferencesPaneOpen: Dispatch<SetStateAction<boolean>>
  isMarkmapPaneOpen: boolean
  openMarkmapPane: () => void
}

export function RibbonBar(props: RibbonBarProps) {
  const {
    activeTab,
    setActiveTab,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    recentNotebookEntries,
    loadNotebookFromPath,
    openNotebook,
    importOneNoteExport,
    isImportingOneNoteExport,
    saveNotebookAs,
    exportCurrentPage,
    saveNow,
    addPage,
    addSubpage,
    canPromotePage,
    canDemotePage,
    canDeletePage,
    promoteCurrentPage,
    demoteCurrentPage,
    deleteCurrentPage,
    promptCreateSection,
    addSectionGroup,
    createNotebook,
    insertChecklist,
    insertTable,
    insertExternalLink,
    insertInternalPageLink,
    openImagePicker,
    openPrintoutPicker,
    openAudioPane,
    openAttachmentPicker,
    applyPageTemplate,
    insertTemplate,
    isRecordingAudio,
    setDrawColor,
    clearInkStrokes,
    saveCurrentPageVersion,
    restoreSavedPageVersion,
    setIsHistoryPaneOpen,
    isHistoryPaneOpen,
    setQuery,
    addTagToCurrentPage,
    toggleCurrentTask,
    isCurrentSectionLocked,
    page,
    setCurrentTaskDueDate,
    toggleCurrentTaskComplete,
    setIsReviewPaneOpen,
    isReviewPaneOpen,
    setIsTaskPaneOpen,
    isTaskPaneOpen,
    pageSortMode,
    setPageSortMode,
    adjustEditorZoom,
    setEditorZoom,
    editorZoom,
    setPageWidthMode,
    pageWidthMode,
    setShowRuleLines,
    showRuleLines,
    setIsNotebookPaneVisible,
    isNotebookPaneVisible,
    setIsPagesPaneVisible,
    isPagesPaneVisible,
    editorRef,
    pasteFromClipboard,
    copySelection,
    runEditorCommand,
    fontMenuRef,
    fontMenuPanelRef,
    isFontMenuOpen,
    setIsFontMenuOpen,
    selectedFontFamily,
    applyFontFamily,
    fontSizeMenuRef,
    fontSizeMenuPanelRef,
    isFontSizeMenuOpen,
    setIsFontSizeMenuOpen,
    selectedFontSize,
    applyFontSize,
    applyStylePreset,
    emailCurrentPage,
    openMeetingDetailsPane,
    startDictation,
    startSpeechTranscription,
    isDictating,
    isTranscribing,
    setIsCopilotOpen,
    setIsReferencesPaneOpen,
    openMarkmapPane,
  } = props
  const canEditPage = Boolean(page) && !isCurrentSectionLocked
  const hasTask = Boolean(page?.task)
  const focusPage = () => {
    editorRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  const insertDateStamp = () => insertTemplate(`<p>${new Date().toLocaleDateString()}</p>`)
  const insertTimeStamp = () => insertTemplate(`<p>${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>`)
  const insertDateTimeStamp = () => insertTemplate(`<p>${new Date().toLocaleString()}</p>`)
  const insertDivider = () => insertTemplate('<hr />')

  const renderRibbonContent = () => {
    if (activeTab === 'File') {
      return (
        <section className="ribbon ribbon-file">
          <div className="ribbon-cluster styles file-actions">
            <button onClick={openNotebook} type="button">
              <FolderIcon size={26} />
              <span>Open Notebook</span>
            </button>
            <button disabled={isImportingOneNoteExport} onClick={() => void importOneNoteExport()} type="button">
              <NotebookStackIcon size={26} />
              <span>{isImportingOneNoteExport ? 'Importing OneNote...' : 'Import OneNote'}</span>
            </button>
            <button onClick={() => void saveNotebookAs()} type="button">
              <SaveIcon size={26} />
              <span>Save Notebook As</span>
            </button>
            <button onClick={() => void exportCurrentPage()} type="button">
              <ProjectIcon size={26} />
              <span>Export Page</span>
            </button>
            <button onClick={() => void saveNow()} type="button">
              <SaveIcon size={26} />
              <span>Save Notebook</span>
            </button>
            <button onClick={addPage} type="button">
              <EditIcon size={26} />
              <span>New Page</span>
            </button>
            <button onClick={addSubpage} type="button">
              <ListLinesIcon size={26} />
              <span>New Subpage</span>
            </button>
            <button onClick={() => promptCreateSection()} type="button">
              <SectionBookIcon size={26} />
              <span>New Section</span>
            </button>
            <button onClick={addSectionGroup} type="button">
              <FolderIcon size={26} />
              <span>New Section Group</span>
            </button>
            <button onClick={createNotebook} type="button">
              <NotebookStackIcon size={26} />
              <span>New Notebook</span>
            </button>
          </div>
          {recentNotebookEntries.length > 0 ? (
            <div className="ribbon-cluster styles file-recents">
              {recentNotebookEntries.slice(0, 4).map((entry) => (
                <button key={entry.path} onClick={() => void loadNotebookFromPath(entry.path)} type="button">
                  <FolderIcon size={26} />
                  <span>{entry.name}</span>
                </button>
              ))}
            </div>
          ) : null}
        </section>
      )
    }

    if (activeTab === 'Insert') {
      return (
        <section className="ribbon ribbon-insert">
          <div className="ribbon-cluster styles insert-pages">
            <button disabled={isCurrentSectionLocked} onClick={addPage} type="button">
              <EditIcon size={26} />
              <span>Blank Page</span>
            </button>
            <button disabled={!canEditPage} onClick={addSubpage} type="button">
              <ListLinesIcon size={26} />
              <span>Subpage</span>
            </button>
            <button onClick={() => promptCreateSection()} type="button">
              <SectionBookIcon size={26} />
              <span>Section</span>
            </button>
            <span className="ribbon-label">Pages</span>
          </div>
          <div className="ribbon-cluster styles insert-zotero">
            <button
              disabled={!page}
              onClick={() => setIsReferencesPaneOpen(true)}
              type="button"
            >
              <ProjectIcon size={26} />
              <span>Zotero Import</span>
            </button>
            <span className="ribbon-label">Zotero</span>
          </div>
          <div className="ribbon-cluster styles insert-content">
            <button disabled={!canEditPage} onClick={insertChecklist} type="button">
              <TagsIcon size={26} />
              <span>Checklist</span>
            </button>
            <button disabled={!canEditPage} onClick={insertTable} type="button">
              <TableIcon size={26} />
              <span>Table</span>
            </button>
            <button disabled={!canEditPage} onClick={insertExternalLink} type="button">
              <LinkIcon size={26} />
              <span>Link</span>
            </button>
            <button disabled={!canEditPage} onClick={insertInternalPageLink} type="button">
              <ProjectIcon size={26} />
              <span>Page Link</span>
            </button>
            <button
              disabled={!page}
              onClick={openMarkmapPane}
              type="button"
            >
              <ProjectIcon size={26} />
              <span>Mind Map</span>
            </button>
            <button disabled={!canEditPage} onClick={insertDateStamp} type="button">
              <FormatMotivationIcon size={26} />
              <span>Date</span>
            </button>
            <button disabled={!canEditPage} onClick={insertTimeStamp} type="button">
              <SaveIcon size={26} />
              <span>Time</span>
            </button>
            <button disabled={!canEditPage} onClick={insertDateTimeStamp} type="button">
              <ShowIcon size={26} />
              <span>Date &amp; Time</span>
            </button>
            <button disabled={!canEditPage} onClick={insertDivider} type="button">
              <ListLinesIcon size={26} />
              <span>Divider</span>
            </button>
            <span className="ribbon-label">Content</span>
          </div>
          <div className="ribbon-cluster styles insert-media">
            <button disabled={!canEditPage} onClick={openImagePicker} type="button">
              <ImageIcon size={26} />
              <span>Picture</span>
            </button>
            <button disabled={!canEditPage} onClick={openPrintoutPicker} type="button">
              <ShowIcon size={26} />
              <span>Printout</span>
            </button>
            <button disabled={!canEditPage} onClick={openAudioPane} type="button">
              <SaveIcon size={26} />
              <span>{isRecordingAudio ? 'Audio Controls' : 'Audio Note'}</span>
            </button>
            <button disabled={!canEditPage} onClick={openAttachmentPicker} type="button">
              <AttachmentIcon size={26} />
              <span>File</span>
            </button>
            <span className="ribbon-label">Media</span>
          </div>
          <div className="ribbon-cluster styles insert-meeting-tools">
            <button disabled={!canEditPage} onClick={addTagToCurrentPage} type="button">
              <TagsIcon size={26} />
              <span>To Do Tag</span>
            </button>
            <button disabled={!canEditPage} onClick={openMeetingDetailsPane} type="button">
              <TableIcon size={26} />
              <span>Meeting</span>
            </button>
            <button disabled={!page} onClick={() => setIsTaskPaneOpen(true)} type="button">
              <FormatMotivationIcon size={26} />
              <span>Outlook Tasks</span>
            </button>
            <button disabled={!page} onClick={emailCurrentPage} type="button">
              <ProjectIcon size={26} />
              <span>Email Page</span>
            </button>
            <button disabled={!canEditPage} onClick={applyPageTemplate} type="button">
              <InsertFormattingIcon size={26} />
              <span>Template</span>
            </button>
            <button disabled={!canEditPage} onClick={startDictation} type="button">
              <SaveIcon size={26} />
              <span>{isDictating ? 'Stop Dictate' : 'Dictate'}</span>
            </button>
            <button disabled={!canEditPage} onClick={startSpeechTranscription} type="button">
              <ShowIcon size={26} />
              <span>{isTranscribing ? 'Stop Transcribe' : 'Transcribe'}</span>
            </button>
            <button disabled={!page} onClick={() => setIsCopilotOpen(true)} type="button">
              <InsertFormattingIcon size={26} />
              <span>Copilot</span>
            </button>
            <span className="ribbon-label">Meeting Tools</span>
          </div>
        </section>
      )
    }

    if (activeTab === 'Draw') {
      return (
        <section className="ribbon">
          <div className="ribbon-cluster styles">
            <button disabled={!canEditPage} onClick={() => setDrawColor('#1a73d9')} type="button">
              <PenIcon size={26} />
              <span>Blue Ink</span>
            </button>
            <button disabled={!canEditPage} onClick={() => setDrawColor('#232a35')} type="button">
              <PenIcon size={26} />
              <span>Black Ink</span>
            </button>
            <button disabled={!canEditPage} onClick={() => setDrawColor('#b42318')} type="button">
              <PenIcon size={26} />
              <span>Red Ink</span>
            </button>
            <button disabled={!canEditPage} onClick={() => setDrawColor('#067647')} type="button">
              <PenIcon size={26} />
              <span>Green Ink</span>
            </button>
            <button disabled={!canEditPage} onClick={() => setDrawColor('#ffe266')} type="button">
              <BrushIcon size={26} />
              <span>Highlighter</span>
            </button>
            <button disabled={!canEditPage} onClick={clearInkStrokes} type="button">
              <CutIcon size={26} />
              <span>Clear Ink</span>
            </button>
            <span className="ribbon-label">Pens</span>
          </div>
          <div className="ribbon-cluster styles">
            <button disabled={!canEditPage} onClick={startDictation} type="button">
              <SaveIcon size={26} />
              <span>{isDictating ? 'Stop Dictate' : 'Dictate'}</span>
            </button>
            <button disabled={!canEditPage} onClick={startSpeechTranscription} type="button">
              <ShowIcon size={26} />
              <span>{isTranscribing ? 'Stop Transcribe' : 'Transcribe'}</span>
            </button>
            <button disabled={!canEditPage} onClick={openAudioPane} type="button">
              <SaveIcon size={26} />
              <span>{isRecordingAudio ? 'Audio Controls' : 'Audio Note'}</span>
            </button>
            <span className="ribbon-label">Capture</span>
          </div>
        </section>
      )
    }

    if (activeTab === 'History') {
      return (
        <section className="ribbon">
          <div className="ribbon-cluster styles">
            <button onClick={() => runEditorCommand('undo')} type="button">
              <UndoIcon size={26} />
              <span>Undo</span>
            </button>
            <button onClick={() => runEditorCommand('redo')} type="button">
              <ChevronDownIcon size={26} />
              <span>Redo</span>
            </button>
            <button disabled={!canGoBack} onClick={goBack} type="button">
              <UndoIcon size={26} />
              <span>Back</span>
            </button>
            <button disabled={!canGoForward} onClick={goForward} type="button">
              <ChevronDownIcon size={26} />
              <span>Forward</span>
            </button>
            <span className="ribbon-label">Navigation</span>
          </div>
          <div className="ribbon-cluster styles">
            <button disabled={!page} onClick={() => saveCurrentPageVersion()} type="button">
              <SaveIcon size={26} />
              <span>Save Version</span>
            </button>
            <button disabled={!page} onClick={restoreSavedPageVersion} type="button">
              <ShowIcon size={26} />
              <span>Restore Version</span>
            </button>
            <button onClick={() => setIsHistoryPaneOpen((current) => !current)} type="button">
              <ListLinesIcon size={26} />
              <span>{isHistoryPaneOpen ? 'Hide History' : 'History Pane'}</span>
            </button>
            <span className="ribbon-label">Versions</span>
          </div>
          <div className="ribbon-cluster styles">
            <button onClick={() => setQuery('')} type="button">
              <SearchIcon size={26} />
              <span>Clear Search</span>
            </button>
            <button onClick={() => void saveNow()} type="button">
              <SaveIcon size={26} />
              <span>Save Now</span>
            </button>
            <span className="ribbon-label">Session</span>
          </div>
        </section>
      )
    }

    if (activeTab === 'Review') {
      return (
        <section className="ribbon">
          <div className="ribbon-cluster styles">
            <button disabled={!canEditPage} onClick={addTagToCurrentPage} type="button">
              <TagsIcon size={26} />
              <span>Tag</span>
            </button>
            <button disabled={!canEditPage} onClick={toggleCurrentTask} type="button">
              <BulletsIcon size={26} />
              <span>{page?.task ? 'Remove To Do' : 'To Do'}</span>
            </button>
            <button disabled={!canEditPage || !hasTask} onClick={setCurrentTaskDueDate} type="button">
              <ProjectIcon size={26} />
              <span>Set Due Date</span>
            </button>
            <button disabled={!canEditPage || !hasTask} onClick={toggleCurrentTaskComplete} type="button">
              <ShowIcon size={26} />
              <span>{page?.task?.status === 'done' ? 'Mark Incomplete' : 'Mark Complete'}</span>
            </button>
            <span className="ribbon-label">Tasks</span>
          </div>
          <div className="ribbon-cluster styles">
            <button onClick={() => setIsReviewPaneOpen((current) => !current)} type="button">
              <SearchIcon size={26} />
              <span>{isReviewPaneOpen ? 'Hide Find' : 'Find & Replace'}</span>
            </button>
            <button onClick={() => setIsTaskPaneOpen((current) => !current)} type="button">
              <FormatMotivationIcon size={26} />
              <span>{isTaskPaneOpen ? 'Hide Task List' : 'Task List'}</span>
            </button>
            <button disabled={!page} onClick={() => setQuery(page?.title ?? '')} type="button">
              <SearchIcon size={26} />
              <span>Find This Page</span>
            </button>
            <button disabled={!page} onClick={emailCurrentPage} type="button">
              <ProjectIcon size={26} />
              <span>Email Page</span>
            </button>
            <span className="ribbon-label">Review</span>
          </div>
        </section>
      )
    }

    if (activeTab === 'View') {
      return (
        <section className="ribbon">
          <div className="ribbon-cluster styles">
            <button onClick={() => adjustEditorZoom(0.1)} type="button">
              <TextSizeUpIcon size={26} />
              <span>Zoom In</span>
            </button>
            <button onClick={() => adjustEditorZoom(-0.1)} type="button">
              <TextSizeDownIcon size={26} />
              <span>Zoom Out</span>
            </button>
            <button onClick={() => setEditorZoom(1)} type="button">
              <ShowIcon size={26} />
              <span>{Math.round(editorZoom * 100)}%</span>
            </button>
            <span className="ribbon-label">Zoom</span>
          </div>
          <div className="ribbon-cluster styles">
            <button onClick={() => setPageWidthMode((current) => (current === 'normal' ? 'wide' : 'normal'))} type="button">
              <TableIcon size={26} />
              <span>{pageWidthMode === 'normal' ? 'Wide Page' : 'Normal Page'}</span>
            </button>
            <button onClick={() => setShowRuleLines((current) => !current)} type="button">
              <BulletsIcon size={26} />
              <span>{showRuleLines ? 'Hide Rule Lines' : 'Rule Lines'}</span>
            </button>
            <button onClick={() => setIsNotebookPaneVisible((current) => !current)} type="button">
              <NotebookStackIcon size={26} />
              <span>{isNotebookPaneVisible ? 'Hide Notebooks' : 'Show Notebooks'}</span>
            </button>
            <button onClick={() => setIsPagesPaneVisible((current) => !current)} type="button">
              <ListLinesIcon size={26} />
              <span>{isPagesPaneVisible ? 'Hide Pages' : 'Show Pages'}</span>
            </button>
            <span className="ribbon-label">Layout</span>
          </div>
          <div className="ribbon-cluster styles">
            <button onClick={() => setPageSortMode('manual')} type="button">
              <SortIcon size={26} />
              <span>{pageSortMode === 'manual' ? 'Manual Sort' : 'Set Manual'}</span>
            </button>
            <button onClick={() => setPageSortMode('updated-desc')} type="button">
              <SortIcon size={26} />
              <span>{pageSortMode === 'updated-desc' ? 'Newest First' : 'Sort Newest'}</span>
            </button>
            <button onClick={() => setPageSortMode('title-asc')} type="button">
              <SortIcon size={26} />
              <span>{pageSortMode === 'title-asc' ? 'A-Z Pages' : 'Sort A-Z'}</span>
            </button>
            <span className="ribbon-label">Sort</span>
          </div>
          <div className="ribbon-cluster styles">
            <button onClick={focusPage} type="button">
              <ShowIcon size={26} />
              <span>Focus Page</span>
            </button>
            <button onClick={() => void saveNow()} type="button">
              <SaveIcon size={26} />
              <span>Refresh Save</span>
            </button>
            <button onClick={() => setQuery('')} type="button">
              <SearchIcon size={26} />
              <span>Clear Search</span>
            </button>
            <span className="ribbon-label">Workspace</span>
          </div>
        </section>
      )
    }

    return (
      <section className="ribbon ribbon-home">
        <div className="ribbon-cluster clipboard">
          <div className="ribbon-big">
            <button onClick={() => void pasteFromClipboard()} type="button">
              <PasteIcon className="ribbon-large-icon" size={30} />
              <span>Paste</span>
              <ChevronDownIcon size={12} />
            </button>
          </div>
          <div className="ribbon-stack">
            <button onClick={() => document.execCommand('cut')} type="button">
              <CutIcon size={16} />
              <span>Cut</span>
            </button>
            <button onClick={() => void copySelection()} type="button">
              <CopyIcon size={16} />
              <span>Copy</span>
            </button>
            <button onClick={() => runEditorCommand('removeFormat')} type="button">
              <BrushIcon size={16} />
              <span>Format Painter</span>
            </button>
          </div>
          <span className="ribbon-label">Clipboard</span>
        </div>

        <div className="ribbon-cluster font home-basic-text">
          <div className="ribbon-row-compact">
            <div className="picker-dropdown" ref={fontMenuRef}>
              <button className="picker" onClick={() => setIsFontMenuOpen((current) => !current)} type="button">
                <span>{selectedFontFamily}</span>
                <ChevronDownIcon size={12} />
              </button>
              {isFontMenuOpen ? (
                <div className="picker-menu picker-menu-floating" ref={fontMenuPanelRef}>
                  {fontFamilies.map((fontFamily) => (
                    <button key={fontFamily} onClick={() => applyFontFamily(fontFamily)} type="button">
                      {fontFamily}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="picker-dropdown" ref={fontSizeMenuRef}>
              <button
                className="picker tiny"
                onClick={() => setIsFontSizeMenuOpen((current) => !current)}
                type="button"
              >
                <span>{selectedFontSize}</span>
                <ChevronDownIcon size={12} />
              </button>
              {isFontSizeMenuOpen ? (
                <div className="picker-menu picker-menu-floating tiny" ref={fontSizeMenuPanelRef}>
                  {fontSizes.map((fontSize) => (
                    <button
                      key={fontSize.command}
                      onClick={() => applyFontSize(fontSize.command, fontSize.label)}
                      type="button"
                    >
                      {fontSize.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button onClick={() => runEditorCommand('fontSize', '4')} type="button">
              <TextSizeUpIcon size={16} />
            </button>
            <button onClick={() => runEditorCommand('fontSize', '2')} type="button">
              <TextSizeDownIcon size={16} />
            </button>
            <button onClick={() => runEditorCommand('foreColor', '#7e42b3')} type="button">
              <PenIcon size={16} />
            </button>
            <button onClick={insertExternalLink} type="button">
              <LinkIcon size={16} />
            </button>
          </div>
          <div className="ribbon-row-compact">
            <button className="strong" onClick={() => runEditorCommand('bold')} type="button">
              <BoldIcon size={16} />
            </button>
            <button className="strong" onClick={() => runEditorCommand('italic')} type="button">
              <ItalicIcon size={16} />
            </button>
            <button className="strong" onClick={() => runEditorCommand('underline')} type="button">
              <UnderlineIcon size={16} />
            </button>
            <button onClick={() => runEditorCommand('strikeThrough')} type="button">
              <UnderlineIcon size={16} />
            </button>
            <button onClick={() => runEditorCommand('superscript')} type="button">
              <TextSizeUpIcon size={16} />
            </button>
            <button onClick={() => runEditorCommand('subscript')} type="button">
              <TextSizeDownIcon size={16} />
            </button>
            <button onClick={() => runEditorCommand('hiliteColor', '#fff59d')} type="button">
              <PenIcon size={16} />
            </button>
            <button onClick={() => runEditorCommand('foreColor', '#d83b01')} type="button">
              <BrushIcon size={16} />
            </button>
          </div>
          <span className="ribbon-label">Font</span>
        </div>

        <div className="ribbon-cluster paragraph home-basic-text">
          <div className="ribbon-row-compact">
            <button onClick={() => runEditorCommand('insertUnorderedList')} type="button">
              <BulletsIcon size={16} />
            </button>
            <button onClick={() => runEditorCommand('outdent')} type="button">
              <IndentIcon size={16} />
            </button>
            <button onClick={() => runEditorCommand('justifyLeft')} type="button">
              <AlignLeftIcon size={16} />
            </button>
            <button onClick={() => runEditorCommand('insertOrderedList')} type="button">
              <SortIcon size={16} />
            </button>
            <button onClick={() => runEditorCommand('selectAll')} type="button">
              <ShowIcon size={16} />
            </button>
            <button onClick={insertTable} type="button">
              <TableIcon size={16} />
            </button>
          </div>
          <div className="ribbon-row-compact">
            <button onClick={() => runEditorCommand('justifyLeft')} type="button">
              <AlignLeftIcon size={16} />
            </button>
            <button onClick={() => runEditorCommand('insertParagraph')} type="button">
              <ListLinesIcon size={16} />
            </button>
            <button onClick={() => runEditorCommand('justifyCenter')} type="button">
              <AlignLeftIcon size={16} />
            </button>
            <button onClick={() => runEditorCommand('justifyRight')} type="button">
              <AlignLeftIcon size={16} />
            </button>
            <button onClick={() => runEditorCommand('indent')} type="button">
              <IndentIcon size={16} />
            </button>
            <button onClick={() => runEditorCommand('removeFormat')} type="button">
              <ShowIcon size={16} />
            </button>
            <button onClick={openImagePicker} type="button">
              <ImageIcon size={16} />
            </button>
          </div>
          <span className="ribbon-label">Paragraph</span>
        </div>

        <div className="ribbon-cluster home-styles">
          <div className="home-style-grid">
            {stylePresets.map((preset) => (
              <button
                key={preset.id}
                className={`home-style-card compact ${preset.id}`}
                onClick={() => applyStylePreset(preset.html)}
                type="button"
              >
                <strong>{preset.label}</strong>
              </button>
            ))}
          </div>
          <span className="ribbon-label">Styles</span>
        </div>

        <div className="ribbon-cluster home-tags">
          <button className="home-tag-card" onClick={toggleCurrentTask} type="button">
            <span className="home-tag-dot">v</span>
            <span>{page?.task ? 'To Do (Ctrl+1)' : 'To Do (Ctrl+1)'}</span>
          </button>
          <button
            className="home-tag-card"
            onClick={() => insertTemplate('<p><span style="color:#d68200;">Important</span></p>')}
            type="button"
          >
            <span className="home-tag-star">*</span>
            <span>Important (Ctrl+2)</span>
          </button>
          <span className="ribbon-label">Tags</span>
        </div>

        <div className="ribbon-cluster home-quick-actions">
          <button className="home-vertical-action" onClick={addPage} type="button">
            <EditIcon size={22} />
            <span>New Page</span>
          </button>
          <button className="home-vertical-action" onClick={addSubpage} type="button">
            <ListLinesIcon size={22} />
            <span>Subpage</span>
          </button>
          <button className="home-vertical-action" disabled={!canPromotePage} onClick={promoteCurrentPage} type="button">
            <TextSizeUpIcon size={22} />
            <span>Promote</span>
          </button>
          <button className="home-vertical-action" disabled={!canDemotePage} onClick={demoteCurrentPage} type="button">
            <TextSizeDownIcon size={22} />
            <span>Demote</span>
          </button>
          <button className="home-vertical-action" disabled={!canDeletePage} onClick={deleteCurrentPage} type="button">
            <CutIcon size={22} />
            <span>Delete Page</span>
          </button>
        </div>

      </section>
    )
  }

  return (
    <>
      <nav className="tab-row">
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
      {renderRibbonContent()}
    </>
  )
}
