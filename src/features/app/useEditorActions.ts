import {
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
  type RefObject,
} from 'react'
import {
  escapeAttribute,
  escapeHtml,
  plainTextToHtml,
} from '../../app/appModel'
import type { Page } from '../../app/appModel'
import { dialogs } from '../../components/ui/dialogContext'

type MeetingDrafts = {
  agenda: string
  attendees: string
  date: string
  location: string
  time: string
  title: string
}

type TextFormatSnapshot = {
  blockTag: string
  bold: boolean
  fontName: string
  fontSize: string
  foreColor: string
  hiliteColor: string
  italic: boolean
  strikeThrough: boolean
  subscript: boolean
  superscript: boolean
  underline: boolean
}

type TableContext = {
  cell: HTMLTableCellElement
  row: HTMLTableRowElement
  table: HTMLTableElement
}

const alignmentCommands: Record<string, string> = {
  justifyCenter: 'op-align-center',
  justifyFull: 'op-align-justify',
  justifyLeft: 'op-align-left',
  justifyRight: 'op-align-right',
}

const alignmentClasses = Object.values(alignmentCommands)
const indentClasses = ['op-indent-1', 'op-indent-2', 'op-indent-3', 'op-indent-4']
const editableBlockSelector = 'p,h1,h2,h3,h4,h5,h6,blockquote,pre,li,td,th,div,section'

type Args = {
  editorRef: RefObject<HTMLDivElement | null>
  fontMenuClose: () => void
  fontSizeMenuClose: () => void
  keepCaretInView: (behavior?: ScrollBehavior) => void
  page: Page | undefined
  pageTemplates: Array<{ html: string; id: string; label: string }>
  searchPages: (query: string) => Array<{ notebookName: string; page: Page; sectionName: string }>
  setMeetingAgendaDraft: (value: string) => void
  setMeetingAttendeesDraft: (value: string) => void
  setMeetingDateDraft: (value: string) => void
  selectedFontSizeSetter: (label: string) => void
  selectedFontFamilySetter: (fontFamily: string) => void
  selectedTemplateId: string
  selectionRangeRef: MutableRefObject<Range | null>
  setIsMeetingDetailsOpen: (value: boolean) => void
  setIsTemplatePaneOpen: (value: boolean) => void
  setMeetingLocationDraft: (value: string) => void
  setMeetingTimeDraft: (value: string) => void
  setMeetingTitleDraft: (value: string) => void
  setSaveLabel: (value: string) => void
  setSelectedTemplateId: (value: string) => void
  styleMenuClose: () => void
  syncEditorContent: () => void
}

