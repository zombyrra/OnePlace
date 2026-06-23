import type {
  KeyboardEvent as ReactKeyboardEvent,
  MutableRefObject,
  RefObject,
} from 'react'
import {
  escapeAttribute,
  escapeHtml,
  plainTextToHtml,
} from '../../app/appModel'
import type { Page } from '../../app/appModel'

type MeetingDrafts = {
  agenda: string
  attendees: string
  date: string
  location: string
  time: string
  title: string
}

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

  const runEditorCommand = (command: string, value?: string) => {
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

  const getChecklistContext = () => {
    const container = getSelectionContainerElement()
    const item = container?.closest('li')
    const list = item?.closest('ul.checklist')
    if (!item || !list) return null
    return { item, list }
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

  const insertExternalLink = () => {
    const url = window.prompt('Link URL', 'https://')
    if (!url) return
    const label = window.prompt('Text to display', url) || url
    insertHtmlAtSelection(`<a href="${escapeAttribute(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`)
  }

  const insertInternalPageLink = () => {
    const query = window.prompt('Link to which page? Search by title', page?.title ?? '')
    if (!query) return

    const match = searchPages(query)[0]
    if (!match) {
      window.alert('No matching page found.')
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
    runEditorCommand,
  }
}
