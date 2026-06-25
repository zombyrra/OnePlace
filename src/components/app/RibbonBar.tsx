import type { Dispatch, RefObject, SetStateAction } from 'react'
import type {
  Page,
  PageSortMode,
  PageWidthMode,
  RecentNotebookEntry,
  RibbonTab,
} from '../../app/appModel'
import { fontFamilies, fontSizes, stylePresets } from '../../app/appModel'
import {
  ColorGrid,
  Combobox,
  HIGHLIGHT_COLORS,
  MenuItem,
  PopoverButton,
  RibbonButton,
  SplitButton,
  TEXT_COLORS,
} from '../ui'
import {
  AlignCenterIcon,
  BaselineIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AttachmentIcon,
  AudioLinesIcon,
  BoldIcon,
  BookDownIcon,
  BrushIcon,
  BulletsIcon,
  CalendarCheckIcon,
  CalendarClockIcon,
  CalendarDaysIcon,
  CaptionsIcon,
  CheckSquareIcon,
  ChevronDownIcon,
  CircleCheckIcon,
  ClockIcon,
  CopyIcon,
  CrosshairIcon,
  CutIcon,
  DeleteIcon,
  EraserIcon,
  FileDownIcon,
  FilePlusIcon,
  FileStackIcon,
  FileUpIcon,
  FolderIcon,
  FolderPlusIcon,
  HighlighterIcon,
  ImageIcon,
  IndentIcon,
  ItalicIcon,
  KeyboardIcon,
  LayoutTemplateIcon,
  LibraryBigIcon,
  Link2Icon,
  LinkIcon,
  ListChecksIcon,
  ListOrderedIcon,
  MailIcon,
  MicIcon,
  NetworkIcon,
  PanelLeftIcon,
  PanelRightIcon,
  PasteIcon,
  PenIcon,
  PrinterIcon,
  ReplaceIcon,
  SaveAllIcon,
  SaveIcon,
  ScanSearchIcon,
  SearchIcon,
  SearchXIcon,
  SectionBookIcon,
  SeparatorHorizontalIcon,
  SortAZIcon,
  SortNewestIcon,
  SparklesIcon,
  StrikethroughIcon,
  TableIcon,
  TagsIcon,
  TextSizeDownIcon,
  TextSizeUpIcon,
  UnderlineIcon,
  UsersRoundIcon,
  WidenPageIcon,
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
  importFolderTree: () => Promise<void> | void
  isImportingFolderTree: boolean
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
  copySelectionFormatting: () => void
  pasteSelectionFormatting: () => void
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
  openShortcutHelp: () => void
}

const Sep = () => <span className="op-rib-sep" aria-hidden="true" />

