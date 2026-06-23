import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react'
import {
  escapeHtml,
  extractExportText,
  extractSnippetText,
  formatDate,
  formatPageDate,
  formatPageTime,
  hydratePageContent,
  normalizeTerminalText,
  plainTextToHtml,
  saveRecentNotebookEntries,
} from '../../app/appModel'
import type { AppAsset, AppState, Notebook, Page, PageUpdate, RecentNotebookEntry, Section } from '../../app/appModel'
import {
  exportNotebookDirectory,
  exportPageFile,
  pickExportFilePath,
  pickNotebookSaveDirectory,
  saveDesktopData,
} from '../../lib/desktop'

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))

type Args = {
  appState: AppState
  attachmentInputRef: RefObject<HTMLInputElement | null>
  editorRef: RefObject<HTMLDivElement | null>
  imageInputRef: RefObject<HTMLInputElement | null>
  lastSavedPayloadRef: MutableRefObject<string>
  notebook: Notebook | undefined
  page: Page | undefined
  printoutInputRef: RefObject<HTMLInputElement | null>
  recentNotebookEntries: RecentNotebookEntry[]
  section: Section | undefined
  setAppState: Dispatch<SetStateAction<AppState>>
  setIsDirty: (value: boolean) => void
  setRecentNotebookEntries: (value: RecentNotebookEntry[]) => void
  setSaveLabel: (value: string) => void
  updatePage: (updates: PageUpdate) => void
}

export const useFileActions = ({
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
}: Args) => {
  const saveNow = async () => {
    const payload = JSON.stringify(appState)
    if (payload === lastSavedPayloadRef.current) {
      setSaveLabel('All changes saved')
      setIsDirty(false)
      return
    }
    setSaveLabel('Saving...')
    try {
      const result = await saveDesktopData(payload)
      lastSavedPayloadRef.current = payload
      setIsDirty(false)
      setSaveLabel(`Saved ${formatDate(result.savedAt)}`)
    } catch (error) {
      const message = getErrorMessage(error)
      setIsDirty(true)
      setSaveLabel(`Save failed: ${message}`)
      window.alert(`Save failed.\n\n${message}`)
    }
  }

  const saveNotebookAs = async () => {
    if (!notebook) return

    try {
      const path = await pickNotebookSaveDirectory()
      if (!path) return

      const result = await exportNotebookDirectory(path, JSON.stringify(notebook))
      const nextEntries = [
        { name: notebook.name, path: result.path },
        ...recentNotebookEntries.filter((item) => item.path !== result.path),
      ].slice(0, 8)
      setRecentNotebookEntries(nextEntries)
      saveRecentNotebookEntries(nextEntries)
      setSaveLabel(`Saved notebook to ${result.path}`)
    } catch (error) {
      const message = getErrorMessage(error)
      setSaveLabel(`Notebook save failed: ${message}`)
      window.alert(`Notebook save failed.\n\n${message}`)
    }
  }

  const exportCurrentPage = async () => {
    if (!page) return

    const safeBaseName =
      (page.title || 'Untitled Page')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'untitled-page'

    const filePath = await pickExportFilePath(`${safeBaseName}.pdf`)
    if (!filePath) return

    try {
      const hydratedContent = hydratePageContent(page.content, appState.meta.assets)
      const plainText = extractExportText(hydratedContent) || page.title || 'Untitled Page'
      const rawPath = filePath.trim()
      const lowerPath = rawPath.toLowerCase()
      const format: 'html' | 'pdf' | 'txt' =
        lowerPath.endsWith('.txt') ? 'txt' : lowerPath.endsWith('.html') ? 'html' : 'pdf'
      const normalizedPath =
        rawPath.includes('.') && /\.(pdf|html|txt)$/i.test(rawPath)
          ? rawPath
          : `${rawPath}.${format}`

      const title = page.title || 'Untitled Page'
      const escapedTitle = escapeHtml(title)
      const htmlContents = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapedTitle}</title>
  <style>
    body { font-family: "Segoe UI", sans-serif; margin: 40px auto; max-width: 860px; color: #1f1f1f; line-height: 1.6; }
    h1 { font-size: 2rem; margin-bottom: 0.35rem; }
    .meta { color: #6b7280; font-size: 0.95rem; margin-bottom: 2rem; }
    img, iframe, audio { max-width: 100%; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #cfd8e3; padding: 8px 10px; vertical-align: top; }
    blockquote { border-left: 4px solid #d0d7e2; margin: 1rem 0; padding: 0.25rem 0 0.25rem 1rem; color: #4b5563; }
    pre { background: #f6f8fb; padding: 12px; overflow: auto; }
  </style>
</head>
<body>
  <h1>${escapedTitle}</h1>
  <div class="meta">Created ${formatPageDate(page.createdAt)} at ${formatPageTime(page.createdAt)}</div>
  <main>${hydratedContent}</main>
</body>
</html>`

      const result = await exportPageFile(
        normalizedPath,
        format,
        title,
        page.createdAt,
        htmlContents,
        plainText,
      )
      setSaveLabel(`Exported page to ${result.path}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setSaveLabel(`Export failed: ${message}`)
      window.alert(`Export failed.\n\n${message}`)
    }
  }

  const copySelection = async () => {
    const selection = window.getSelection()?.toString() ?? ''
    const activeElement = document.activeElement
    const inputSelection =
      activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement
        ? activeElement.value.slice(activeElement.selectionStart ?? 0, activeElement.selectionEnd ?? 0)
        : ''
    const rawText = inputSelection || selection || editorRef.current?.innerText || page?.title || ''
    const normalized = normalizeTerminalText(rawText)
    if (!normalized.trim()) return

    await navigator.clipboard.writeText(normalized)
    setSaveLabel('Copied as terminal-safe text')
  }

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })

  const addAssetsToState = (assets: AppAsset[]) => {
    if (assets.length === 0) return

    setAppState((current) => ({
      ...current,
      meta: {
        ...current.meta,
        assets: {
          ...current.meta.assets,
          ...Object.fromEntries(assets.map((asset) => [asset.id, asset])),
        },
      },
    }))
  }

  const openImagePicker = () => {
    imageInputRef.current?.click()
  }

  const openAttachmentPicker = () => {
    attachmentInputRef.current?.click()
  }

  const openPrintoutPicker = () => {
    printoutInputRef.current?.click()
  }

  const emailCurrentPage = () => {
    if (!page) return

    const plainContent = extractSnippetText(hydratePageContent(page.content, appState.meta.assets))
    const body = [
      `Notebook: ${notebook?.name ?? 'Notebook'}`,
      `Section: ${section?.name ?? 'Section'}`,
      '',
      plainContent || page.title,
    ]
      .join('\n')
      .slice(0, 1800)

    window.location.href = `mailto:?subject=${encodeURIComponent(page.title)}&body=${encodeURIComponent(body)}`
    setSaveLabel('Opened default mail client')
  }

  const insertTranscriptIntoPage = (transcript: string) => {
    if (!page) return

    const block = `
      <section class="template-block">
        <h3>Transcript</h3>
        ${plainTextToHtml(transcript)}
      </section>
    `

    updatePage({
      content: `${page.content}${block}`,
    })
  }

  return {
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
  }
}
