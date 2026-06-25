import { useEffect } from 'react'
import type { RibbonTab } from '../../app/appModel'
import type { TaskDuePreset } from './useSectionTaskActions'

type ShortcutActions = {
  addPage: () => void
  addPageBelowCurrent: () => void
  addSubpage: () => void
  clearCurrentPageTask: () => void
  clearCurrentPageTags: () => void
  closeSearchAndReturnToPage: () => void
  copySelectionFormatting: () => void
  createSection: () => void
  decreasePageNavigationWidth: () => void
  demoteCurrentPage: () => void
  emailCurrentPage: () => Promise<void> | void
  findNextCurrentPageMatch: () => void
  findPreviousCurrentPageMatch: () => void
  focusCurrentNotebook: () => void
  focusCurrentPage: () => void
  focusCurrentSection: () => void
  focusNextSearchResult: () => void
  focusPageTitle: () => void
  goBack: () => void
  goForward: () => void
  increasePageNavigationWidth: () => void
  insertExternalLink: () => void
  insertAuthorTimestamp: () => void
  insertHtmlAtSelection: (html: string) => void
  lockProtectedSections: () => void
  markCurrentPageUnread: () => void
  moveCurrentPageDown: () => void
  moveCurrentPageUp: () => void
  openCurrentPageFind: () => void
  openCurrentTask: () => void
  openMoveCopyPage: () => void
  openNotebook: () => void
  openSelectedSearchResult: () => void
  openSearchAll: () => void
  openShortcutHelp: () => void
  pasteSelectionFormatting: () => void
  playSelectedAudio: () => void
  printPage: () => void
  promoteCurrentPage: () => void
  runEditorCommand: (command: string, value?: string) => void
  saveNow: () => Promise<void> | void
  selectFirstPage: () => void
  selectLastPage: () => void
  selectNextPage: () => void
  selectNextSection: () => void
  selectPreviousPage: () => void
  selectPreviousSection: () => void
  selectAllPageContent: () => void
  setActiveTab: (tab: RibbonTab) => void
  setCurrentTaskDuePreset: (preset: TaskDuePreset) => void
  skipAudioPlayback: (deltaSeconds: number) => void
  startAudioRecording: () => Promise<void> | void
  stopAudio: () => Promise<void> | void
  syncEditorContent: () => void
  toggleCurrentTask: () => void
  toggleCurrentTaskComplete: () => void
  toggleFullPageView: () => void
  toggleCurrentPageCollapse: () => void
  toggleNamedTagOnCurrentPage: (tag: string) => void
  toggleRuleLines: () => void
  zoomBy: (delta: number) => void
}

type UseGlobalShortcutsArgs = {
  canEditPage: boolean
  shortcutActions: ShortcutActions
}

const isPlainTextInput = (target: EventTarget | null) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement

const isEditorTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement && Boolean(target.closest('.editor-canvas'))

const isDialogTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement && Boolean(target.closest('.op-dialog'))

const isSearchTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement && Boolean(target.closest('.op-tellme, .search-results'))

const isReviewPaneTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement && Boolean(target.closest('.review-pane'))

const isPlusKey = (event: KeyboardEvent) =>
  event.key === '+' || event.key === '=' || event.code === 'NumpadAdd'

const isMinusKey = (event: KeyboardEvent) =>
  event.key === '-' || event.key === '_' || event.code === 'Minus' || event.code === 'NumpadSubtract'

const isDigitKey = (event: KeyboardEvent, digit: number) =>
  event.key === String(digit) || event.code === `Digit${digit}` || event.code === `Numpad${digit}`

const isBracketLeftKey = (event: KeyboardEvent) => event.key === '[' || event.key === '{' || event.code === 'BracketLeft'
const isBracketRightKey = (event: KeyboardEvent) => event.key === ']' || event.key === '}' || event.code === 'BracketRight'

const formatDateForInsert = () => new Date().toLocaleDateString()
const formatTimeForInsert = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const formatDateTimeForInsert = () => new Date().toLocaleString()

