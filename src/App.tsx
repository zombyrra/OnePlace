import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AppShell } from './components/app/AppShell'
import { FolderIcon, PersonIcon, SectionBookIcon } from './components/Icons'
import type { SidePanesProps } from './components/app/SidePanes'
import './App.css'
import {
  pageTemplates,
  pageSortModeLabels,
  searchScopeLabels,
  searchFilterLabels,
  reviewScopeLabels,
  taskStatusLabels,
  formatDate,
  formatPageDate,
  formatPageTime,
  formatDueDate,
  extractSnippetText,
  buildSnippet,
  formatElapsedTime,
  flattenPages,
  hasChildPageSelected,
  findPageLocation,
  createStarterState,
  getSelection,
} from './app/appModel'
import { useAppPersistence } from './features/app/useAppPersistence'
import { useClipboardActions } from './features/app/useClipboardActions'
import { useContextMenu } from './features/app/useContextMenu'
import { useEditorActions } from './features/app/useEditorActions'
import { useEditorChrome } from './features/app/useEditorChrome'
import { useDragState } from './features/app/useDragState'
import { useFileActions } from './features/app/useFileActions'
import { useGlobalShortcuts } from './features/app/useGlobalShortcuts'
import { useMediaAndDrawing } from './features/app/useMediaAndDrawing'
import { useNavigationActions } from './features/app/useNavigationActions'
import { useNavigationHistory } from './features/app/useNavigationHistory'
import { useNotebookPageActions } from './features/app/useNotebookPageActions'
import { useOneNoteExportImport } from './features/app/useOneNoteExportImport'
import { usePageAssistActions } from './features/app/usePageAssistActions'
import { useReviewHistory } from './features/app/useReviewHistory'
import { useSectionTaskActions } from './features/app/useSectionTaskActions'
import { useWorkspaceTreeActions } from './features/app/useWorkspaceTreeActions'
import { renderHighlightedText, useWorkspaceSearch } from './features/app/useWorkspaceSearch'
import { useReferenceManager } from './features/app/useReferenceManager'
import {
  buildMarkmapCardMarkup,
  buildMarkmapMarkdownFromText,
  createMarkmapTreeFromMarkdown,
  serializeMarkmapTreeToMarkdown,
} from './features/app/markmapFeature'
import { useMarkmapRenderer } from './features/app/useMarkmapRenderer'
import type {
  Page,
  InkStroke,
  Notebook,
  SearchScope,
  SearchFilter,
  ReviewScope,
  AppState,
  TaskStatusFilter,
  CopilotMessage,
  PageWidthMode,
  RecentNotebookEntry,
  AudioInputDevice,
  RibbonTab,
} from './app/appModel'