export function RibbonBar(props: RibbonBarProps) {
  const {
    activeTab,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    recentNotebookEntries,
    loadNotebookFromPath,
    openNotebook,
    importFolderTree,
    isImportingFolderTree,
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
    setQuery,
    addTagToCurrentPage,
    toggleCurrentTask,
    isCurrentSectionLocked,
    page,
    setCurrentTaskDueDate,
    toggleCurrentTaskComplete,
    setIsReviewPaneOpen,
    isReviewPaneOpen,
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
    copySelectionFormatting,
    runEditorCommand,
    selectedFontFamily,
    applyFontFamily,
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
    openShortcutHelp,
  } = props

  const canEditPage = Boolean(page) && !isCurrentSectionLocked
  const hasTask = Boolean(page?.task)
  const sizeValue = fontSizes.find((size) => size.label === selectedFontSize)?.command ?? '3'
  const focusPage = () => editorRef.current?.scrollIntoView({ behavior: 'smooth' })
  const insertDateStamp = () => insertTemplate(`<p>${new Date().toLocaleDateString()}</p>`)
  const insertTimeStamp = () =>
    insertTemplate(`<p>${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>`)
  const insertDateTimeStamp = () => insertTemplate(`<p>${new Date().toLocaleString()}</p>`)
  const insertDivider = () => insertTemplate('<hr />')
  const overflow = (
    <button aria-label="More commands" className="op-rib-overflow" type="button">
      <ChevronDownIcon size={14} />
    </button>
  )

  if (activeTab === 'File') {
    return (
      <section className="op-ribbon">
        <RibbonButton icon={<FolderIcon size={18} />} label="Open" onClick={openNotebook} title="Open OnePlace notebook" variant="compact" />
        <RibbonButton
          disabled={isImportingFolderTree}
          icon={<FolderPlusIcon size={18} />}
          label={isImportingFolderTree ? 'Importing...' : 'Folder'}
          onClick={() => void importFolderTree()}
          title="Import existing folder tree"
          variant="compact"
        />
        <RibbonButton
          disabled={isImportingOneNoteExport}
          icon={<FileDownIcon size={18} />}
          label={isImportingOneNoteExport ? 'Importing...' : 'OneNote'}
          onClick={() => void importOneNoteExport()}
          title="Import OneNote export"
          variant="compact"
        />
        <RibbonButton icon={<SaveAllIcon size={18} />} label="Save As" onClick={() => void saveNotebookAs()} variant="compact" />
        <RibbonButton icon={<FileUpIcon size={18} />} label="Export" onClick={() => void exportCurrentPage()} title="Export page" variant="compact" />
        <RibbonButton icon={<SaveIcon size={18} />} label="Save" onClick={() => void saveNow()} variant="compact" />
        <Sep />
        <RibbonButton icon={<FilePlusIcon size={18} />} label="New Page" onClick={addPage} variant="compact" />
        <RibbonButton icon={<FileStackIcon size={18} />} label="Subpage" onClick={addSubpage} variant="compact" />
        <RibbonButton icon={<SectionBookIcon size={18} />} label="Section" onClick={() => promptCreateSection()} variant="compact" />
        <RibbonButton icon={<FolderPlusIcon size={18} />} label="Group" onClick={addSectionGroup} variant="compact" />
        <RibbonButton icon={<LibraryBigIcon size={18} />} label="Notebook" onClick={createNotebook} title="New notebook" variant="compact" />
        {recentNotebookEntries.length > 0 ? <Sep /> : null}
        {recentNotebookEntries.slice(0, 3).map((entry) => (
          <RibbonButton
            icon={<FolderIcon size={18} />}
            key={entry.path}
            label={entry.name}
            onClick={() => void loadNotebookFromPath(entry.path)}
            title={entry.path}
            variant="compact"
          />
        ))}
        {overflow}
      </section>
    )
  }

  if (activeTab === 'Insert') {
    return (
      <section className="op-ribbon">
        <RibbonButton disabled={isCurrentSectionLocked} icon={<FilePlusIcon size={18} />} label="Page" onClick={addPage} variant="compact" />
        <RibbonButton disabled={!canEditPage} icon={<FileStackIcon size={18} />} label="Subpage" onClick={addSubpage} variant="compact" />
        <Sep />
        <RibbonButton disabled={!canEditPage} icon={<TableIcon size={18} />} label="Table" onClick={insertTable} variant="compact" />
        <RibbonButton disabled={!canEditPage} icon={<AttachmentIcon size={18} />} label="File" onClick={openAttachmentPicker} variant="compact" />
        <RibbonButton disabled={!canEditPage} icon={<ImageIcon size={18} />} label="Picture" onClick={openImagePicker} variant="compact" />
        <RibbonButton disabled={!canEditPage} icon={<PrinterIcon size={18} />} label="Printout" onClick={openPrintoutPicker} variant="compact" />
        <Sep />
        <RibbonButton disabled={!canEditPage} icon={<LinkIcon size={18} />} label="Link" onClick={insertExternalLink} variant="compact" />
        <RibbonButton disabled={!canEditPage} icon={<Link2Icon size={18} />} label="Page Link" onClick={insertInternalPageLink} variant="compact" />
        <RibbonButton disabled={!canEditPage} icon={<ListChecksIcon size={18} />} label="Checklist" onClick={insertChecklist} variant="compact" />
        <RibbonButton disabled={!page} icon={<NetworkIcon size={18} />} label="Mind Map" onClick={openMarkmapPane} variant="compact" />
        <RibbonButton disabled={!page} icon={<BookDownIcon size={18} />} label="Citations" onClick={() => setIsReferencesPaneOpen(true)} variant="compact" />
        <Sep />
        <RibbonButton disabled={!canEditPage} icon={<CalendarDaysIcon size={18} />} label="Date" onClick={insertDateStamp} variant="compact" />
        <RibbonButton disabled={!canEditPage} icon={<ClockIcon size={18} />} label="Time" onClick={insertTimeStamp} variant="compact" />
        <RibbonButton disabled={!canEditPage} icon={<CalendarClockIcon size={18} />} label="Date & Time" onClick={insertDateTimeStamp} variant="compact" />
        <RibbonButton disabled={!canEditPage} icon={<SeparatorHorizontalIcon size={18} />} label="Divider" onClick={insertDivider} variant="compact" />
        <Sep />
        <RibbonButton disabled={!canEditPage} icon={<UsersRoundIcon size={18} />} label="Meeting" onClick={openMeetingDetailsPane} variant="compact" />
        <RibbonButton disabled={!canEditPage} icon={<LayoutTemplateIcon size={18} />} label="Template" onClick={applyPageTemplate} variant="compact" />
        <RibbonButton disabled={!page} icon={<SparklesIcon size={18} />} label="Copilot" onClick={() => setIsCopilotOpen(true)} variant="compact" />
        {overflow}
      </section>
    )
  }

  if (activeTab === 'Draw') {
    return (
      <section className="op-ribbon">
        <RibbonButton disabled={!canEditPage} icon={<PenIcon size={18} />} label="Blue" onClick={() => setDrawColor('#1a73d9')} title="Blue ink" variant="compact" />
        <RibbonButton disabled={!canEditPage} icon={<PenIcon size={18} />} label="Black" onClick={() => setDrawColor('#232a35')} title="Black ink" variant="compact" />
        <RibbonButton disabled={!canEditPage} icon={<PenIcon size={18} />} label="Red" onClick={() => setDrawColor('#b42318')} title="Red ink" variant="compact" />
        <RibbonButton disabled={!canEditPage} icon={<PenIcon size={18} />} label="Green" onClick={() => setDrawColor('#067647')} title="Green ink" variant="compact" />
        <RibbonButton disabled={!canEditPage} icon={<HighlighterIcon size={18} />} label="Highlighter" onClick={() => setDrawColor('#ffe266')} variant="compact" />
        <RibbonButton disabled={!canEditPage} icon={<EraserIcon size={18} />} label="Clear Ink" onClick={clearInkStrokes} variant="compact" />
        <Sep />
        <SplitButton
          caretLabel="Dictate options"
          disabled={!canEditPage}
          icon={<MicIcon size={18} />}
          label={isDictating ? 'Stop' : 'Dictate'}
          onClick={startDictation}
          split
          variant="compact"
        >
          <MenuItem icon={<CaptionsIcon size={16} />} onSelect={startSpeechTranscription}>
            {isTranscribing ? 'Stop transcribe' : 'Transcribe'}
          </MenuItem>
          <MenuItem icon={<AudioLinesIcon size={16} />} onSelect={openAudioPane}>
            {isRecordingAudio ? 'Audio controls' : 'Audio note'}
          </MenuItem>
        </SplitButton>
        {overflow}
      </section>
    )
  }

  if (activeTab === 'View') {
    return (
      <section className="op-ribbon">
        <RibbonButton icon={<TextSizeUpIcon size={18} />} label="Zoom In" onClick={() => adjustEditorZoom(0.1)} variant="compact" />
        <RibbonButton icon={<TextSizeDownIcon size={18} />} label="Zoom Out" onClick={() => adjustEditorZoom(-0.1)} variant="compact" />
        <RibbonButton icon={<ScanSearchIcon size={18} />} label={`${Math.round(editorZoom * 100)}%`} onClick={() => setEditorZoom(1)} title="Reset zoom" variant="compact" />
        <Sep />
        <RibbonButton
          icon={<WidenPageIcon size={18} />}
          label={pageWidthMode === 'normal' ? 'Wide' : 'Normal'}
          onClick={() => setPageWidthMode((current) => (current === 'normal' ? 'wide' : 'normal'))}
          title="Page width"
          variant="compact"
        />
        <RibbonButton
          active={showRuleLines}
          icon={<AlignJustifyIcon size={18} />}
          label="Rule Lines"
          onClick={() => setShowRuleLines((current) => !current)}
          variant="compact"
        />
        <RibbonButton
          active={isNotebookPaneVisible}
          icon={<PanelLeftIcon size={18} />}
          label="Notebooks"
          onClick={() => setIsNotebookPaneVisible((current) => !current)}
          variant="compact"
        />
        <RibbonButton
          active={isPagesPaneVisible}
          icon={<PanelRightIcon size={18} />}
          label="Pages"
          onClick={() => setIsPagesPaneVisible((current) => !current)}
          variant="compact"
        />
        <Sep />
        <RibbonButton active={pageSortMode === 'updated-desc'} icon={<SortNewestIcon size={18} />} label="Newest" onClick={() => setPageSortMode('updated-desc')} title="Sort newest" variant="compact" />
        <RibbonButton active={pageSortMode === 'title-asc'} icon={<SortAZIcon size={18} />} label="A–Z" onClick={() => setPageSortMode('title-asc')} title="Sort A–Z" variant="compact" />
        {overflow}
      </section>
    )
  }

  if (activeTab === 'Help') {
    return (
      <section className="op-ribbon">
        <RibbonButton icon={<KeyboardIcon size={18} />} label="Shortcuts" onClick={openShortcutHelp} title="OneNote keyboard shortcuts (F1)" variant="compact" />
        <RibbonButton active={isReviewPaneOpen} icon={<ReplaceIcon size={18} />} label="Find & Replace" onClick={() => setIsReviewPaneOpen((current) => !current)} variant="compact" />
<RibbonButton disabled={!page} icon={<SearchIcon size={18} />} label="Find Page" onClick={() => setQuery(page?.title ?? '')} variant="compact" />
        <RibbonButton onClick={() => setQuery('')} icon={<SearchXIcon size={18} />} label="Clear" title="Clear search" variant="compact" />
        <Sep />
        <RibbonButton disabled={!canEditPage} icon={<TagsIcon size={18} />} label="Tag" onClick={addTagToCurrentPage} variant="compact" />
        <RibbonButton disabled={!canEditPage} icon={<CheckSquareIcon size={18} />} label={page?.task ? 'Remove To Do' : 'To Do'} onClick={toggleCurrentTask} variant="compact" />
        <RibbonButton disabled={!canEditPage || !hasTask} icon={<CalendarCheckIcon size={18} />} label="Due Date" onClick={setCurrentTaskDueDate} variant="compact" />
        <RibbonButton disabled={!canEditPage || !hasTask} icon={<CircleCheckIcon size={18} />} label={page?.task?.status === 'done' ? 'Incomplete' : 'Complete'} onClick={toggleCurrentTaskComplete} variant="compact" />
        <Sep />
        <RibbonButton disabled={!page} icon={<MailIcon size={18} />} label="Email Page" onClick={emailCurrentPage} variant="compact" />
        <RibbonButton disabled={!canGoBack} icon={<CrosshairIcon size={18} />} label="Back" onClick={goBack} variant="compact" />
        <RibbonButton disabled={!canGoForward} icon={<CrosshairIcon size={18} />} label="Forward" onClick={goForward} variant="compact" />
        {overflow}
      </section>
    )
  }

  // Home (default)
  return (
    <section className="op-ribbon op-ribbon-home">
      <SplitButton
        caretLabel="Paste options"
        icon={<PasteIcon size={18} />}
        label="Paste"
        onClick={() => void pasteFromClipboard()}
        split
        variant="compact"
      >
        <MenuItem icon={<PasteIcon size={16} />} onSelect={() => void pasteFromClipboard()}>
          Keep source formatting
        </MenuItem>
        <MenuItem icon={<CopyIcon size={16} />} onSelect={() => void copySelection()}>
          Copy
        </MenuItem>
      </SplitButton>
      <RibbonButton icon={<CutIcon size={16} />} onClick={() => document.execCommand('cut')} title="Cut" variant="icon" />
      <RibbonButton icon={<CopyIcon size={16} />} onClick={() => void copySelection()} title="Copy" variant="icon" />
      <RibbonButton icon={<BrushIcon size={16} />} onClick={copySelectionFormatting} title="Format Painter (Ctrl+Alt+C)" variant="icon" />
      <Sep />

      <Combobox
        ariaLabel="Font"
        onSelect={applyFontFamily}
        optionFont
        options={fontFamilies.map((font) => ({ value: font, label: font }))}
        value={selectedFontFamily}
        width={128}
      />
      <Combobox
        ariaLabel="Font size"
        display={selectedFontSize}
        onSelect={(command) =>
          applyFontSize(command, fontSizes.find((size) => size.command === command)?.label ?? selectedFontSize)
        }
        options={fontSizes.map((size) => ({ value: size.command, label: size.label }))}
        value={sizeValue}
        width={56}
      />
      <RibbonButton icon={<TextSizeUpIcon size={16} />} onClick={() => runEditorCommand('fontSize', '5')} title="Grow font" variant="icon" />
      <RibbonButton icon={<TextSizeDownIcon size={16} />} onClick={() => runEditorCommand('fontSize', '2')} title="Shrink font" variant="icon" />
      <RibbonButton icon={<BoldIcon size={16} />} onClick={() => runEditorCommand('bold')} title="Bold (Ctrl+B)" variant="icon" />
      <RibbonButton icon={<ItalicIcon size={16} />} onClick={() => runEditorCommand('italic')} title="Italic (Ctrl+I)" variant="icon" />
      <RibbonButton icon={<UnderlineIcon size={16} />} onClick={() => runEditorCommand('underline')} title="Underline (Ctrl+U)" variant="icon" />
      <RibbonButton icon={<StrikethroughIcon size={16} />} onClick={() => runEditorCommand('strikeThrough')} title="Strikethrough" variant="icon" />
      <PopoverButton caretLabel="Highlight colour" icon={<HighlighterIcon size={16} />} surfaceClassName="op-color-pop" title="Text highlight colour" variant="icon">
        <ColorGrid
          clearLabel="No colour"
          colors={HIGHLIGHT_COLORS}
          onClear={() => runEditorCommand('hiliteColor', 'transparent')}
          onSelect={(color) => runEditorCommand('hiliteColor', color)}
        />
      </PopoverButton>
      <PopoverButton caretLabel="Font colour" icon={<BaselineIcon size={16} />} label="Color" surfaceClassName="op-color-pop" title="Font colour" variant="compact">
        <ColorGrid
          clearLabel="Automatic"
          colors={TEXT_COLORS}
          columns={8}
          onClear={() => runEditorCommand('foreColor', '#201f1e')}
          onSelect={(color) => runEditorCommand('foreColor', color)}
        />
      </PopoverButton>
      <RibbonButton icon={<EraserIcon size={16} />} onClick={() => runEditorCommand('removeFormat')} title="Clear all formatting" variant="icon" />
      <Sep />

      <SplitButton caretLabel="Bullet library" icon={<BulletsIcon size={16} />} onClick={() => runEditorCommand('insertUnorderedList')} split variant="icon">
        <MenuItem onSelect={() => runEditorCommand('insertUnorderedList')}>Bulleted list</MenuItem>
        <MenuItem onSelect={() => runEditorCommand('insertOrderedList')}>Numbered list</MenuItem>
        <MenuItem onSelect={() => runEditorCommand('insertUnorderedList')}>Remove list</MenuItem>
      </SplitButton>
      <SplitButton caretLabel="Numbering library" icon={<ListOrderedIcon size={16} />} onClick={() => runEditorCommand('insertOrderedList')} split variant="icon">
        <MenuItem onSelect={() => runEditorCommand('insertOrderedList')}>Numbered list</MenuItem>
        <MenuItem onSelect={() => runEditorCommand('insertUnorderedList')}>Bulleted list</MenuItem>
      </SplitButton>
      <RibbonButton icon={<IndentIcon className="op-flip" size={16} />} onClick={() => runEditorCommand('outdent')} title="Decrease indent" variant="icon" />
      <RibbonButton icon={<IndentIcon size={16} />} onClick={() => runEditorCommand('indent')} title="Increase indent" variant="icon" />
      <SplitButton caretLabel="Alignment" icon={<AlignLeftIcon size={16} />} surfaceClassName="op-align-menu" variant="icon">
        <MenuItem icon={<AlignLeftIcon size={16} />} onSelect={() => runEditorCommand('justifyLeft')}>Align left</MenuItem>
        <MenuItem icon={<AlignCenterIcon size={16} />} onSelect={() => runEditorCommand('justifyCenter')}>Center</MenuItem>
        <MenuItem icon={<AlignRightIcon size={16} />} onSelect={() => runEditorCommand('justifyRight')}>Align right</MenuItem>
        <MenuItem icon={<AlignJustifyIcon size={16} />} onSelect={() => runEditorCommand('justifyFull')}>Justify</MenuItem>
      </SplitButton>
      <Sep />

      <SplitButton align="start" label="Styles" surfaceClassName="op-styles-menu" title="Styles" variant="compact">
        <MenuItem className="op-style-item op-style-normal" onSelect={() => runEditorCommand('formatBlock', 'p')}>
          Normal
        </MenuItem>
        {stylePresets.map((preset) => (
          <MenuItem className={`op-style-item op-style-${preset.id}`} key={preset.id} onSelect={() => applyStylePreset(preset.html)}>
            {preset.label}
          </MenuItem>
        ))}
      </SplitButton>
      <Sep />

      <SplitButton caretLabel="Dictate options" disabled={!canEditPage} icon={<MicIcon size={16} />} label={isDictating ? 'Stop' : 'Dictate'} onClick={startDictation} split variant="compact">
        <MenuItem icon={<CaptionsIcon size={16} />} onSelect={startSpeechTranscription}>
          {isTranscribing ? 'Stop transcribe' : 'Transcribe'}
        </MenuItem>
      </SplitButton>
      <RibbonButton disabled={!canPromotePage} icon={<TextSizeUpIcon size={16} />} onClick={promoteCurrentPage} title="Promote page" variant="icon" />
      <RibbonButton disabled={!canDemotePage} icon={<TextSizeDownIcon size={16} />} onClick={demoteCurrentPage} title="Demote page" variant="icon" />
      <RibbonButton disabled={!canDeletePage} icon={<DeleteIcon size={16} />} onClick={deleteCurrentPage} title="Delete page" variant="icon" />
      <RibbonButton icon={<CrosshairIcon size={16} />} onClick={focusPage} title="Focus page" variant="icon" />
      {overflow}
    </section>
  )
}