export const useGlobalShortcuts = ({
  canEditPage,
  shortcutActions,
}: UseGlobalShortcutsArgs) => {
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return

      const target = event.target
      const key = event.key.toLowerCase()
      const primary = event.ctrlKey || event.metaKey
      const textInput = isPlainTextInput(target)
      const editorTarget = isEditorTarget(target)
      const inDialog = isDialogTarget(target)
      const searchTarget = isSearchTarget(target)
      const reviewPaneTarget = isReviewPaneTarget(target)
      const canUseEditorCommand = canEditPage && (editorTarget || !textInput)

      const run = (action: () => void) => {
        event.preventDefault()
        action()
      }

      const runEditor = (command: string, value?: string) => {
        if (!canUseEditorCommand) return false
        run(() => shortcutActions.runEditorCommand(command, value))
        return true
      }

      if (event.key === 'F1') {
        run(shortcutActions.openShortcutHelp)
        return
      }

      if (!inDialog && event.key === 'F11') {
        run(shortcutActions.toggleFullPageView)
        return
      }

      if (!inDialog && event.altKey && !primary && !event.shiftKey) {
        if (key === 'h') {
          run(() => shortcutActions.setActiveTab('Home'))
          return
        }
        if (key === 'n') {
          run(() => shortcutActions.setActiveTab('Insert'))
          return
        }
        if (key === 'd') {
          run(() => shortcutActions.setActiveTab('Draw'))
          return
        }
        if (key === 'w') {
          run(() => shortcutActions.setActiveTab('View'))
          return
        }
      }

      if (!inDialog && event.altKey && event.shiftKey && !primary) {
        if (key === 'd' && canEditPage) {
          run(() => shortcutActions.insertHtmlAtSelection(`<p>${formatDateForInsert()}</p>`))
          return
        }
        if (key === 'f' && canEditPage) {
          run(() => shortcutActions.insertHtmlAtSelection(`<p>${formatDateTimeForInsert()}</p>`))
          return
        }
        if (key === 't' && canEditPage) {
          run(() => shortcutActions.insertHtmlAtSelection(`<p>${formatTimeForInsert()}</p>`))
          return
        }
        if (event.key === 'ArrowUp') {
          run(shortcutActions.moveCurrentPageUp)
          return
        }
        if (event.key === 'ArrowDown') {
          run(shortcutActions.moveCurrentPageDown)
          return
        }
        if (event.key === 'ArrowRight') {
          if (runEditor('indent')) return
        }
        if (event.key === 'ArrowLeft') {
          if (runEditor('outdent')) return
        }
      }

      if (!inDialog && event.altKey && !primary && !event.shiftKey) {
        if (event.key === 'ArrowLeft') {
          run(shortcutActions.goBack)
          return
        }
        if (event.key === 'ArrowRight') {
          run(shortcutActions.goForward)
          return
        }
        if (event.key === 'Home') {
          run(shortcutActions.selectFirstPage)
          return
        }
        if (event.key === 'End') {
          run(shortcutActions.selectLastPage)
          return
        }
        if (event.key === 'PageUp') {
          run(shortcutActions.selectFirstPage)
          return
        }
        if (event.key === 'PageDown') {
          run(shortcutActions.selectLastPage)
          return
        }
        if (isMinusKey(event) && canEditPage) {
          if (runEditor('strikeThrough')) return
        }
      }

      if (!inDialog && event.key === 'F9') {
        run(() => void shortcutActions.saveNow())
        return
      }

      if (!inDialog && event.key === 'F3') {
        run(event.shiftKey ? shortcutActions.findPreviousCurrentPageMatch : shortcutActions.findNextCurrentPageMatch)
        return
      }

      if (!inDialog && searchTarget && event.key === 'ArrowDown') {
        run(shortcutActions.focusNextSearchResult)
        return
      }

      if (!inDialog && searchTarget && event.key === 'Enter') {
        run(shortcutActions.openSelectedSearchResult)
        return
      }

      if (!inDialog && reviewPaneTarget && event.key === 'Enter') {
        run(event.shiftKey ? shortcutActions.findPreviousCurrentPageMatch : shortcutActions.findNextCurrentPageMatch)
        return
      }

      if (!inDialog && (searchTarget || reviewPaneTarget) && event.key === 'Escape') {
        run(shortcutActions.closeSearchAndReturnToPage)
        return
      }

      if (!primary) return

      if (!inDialog && event.altKey && key === 'c' && !event.shiftKey && canEditPage) {
        run(shortcutActions.copySelectionFormatting)
        return
      }

      if (!inDialog && event.altKey && key === 'v' && !event.shiftKey && canEditPage) {
        run(shortcutActions.pasteSelectionFormatting)
        return
      }

      if (!inDialog && event.altKey && key === 'a' && !event.shiftKey) {
        run(() => void shortcutActions.startAudioRecording())
        return
      }

      if (!inDialog && event.altKey && key === 'p' && !event.shiftKey) {
        run(shortcutActions.playSelectedAudio)
        return
      }

      if (!inDialog && event.altKey && key === 's' && !event.shiftKey) {
        run(() => void shortcutActions.stopAudio())
        return
      }

      if (!inDialog && event.altKey && key === 'y' && !event.shiftKey) {
        run(() => shortcutActions.skipAudioPlayback(-10))
        return
      }

      if (!inDialog && event.altKey && key === 'u' && !event.shiftKey) {
        run(() => shortcutActions.skipAudioPlayback(10))
        return
      }

      if (!inDialog && event.altKey && key === 'm' && !event.shiftKey) {
        run(shortcutActions.openMoveCopyPage)
        return
      }

      if (!inDialog && event.altKey && event.shiftKey && key === 'o') {
        run(shortcutActions.focusCurrentSection)
        return
      }

      if (!inDialog && event.altKey && !event.shiftKey && isBracketLeftKey(event)) {
        run(shortcutActions.promoteCurrentPage)
        return
      }

      if (!inDialog && event.altKey && !event.shiftKey && isBracketRightKey(event)) {
        run(shortcutActions.demoteCurrentPage)
        return
      }

      if (!inDialog && !event.altKey && event.shiftKey && isBracketLeftKey(event)) {
        run(shortcutActions.increasePageNavigationWidth)
        return
      }

      if (!inDialog && !event.altKey && event.shiftKey && isBracketRightKey(event)) {
        run(shortcutActions.decreasePageNavigationWidth)
        return
      }

      if (!event.shiftKey && key === 's') {
        run(() => void shortcutActions.saveNow())
        return
      }

      if (!inDialog && key === 'o' && !event.altKey) {
        run(shortcutActions.openNotebook)
        return
      }

      if (!inDialog && key === 'p' && !event.altKey && !event.shiftKey) {
        run(shortcutActions.printPage)
        return
      }

      if (!inDialog && key === 'e' && !event.altKey && !event.shiftKey) {
        run(shortcutActions.openSearchAll)
        return
      }

      if (!inDialog && key === 'f' && !event.altKey && !event.shiftKey) {
        run(shortcutActions.openCurrentPageFind)
        return
      }

      if (!inDialog && key === 'e' && event.shiftKey && !event.altKey) {
        run(() => void shortcutActions.emailCurrentPage())
        return
      }

      if (!inDialog && key === 'm' && event.shiftKey && !event.altKey && canEditPage) {
        run(shortcutActions.insertAuthorTimestamp)
        return
      }

      if (!inDialog && key === 'q' && !event.shiftKey && !event.altKey) {
        run(shortcutActions.markCurrentPageUnread)
        return
      }

      if (!inDialog && event.shiftKey && !event.altKey) {
        if (isDigitKey(event, 1)) {
          run(() => shortcutActions.setCurrentTaskDuePreset('today'))
          return
        }
        if (isDigitKey(event, 2)) {
          run(() => shortcutActions.setCurrentTaskDuePreset('tomorrow'))
          return
        }
        if (isDigitKey(event, 3)) {
          run(() => shortcutActions.setCurrentTaskDuePreset('this-week'))
          return
        }
        if (isDigitKey(event, 4)) {
          run(() => shortcutActions.setCurrentTaskDuePreset('next-week'))
          return
        }
        if (isDigitKey(event, 5)) {
          run(() => shortcutActions.setCurrentTaskDuePreset('none'))
          return
        }
        if (isDigitKey(event, 9)) {
          run(shortcutActions.toggleCurrentTaskComplete)
          return
        }
        if (isDigitKey(event, 0)) {
          run(shortcutActions.clearCurrentPageTask)
          return
        }
        if (key === 'k') {
          run(shortcutActions.openCurrentTask)
          return
        }
      }

      if (!inDialog && key === 'n' && event.altKey && event.shiftKey) {
        run(shortcutActions.addSubpage)
        return
      }

      if (!inDialog && key === 'n' && event.altKey && !event.shiftKey) {
        run(shortcutActions.addPageBelowCurrent)
        return
      }

      if (!inDialog && key === 'n' && !event.altKey && !event.shiftKey) {
        run(shortcutActions.addPage)
        return
      }

      if (!inDialog && key === 't' && !event.altKey && !event.shiftKey) {
        run(shortcutActions.createSection)
        return
      }

      if (!inDialog && key === 'g') {
        if (event.altKey && !event.shiftKey) {
          run(shortcutActions.focusCurrentPage)
          return
        }
        if (event.shiftKey && !event.altKey) {
          run(shortcutActions.focusCurrentSection)
          return
        }
        if (!event.altKey && !event.shiftKey) {
          run(shortcutActions.focusCurrentNotebook)
          return
        }
      }

      if (!inDialog && event.key === 'PageDown' && !event.altKey && !event.shiftKey) {
        run(shortcutActions.selectNextPage)
        return
      }

      if (!inDialog && event.key === 'PageUp' && !event.altKey && !event.shiftKey) {
        run(shortcutActions.selectPreviousPage)
        return
      }

      if (!inDialog && event.key === 'Tab' && !event.altKey) {
        run(event.shiftKey ? shortcutActions.selectPreviousSection : shortcutActions.selectNextSection)
        return
      }

      if (!inDialog && event.shiftKey && key === 't' && !event.altKey) {
        run(shortcutActions.focusPageTitle)
        return
      }

      if (!inDialog && key === 'a' && event.shiftKey && !event.altKey) {
        run(shortcutActions.focusCurrentPage)
        return
      }

      if (!inDialog && event.shiftKey && !event.altKey && (event.key === '*' || event.code === 'Digit8')) {
        run(shortcutActions.toggleCurrentPageCollapse)
        return
      }

      if (!inDialog && event.altKey && key === 'l' && !event.shiftKey) {
        run(shortcutActions.lockProtectedSections)
        return
      }

      if (!inDialog && event.shiftKey && key === 'r' && !event.altKey) {
        run(shortcutActions.toggleRuleLines)
        return
      }

      if (!inDialog && event.altKey && (event.shiftKey || event.code === 'NumpadAdd') && isPlusKey(event)) {
        run(() => shortcutActions.zoomBy(0.1))
        return
      }

      if (!inDialog && event.altKey && (event.shiftKey || event.code === 'NumpadSubtract') && isMinusKey(event)) {
        run(() => shortcutActions.zoomBy(-0.1))
        return
      }

      if (!textInput && !inDialog) {
        if (isDigitKey(event, 6) && !event.shiftKey && !event.altKey) {
          run(() => shortcutActions.toggleNamedTagOnCurrentPage('Highlight'))
          return
        }
        if (isDigitKey(event, 7) && !event.shiftKey && !event.altKey) {
          run(() => shortcutActions.toggleNamedTagOnCurrentPage('Contact'))
          return
        }
        if (isDigitKey(event, 8) && !event.shiftKey && !event.altKey) {
          run(() => shortcutActions.toggleNamedTagOnCurrentPage('Address'))
          return
        }
        if (isDigitKey(event, 9) && !event.shiftKey && !event.altKey) {
          run(() => shortcutActions.toggleNamedTagOnCurrentPage('Phone number'))
          return
        }
        if (isDigitKey(event, 1) && !event.shiftKey && !event.altKey) {
          run(shortcutActions.toggleCurrentTask)
          return
        }
        if (isDigitKey(event, 2) && !event.shiftKey && !event.altKey) {
          run(() => shortcutActions.toggleNamedTagOnCurrentPage('Important'))
          return
        }
        if (isDigitKey(event, 3) && !event.shiftKey && !event.altKey) {
          run(() => shortcutActions.toggleNamedTagOnCurrentPage('Question'))
          return
        }
        if (isDigitKey(event, 4) && !event.shiftKey && !event.altKey) {
          run(() => shortcutActions.toggleNamedTagOnCurrentPage('Remember for later'))
          return
        }
        if (isDigitKey(event, 5) && !event.shiftKey && !event.altKey) {
          run(() => shortcutActions.toggleNamedTagOnCurrentPage('Definition'))
          return
        }
        if (isDigitKey(event, 0) && !event.shiftKey && !event.altKey) {
          run(shortcutActions.clearCurrentPageTags)
          return
        }
      }

      if (key === 'a' && !event.altKey && !event.shiftKey && !textInput) {
        run(shortcutActions.selectAllPageContent)
        return
      }

      if (!editorTarget && !textInput && !event.altKey && !event.shiftKey && isPlusKey(event)) {
        run(() => shortcutActions.zoomBy(0.1))
        return
      }

      if (!editorTarget && !textInput && !event.altKey && !event.shiftKey && isMinusKey(event)) {
        run(() => shortcutActions.zoomBy(-0.1))
        return
      }

      if (key === 'k' && !event.altKey && !event.shiftKey && canUseEditorCommand) {
        run(shortcutActions.insertExternalLink)
        return
      }

      if (key === 'b' && !event.altKey && !event.shiftKey) {
        if (runEditor('bold')) return
      }

      if (key === 'i' && !event.altKey && !event.shiftKey) {
        if (runEditor('italic')) return
      }

      if (key === 'u' && !event.altKey && !event.shiftKey) {
        if (runEditor('underline')) return
      }

      if ((key === 'h' && event.shiftKey && !event.altKey) || (key === 'h' && event.altKey && !event.shiftKey)) {
        if (runEditor('hiliteColor', '#fff4a3')) return
      }

      if (isMinusKey(event) && !event.altKey && !event.shiftKey) {
        if (runEditor('strikeThrough')) return
      }

      if (isPlusKey(event) && event.shiftKey && !event.altKey) {
        if (runEditor('superscript')) return
      }

      if (isPlusKey(event) && !event.shiftKey && !event.altKey) {
        if (runEditor('subscript')) return
      }

      if (event.key === '.' && !event.shiftKey && !event.altKey) {
        if (runEditor('insertUnorderedList')) return
      }

      if (event.key === '/' && !event.shiftKey && !event.altKey) {
        if (runEditor('insertOrderedList')) return
      }

      if (event.altKey && !event.shiftKey) {
        for (let level = 1; level <= 6; level += 1) {
          if (isDigitKey(event, level)) {
            if (runEditor('formatBlock', `h${level}`)) return
          }
        }
      }

      if (event.shiftKey && key === 'n' && !event.altKey) {
        if (runEditor('removeFormat')) return
      }

      if (key === 'l' && !event.shiftKey && !event.altKey) {
        if (runEditor('justifyLeft')) return
      }

      if (key === 'r' && !event.shiftKey && !event.altKey) {
        if (runEditor('justifyRight')) return
      }

      if (event.shiftKey && (event.key === '>' || event.key === '.')) {
        if (runEditor('fontSize', '5')) return
      }

      if (event.shiftKey && (event.key === '<' || event.key === ',')) {
        if (runEditor('fontSize', '2')) return
      }

      window.setTimeout(shortcutActions.syncEditorContent, 0)
    }

    window.addEventListener('keydown', handleShortcut)
    return () => {
      window.removeEventListener('keydown', handleShortcut)
    }
  }, [canEditPage, shortcutActions])
}