function App() {
  const [appState, setAppState] = useState<AppState>(createStarterState)
  const [appInfo, setAppInfo] = useState<DesktopAppInfo | null>(null)
  const [activeTab, setActiveTab] = useState<RibbonTab>('Home')
  const [drawColor, setDrawColor] = useState('#1a73d9')
  const [isLoaded, setIsLoaded] = useState(false)
  const [query, setQuery] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const [isAudioPaneOpen, setIsAudioPaneOpen] = useState(false)
  const [isAudioPaused, setIsAudioPaused] = useState(false)
  const [audioDevices, setAudioDevices] = useState<AudioInputDevice[]>([])
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState('default')
  const [audioRecordingSeconds, setAudioRecordingSeconds] = useState(0)
  const [isDictating, setIsDictating] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [unlockedSectionIds, setUnlockedSectionIds] = useState<string[]>([])
  const [saveLabel, setSaveLabel] = useState('Loading notes...')
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false)
  const [, setIsStyleMenuOpen] = useState(false)
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false)
  const [isFontSizeMenuOpen, setIsFontSizeMenuOpen] = useState(false)
  const [isCopilotOpen, setIsCopilotOpen] = useState(false)
  const [isTaskPaneOpen, setIsTaskPaneOpen] = useState(false)
  const [isTagPaneOpen, setIsTagPaneOpen] = useState(false)
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('all')
  const [taskPaneScope, setTaskPaneScope] = useState<SearchScope>('all')
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatusFilter>('open')
  const [tagPaneScope, setTagPaneScope] = useState<SearchScope>('all')
  const [selectedTagFilter, setSelectedTagFilter] = useState('')
  const [customTagDraft, setCustomTagDraft] = useState('')
  const [copilotDraft, setCopilotDraft] = useState('')
  const [copilotMessages, setCopilotMessages] = useState<CopilotMessage[]>([])
  const [isReviewPaneOpen, setIsReviewPaneOpen] = useState(false)
  const [reviewFind, setReviewFind] = useState('')
  const [reviewReplace, setReviewReplace] = useState('')
  const [reviewScope, setReviewScope] = useState<ReviewScope>('page')
  const [isHistoryPaneOpen, setIsHistoryPaneOpen] = useState(false)
  const [isMeetingDetailsOpen, setIsMeetingDetailsOpen] = useState(false)
  const [isTemplatePaneOpen, setIsTemplatePaneOpen] = useState(false)
  const [isMarkmapPaneOpen, setIsMarkmapPaneOpen] = useState(false)
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false)
  const [isMoveCopyPageOpen, setIsMoveCopyPageOpen] = useState(false)
  const [markmapTree, setMarkmapTree] = useState(() => createMarkmapTreeFromMarkdown('', 'Mind Map'))
  const [selectedHistoryVersionId, setSelectedHistoryVersionId] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState(pageTemplates[0]?.id ?? '')
  const [meetingTitleDraft, setMeetingTitleDraft] = useState('')
  const [meetingDateDraft, setMeetingDateDraft] = useState(new Date().toISOString().slice(0, 10))
  const [meetingTimeDraft, setMeetingTimeDraft] = useState(new Date().toTimeString().slice(0, 5))
  const [meetingLocationDraft, setMeetingLocationDraft] = useState('')
  const [meetingAttendeesDraft, setMeetingAttendeesDraft] = useState('')
  const [meetingAgendaDraft, setMeetingAgendaDraft] = useState('')
  const [editorZoom, setEditorZoom] = useState(1)
  const [showRuleLines, setShowRuleLines] = useState(false)
  const [pageWidthMode, setPageWidthMode] = useState<PageWidthMode>('normal')
  const [isNotebookPaneVisible, setIsNotebookPaneVisible] = useState(true)
  const [isPagesPaneVisible, setIsPagesPaneVisible] = useState(true)
  const [pagesPaneWidth, setPagesPaneWidth] = useState(300)
  const [selectedFontFamily, setSelectedFontFamily] = useState('Calibri')
  const [selectedFontSize, setSelectedFontSize] = useState('11')
  const [recentNotebookEntries, setRecentNotebookEntries] = useState<RecentNotebookEntry[]>([])
  const editorRef = useRef<HTMLDivElement | null>(null)
  const titleInputRef = useRef<HTMLInputElement | null>(null)
  const noteCanvasScrollRef = useRef<HTMLDivElement | null>(null)
  const lastHydratedPageIdRef = useRef<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const attachmentInputRef = useRef<HTMLInputElement | null>(null)
  const printoutInputRef = useRef<HTMLInputElement | null>(null)
  const isCheckingForUpdatesRef = useRef(false)
  const titlebarSearchRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const drawSurfaceRef = useRef<SVGSVGElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const dictationRecognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const speechTranscriptRef = useRef('')
  const recordingChunksRef = useRef<Blob[]>([])
  const audioTimerRef = useRef<number | null>(null)
  const inkDrawingRef = useRef<InkStroke | null>(null)
  const styleMenuRef = useRef<HTMLDivElement | null>(null)
  const fontMenuRef = useRef<HTMLDivElement | null>(null)
  const fontSizeMenuRef = useRef<HTMLDivElement | null>(null)
  const searchResultsPanelRef = useRef<HTMLDivElement | null>(null)
  const styleMenuPanelRef = useRef<HTMLDivElement | null>(null)
  const fontMenuPanelRef = useRef<HTMLDivElement | null>(null)
  const fontSizeMenuPanelRef = useRef<HTMLDivElement | null>(null)
  const saveTimer = useRef<number | null>(null)
  const selectionRangeRef = useRef<Range | null>(null)
  const caretScrollFrameRef = useRef<number | null>(null)
  const suppressAutoFollowUntilRef = useRef(0)
  const lastSavedPayloadRef = useRef('')
  const { contextMenu, openContextMenu, setContextMenu } = useContextMenu()
  const {
    allowDrop,
    beginDrag,
    clearDragState,
    consumeSuppressedClick,
    dragPosition,
    dragState,
    dropTarget,
    setDropTarget,
  } = useDragState()
  const {
    canGoBack,
    canGoForward,
    navigateToEntry,
    navigationHistory,
    navigationIndex,
    setNavigationIndex,
    trackedRecentPageRef,
  } = useNavigationHistory({
    appState,
    isLoaded,
    setAppState,
  })

  const { notebook, page, section, sectionGroup } = useMemo(() => getSelection(appState), [appState])
  const pageSortMode = appState.meta.pageSortMode
  const searchScope = appState.meta.searchScope
  const isCurrentSectionLocked = Boolean(section?.passwordHash && !unlockedSectionIds.includes(section.id))
  const markmapMarkdown = useMemo(() => serializeMarkmapTreeToMarkdown(markmapTree), [markmapTree])
  const moveCopyPageDestinations = useMemo(
    () =>
      appState.notebooks.flatMap((entry) =>
        entry.sectionGroups.flatMap((group) =>
          group.sections.map((part) => ({
            groupId: group.id,
            id: `${entry.id}:${group.id}:${part.id}`,
            label: `${entry.name} / ${group.name} / ${part.name}`,
            notebookId: entry.id,
            sectionId: part.id,
          })),
        ),
      ),
    [appState.notebooks],
  )

  const { runUpdateCheck } = useAppPersistence({
    appState,
    isLoaded,
    setAppInfo,
    setAppState,
    setIsCheckingForUpdates,
    setIsDirty,
    setIsLoaded,
    setRecentNotebookEntries,
    setSaveLabel,
    isCheckingForUpdatesRef,
    lastSavedPayloadRef,
    saveTimerRef: saveTimer,
    trackedRecentPageRef,
  })
  const { importOneNoteExport, isImportingOneNoteExport } = useOneNoteExportImport({
    setActiveTab: () => setActiveTab('Home'),
    setAppState,
    setSaveLabel,
  })

  useEffect(() => {
    const pageTitle = page?.title?.trim() || 'Untitled Page'
    const notebookTitle = notebook?.name?.trim() || 'Notebook'
    const nextTitle = `${isDirty ? '* ' : ''}${pageTitle} - ${notebookTitle} - OnePlace`
    document.title = nextTitle
  }, [isDirty, notebook?.name, page?.title])

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', warnBeforeUnload)
    }
  }, [isDirty])

  const {
    canDeleteNotebook,
    canDeletePage,
    canDemotePage,
    canPromotePage,
    goBack,
    goForward,
    loadNotebookFromPath,
    openLinkedPage,
    openNotebook,
    openSearchResult,
    openTagResult,
    openTaskResult,
    selectFirstPage,
    selectLastPage,
    selectNotebook,
    selectNextPage,
    selectNextSection,
    selectPage,
    selectPreviousPage,
    selectPreviousSection,
    selectSection,
    setPageSortMode,
  } = useNavigationActions({
    appState,
    navigationHistory,
    navigationIndex,
    navigateToEntry,
    notebook,
    page,
    recentNotebookEntries,
    section,
    setActiveTab,
    setAppState,
    setNavigationIndex,
    setRecentNotebookEntries,
    setSaveLabel,
  })
  const {
    moveNotebook,
    movePage,
    moveSection,
    moveSectionGroup,
    moveSectionToGroup,
    setNotebookDropTarget,
    setPageDropTarget,
    setSectionDropTarget,
    setSectionGroupDropTarget,
    setSectionGroupInsideDropTarget,
    togglePageCollapse,
    toggleSectionGroupCollapse,
    updatePage,
  } = useWorkspaceTreeActions({
    clearDragState,
    dragState,
    notebook,
    page,
    section,
    setAppState,
    setDropTarget,
  })

  const { keepCaretInView, syncEditorContent } = useEditorChrome({
    appState,
    page,
    editorRef,
    noteCanvasScrollRef,
    titlebarSearchRef,
    searchResultsPanelRef,
    styleMenuRef,
    styleMenuPanelRef,
    fontMenuRef,
    fontMenuPanelRef,
    fontSizeMenuRef,
    fontSizeMenuPanelRef,
    caretScrollFrameRef,
    lastHydratedPageIdRef,
    selectionRangeRef,
    suppressAutoFollowUntilRef,
    setIsFontMenuOpen,
    setIsFontSizeMenuOpen,
    setIsStyleMenuOpen,
    setQuery,
    updatePage,
  })

  useMarkmapRenderer(editorRef, page?.id, page?.content)

  const { recentPages, searchResults, setSearchScope, tagCatalog, tagResults, taskResults, taskSummary, toggleSearchScope, visiblePages } =
    useWorkspaceSearch({
      appState,
      isCurrentSectionLocked,
      notebook,
      pageSortMode,
      query,
      searchFilter,
      searchScope,
      section,
      sectionGroup,
      selectedTagFilter,
      setAppState,
      tagPaneScope,
      taskPaneScope,
      taskStatusFilter,
    })

  const {
    applyFontFamily,
    applyFontSize,
    applyPageTemplate,
    applyStylePreset,
    copySelectionFormatting,
    handleEditorInput,
    handleEditorKeyDown,
    insertChecklist,
    insertExternalLink,
    insertHtmlAtSelection,
    insertInternalPageLink,
    insertMeetingDetails,
    insertSelectedTemplate,
    insertTable,
    insertTemplate,
    insertTextAsHtml,
    openMeetingDetailsPane,
    pasteSelectionFormatting,
    runEditorCommand,
  } = useEditorActions({
    editorRef,
    fontMenuClose: () => setIsFontMenuOpen(false),
    fontSizeMenuClose: () => setIsFontSizeMenuOpen(false),
    keepCaretInView,
    page,
    pageTemplates,
    searchPages: (query) =>
      appState.notebooks.flatMap((entry) =>
        entry.sectionGroups.flatMap((group) =>
          group.sections.flatMap((part) =>
            flattenPages(part.pages, 0, true)
              .filter(({ page: linkedPage }) => linkedPage.title.toLowerCase().includes(query.toLowerCase()))
              .map(({ page: linkedPage }) => ({
                notebookName: entry.name,
                page: linkedPage,
                sectionName: part.name,
              })),
          ),
        ),
      ),
    selectedFontFamilySetter: setSelectedFontFamily,
    selectedFontSizeSetter: setSelectedFontSize,
    selectedTemplateId,
    selectionRangeRef,
    setIsMeetingDetailsOpen,
    setIsTemplatePaneOpen,
    setMeetingAgendaDraft,
    setMeetingAttendeesDraft,
    setMeetingDateDraft,
    setMeetingLocationDraft,
    setMeetingTimeDraft,
    setMeetingTitleDraft,
    setSaveLabel,
    setSelectedTemplateId,
    styleMenuClose: () => setIsStyleMenuOpen(false),
    syncEditorContent,
  })

  const {
    canInsertReference,
    editReference,
    editingReferenceId,
    filteredReferences,
    importReferenceText,
    insertReferenceBibliography,
    insertReferenceCitation,
    insertReferenceEntry,
    isReferencesPaneOpen,
    manualReferenceDraft,
    referenceImportDraft,
    referenceImportSummary,
    referenceQuery,
    referenceStyle,
    references,
    removeReference,
    resetManualReferenceDraft,
    saveManualReference,
    setIsReferencesPaneOpen,
    setReferenceImportDraft,
    setManualReferenceField,
    setReferenceQuery,
    setReferenceStyle,
  } = useReferenceManager({
    appState,
    insertHtmlAtSelection,
    isCurrentSectionLocked,
    page,
    setAppState,
    setSaveLabel,
  })

  const getCurrentMarkmapSource = () => {
    const selectedText =
      selectionRangeRef.current && editorRef.current?.contains(selectionRangeRef.current.commonAncestorContainer)
        ? selectionRangeRef.current.toString()
        : ''
    return selectedText.trim() || editorRef.current?.innerText || page?.title || ''
  }

  const buildCurrentMarkmapMarkdown = () =>
    buildMarkmapMarkdownFromText(page?.title ?? 'Mind Map', getCurrentMarkmapSource())

  const canInsertMarkmap = Boolean(page) && !isCurrentSectionLocked

  const seedMarkmapFromPage = () => {
    setMarkmapTree(createMarkmapTreeFromMarkdown(buildCurrentMarkmapMarkdown(), page?.title ?? 'Mind Map'))
  }

  const openMarkmapPane = () => {
    if (!isMarkmapPaneOpen) {
      seedMarkmapFromPage()
    }
    setIsMarkmapPaneOpen(true)
  }

  const insertMarkmapBlock = () => {
    if (!canInsertMarkmap) return
    insertHtmlAtSelection(buildMarkmapCardMarkup(markmapMarkdown))
    setIsMarkmapPaneOpen(true)
    setSaveLabel('Inserted mind map')
  }

  const {
    addAssetsToState,
    copySelection,
    emailCurrentPage,
    exportCurrentPage,
    insertTranscriptIntoPage,
    openAttachmentPicker,
    openImagePicker,
    openPrintoutPicker,
    readFileAsDataUrl,
    saveNotebookAs,
    saveNow,
  } = useFileActions({
    appState,
    attachmentInputRef,
    editorRef,
    imageInputRef,
    lastSavedPayloadRef,
    notebook,
    page,
    printoutInputRef,
    recentNotebookEntries,
    section,
    setAppState,
    setIsDirty,
    setRecentNotebookEntries,
    setSaveLabel,
    updatePage,
  })

  const {
    beginInkStroke,
    clearInkStrokes,
    handleAttachmentSelection,
    handleEditorAssetClick,
    handleEditorDragEnd,
    handleEditorDragOver,
    handleEditorDragStart,
    handleEditorPointerDown,
    handleEditorPaste,
    handleImageSelection,
    handlePrintoutSelection,
    handleEditorDrop,
    moveInkStroke,
    openAudioPane,
    startAudioRecording,
    startDictation,
    startSpeechTranscription,
    stopAudioRecording,
    toggleAudioPause,
    endInkStroke,
  } = useMediaAndDrawing({
    activeTab,
    appState,
    attachmentInputRef,
    audioDevices,
    audioRecordingSeconds,
    audioTimerRef,
    drawColor,
    editorRef,
    imageInputRef,
    inkDrawingRef,
    insertHtmlAtSelection,
    insertTextAsHtml,
    insertTranscriptIntoPage,
    isAudioPaneOpen,
    isCurrentSectionLocked,
    isDictating,
    isRecordingAudio,
    isTranscribing,
    keepCaretInView,
    mediaRecorderRef,
    mediaStreamRef,
    page,
    printoutInputRef,
    readFileAsDataUrl,
    selectedAudioDeviceId,
    setAudioDevices,
    setAudioRecordingSeconds,
    setIsAudioPaneOpen,
    setIsAudioPaused,
    setIsDictating,
    setIsRecordingAudio,
    setIsTranscribing,
    setSaveLabel,
    setSelectedAudioDeviceId,
    speechRecognitionRef,
    speechTranscriptRef,
    recordingChunksRef,
    dictationRecognitionRef,
    syncEditorContent,
    updatePage,
    addAssetsToState,
  })

  const { adjustEditorZoom, handleEditorClick, runCopilotPrompt, submitCopilotDraft } = usePageAssistActions({
    appAssets: appState.meta.assets,
    copilotDraft,
    handleEditorAssetClick,
    insertHtmlAtSelection,
    keepCaretInView,
    openLinkedPage,
    page,
    setCopilotDraft,
    setCopilotMessages,
    setEditorZoom,
    setSaveLabel,
    syncEditorContent,
  })
  const { pasteFromClipboard } = useClipboardActions({
    handleImageSelection,
    insertHtmlAtSelection,
    insertTextAsHtml,
    setSaveLabel,
  })

  const { currentPageVersions, historyPreviewText, replaceInReviewScope, reviewMatchCount, selectedHistoryVersion, selectedTemplate } =
    useReviewHistory({
      appState,
      editorRef,
      notebook,
      page,
      reviewFind,
      reviewReplace,
      reviewScope,
      reviewScopeLabels,
      section,
      sectionGroup,
      selectedHistoryVersionId,
      selectedTemplateId,
      pageTemplates,
      setAppState,
      setSaveLabel,
      setSelectedHistoryVersionId,
    })

  const {
    addCustomTagToCurrentPage: applyCustomTagDraft,
    addSelectedTagToCurrentPage,
    addTagToCurrentPage,
    clearCurrentPageTask,
    clearCurrentPageTags,
    clearTaskForPage,
    protectSection,
    markCurrentPageUnread,
    removeSectionProtection,
    renamePage,
    renamePageTo,
    restoreSavedPageVersion,
    restoreSelectedHistoryVersion,
    saveCurrentPageVersion,
    setCurrentTaskDueDate,
    setCurrentTaskDuePreset,
    setTaskDueDateForPage,
    toggleCurrentTask,
    toggleCurrentTaskComplete,
    toggleNamedTagOnCurrentPage,
    toggleTagOnPage,
    toggleTaskForPage,
    unlockSection,
  } = useSectionTaskActions({
    appState,
    currentPageVersions,
    page,
    section,
    selectedHistoryVersion,
    selectedTagFilter,
    setAppState,
    setCustomTagDraft,
    setIsHistoryPaneOpen,
    setIsTagPaneOpen,
    setSaveLabel,
    setSelectedHistoryVersionId,
    setSelectedTagFilter,
    setUnlockedSectionIds,
    updatePage,
  })

  const addCustomTagToCurrentPage = () => {
    applyCustomTagDraft(customTagDraft)
  }

  const {
    addPage,
    addPageBelowCurrent,
    addPageWithTitle,
    addSectionGroup,
    addSectionGroupWithName,
    addSubpage,
    addSubpageWithTitle,
    createSectionInGroup,
    createNotebook,
    deleteCurrentPage,
    deleteNotebook,
    deleteSection,
    deleteSectionGroup,
    demoteCurrentPage,
    moveOrCopyCurrentPage,
    moveCurrentPageDown,
    moveCurrentPageUp,
    promptCreateSection,
    promoteCurrentPage,
    renameNotebookTo,
    renameSection,
    renameSectionTo,
    renameSectionGroup,
    renameSectionGroupTo,
  } = useNotebookPageActions({
    appState,
    canDemotePage,
    canPromotePage,
    notebook,
    page,
    section,
    sectionGroup,
    setAppState,
  })

  void protectSection
  void removeSectionProtection
  void setSectionGroupDropTarget
  void setSectionDropTarget
  void setSectionGroupInsideDropTarget
  void moveSectionGroup
  void moveSection
  void moveSectionToGroup
  void toggleSectionGroupCollapse
  void renameSectionGroup
  void renameSection
  void deleteSectionGroup
  void deleteSection

  const canEditPage = Boolean(page) && !isCurrentSectionLocked

  const focusElement = (selector: string) => {
    window.setTimeout(() => {
      document.querySelector<HTMLElement>(selector)?.focus()
    }, 0)
  }

  const focusCurrentNotebook = () => {
    setIsNotebookPaneVisible(true)
    focusElement('.notebook-item.active')
  }

  const focusCurrentSection = () => {
    setIsNotebookPaneVisible(true)
    focusElement('.notebook-section-link.section-item.active')
  }

  const focusCurrentPage = () => {
    setIsPagesPaneVisible(true)
    focusElement('.page-card.active')
  }

  const focusPageTitle = () => {
    titleInputRef.current?.focus()
    titleInputRef.current?.select()
  }

  const openSearchAll = () => {
    setSearchScope('all')
    window.setTimeout(() => {
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    }, 0)
  }

  const openCurrentPageFind = () => {
    setReviewScope('page')
    setIsReviewPaneOpen(true)
    window.setTimeout(() => {
      document.querySelector<HTMLInputElement>('.review-pane .review-pane-field input')?.focus()
    }, 0)
  }

  const findCurrentPageMatch = (backward = false) => {
    setReviewScope('page')
    setIsReviewPaneOpen(true)
    const needle = reviewFind.trim()
    if (!needle) {
      window.setTimeout(() => {
        document.querySelector<HTMLInputElement>('.review-pane .review-pane-field input')?.focus()
      }, 0)
      return
    }

    window.setTimeout(() => {
      const finder = (window as Window & {
        find?: (
          searchString: string,
          caseSensitive?: boolean,
          backwards?: boolean,
          wrapAround?: boolean,
          wholeWord?: boolean,
          searchInFrames?: boolean,
          showDialog?: boolean,
        ) => boolean
      }).find
      const found = finder?.(needle, false, backward, true, false, false, false) ?? false
      setSaveLabel(found ? `Found "${needle}"` : `No page matches for "${needle}"`)
    }, 0)
  }

  const closeSearchAndReturnToPage = () => {
    setQuery('')
    setIsReviewPaneOpen(false)
    window.setTimeout(() => {
      editorRef.current?.focus()
    }, 0)
  }

  const getVisibleSearchResultButtons = () =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('.search-results-list .search-result'))

  const focusNextSearchResult = () => {
    const buttons = getVisibleSearchResultButtons()
    if (buttons.length === 0) return
    const activeIndex = buttons.findIndex((button) => button === document.activeElement)
    buttons[(activeIndex + 1) % buttons.length]?.focus()
  }

  const openSelectedSearchResult = () => {
    const visibleResults = searchResults.slice(0, 8)
    if (visibleResults.length === 0) return
    const buttons = getVisibleSearchResultButtons()
    const activeIndex = buttons.findIndex((button) => button === document.activeElement)
    const result = visibleResults[activeIndex >= 0 ? activeIndex : 0]
    if (!result) return
    openSearchResult(result)
    setQuery('')
    window.setTimeout(() => {
      editorRef.current?.focus()
    }, 0)
  }

  const toggleFullPageView = () => {
    const shouldHidePanes = isNotebookPaneVisible || isPagesPaneVisible
    setIsNotebookPaneVisible(!shouldHidePanes)
    setIsPagesPaneVisible(!shouldHidePanes)
  }

  const printPage = () => {
    syncEditorContent()
    window.print()
  }

  const lockProtectedSections = () => {
    setUnlockedSectionIds([])
    setSaveLabel('Locked protected sections')
  }

  const insertAuthorTimestamp = () => {
    insertTemplate(`<p>${appInfo?.name ?? 'OnePlace'} - ${new Date().toLocaleString()}</p>`)
  }

  const selectAllPageContent = () => {
    runEditorCommand('selectAll')
  }

  const getPageAudioElements = () =>
    Array.from(editorRef.current?.querySelectorAll<HTMLAudioElement>('audio') ?? [])

  const getSelectedAudioElement = () => {
    const activeElement = document.activeElement
    if (activeElement instanceof HTMLAudioElement && editorRef.current?.contains(activeElement)) {
      return activeElement
    }

    if (activeElement instanceof HTMLElement && editorRef.current?.contains(activeElement)) {
      const activeAudio = activeElement.closest<HTMLElement>('.audio-note')?.querySelector<HTMLAudioElement>('audio')
      if (activeAudio) return activeAudio
    }

    const range = window.getSelection()?.rangeCount ? window.getSelection()?.getRangeAt(0) : null
    const rangeElement =
      range?.commonAncestorContainer instanceof HTMLElement
        ? range.commonAncestorContainer
        : range?.commonAncestorContainer.parentElement
    const selectedAudio = rangeElement?.closest<HTMLElement>('.audio-note')?.querySelector<HTMLAudioElement>('audio')
    if (selectedAudio) return selectedAudio

    const audios = getPageAudioElements()
    return audios.find((audio) => !audio.paused) ?? audios[0] ?? null
  }

  const playSelectedAudio = () => {
    const audio = getSelectedAudioElement()
    if (!audio) {
      setSaveLabel('No audio recording on this page')
      return
    }

    void audio.play().then(
      () => setSaveLabel('Playing audio recording'),
      () => setSaveLabel('Audio playback is blocked until the page is clicked'),
    )
  }

  const skipAudioPlayback = (deltaSeconds: number) => {
    const audio = getSelectedAudioElement()
    if (!audio) {
      setSaveLabel('No audio recording on this page')
      return
    }

    const duration = Number.isFinite(audio.duration) ? audio.duration : Number.MAX_SAFE_INTEGER
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + deltaSeconds))
    setSaveLabel(deltaSeconds < 0 ? 'Skipped audio back 10 seconds' : 'Skipped audio forward 10 seconds')
  }

  const startAudioRecordingShortcut = () => {
    setIsAudioPaneOpen(true)
    void startAudioRecording()
  }

  const stopAudioShortcut = () => {
    if (isRecordingAudio) {
      void stopAudioRecording()
      return
    }

    const audio = getSelectedAudioElement()
    if (!audio) return
    audio.pause()
    setSaveLabel('Stopped audio playback')
  }

  const openCurrentTask = () => {
    setIsTaskPaneOpen(true)
    setTaskStatusFilter('all')
    window.setTimeout(() => {
      document.querySelector<HTMLElement>('.task-pane-link')?.focus()
    }, 0)
  }

  const increasePageNavigationWidth = () => {
    setIsPagesPaneVisible(true)
    setPagesPaneWidth((current) => Math.min(460, current + 32))
  }

  const decreasePageNavigationWidth = () => {
    setIsPagesPaneVisible(true)
    setPagesPaneWidth((current) => Math.max(220, current - 32))
  }

  useGlobalShortcuts({
    canEditPage,
    shortcutActions: {
      addPage,
      addPageBelowCurrent,
      addSubpage,
      clearCurrentPageTask,
      clearCurrentPageTags,
      closeSearchAndReturnToPage,
      copySelectionFormatting,
      createSection: () => void promptCreateSection(),
      decreasePageNavigationWidth,
      demoteCurrentPage,
      emailCurrentPage,
      findNextCurrentPageMatch: () => findCurrentPageMatch(false),
      findPreviousCurrentPageMatch: () => findCurrentPageMatch(true),
      focusCurrentNotebook,
      focusCurrentPage,
      focusCurrentSection,
      focusNextSearchResult,
      focusPageTitle,
      goBack,
      goForward,
      increasePageNavigationWidth,
      insertAuthorTimestamp,
      insertExternalLink,
      insertHtmlAtSelection: insertTemplate,
      lockProtectedSections,
      markCurrentPageUnread,
      moveCurrentPageDown,
      moveCurrentPageUp,
      openCurrentPageFind,
      openCurrentTask,
      openMoveCopyPage: () => setIsMoveCopyPageOpen(true),
      openNotebook,
      openSelectedSearchResult,
      openSearchAll,
      openShortcutHelp: () => setIsShortcutHelpOpen(true),
      pasteSelectionFormatting,
      playSelectedAudio,
      printPage,
      promoteCurrentPage,
      runEditorCommand,
      saveNow,
      selectFirstPage,
      selectLastPage,
      selectNextPage,
      selectNextSection,
      selectPreviousPage,
      selectPreviousSection,
      selectAllPageContent,
      setActiveTab,
      setCurrentTaskDuePreset,
      skipAudioPlayback,
      startAudioRecording: startAudioRecordingShortcut,
      stopAudio: stopAudioShortcut,
      syncEditorContent,
      toggleCurrentTask,
      toggleCurrentTaskComplete,
      toggleCurrentPageCollapse: () => {
        if (page) togglePageCollapse(page.id)
      },
      toggleFullPageView,
      toggleNamedTagOnCurrentPage,
      toggleRuleLines: () => setShowRuleLines((current) => !current),
      zoomBy: adjustEditorZoom,
    },
  })

  const renderNotebookIcon = (item: Notebook) => {
    if (item.icon === 'folder') {
      return <FolderIcon className="notebook-glyph-svg" color={item.color} />
    }
    if (item.icon === 'person') {
      return <PersonIcon className="notebook-glyph-svg" color={item.color} />
    }
    return <SectionBookIcon className="notebook-glyph-svg" color={item.color} />
  }

  const getSnippetParts = (entry: Page) => {
    const value =
      typeof entry.snippet === 'string' && entry.snippet.trim()
        ? entry.snippet
        : buildSnippet(entry.title, entry.content, entry.updatedAt)
    const [first, ...rest] = value.split('\n')
    return {
      first: first || formatPageDate(entry.updatedAt),
      second: rest.join(' ') || entry.title,
    }
  }

  const dragLabel =
    dragState?.type === 'notebook'
      ? 'Moving notebook'
      : dragState?.type === 'section-group'
      ? 'Moving section group'
      : dragState?.type === 'section'
        ? 'Moving section'
        : dragState?.type === 'page'
          ? 'Moving page'
          : ''
  const windowTitle = `${page?.title?.trim() || 'Untitled Page'} - ${notebook?.name ?? 'Notebook'} - OnePlace`
  const saveStatusText = isDirty ? `${saveLabel} · Unsaved changes` : saveLabel
  const displayVersion = appInfo?.version ?? __APP_VERSION__
  const hasSidePane =
    isCopilotOpen ||
    isTaskPaneOpen ||
    isTagPaneOpen ||
    isReviewPaneOpen ||
    isHistoryPaneOpen ||
    isMeetingDetailsOpen ||
    isAudioPaneOpen ||
    isTemplatePaneOpen ||
    isMarkmapPaneOpen ||
    isReferencesPaneOpen
  const suggestedPrompts = [
    'Change this bulleted list into full sentences and paragraphs',
    'Draft a plan for a team offsite in Santa Fe',
    'Give me ideas for ways to improve productivity and better manage my time',
  ]
  const sidePanesProps: SidePanesProps = {
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
    manualReferenceDraft,
    editingReferenceId,
    canInsertReference,
    importReferenceText,
    setManualReferenceField,
    saveManualReference,
    resetManualReferenceDraft,
    editReference,
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
    insertMeetingDetails: () =>
      insertMeetingDetails({
        agenda: meetingAgendaDraft,
        attendees: meetingAttendeesDraft,
        date: meetingDateDraft,
        location: meetingLocationDraft,
        time: meetingTimeDraft,
        title: meetingTitleDraft,
      }),
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
  }

  return (
    <AppShell
      contextMenu={contextMenu}
      dragLabel={dragLabel}
      dragPosition={dragPosition}
      dragState={dragState}
      fileInputProps={{
        attachmentInputRef,
        handleAttachmentSelection,
        handleImageSelection,
        handlePrintoutSelection,
        imageInputRef,
        printoutInputRef,
      }}
      isNotebookPaneVisible={isNotebookPaneVisible}
      isPagesPaneVisible={isPagesPaneVisible}
      moveCopyPageDialogProps={{
        destinations: moveCopyPageDestinations,
        onOpenChange: setIsMoveCopyPageOpen,
        onSubmit: (mode, target) => {
          moveOrCopyCurrentPage(mode, target)
          setIsMoveCopyPageOpen(false)
        },
        open: isMoveCopyPageOpen,
        pageTitle: page?.title ?? 'Untitled Page',
      }}
      shortcutHelpDialogProps={{
        onOpenChange: setIsShortcutHelpOpen,
        open: isShortcutHelpOpen,
      }}
      notePaneProps={{
        activeTab,
        addTagToCurrentPage,
        appName: appInfo?.name ?? 'OnePlace',
        beginInkStroke,
        canvasScrollRef: noteCanvasScrollRef,
        displayVersion,
        drawColor,
        drawSurfaceRef,
        editorRef,
        editorZoom,
        endInkStroke,
        formatDueDate,
        formatPageDate,
        formatPageTime,
        handleEditorClick,
        handleEditorDragEnd,
        handleEditorDragOver,
        handleEditorDragStart,
        handleEditorDrop,
        handleEditorInput,
        handleEditorKeyDown,
        handleEditorPaste,
        handleEditorPointerDown,
        hasSidePane,
        isCurrentSectionLocked,
        isRecordingAudio,
        isTagPaneOpen,
        isTaskPaneOpen,
        moveInkStroke,
        openAudioPane,
        page,
        pageWidthMode,
        saveCurrentPageVersion,
        saveStatusText,
        searchScope,
        searchScopeLabels,
        section,
        setIsTaskPaneOpen,
        showRuleLines,
        sidePanes: sidePanesProps,
        syncEditorContent,
        toggleCurrentTask,
        toggleCurrentTaskComplete,
        toggleTagOnPage,
        titleInputRef,
        unlockSection,
        updatePage,
      }}
      notebooksPaneProps={{
        addSectionGroupWithName,
        allowDrop,
        appState,
        beginDrag,
        canDeleteNotebook,
        consumeSuppressedClick,
        createNotebook,
        deleteNotebook,
        dragState,
        dropTarget,
        isCheckingForUpdates,
        isNotebookPaneVisible,
        moveNotebook,
        moveSection,
        moveSectionToGroup,
        notebook,
        openContextMenu,
        createSectionInGroup,
        renameNotebookTo,
        renameSectionTo,
        renameSectionGroupTo,
        renderNotebookIcon,
        runUpdateCheck,
        section,
        selectNotebook,
        selectSection,
        setNotebookDropTarget,
        setSectionDropTarget,
        setSectionGroupInsideDropTarget,
        toggleSectionGroupCollapse,
      }}
      onRequestCloseContextMenu={() => setContextMenu(null)}
      pagesPaneProps={{
        addPage,
        addPageWithTitle,
        addSubpage,
        addSubpageWithTitle,
        allowDrop,
        beginDrag,
        canDeletePage,
        canDemotePage,
        canPromotePage,
        consumeSuppressedClick,
        deleteCurrentPage,
        demoteCurrentPage,
        dragState,
        dropTarget,
        findPageLocation,
        getSnippetParts,
        hasChildPageSelected,
        isCurrentSectionLocked,
        isPagesPaneVisible,
        movePage,
        openContextMenu,
        openSearchResult,
        page,
        pageSortMode,
        pageSortModeLabels,
        promoteCurrentPage,
        query,
        recentPages,
        renamePage,
        renamePageTo,
        renderHighlightedText,
        saveCurrentPageVersion,
        section,
        sectionGroup,
        selectPage,
        setPageDropTarget,
        setPageSortMode,
        togglePageCollapse,
        unlockSection,
        visiblePages,
      }}
      pagesPaneWidth={pagesPaneWidth}
      ribbonBarProps={{
        activeTab,
        addPage,
        addSectionGroup,
        addSubpage,
        addTagToCurrentPage,
        adjustEditorZoom,
        applyFontFamily,
        applyFontSize,
        applyPageTemplate,
        applyStylePreset,
        canDeletePage,
        canDemotePage,
        canGoBack,
        canGoForward,
        canPromotePage,
        clearInkStrokes,
        copySelection,
        copySelectionFormatting,
        createNotebook,
        deleteCurrentPage,
        demoteCurrentPage,
        editorRef,
        editorZoom,
        emailCurrentPage,
        exportCurrentPage,
        fontMenuPanelRef,
        fontMenuRef,
        fontSizeMenuPanelRef,
        fontSizeMenuRef,
        goBack,
        goForward,
        importOneNoteExport,
        insertChecklist,
        insertExternalLink,
        insertInternalPageLink,
        insertTable,
        insertTemplate,
        isDictating,
        isFontMenuOpen,
        isFontSizeMenuOpen,
        isHistoryPaneOpen,
        isImportingOneNoteExport,
        isCurrentSectionLocked,
        isNotebookPaneVisible,
        isPagesPaneVisible,
        isRecordingAudio,
        isReviewPaneOpen,
        isTaskPaneOpen,
        isTranscribing,
        isReferencesPaneOpen,
        isMarkmapPaneOpen,
        loadNotebookFromPath,
        openAttachmentPicker,
        openAudioPane,
        openImagePicker,
        openMeetingDetailsPane,
        openMarkmapPane,
        openNotebook,
        openPrintoutPicker,
        openShortcutHelp: () => setIsShortcutHelpOpen(true),
        page,
        pageSortMode,
        pageWidthMode,
        pasteFromClipboard,
        pasteSelectionFormatting,
        promptCreateSection,
        promoteCurrentPage,
        recentNotebookEntries,
        restoreSavedPageVersion,
        runEditorCommand,
        saveCurrentPageVersion,
        saveNotebookAs,
        saveNow,
        selectedFontFamily,
        selectedFontSize,
        setActiveTab,
        setCurrentTaskDueDate,
        setDrawColor,
        setEditorZoom,
        setIsCopilotOpen,
        setIsFontMenuOpen,
        setIsFontSizeMenuOpen,
        setIsHistoryPaneOpen,
        setIsNotebookPaneVisible,
        setIsPagesPaneVisible,
        setIsReviewPaneOpen,
        setIsTaskPaneOpen,
        setIsReferencesPaneOpen,
        setPageSortMode,
        setPageWidthMode,
        setQuery,
        setShowRuleLines,
        showRuleLines,
        startDictation,
        startSpeechTranscription,
        toggleCurrentTask,
        toggleCurrentTaskComplete,
      }}
      commandBarProps={{
        activeTab,
        setActiveTab,
        onSetSearchFilter: setSearchFilter,
        onToggleSearchScope: toggleSearchScope,
        openSearchResult,
        query,
        renderHighlightedText,
        searchFilter,
        searchFilterLabels,
        searchInputRef,
        searchResults,
        searchResultsPanelRef,
        searchScope,
        searchScopeLabels,
        setQuery,
        titlebarSearchRef,
      }}
      navRailProps={{
        isNotebookPaneVisible,
        onFocusSearch: () => searchInputRef.current?.focus(),
        onShowLibrary: () => setIsNotebookPaneVisible(true),
      }}
      titleBarProps={{
        canGoBack,
        canGoForward,
        onGoBack: goBack,
        onGoForward: goForward,
        onNewNotebook: createNotebook,
        onOpenNotebook: openNotebook,
        onSave: () => void saveNow(),
        onUndo: () => runEditorCommand('undo'),
        windowTitle,
        workspaceName: notebook?.name ?? 'Dunder Mifflin offsite',
      }}
    />
  )
}

export default App
