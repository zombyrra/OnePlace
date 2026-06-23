import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import type { Page, PageWidthMode, SearchScope, Section } from '../../app/appModel'
import { SidePanes, type SidePanesProps } from './SidePanes'

type NotePaneProps = {
  hasSidePane: boolean
  page?: Page
  section?: Section
  appName: string
  displayVersion: string
  isCurrentSectionLocked: boolean
  isTagPaneOpen: boolean
  isTaskPaneOpen: boolean
  isRecordingAudio: boolean
  drawColor: string
  activeTab: string
  pageWidthMode: PageWidthMode
  showRuleLines: boolean
  editorZoom: number
  saveStatusText: string
  searchScope: SearchScope
  searchScopeLabels: Record<SearchScope, string>
  formatPageDate: (value: string) => string
  formatPageTime: (value: string) => string
  formatDueDate: (value: string) => string
  unlockSection: (id: string) => Promise<void> | void
  updatePage: (payload: Partial<Page>) => void
  addTagToCurrentPage: () => void
  toggleCurrentTask: () => void
  openAudioPane: () => void
  setIsTaskPaneOpen: (value: boolean) => void
  saveCurrentPageVersion: () => void
  toggleTagOnPage: (pageId: string, tag: string) => void
  toggleCurrentTaskComplete: () => void
  beginInkStroke: (event: ReactPointerEvent<SVGSVGElement>) => void
  moveInkStroke: (event: ReactPointerEvent<SVGSVGElement>) => void
  endInkStroke: (event: ReactPointerEvent<SVGSVGElement>) => void
  drawSurfaceRef: RefObject<SVGSVGElement | null>
  canvasScrollRef: RefObject<HTMLDivElement | null>
  editorRef: RefObject<HTMLDivElement | null>
  syncEditorContent: () => void
  handleEditorInput: () => void
  handleEditorClick: (event: ReactMouseEvent<HTMLDivElement>) => void
  handleEditorDragStart: (event: ReactDragEvent<HTMLDivElement>) => void
  handleEditorDragOver: (event: ReactDragEvent<HTMLDivElement>) => void
  handleEditorDrop: (event: ReactDragEvent<HTMLDivElement>) => void
  handleEditorDragEnd: () => void
  handleEditorPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  handleEditorKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void
  handleEditorPaste: (event: ReactClipboardEvent<HTMLDivElement>) => Promise<void> | void
  sidePanes: SidePanesProps
}