export const useEditorActions = ({
  editorRef,
  fontMenuClose,
  fontSizeMenuClose,
  keepCaretInView,
  page,
  pageTemplates,
  searchPages,
  setMeetingAgendaDraft,
  setMeetingAttendeesDraft,
  setMeetingDateDraft,
  selectedFontSizeSetter,
  selectedFontFamilySetter,
  selectedTemplateId,
  selectionRangeRef,
  setIsMeetingDetailsOpen,
  setIsTemplatePaneOpen,
  setMeetingLocationDraft,
  setMeetingTimeDraft,
  setMeetingTitleDraft,
  setSaveLabel,
  setSelectedTemplateId,
  styleMenuClose,
  syncEditorContent,
}: Args) => {
  const formatPainterRef = useRef<TextFormatSnapshot | null>(null)
  const tableDeletePressRef = useRef<{ at: number; cell: HTMLTableCellElement | null }>({ at: 0, cell: null })

  const focusEditor = (restoreSelection = true) => {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    if (restoreSelection && selectionRangeRef.current) {
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(selectionRangeRef.current)
    }
  }

  const getEditableBlocksForRange = (range: Range) => {
    const editor = editorRef.current
    if (!editor) return []

    const blockSet = new Set<HTMLElement>()
    const addBlockForNode = (node: Node) => {
      const element = node instanceof Element ? node : node.parentNode instanceof Element ? node.parentNode : null
      const block = element?.closest(editableBlockSelector)
      if (block instanceof HTMLElement && editor.contains(block)) {
        blockSet.add(block)
      }
    }

    addBlockForNode(range.startContainer)
    addBlockForNode(range.endContainer)

    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        if (!(node instanceof HTMLElement) || !node.matches(editableBlockSelector)) {
          return NodeFilter.FILTER_SKIP
        }
        return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
      },
    })

    while (walker.nextNode()) {
      if (walker.currentNode instanceof HTMLElement) {
        blockSet.add(walker.currentNode)
      }
    }

    if (blockSet.size === 0) blockSet.add(editor)
    return Array.from(blockSet)
  }

  const applyAlignmentClass = (command: string) => {
    const className = alignmentCommands[command]
    if (!className) return false

    focusEditor()
    const range = getActiveEditorRange()
    if (!range) return true

    for (const block of getEditableBlocksForRange(range)) {
      block.classList.remove(...alignmentClasses)
      if (className !== 'op-align-left') {
        block.classList.add(className)
      }
    }

    syncEditorContent()
    window.setTimeout(() => keepCaretInView(), 0)
    return true
  }

  const applyIndentClass = (direction: 1 | -1) => {
    focusEditor()
    const range = getActiveEditorRange()
    if (!range) return true

    for (const block of getEditableBlocksForRange(range)) {
      const currentIndex = indentClasses.findIndex((className) => block.classList.contains(className))
      const nextIndex = Math.max(-1, Math.min(indentClasses.length - 1, currentIndex + direction))
      block.classList.remove(...indentClasses)
      if (nextIndex >= 0) {
        block.classList.add(indentClasses[nextIndex])
      }
    }

    syncEditorContent()
    window.setTimeout(() => keepCaretInView(), 0)
    return true
  }

  const runEditorCommand = (command: string, value?: string) => {
    if (applyAlignmentClass(command)) return
    if (command === 'indent' && applyIndentClass(1)) return
    if (command === 'outdent' && applyIndentClass(-1)) return

    focusEditor()
    document.execCommand(command, false, value)
    syncEditorContent()
    window.setTimeout(() => {
      keepCaretInView()
    }, 0)
  }

  const handleEditorInput = () => {
    syncEditorContent()
  }

  const getActiveEditorRange = () => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        return range
      }
    }

    if (selectionRangeRef.current) {
      return selectionRangeRef.current
    }

    const editor = editorRef.current
    if (!editor) return null
    const range = document.createRange()
    range.selectNodeContents(editor)
    range.collapse(false)
    return range
  }

  const insertHtmlAtSelection = (html: string) => {
    const editor = editorRef.current
    if (!editor) return

    focusEditor()
    const range = getActiveEditorRange()
    if (!range) return

    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)

    const template = document.createElement('template')
    template.innerHTML = html.trim()
    const fragment = template.content.cloneNode(true)
    const lastNode = fragment.lastChild

    range.deleteContents()
    range.insertNode(fragment)

    const nextRange = document.createRange()
    if (lastNode) {
      nextRange.setStartAfter(lastNode)
    } else {
      nextRange.selectNodeContents(editor)
      nextRange.collapse(false)
    }
    nextRange.collapse(true)
    selection?.removeAllRanges()
    selection?.addRange(nextRange)
    selectionRangeRef.current = nextRange.cloneRange()
    syncEditorContent()
    window.setTimeout(() => {
      keepCaretInView('smooth')
    }, 0)
  }

  const insertTextAsHtml = (value: string) => {
    const normalizedValue = value.replace(/\r\n?/g, '\n')
    const html = plainTextToHtml(normalizedValue)

    if (!normalizedValue.includes('\n') && html.startsWith('<p>') && html.endsWith('</p>')) {
      insertHtmlAtSelection(html.slice(3, -4))
      return
    }

    insertHtmlAtSelection(html)
  }

  const insertChecklist = () => {
    insertHtmlAtSelection('<ul class="checklist"><li><label><input type="checkbox" /> New task</label></li></ul>')
  }

  const insertTable = () => {
    insertHtmlAtSelection('<table><tbody><tr><td><br /></td><td><br /></td></tr><tr><td><br /></td><td><br /></td></tr></tbody></table>')
  }

  const getSelectionContainerElement = () => {
    const selection = window.getSelection()
    const anchor = selection?.anchorNode
    if (!anchor) return null
    return anchor.nodeType === Node.TEXT_NODE ? anchor.parentElement : (anchor as HTMLElement)
  }

  const getCurrentBlockTag = () => {
    const container = getSelectionContainerElement()
    const block = container?.closest('p,h1,h2,h3,h4,h5,h6,blockquote,pre')
    return block?.tagName.toLowerCase() ?? 'p'
  }

  const readCommandValue = (command: string) => {
    const value = document.queryCommandValue(command)
    return typeof value === 'string' ? value : ''
  }

  const copySelectionFormatting = () => {
    focusEditor()
    const hiliteColor = readCommandValue('hiliteColor') || readCommandValue('backColor')
    formatPainterRef.current = {
      blockTag: getCurrentBlockTag(),
      bold: document.queryCommandState('bold'),
      fontName: readCommandValue('fontName'),
      fontSize: readCommandValue('fontSize'),
      foreColor: readCommandValue('foreColor'),
      hiliteColor,
      italic: document.queryCommandState('italic'),
      strikeThrough: document.queryCommandState('strikeThrough'),
      subscript: document.queryCommandState('subscript'),
      superscript: document.queryCommandState('superscript'),
      underline: document.queryCommandState('underline'),
    }
    setSaveLabel('Copied formatting')
  }

  const pasteSelectionFormatting = () => {
    const format = formatPainterRef.current
    if (!format) {
      setSaveLabel('No copied formatting yet')
      return
    }

    focusEditor()
    const setCommandState = (command: string, enabled: boolean) => {
      if (document.queryCommandState(command) !== enabled) {
        document.execCommand(command)
      }
    }

    if (format.blockTag) document.execCommand('formatBlock', false, format.blockTag)
    if (format.fontName) document.execCommand('fontName', false, format.fontName)
    if (format.fontSize) document.execCommand('fontSize', false, format.fontSize)
    if (format.foreColor) document.execCommand('foreColor', false, format.foreColor)
    if (format.hiliteColor && format.hiliteColor !== 'transparent') {
      document.execCommand('hiliteColor', false, format.hiliteColor)
    }

    setCommandState('bold', format.bold)
    setCommandState('italic', format.italic)
    setCommandState('underline', format.underline)
    setCommandState('strikeThrough', format.strikeThrough)
    setCommandState('subscript', format.subscript)
    setCommandState('superscript', format.superscript)
    syncEditorContent()
    setSaveLabel('Pasted formatting')
    window.setTimeout(() => {
      keepCaretInView()
    }, 0)
  }

  const getChecklistContext = () => {
    const container = getSelectionContainerElement()
    const item = container?.closest('li')
    const list = item?.closest('ul.checklist')
    if (!item || !list) return null
    return { item, list }
  }

  const getTableContext = (): TableContext | null => {
    const container = getSelectionContainerElement()
    const cell = container?.closest('td,th')
    if (!(cell instanceof HTMLTableCellElement)) return null
    const row = cell.parentElement
    const table = cell.closest('table')
    if (!(row instanceof HTMLTableRowElement) || !(table instanceof HTMLTableElement)) return null
    return { cell, row, table }
  }

  const createTableCell = () => {
    const cell = document.createElement('td')
    cell.innerHTML = '<br />'
    return cell
  }

  const focusTableCell = (cell: HTMLTableCellElement) => {
    const range = document.createRange()
    range.selectNodeContents(cell)
    range.collapse(false)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    selectionRangeRef.current = range.cloneRange()
    focusEditor(false)
    window.setTimeout(syncEditorContent, 0)
  }

  const insertTableRowBelow = ({ row }: TableContext) => {
    const newRow = document.createElement('tr')
    const columnCount = Math.max(row.cells.length, 1)
    for (let index = 0; index < columnCount; index += 1) {
      newRow.append(createTableCell())
    }
    row.insertAdjacentElement('afterend', newRow)
    focusTableCell(newRow.cells[0])
  }

  const insertTableRowAbove = ({ row }: TableContext) => {
    const newRow = document.createElement('tr')
    const columnCount = Math.max(row.cells.length, 1)
    for (let index = 0; index < columnCount; index += 1) {
      newRow.append(createTableCell())
    }
    row.insertAdjacentElement('beforebegin', newRow)
    focusTableCell(newRow.cells[0])
  }

  const insertTableColumn = ({ cell, row, table }: TableContext, side: 'left' | 'right') => {
    const referenceIndex = cell.cellIndex + (side === 'right' ? 1 : 0)
    let targetCell: HTMLTableCellElement | null = null

    for (const tableRow of Array.from(table.rows)) {
      const newCell = createTableCell()
      tableRow.insertBefore(newCell, tableRow.cells[referenceIndex] ?? null)
      if (tableRow === row) targetCell = newCell
    }

    if (targetCell) focusTableCell(targetCell)
  }

  const moveToAdjacentTableCell = (context: TableContext, direction: -1 | 1) => {
    const cells = Array.from(context.table.rows).flatMap((tableRow) => Array.from(tableRow.cells))
    const currentIndex = cells.indexOf(context.cell)
    const nextCell = cells[currentIndex + direction]
    if (nextCell) {
      focusTableCell(nextCell)
      return
    }

    if (direction > 0) {
      insertTableRowBelow({ ...context, row: context.table.rows[context.table.rows.length - 1] ?? context.row })
    }
  }

  const getActiveRangeInEditor = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return null
    const range = selection.getRangeAt(0)
    if (!editorRef.current?.contains(range.commonAncestorContainer)) return null
    return range
  }

  const isRangeAtStartOfCell = (cell: HTMLTableCellElement) => {
    const range = getActiveRangeInEditor()
    if (!range?.collapsed || !cell.contains(range.startContainer)) return false
    const beforeRange = document.createRange()
    beforeRange.selectNodeContents(cell)
    beforeRange.setEnd(range.startContainer, range.startOffset)
    return beforeRange.toString().trim().length === 0
  }

  const isRangeAtEndOfCell = (cell: HTMLTableCellElement) => {
    const range = getActiveRangeInEditor()
    if (!range?.collapsed || !cell.contains(range.startContainer)) return false
    const afterRange = document.createRange()
    afterRange.selectNodeContents(cell)
    afterRange.setStart(range.startContainer, range.startOffset)
    return afterRange.toString().trim().length === 0
  }

  const isTableCellEmpty = (cell: HTMLTableCellElement) =>
    !cell.textContent?.trim() &&
    !cell.querySelector('img,audio,iframe,.attachment-card,.printout-card,.markmap-card')

  const deleteTableRow = ({ row, table }: TableContext) => {
    const rowIndex = row.rowIndex
    const nextFocusRow = table.rows[rowIndex + 1] ?? table.rows[rowIndex - 1]

    if (table.rows.length <= 1) {
      const paragraph = document.createElement('p')
      paragraph.innerHTML = '<br />'
      table.insertAdjacentElement('afterend', paragraph)
      table.remove()
      focusEditor(false)
      syncEditorContent()
      return
    }

    row.remove()
    if (nextFocusRow?.cells[0]) {
      focusTableCell(nextFocusRow.cells[0])
    } else {
      syncEditorContent()
    }
  }

  const focusChecklistItem = (item: HTMLLIElement) => {
    const label = item.querySelector('label')
    if (!label) return
    const textNode = Array.from(label.childNodes).find((node) => node.nodeType === Node.TEXT_NODE) ?? label
    const range = document.createRange()
    range.selectNodeContents(textNode)
    range.collapse(false)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    selectionRangeRef.current = range.cloneRange()
    focusEditor(false)
  }

  const createChecklistItemNode = (text = '') => {
    const item = document.createElement('li')
    item.innerHTML = `<label><input type="checkbox" /> ${escapeHtml(text)}</label>`
    return item
  }

  const insertExternalLink = async () => {
    const url = await dialogs.prompt({
      title: 'Insert link',
      label: 'Address',
      defaultValue: 'https://',
      placeholder: 'https://example.com',
      confirmText: 'Insert',
    })
    if (!url) return
    const label =
      (await dialogs.prompt({ title: 'Insert link', label: 'Text to display', defaultValue: url, confirmText: 'Insert' })) || url
    insertHtmlAtSelection(`<a href="${escapeAttribute(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`)
  }

  const insertInternalPageLink = async () => {
    const query = await dialogs.prompt({
      title: 'Link to page',
      label: 'Search by title',
      defaultValue: page?.title ?? '',
      confirmText: 'Insert',
    })
    if (!query) return

    const match = searchPages(query)[0]
    if (!match) {
      setSaveLabel('No matching page found.')
      return
    }

    insertHtmlAtSelection(
      `<a href="#page-${escapeAttribute(match.page.id)}" data-page-id="${escapeAttribute(match.page.id)}">${escapeHtml(match.page.title)}</a>`,
    )
    setSaveLabel(`Linked to ${match.page.title}`)
  }

  const applyPageTemplate = () => {
    setSelectedTemplateId(selectedTemplateId || pageTemplates[0]?.id || '')
    setIsTemplatePaneOpen(true)
  }

  const insertSelectedTemplate = () => {
    const template = pageTemplates.find((entry) => entry.id === selectedTemplateId) ?? pageTemplates[0]
    if (!template) return
    insertHtmlAtSelection(template.html)
    setIsTemplatePaneOpen(false)
    setSaveLabel(`Inserted ${template.label}`)
  }

  const openMeetingDetailsPane = () => {
    setMeetingTitleDraft(page?.title?.trim() && page.title !== 'Untitled Page' ? page.title : 'Team Sync')
    setMeetingDateDraft(new Date().toISOString().slice(0, 10))
    setMeetingTimeDraft(new Date().toTimeString().slice(0, 5))
    setMeetingLocationDraft('')
    setMeetingAttendeesDraft('')
    setMeetingAgendaDraft('Wins\nRisks\nNext steps')
    setIsMeetingDetailsOpen(true)
  }

  const insertMeetingDetails = (drafts: MeetingDrafts) => {
    const attendees = drafts.attendees
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    const agendaItems = drafts.agenda
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean)

    const attendeeMarkup =
      attendees.length > 0 ? attendees.map((value) => `<li>${escapeHtml(value)}</li>`).join('') : '<li></li>'
    const agendaMarkup =
      agendaItems.length > 0 ? agendaItems.map((value) => `<li>${escapeHtml(value)}</li>`).join('') : '<li></li>'

    insertHtmlAtSelection(`
      <section class="template-block meeting-details-block">
        <h2>${escapeHtml(drafts.title.trim() || 'Meeting Details')}</h2>
        <p><strong>Date:</strong> ${escapeHtml(drafts.date || new Date().toLocaleDateString())}</p>
        <p><strong>Time:</strong> ${escapeHtml(drafts.time || 'TBD')}</p>
        <p><strong>Location:</strong> ${escapeHtml(drafts.location.trim() || 'TBD')}</p>
        <h3>Attendees</h3>
        <ul>${attendeeMarkup}</ul>
        <h3>Agenda</h3>
        <ul>${agendaMarkup}</ul>
        <h3>Notes</h3>
        <p></p>
        <h3>Action Items</h3>
        <ul class="checklist"><li><label><input type="checkbox" /> Follow up</label></li></ul>
      </section>
    `)
    setIsMeetingDetailsOpen(false)
    setSaveLabel(`Inserted meeting details for ${drafts.title.trim() || 'meeting'}`)
  }

  const handleEditorKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const tableContext = getTableContext()
    if (tableContext) {
      if (event.key === 'Delete' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
        const rowIsEmpty = Array.from(tableContext.row.cells).every((cell) =>
          isTableCellEmpty(cell as HTMLTableCellElement),
        )
        if (rowIsEmpty && isRangeAtStartOfCell(tableContext.cell)) {
          event.preventDefault()
          const now = Date.now()
          if (
            tableDeletePressRef.current.cell === tableContext.cell &&
            now - tableDeletePressRef.current.at < 1300
          ) {
            tableDeletePressRef.current = { at: 0, cell: null }
            deleteTableRow(tableContext)
            return
          }

          tableDeletePressRef.current = { at: now, cell: tableContext.cell }
          setSaveLabel('Press Delete again to remove empty table row')
          return
        }
      }

      if (event.key === 'Tab') {
        event.preventDefault()
        moveToAdjacentTableCell(tableContext, event.shiftKey ? -1 : 1)
        return
      }

      if (
        event.key === 'Enter' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey &&
        tableContext.cell.cellIndex === 0 &&
        tableContext.row.rowIndex > 0 &&
        isRangeAtStartOfCell(tableContext.cell)
      ) {
        event.preventDefault()
        insertTableRowAbove(tableContext)
        return
      }

      if (
        event.key === 'Enter' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey &&
        tableContext.row.rowIndex === tableContext.table.rows.length - 1 &&
        tableContext.cell.cellIndex === tableContext.row.cells.length - 1 &&
        isRangeAtEndOfCell(tableContext.cell)
      ) {
        event.preventDefault()
        insertTableRowBelow(tableContext)
        return
      }

      if (event.key === 'Enter' && event.ctrlKey) {
        event.preventDefault()
        insertTableRowBelow(tableContext)
        return
      }

      if (event.key === 'Enter' && event.altKey) {
        event.preventDefault()
        insertHtmlAtSelection('<br /><br />')
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.altKey && event.key.toLowerCase() === 'r') {
        event.preventDefault()
        insertTableColumn(tableContext, 'right')
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.altKey && event.key.toLowerCase() === 'e') {
        event.preventDefault()
        insertTableColumn(tableContext, 'left')
        return
      }
    }

    if (event.key === 'Tab') {
      event.preventDefault()
      runEditorCommand(event.shiftKey ? 'outdent' : 'indent')
      return
    }

    if (event.key === 'Enter') {
      const checklistContext = getChecklistContext()
      if (checklistContext) {
        event.preventDefault()
        const nextItem = createChecklistItemNode()
        checklistContext.item.insertAdjacentElement('afterend', nextItem)
        focusChecklistItem(nextItem)
        window.setTimeout(syncEditorContent, 0)
        return
      }
    }

    if (event.key === 'Backspace') {
      const checklistContext = getChecklistContext()
      if (checklistContext) {
        const labelText =
          checklistContext.item.querySelector('label')?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        if (!labelText) {
          event.preventDefault()
          const nextItem =
            (checklistContext.item.previousElementSibling as HTMLLIElement | null) ??
            (checklistContext.item.nextElementSibling as HTMLLIElement | null)
          checklistContext.item.remove()

          if (checklistContext.list.children.length === 0) {
            const paragraph = document.createElement('p')
            paragraph.append(document.createTextNode(''))
            checklistContext.list.insertAdjacentElement('afterend', paragraph)
            checklistContext.list.remove()
            focusEditor(false)
          } else if (nextItem) {
            focusChecklistItem(nextItem)
          }

          window.setTimeout(syncEditorContent, 0)
          return
        }
      }
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      insertExternalLink()
      return
    }

    window.setTimeout(() => {
      keepCaretInView()
    }, 0)
  }

  const insertTemplate = (html: string) => {
    insertHtmlAtSelection(html)
  }

  const applyStylePreset = (html: string) => {
    insertTemplate(html)
    styleMenuClose()
  }

  const applyFontFamily = (fontFamily: string) => {
    selectedFontFamilySetter(fontFamily)
    runEditorCommand('fontName', fontFamily)
    fontMenuClose()
  }

  const applyFontSize = (fontSizeCommand: string, label: string) => {
    selectedFontSizeSetter(label)
    runEditorCommand('fontSize', fontSizeCommand)
    fontSizeMenuClose()
  }

  return {
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
  }
}
