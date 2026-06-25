import type { Dispatch, SetStateAction } from 'react'
import { buildSnippet, defaultTask, findPageById, flattenPages, hashSecret, recordPageVersion, updateNestedPages, verifySecret } from '../../app/appModel'
import type { AppState, Page, PageUpdate, PageVersion, Section } from '../../app/appModel'
import { dialogs } from '../../components/ui/dialogContext'

export type TaskDuePreset = 'today' | 'tomorrow' | 'this-week' | 'next-week' | 'none'

type Args = {
  appState: AppState
  currentPageVersions: PageVersion[]
  page: Page | undefined
  section: Section | undefined
  selectedHistoryVersion: PageVersion | null
  selectedTagFilter: string
  setAppState: Dispatch<SetStateAction<AppState>>
  setCustomTagDraft: (value: string) => void
  setIsHistoryPaneOpen: (value: boolean) => void
  setIsTagPaneOpen: Dispatch<SetStateAction<boolean>>
  setSaveLabel: (value: string) => void
  setSelectedHistoryVersionId: (value: string) => void
  setSelectedTagFilter: (value: string) => void
  setUnlockedSectionIds: Dispatch<SetStateAction<string[]>>
  updatePage: (updates: PageUpdate) => void
}

export const useSectionTaskActions = ({
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
}: Args) => {
  const getTaskDueDate = (preset: TaskDuePreset) => {
    if (preset === 'none') return null
    const dueDate = new Date()
    dueDate.setHours(23, 59, 59, 999)

    if (preset === 'tomorrow') {
      dueDate.setDate(dueDate.getDate() + 1)
    } else if (preset === 'this-week') {
      const daysUntilFriday = (5 - dueDate.getDay() + 7) % 7
      dueDate.setDate(dueDate.getDate() + daysUntilFriday)
    } else if (preset === 'next-week') {
      const daysUntilFriday = (5 - dueDate.getDay() + 7) % 7
      dueDate.setDate(dueDate.getDate() + daysUntilFriday + 7)
    }

    return dueDate.toISOString()
  }

  const updatePageById = (pageId: string, updater: (targetPage: Page) => Page) => {
    setAppState((current) => ({
      ...current,
      notebooks: current.notebooks.map((item) => ({
        ...item,
        sectionGroups: item.sectionGroups.map((group) => ({
          ...group,
          sections: group.sections.map((entry) => ({
            ...entry,
            pages: updateNestedPages(entry.pages, pageId, updater),
          })),
        })),
      })),
    }))
  }

  const lockSection = (sectionId: string) => {
    setUnlockedSectionIds((current) => current.filter((item) => item !== sectionId))
  }

  const unlockSection = async (sectionId: string) => {
    const targetSection = appState.notebooks
      .flatMap((entry) => entry.sectionGroups.flatMap((group) => group.sections))
      .find((entry) => entry.id === sectionId)
    if (!targetSection?.passwordHash) return
    const promptLabel = targetSection.passwordHint
      ? `Enter password for ${targetSection.name}\nHint: ${targetSection.passwordHint}`
      : `Enter password for ${targetSection.name}`
    const password = window.prompt(promptLabel, '') ?? ''
    if (!password) return
    const matches = await verifySecret(password, targetSection.passwordHash)
    if (!matches) {
      window.alert('Incorrect password.')
      return
    }
    setUnlockedSectionIds((current) => [...new Set([...current, sectionId])])
  }

  const protectSection = async (groupId: string, sectionId: string) => {
    const password = window.prompt('Set a password for this section', '')?.trim()
    if (!password) return
    const hint = window.prompt('Password hint (optional)', '')?.trim() ?? ''
    const hash = await hashSecret(password)
    setAppState((current) => ({
      ...current,
      notebooks: current.notebooks.map((item) => ({
        ...item,
        sectionGroups: item.sectionGroups.map((group) => ({
          ...group,
          sections: group.sections.map((entry) =>
            entry.id === sectionId && group.id === groupId ? { ...entry, passwordHash: hash, passwordHint: hint } : entry,
          ),
        })),
      })),
    }))
    lockSection(sectionId)
    setSaveLabel('Section protection enabled')
  }

  const removeSectionProtection = async (groupId: string, sectionId: string) => {
    const targetSection = appState.notebooks
      .flatMap((entry) => entry.sectionGroups.flatMap((group) => group.sections))
      .find((entry) => entry.id === sectionId)
    if (!targetSection?.passwordHash) return
    const password = window.prompt('Enter the current password to remove protection', '') ?? ''
    if (!password) return
    const matches = await verifySecret(password, targetSection.passwordHash)
    if (!matches) {
      window.alert('Incorrect password.')
      return
    }
    setAppState((current) => ({
      ...current,
      notebooks: current.notebooks.map((item) => ({
        ...item,
        sectionGroups: item.sectionGroups.map((group) => ({
          ...group,
          sections: group.sections.map((entry) =>
            entry.id === sectionId && group.id === groupId ? { ...entry, passwordHash: null, passwordHint: '' } : entry,
          ),
        })),
      })),
    }))
    setUnlockedSectionIds((current) => current.filter((item) => item !== sectionId))
    setSaveLabel('Section protection removed')
  }

  const addTagToCurrentPage = () => {
    setIsTagPaneOpen((current) => {
      const next = !current
      if (next && !selectedTagFilter) {
        setSelectedTagFilter('Important')
      }
      return next
    })
  }

  const toggleTagOnPage = (pageId: string, tag: string) => {
    const normalizedTag = tag.trim()
    if (!normalizedTag) return
    updatePageById(pageId, (note) => {
      const hasTag = note.tags.some((entry) => entry.toLocaleLowerCase() === normalizedTag.toLocaleLowerCase())
      const nextTags = hasTag
        ? note.tags.filter((entry) => entry.toLocaleLowerCase() !== normalizedTag.toLocaleLowerCase())
        : [...note.tags, normalizedTag]
      return { ...note, snippet: buildSnippet(note.title, note.content), tags: nextTags, updatedAt: new Date().toISOString() }
    })
  }

  const addSelectedTagToCurrentPage = () => {
    if (!page || !selectedTagFilter) return
    toggleTagOnPage(page.id, selectedTagFilter)
  }

  const addCustomTagToCurrentPage = (customTagDraft: string) => {
    const value = customTagDraft.trim()
    if (!page || !value) return
    toggleTagOnPage(page.id, value)
    setSelectedTagFilter(value)
    setCustomTagDraft('')
  }

  const toggleCurrentTask = () => {
    if (!page) return
    updatePage({ task: page.task ? null : defaultTask() })
  }

  const toggleTaskForPage = (pageId: string) => {
    const target = appState.notebooks
      .flatMap((entry) => entry.sectionGroups.flatMap((group) => group.sections.flatMap((part) => flattenPages(part.pages, 0, true))))
      .find((item) => item.page.id === pageId)?.page
    if (!target?.task) return
    updatePageById(pageId, (note) => ({
      ...note,
      snippet: buildSnippet(note.title, note.content),
      task: { ...note.task!, status: note.task?.status === 'done' ? 'open' : 'done' },
      updatedAt: new Date().toISOString(),
    }))
  }

  const setTaskDueDateForPage = async (pageId: string) => {
    const target = appState.notebooks
      .flatMap((entry) => entry.sectionGroups.flatMap((group) => group.sections.flatMap((part) => flattenPages(part.pages, 0, true))))
      .find((item) => item.page.id === pageId)?.page
    if (!target) return
    const currentDue = target.task?.dueAt?.slice(0, 10) ?? ''
    const response = await dialogs.prompt({
      title: 'Set due date',
      label: 'Due date (YYYY-MM-DD)',
      defaultValue: currentDue,
      placeholder: 'Leave blank to clear',
      confirmText: 'Set',
    })
    if (response === null) return
    const value = response.trim()
    updatePageById(pageId, (note) => ({
      ...note,
      snippet: buildSnippet(note.title, note.content),
      task: note.task
        ? { ...note.task, dueAt: value ? new Date(value).toISOString() : null }
        : { ...defaultTask(), dueAt: value ? new Date(value).toISOString() : null },
      updatedAt: new Date().toISOString(),
    }))
  }

  const clearTaskForPage = (pageId: string) => {
    updatePageById(pageId, (note) => ({
      ...note,
      snippet: buildSnippet(note.title, note.content),
      task: null,
      updatedAt: new Date().toISOString(),
    }))
  }

  const toggleCurrentTaskComplete = () => {
    if (!page?.task) return
    updatePage({ task: { ...page.task, status: page.task.status === 'done' ? 'open' : 'done' } })
  }

  const setCurrentTaskDuePreset = (preset: TaskDuePreset) => {
    if (!page) return
    const dueAt = getTaskDueDate(preset)
    updatePage({
      task: {
        ...(page.task ?? defaultTask()),
        dueAt,
      },
    })
    setSaveLabel(preset === 'none' ? 'Task date cleared' : 'Task date updated')
  }

  const clearCurrentPageTask = () => {
    if (!page) return
    updatePage({ task: null })
    setSaveLabel('Task removed')
  }

  const toggleNamedTagOnCurrentPage = (tag: string) => {
    if (!page) return
    toggleTagOnPage(page.id, tag)
  }

  const markCurrentPageUnread = () => {
    if (!page) return
    const hasUnread = page.tags.some((tag) => tag.toLocaleLowerCase() === 'unread')
    if (hasUnread) {
      setSaveLabel('Page is already marked unread')
      return
    }
    updatePage({ tags: [...page.tags, 'Unread'] })
    setSelectedTagFilter('Unread')
    setSaveLabel('Marked page as unread')
  }

  const clearCurrentPageTags = () => {
    if (!page) return
    updatePage({ tags: [], task: null })
  }

  const setCurrentTaskDueDate = () => {
    if (!page) return
    setTaskDueDateForPage(page.id)
  }

  const renamePage = (pageId: string) => {
    if (!section) return
    const currentPage = findPageById(section.pages, pageId)
    if (!currentPage) return
    const nextName = window.prompt('Rename page', currentPage.title)?.trim()
    if (!nextName || nextName === currentPage.title) return
    setAppState((current) => ({
      ...current,
      notebooks: current.notebooks.map((item) => ({
        ...item,
        sectionGroups: item.sectionGroups.map((group) => ({
          ...group,
          sections: group.sections.map((part) =>
            part.id === current.selectedSectionId
              ? { ...part, pages: updateNestedPages(part.pages, pageId, (note) => ({ ...note, snippet: buildSnippet(nextName, note.content), title: nextName, updatedAt: new Date().toISOString() })) }
              : part,
          ),
        })),
      })),
    }))
  }

  const renamePageTo = (pageId: string, name: string) => {
    if (!section) return
    const currentPage = findPageById(section.pages, pageId)
    const nextName = name.trim()
    if (!currentPage || !nextName || nextName === currentPage.title) return
    setAppState((current) => ({
      ...current,
      notebooks: current.notebooks.map((item) => ({
        ...item,
        sectionGroups: item.sectionGroups.map((group) => ({
          ...group,
          sections: group.sections.map((part) =>
            part.id === current.selectedSectionId
              ? {
                  ...part,
                  pages: updateNestedPages(part.pages, pageId, (note) => ({
                    ...note,
                    snippet: buildSnippet(nextName, note.content),
                    title: nextName,
                    updatedAt: new Date().toISOString(),
                  })),
                }
              : part,
          ),
        })),
      })),
    }))
  }

  const saveCurrentPageVersion = (targetPage = page) => {
    if (!targetPage) return
    const nextVersionId = crypto.randomUUID()
    setAppState((current) => ({
      ...current,
      meta: {
        ...current.meta,
        pageVersions: recordPageVersion(current.meta.pageVersions, targetPage.id, targetPage.title, targetPage.content, nextVersionId),
      },
    }))
    setSelectedHistoryVersionId(nextVersionId)
    setIsHistoryPaneOpen(true)
    setSaveLabel(`Saved version for ${targetPage.title}`)
  }

  const restorePageVersion = (version: PageVersion) => {
    updatePage({ content: version.content, title: version.title })
    setSaveLabel(`Restored ${version.savedAt}`)
  }

  const restoreSavedPageVersion = () => {
    if (!page) return
    if (currentPageVersions.length === 0) {
      window.alert('No saved versions for this page yet.')
      return
    }
    const options = currentPageVersions.map((version, index) => `${index + 1}. ${version.savedAt}${index === 0 ? ' (Latest)' : ''}`).join('\n')
    const picked = window.prompt(`Restore which version?\n\n${options}`, '1')?.trim()
    if (!picked) return
    const version = currentPageVersions[Number(picked) - 1]
    if (!version) return
    restorePageVersion(version)
  }

  const restoreSelectedHistoryVersion = () => {
    if (!selectedHistoryVersion) {
      window.alert('No saved versions for this page yet.')
      return
    }
    restorePageVersion(selectedHistoryVersion)
  }

  return {
    addCustomTagToCurrentPage,
    addSelectedTagToCurrentPage,
    addTagToCurrentPage,
    clearTaskForPage,
    clearCurrentPageTask,
    lockSection,
    markCurrentPageUnread,
    protectSection,
    removeSectionProtection,
    renamePage,
    renamePageTo,
    restoreSavedPageVersion,
    restoreSelectedHistoryVersion,
    saveCurrentPageVersion,
    setCurrentTaskDueDate,
    setCurrentTaskDuePreset,
    setTaskDueDateForPage,
    clearCurrentPageTags,
    toggleCurrentTask,
    toggleCurrentTaskComplete,
    toggleNamedTagOnCurrentPage,
    toggleTagOnPage,
    toggleTaskForPage,
    unlockSection,
    updatePageById,
  }
}