export function NotePane(props: NotePaneProps) {
  const {
    hasSidePane,
    page,
    section,
    appName,
    displayVersion,
    isCurrentSectionLocked,
    isTagPaneOpen,
    isTaskPaneOpen,
    isRecordingAudio,
    activeTab,
    pageWidthMode,
    showRuleLines,
    editorZoom,
    saveStatusText,
    searchScope,
    searchScopeLabels,
    formatPageDate,
    formatPageTime,
    formatDueDate,
    unlockSection,
    updatePage,
    addTagToCurrentPage,
    toggleCurrentTask,
    openAudioPane,
    setIsTaskPaneOpen,
    saveCurrentPageVersion,
    toggleTagOnPage,
    toggleCurrentTaskComplete,
    beginInkStroke,
    moveInkStroke,
    endInkStroke,
    drawSurfaceRef,
    canvasScrollRef,
    editorRef,
    syncEditorContent,
    handleEditorInput,
    handleEditorClick,
    handleEditorDragStart,
    handleEditorDragOver,
    handleEditorDrop,
    handleEditorDragEnd,
    handleEditorPointerDown,
    handleEditorKeyDown,
    handleEditorPaste,
    sidePanes,
  } = props
  const pageRenderKey = page?.id ?? 'no-page'
  const inkSurfaceRef = useRef<HTMLDivElement | null>(null)
  const [inkViewport, setInkViewport] = useState({ height: 1120, width: 900 })
  const showInkLayer = Boolean(page && (activeTab === 'Draw' || page.inkStrokes.length > 0))
  const isDrawActive = activeTab === 'Draw' && !isCurrentSectionLocked

  useEffect(() => {
    const surface = inkSurfaceRef.current
    if (!surface) return

    const syncViewport = () => {
      setInkViewport({
        height: Math.max(surface.scrollHeight, surface.clientHeight, 1120),
        width: Math.max(surface.clientWidth, 900),
      })
    }

    syncViewport()

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => syncViewport())
    observer.observe(surface)
    return () => observer.disconnect()
  }, [pageRenderKey, pageWidthMode, showRuleLines, showInkLayer])

  return (
    <section className={`note-pane ${hasSidePane ? 'side-pane-open' : 'side-pane-closed'}`}>
      <div className="note-document" key={pageRenderKey}>
        <div className="note-header">
          <div className="note-header-main">
            <div className="note-header-copy">
              <input
                className="note-title"
                disabled={isCurrentSectionLocked}
                onChange={(event) => updatePage({ title: event.target.value })}
                type="text"
                value={page?.title ?? ''}
              />
              <div className="note-date-row">
                <span>{page ? formatPageDate(page.createdAt) : ''}</span>
                <span>{page ? formatPageTime(page.createdAt) : ''}</span>
              </div>
            </div>
          </div>
          <div className="note-toolbar-inline">
            <button disabled={isCurrentSectionLocked} onClick={addTagToCurrentPage} type="button">
              {isTagPaneOpen ? 'Hide Tags' : 'Tags'}
            </button>
            <button disabled={isCurrentSectionLocked} onClick={toggleCurrentTask} type="button">
              {page?.task ? 'Task On' : 'Task'}
            </button>
            <button disabled={isCurrentSectionLocked} onClick={openAudioPane} type="button">
              {isRecordingAudio ? 'Audio Controls' : 'Audio'}
            </button>
            <button onClick={() => setIsTaskPaneOpen(!isTaskPaneOpen)} type="button">
              {isTaskPaneOpen ? 'Hide Tasks' : 'Tasks'}
            </button>
            <button disabled={isCurrentSectionLocked} onClick={saveCurrentPageVersion} type="button">
              Version
            </button>
          </div>
          <div className="note-meta-strip">
            {page?.tags.map((tag) => (
              <button
                key={tag}
                className="note-tag-chip"
                disabled={isCurrentSectionLocked}
                onClick={() => toggleTagOnPage(page.id, tag)}
                type="button"
              >
                {tag}
              </button>
            ))}
            {page?.task ? (
              <button className={`task-pill ${page.task.status === 'done' ? 'done' : ''}`} onClick={toggleCurrentTaskComplete} type="button">
                {page.task.status === 'done' ? 'Task Complete' : 'Task Open'}
                {page.task.dueAt ? ` \u00c2\u00b7 Due ${formatDueDate(page.task.dueAt)}` : ''}
              </button>
            ) : null}
          </div>
        </div>
        <div className="note-canvas-shell" ref={canvasScrollRef}>
          {isCurrentSectionLocked ? (
            <div className="section-lock-screen">
              <strong>{section?.name ?? 'Protected section'}</strong>
              <p>{section?.passwordHint ? `Hint: ${section.passwordHint}` : 'Unlock this section to view and edit its notes.'}</p>
              <button onClick={() => void unlockSection(section?.id ?? '')} type="button">
                Unlock Section
              </button>
            </div>
          ) : (
            <>
              <div className={`note-editor-surface ${isDrawActive ? 'draw-active' : ''}`} ref={inkSurfaceRef}>
                {showInkLayer ? (
                  <svg
                    className={`ink-page-layer ${isDrawActive ? 'is-active' : ''} ${pageWidthMode === 'wide' ? 'wide' : ''}`}
                    onPointerDown={beginInkStroke}
                    onPointerMove={moveInkStroke}
                    onPointerUp={endInkStroke}
                    onPointerLeave={endInkStroke}
                    ref={drawSurfaceRef}
                    style={{ zoom: editorZoom.toString() }}
                    viewBox={`0 0 ${inkViewport.width} ${inkViewport.height}`}
                  >
                    {page?.inkStrokes.map((stroke) => (
                      <polyline
                        key={stroke.id}
                        fill="none"
                        points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')}
                        stroke={stroke.color}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeOpacity={stroke.color === '#ffe266' ? 0.5 : 1}
                        strokeWidth={stroke.width}
                      />
                    ))}
                  </svg>
                ) : null}
                <div
                  className={`editor-canvas ${pageWidthMode === 'wide' ? 'wide' : ''} ${showRuleLines ? 'rule-lines' : ''}`}
                  contentEditable
                  onBlur={syncEditorContent}
                  onClick={handleEditorClick}
                  onDragEnd={handleEditorDragEnd}
                  onDragOver={handleEditorDragOver}
                  onDragStart={handleEditorDragStart}
                  onDrop={handleEditorDrop}
                  onInput={handleEditorInput}
                  onKeyDown={handleEditorKeyDown}
                  onPaste={(event) => void handleEditorPaste(event)}
                  onPointerDown={handleEditorPointerDown}
                  ref={editorRef}
                  style={{ zoom: editorZoom.toString() }}
                  suppressContentEditableWarning
                />
              </div>
            </>
          )}
        </div>
        <div className="status-strip">
          <span>{saveStatusText}</span>
          <span>
            {appName} v{displayVersion} | {searchScopeLabels[searchScope]}
          </span>
        </div>
      </div>
      <SidePanes {...sidePanes} />
    </section>
  )
}
