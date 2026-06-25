import type { ComponentProps, CSSProperties } from 'react'
import type { ContextMenuState, DragPosition, DragState } from '../../app/appModel'
import { CommandBar } from './CommandBar'
import { ContextMenuOverlay } from './ContextMenuOverlay'
import { DragBadge } from './DragBadge'
import { FileInputs } from './FileInputs'
import { MoveCopyPageDialog } from './MoveCopyPageDialog'
import { NavRail } from './NavRail'
import { NotePane } from './NotePane'
import { NotebooksPane } from './NotebooksPane'
import { PagesPane } from './PagesPane'
import { RibbonBar } from './RibbonBar'
import { ShortcutHelpDialog } from './ShortcutHelpDialog'
import { TitleBar } from './TitleBar'

type AppShellProps = {
  contextMenu: ContextMenuState | null
  dragLabel: string
  dragPosition: DragPosition | null
  dragState: DragState | null
  fileInputProps: ComponentProps<typeof FileInputs>
  isNotebookPaneVisible: boolean
  isPagesPaneVisible: boolean
  commandBarProps: ComponentProps<typeof CommandBar>
  moveCopyPageDialogProps: ComponentProps<typeof MoveCopyPageDialog>
  navRailProps: ComponentProps<typeof NavRail>
  notePaneProps: ComponentProps<typeof NotePane>
  notebooksPaneProps: ComponentProps<typeof NotebooksPane>
  onRequestCloseContextMenu: () => void
  pagesPaneProps: ComponentProps<typeof PagesPane>
  pagesPaneWidth: number
  ribbonBarProps: ComponentProps<typeof RibbonBar>
  shortcutHelpDialogProps: ComponentProps<typeof ShortcutHelpDialog>
  titleBarProps: ComponentProps<typeof TitleBar>
}

export function AppShell({
  contextMenu,
  dragLabel,
  dragPosition,
  dragState,
  fileInputProps,
  isNotebookPaneVisible,
  isPagesPaneVisible,
  commandBarProps,
  moveCopyPageDialogProps,
  navRailProps,
  notePaneProps,
  notebooksPaneProps,
  onRequestCloseContextMenu,
  pagesPaneProps,
  pagesPaneWidth,
  ribbonBarProps,
  shortcutHelpDialogProps,
  titleBarProps,
}: AppShellProps) {
  return (
    <div className={`desktop-scene ${dragState ? 'drag-active' : ''}`}>
      <div className={`onenote-window ${dragState ? `dragging-${dragState.type}` : ''}`}>
        <TitleBar {...titleBarProps} />
        <CommandBar {...commandBarProps} />
        <RibbonBar {...ribbonBarProps} />
        <div className="op-body">
          <NavRail {...navRailProps} />
          <main
            className={`workspace ${isNotebookPaneVisible ? '' : 'notebooks-hidden'} ${isPagesPaneVisible ? '' : 'pages-hidden'}`}
            style={{ '--pages-pane-width': `${pagesPaneWidth}px` } as CSSProperties}
          >
            <NotebooksPane {...notebooksPaneProps} />
            <PagesPane {...pagesPaneProps} />
            <NotePane {...notePaneProps} />
          </main>
        </div>
      </div>
      <FileInputs {...fileInputProps} />
      <ContextMenuOverlay contextMenu={contextMenu} onRequestClose={onRequestCloseContextMenu} />
      <MoveCopyPageDialog {...moveCopyPageDialogProps} />
      <ShortcutHelpDialog {...shortcutHelpDialogProps} />
      <DragBadge dragLabel={dragLabel} dragPosition={dragPosition} dragState={dragState} />
    </div>
  )
}
