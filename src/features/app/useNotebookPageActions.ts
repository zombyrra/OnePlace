import type { Dispatch, SetStateAction } from 'react'
import {
  buildSnippet,
  clonePageTree,
  createId,
  createSingleNotebookState,
  createStarterPage,
  createStarterSection,
  createStarterSectionGroup,
  demotePageOneLevel,
  ensureSelection,
  flattenPages,
  insertPageRelative,
  movePageWithinSiblings,
  promotePageOneLevel,
  removePageById,
  updateNestedPages,
} from '../../app/appModel'
import type { AppState, Notebook, Page, Section, SectionGroup } from '../../app/appModel'
import { dialogs } from '../../components/ui/dialogContext'

export type MoveCopyPageMode = 'copy' | 'move'

export type MoveCopyPageTarget = {
  groupId: string
  notebookId: string
  sectionId: string
}

type Args = {
  appState: AppState
  canDemotePage: boolean
  canPromotePage: boolean
  notebook: Notebook | undefined
  page: Page | undefined
  section: Section | undefined
  sectionGroup: SectionGroup | undefined
  setAppState: Dispatch<SetStateAction<AppState>>
}

export const useNotebookPageActions = ({
  appState,
  canDemotePage,
  canPromotePage,
  notebook,
  page,
  section,
  sectionGroup,
  setAppState,
}: Args) => {
  const createBlankPage = (title: string, accent: string, content = ''): Page => {
    const now = new Date().toISOString()
    return {
      accent,
      children: [],
      content,
      createdAt: now,
      id: createId(),
      inkStrokes: [],
      isCollapsed: false,
      snippet: buildSnippet(title, content, now),
      tags: [],
      task: null,
      title,
      updatedAt: now,
    }
  }

  const createSection = (groupId: string, name: string, color: string) => {
    setAppState((current) => {
      const sectionId = createId()
      const pageId = createId()
      const now = new Date().toISOString()
      return {
        ...current,
        notebooks: current.notebooks.map((item) =>
          item.id === current.selectedNotebookId
            ? {
                ...item,
                sectionGroups: item.sectionGroups.map((group) =>
                  group.id === groupId
                    ? {
                        ...group,
                        isCollapsed: false,
                        sections: [
                          ...group.sections,
                          {
                            color,
                            id: sectionId,
                            name,
                            passwordHash: null,
                            passwordHint: '',
                            pages: [
                              {
                                accent: color,
                                children: [],
                                content: '<p>New section notes.</p>',
                                createdAt: now,
                                id: pageId,
                                inkStrokes: [],
                                isCollapsed: false,
                                snippet: buildSnippet('Untitled Page', '<p>New section notes.</p>', now),
                                tags: [],
                                task: null,
                                title: 'Untitled Page',
                                updatedAt: now,
                              },
                            ],
                          },
                        ],
                      }
                    : group,
                ),
              }
            : item,
        ),
        selectedSectionGroupId: groupId,
        selectedPageId: pageId,
        selectedSectionId: sectionId,
      }
    })
  }

  const promptCreateSection = async (groupId?: string) => {
    const targetGroupId = groupId ?? sectionGroup?.id
    if (!targetGroupId) return
    const name = (
      await dialogs.prompt({ title: 'New section', label: 'Section name', defaultValue: 'New Section', confirmText: 'Create' })
    )?.trim()
    if (!name) return
    createSection(targetGroupId, name, '#4c75b8')
  }

  const createSectionInGroup = (groupId: string, name: string) => {
    const nextName = name.trim()
    if (!nextName) return
    createSection(groupId, nextName, '#4c75b8')
  }

  const addSectionGroup = () => {
    setAppState((current) => {
      const currentNotebook = current.notebooks.find((item) => item.id === current.selectedNotebookId)
      if (!currentNotebook) return current
      const groupName = window
        .prompt('New section group name', `Section Group ${currentNotebook.sectionGroups.length + 1}`)
        ?.trim()
      if (!groupName) return current
      const sectionId = createId()
      const pageId = createId()
      const groupId = createId()
      const now = new Date().toISOString()
      return {
        ...current,
        notebooks: current.notebooks.map((item) =>
          item.id === currentNotebook.id
            ? {
                ...item,
                sectionGroups: [
                  ...item.sectionGroups,
                  {
                    id: groupId,
                    isCollapsed: true,
                    name: groupName,
                    sections: [
                      {
                        color: '#4c75b8',
                        id: sectionId,
                        name: 'New Section',
                        passwordHash: null,
                        passwordHint: '',
                        pages: [
                          {
                            accent: '#4c75b8',
                            children: [],
                            content: '<p>New section group starter note.</p>',
                            createdAt: now,
                            id: pageId,
                            inkStrokes: [],
                            isCollapsed: false,
                            snippet: buildSnippet('Untitled Page', '<p>New section group starter note.</p>', now),
                            tags: [],
                            task: null,
                            title: 'Untitled Page',
                            updatedAt: now,
                          },
                        ],
                      },
                    ],
                  },
                ],
              }
            : item,
        ),
      }
    })
  }

  const addSectionGroupWithName = (name: string) => {
    const groupName = name.trim()
    if (!groupName) return
    setAppState((current) => {
      const currentNotebook = current.notebooks.find((item) => item.id === current.selectedNotebookId)
      if (!currentNotebook) return current
      const sectionId = createId()
      const pageId = createId()
      const groupId = createId()
      const now = new Date().toISOString()
      return {
        ...current,
        notebooks: current.notebooks.map((item) =>
          item.id === currentNotebook.id
            ? {
                ...item,
                sectionGroups: [
                  ...item.sectionGroups,
                  {
                    id: groupId,
                    isCollapsed: true,
                    name: groupName,
                    sections: [
                      {
                        color: '#4c75b8',
                        id: sectionId,
                        name: 'New Section',
                        passwordHash: null,
                        passwordHint: '',
                        pages: [
                          {
                            accent: '#4c75b8',
                            children: [],
                            content: '<p>New section group starter note.</p>',
                            createdAt: now,
                            id: pageId,
                            inkStrokes: [],
                            isCollapsed: false,
                            snippet: buildSnippet('Untitled Page', '<p>New section group starter note.</p>', now),
                            tags: [],
                            task: null,
                            title: 'Untitled Page',
                            updatedAt: now,
                          },
                        ],
                      },
                    ],
                  },
                ],
              }
            : item,
        ),
      }
    })
  }

  const renameSectionGroup = (groupId: string) => {
    setAppState((current) => {
      const currentNotebook = current.notebooks.find((item) => item.id === current.selectedNotebookId)
      const group = currentNotebook?.sectionGroups.find((item) => item.id === groupId)
      if (!group) return current
      const nextName = window.prompt('Rename section group', group.name)?.trim()
      if (!nextName || nextName === group.name) return current
      return {
        ...current,
        notebooks: current.notebooks.map((item) =>
          item.id === current.selectedNotebookId
            ? {
                ...item,
                sectionGroups: item.sectionGroups.map((entry) =>
                  entry.id === groupId ? { ...entry, name: nextName } : entry,
                ),
              }
            : item,
        ),
      }
    })
  }

  const renameSectionGroupTo = (groupId: string, name: string) => {
    const nextName = name.trim()
    if (!nextName) return
    setAppState((current) => {
      const currentNotebook = current.notebooks.find((item) => item.id === current.selectedNotebookId)
      const group = currentNotebook?.sectionGroups.find((item) => item.id === groupId)
      if (!group || nextName === group.name) return current
      return {
        ...current,
        notebooks: current.notebooks.map((item) =>
          item.id === current.selectedNotebookId
            ? {
                ...item,
                sectionGroups: item.sectionGroups.map((entry) =>
                  entry.id === groupId ? { ...entry, name: nextName } : entry,
                ),
              }
            : item,
        ),
      }
    })
  }

  const renameSection = (groupId: string, sectionId: string) => {
    setAppState((current) => {
      const currentNotebook = current.notebooks.find((item) => item.id === current.selectedNotebookId)
      const group = currentNotebook?.sectionGroups.find((item) => item.id === groupId)
      const currentSection = group?.sections.find((item) => item.id === sectionId)
      if (!currentSection) return current
      const nextName = window.prompt('Rename section', currentSection.name)?.trim()
      if (!nextName || nextName === currentSection.name) return current
      return {
        ...current,
        notebooks: current.notebooks.map((item) =>
          item.id === current.selectedNotebookId
            ? {
                ...item,
                sectionGroups: item.sectionGroups.map((entry) =>
                  entry.id === groupId
                    ? {
                        ...entry,
                        sections: entry.sections.map((part) =>
                          part.id === sectionId ? { ...part, name: nextName } : part,
                        ),
                      }
                    : entry,
                ),
              }
            : item,
        ),
      }
    })
  }

  const renameSectionTo = (groupId: string, sectionId: string, name: string) => {
    const nextName = name.trim()
    if (!nextName) return
    setAppState((current) => {
      const currentNotebook = current.notebooks.find((item) => item.id === current.selectedNotebookId)
      const group = currentNotebook?.sectionGroups.find((item) => item.id === groupId)
      const currentSection = group?.sections.find((item) => item.id === sectionId)
      if (!currentSection || nextName === currentSection.name) return current
      return {
        ...current,
        notebooks: current.notebooks.map((item) =>
          item.id === current.selectedNotebookId
            ? {
                ...item,
                sectionGroups: item.sectionGroups.map((entry) =>
                  entry.id === groupId
                    ? {
                        ...entry,
                        sections: entry.sections.map((part) =>
                          part.id === sectionId ? { ...part, name: nextName } : part,
                        ),
                      }
                    : entry,
                ),
              }
            : item,
        ),
      }
    })
  }

  const renameNotebook = (notebookId: string) => {
    setAppState((current) => {
      const currentNotebook = current.notebooks.find((item) => item.id === notebookId)
      if (!currentNotebook) return current
      const nextName = window.prompt('Rename notebook', currentNotebook.name)?.trim()
      if (!nextName || nextName === currentNotebook.name) return current

      return {
        ...current,
        notebooks: current.notebooks.map((item) =>
          item.id === notebookId ? { ...item, name: nextName } : item,
        ),
      }
    })
  }

  const renameNotebookTo = (notebookId: string, name: string) => {
    const nextName = name.trim()
    if (!nextName) return
    setAppState((current) => {
      const currentNotebook = current.notebooks.find((item) => item.id === notebookId)
      if (!currentNotebook || nextName === currentNotebook.name) return current
      return {
        ...current,
        notebooks: current.notebooks.map((item) =>
          item.id === notebookId ? { ...item, name: nextName } : item,
        ),
      }
    })
  }

  const deleteNotebook = async (notebookId: string) => {
    const currentNotebook = appState.notebooks.find((item) => item.id === notebookId)
    if (!currentNotebook) return
    const confirmed = await dialogs.confirm({
      title: 'Delete notebook',
      message: `Delete "${currentNotebook.name}" and all of its sections and pages?`,
      confirmText: 'Delete',
      danger: true,
    })
    if (!confirmed) return

    setAppState((current) => {
      const notebooks = current.notebooks.filter((item) => item.id !== notebookId)
      if (notebooks.length === 0) return createSingleNotebookState(current, 'Notebook 1')

      return ensureSelection({
        ...current,
        notebooks,
      })
    })
  }

  const deleteSectionGroup = async (groupId: string) => {
    if (!notebook) return

    const group = notebook.sectionGroups.find((item) => item.id === groupId)
    if (!group) return
    const confirmed = await dialogs.confirm({
      title: 'Delete section group',
      message: `Delete "${group.name}" and everything inside it?`,
      confirmText: 'Delete',
      danger: true,
    })
    if (!confirmed) return

    setAppState((current) =>
      ensureSelection({
        ...current,
        notebooks: current.notebooks.map((item) =>
          item.id === current.selectedNotebookId
            ? {
                ...item,
                sectionGroups:
                  item.sectionGroups.length === 1
                    ? [createStarterSectionGroup('Sections')]
                    : item.sectionGroups.filter((entry) => entry.id !== groupId),
              }
            : item,
        ),
      }),
    )
  }

  const deleteSection = async (groupId: string, sectionId: string) => {
    if (!sectionGroup) return

    const group = notebook?.sectionGroups.find((item) => item.id === groupId)
    const currentSection = group?.sections.find((item) => item.id === sectionId)
    if (!currentSection) return
    const confirmed = await dialogs.confirm({
      title: 'Delete section',
      message: `Delete "${currentSection.name}" and all of its pages?`,
      confirmText: 'Delete',
      danger: true,
    })
    if (!confirmed) return

    setAppState((current) =>
      ensureSelection({
        ...current,
        notebooks: current.notebooks.map((item) =>
          item.id === current.selectedNotebookId
            ? {
                ...item,
                sectionGroups: item.sectionGroups.map((entry) =>
                  entry.id === groupId
                    ? {
                        ...entry,
                        sections:
                          entry.sections.length === 1
                            ? [createStarterSection('New Section', currentSection.color)]
                            : entry.sections.filter((part) => part.id !== sectionId),
                      }
                    : entry,
                ),
              }
            : item,
        ),
      }),
    )
  }

  const createNotebook = () => {
    setAppState((current) => {
      const notebookId = createId()
      const groupId = createId()
      const sectionId = createId()
      const pageId = createId()
      const now = new Date().toISOString()
      return {
        meta: {
          ...current.meta,
          recentPageIds: [pageId, ...current.meta.recentPageIds.filter((id) => id !== pageId)].slice(0, 8),
        },
        notebooks: [
          ...current.notebooks,
          {
            color: '#8b63c9',
            icon: 'book',
            id: notebookId,
            name: `Notebook ${current.notebooks.length + 1}`,
            sectionGroups: [
              {
                id: groupId,
                isCollapsed: false,
                name: 'Sections',
                sections: [
                  {
                    color: '#4c75b8',
                    id: sectionId,
                    name: 'New Section',
                    passwordHash: null,
                    passwordHint: '',
                    pages: [
                      {
                        accent: '#4c75b8',
                        children: [],
                        content: '<p>Start writing here.</p>',
                        createdAt: now,
                        id: pageId,
                        inkStrokes: [],
                        isCollapsed: false,
                        snippet: buildSnippet('Welcome', '<p>Start writing here.</p>', now),
                        tags: [],
                        task: null,
                        title: 'Welcome',
                        updatedAt: now,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        selectedNotebookId: notebookId,
        selectedSectionGroupId: groupId,
        selectedPageId: pageId,
        selectedSectionId: sectionId,
      }
    })
  }

  const addPage = () => {
    if (!section) return
    setAppState((current) => {
      const nextPage = createBlankPage('Untitled Page', section.color)
      return {
        ...current,
        notebooks: current.notebooks.map((item) => ({
          ...item,
          sectionGroups: item.sectionGroups.map((group) => ({
            ...group,
            sections: group.sections.map((entry) =>
              entry.id === current.selectedSectionId
                ? { ...entry, pages: [...entry.pages, nextPage] }
                : entry,
            ),
          })),
        })),
        selectedPageId: nextPage.id,
      }
    })
  }

  const addPageWithTitle = (title: string) => {
    if (!section) return
    const nextTitle = title.trim()
    if (!nextTitle) return
    setAppState((current) => {
      const nextPage = createBlankPage(nextTitle, section.color)
      return {
        ...current,
        notebooks: current.notebooks.map((item) => ({
          ...item,
          sectionGroups: item.sectionGroups.map((group) => ({
            ...group,
            sections: group.sections.map((entry) =>
              entry.id === current.selectedSectionId
                ? { ...entry, pages: [...entry.pages, nextPage] }
                : entry,
            ),
          })),
        })),
        selectedPageId: nextPage.id,
      }
    })
  }

  const addPageBelowCurrent = () => {
    if (!section || !page) {
      addPage()
      return
    }

    setAppState((current) => {
      const nextPage = createBlankPage('Untitled Page', page.accent || section.color)
      return {
        ...current,
        notebooks: current.notebooks.map((item) => ({
          ...item,
          sectionGroups: item.sectionGroups.map((group) => ({
            ...group,
            sections: group.sections.map((entry) =>
              entry.id === current.selectedSectionId
                ? { ...entry, pages: insertPageRelative(entry.pages, current.selectedPageId, nextPage, 'after') }
                : entry,
            ),
          })),
        })),
        selectedPageId: nextPage.id,
      }
    })
  }

  const addSubpage = () => {
    if (!section || !page) return
    setAppState((current) => {
      const nextPage = createBlankPage('Untitled Subpage', page.accent)
      return {
        ...current,
        notebooks: current.notebooks.map((item) => ({
          ...item,
          sectionGroups: item.sectionGroups.map((group) => ({
            ...group,
            sections: group.sections.map((entry) =>
              entry.id === current.selectedSectionId
                ? {
                    ...entry,
                    pages: updateNestedPages(entry.pages, current.selectedPageId, (note) => ({
                      ...note,
                      isCollapsed: false,
                      children: [...note.children, nextPage],
                    })),
                  }
                : entry,
            ),
          })),
        })),
        selectedPageId: nextPage.id,
      }
    })
  }

  const addSubpageWithTitle = (title: string) => {
    if (!section || !page) return
    const nextTitle = title.trim()
    if (!nextTitle) return
    setAppState((current) => {
      const nextPage = createBlankPage(nextTitle, page.accent)
      return {
        ...current,
        notebooks: current.notebooks.map((item) => ({
          ...item,
          sectionGroups: item.sectionGroups.map((group) => ({
            ...group,
            sections: group.sections.map((entry) =>
              entry.id === current.selectedSectionId
                ? {
                    ...entry,
                    pages: updateNestedPages(entry.pages, current.selectedPageId, (targetPage) => ({
                      ...targetPage,
                      children: [nextPage, ...targetPage.children],
                      isCollapsed: false,
                    })),
                  }
                : entry,
            ),
          })),
        })),
        selectedPageId: nextPage.id,
      }
    })
  }

  const moveCurrentPage = (direction: -1 | 1) => {
    if (!section || !page) return

    setAppState((current) => {
      let moved = false
      const nextState = {
        ...current,
        notebooks: current.notebooks.map((item) => ({
          ...item,
          sectionGroups: item.sectionGroups.map((group) => ({
            ...group,
            sections: group.sections.map((entry) => {
              if (entry.id !== current.selectedSectionId) return entry

              const result = movePageWithinSiblings(entry.pages, current.selectedPageId, direction)
              moved = result.moved
              return moved ? { ...entry, pages: result.pages } : entry
            }),
          })),
        })),
      }

      return moved ? nextState : current
    })
  }

  const moveCurrentPageUp = () => moveCurrentPage(-1)
  const moveCurrentPageDown = () => moveCurrentPage(1)

  const moveOrCopyCurrentPage = (mode: MoveCopyPageMode, target: MoveCopyPageTarget) => {
    if (!section || !page) return

    setAppState((current) => {
      let pageToPlace: Page | undefined = mode === 'copy' ? clonePageTree(page) : undefined
      const isSameTargetSection = mode === 'move' && target.sectionId === current.selectedSectionId

      const withoutMovedPage =
        mode === 'move'
          ? {
              ...current,
              notebooks: current.notebooks.map((item) => ({
                ...item,
                sectionGroups: item.sectionGroups.map((group) => ({
                  ...group,
                  sections: group.sections.map((entry) => {
                    if (entry.id !== current.selectedSectionId) return entry

                    const removed = removePageById(entry.pages, current.selectedPageId)
                    if (!removed.page) return entry
                    pageToPlace = removed.page
                    const pages =
                      removed.pages.length > 0 || isSameTargetSection
                        ? removed.pages
                        : [createStarterPage('Untitled Page', entry.color, '<p>Start writing here.</p>')]
                    return { ...entry, pages }
                  }),
                })),
              })),
            }
          : current

      if (!pageToPlace) return current

      let inserted = false
      const nextState = {
        ...withoutMovedPage,
        notebooks: withoutMovedPage.notebooks.map((item) =>
          item.id === target.notebookId
            ? {
                ...item,
                sectionGroups: item.sectionGroups.map((group) =>
                  group.id === target.groupId
                    ? {
                        ...group,
                        isCollapsed: false,
                        sections: group.sections.map((entry) => {
                          if (entry.id !== target.sectionId) return entry
                          inserted = true
                          return { ...entry, pages: [...entry.pages, pageToPlace as Page] }
                        }),
                      }
                    : group,
                ),
              }
            : item,
        ),
        selectedNotebookId: target.notebookId,
        selectedPageId: pageToPlace.id,
        selectedSectionGroupId: target.groupId,
        selectedSectionId: target.sectionId,
      }

      return inserted ? ensureSelection(nextState) : current
    })
  }

  const promoteCurrentPage = () => {
    if (!section || !page || !canPromotePage) return

    setAppState((current) => {
      let moved = false
      const nextState = {
        ...current,
        notebooks: current.notebooks.map((item) => ({
          ...item,
          sectionGroups: item.sectionGroups.map((group) => ({
            ...group,
            sections: group.sections.map((entry) => {
              if (entry.id !== current.selectedSectionId) return entry

              const promoted = promotePageOneLevel(entry.pages, current.selectedPageId)
              moved = promoted.moved
              return moved ? { ...entry, pages: promoted.pages } : entry
            }),
          })),
        })),
      }

      return moved ? nextState : current
    })
  }

  const demoteCurrentPage = () => {
    if (!section || !page || !canDemotePage) return

    setAppState((current) => {
      let moved = false
      const nextState = {
        ...current,
        notebooks: current.notebooks.map((item) => ({
          ...item,
          sectionGroups: item.sectionGroups.map((group) => ({
            ...group,
            sections: group.sections.map((entry) => {
              if (entry.id !== current.selectedSectionId) return entry

              const demoted = demotePageOneLevel(entry.pages, current.selectedPageId)
              moved = demoted.moved
              return moved ? { ...entry, pages: demoted.pages } : entry
            }),
          })),
        })),
      }

      return moved ? nextState : current
    })
  }

  const deleteCurrentPage = async () => {
    if (!section || !page) return
    if (!(await dialogs.confirm({ title: 'Delete page', message: `Delete "${page.title}"?`, confirmText: 'Delete', danger: true }))) return

    setAppState((current) => {
      const currentNotebook = current.notebooks.find((item) => item.id === current.selectedNotebookId)
      const currentGroup = currentNotebook?.sectionGroups.find(
        (item) => item.id === current.selectedSectionGroupId,
      )
      const currentSection = currentGroup?.sections.find((item) => item.id === current.selectedSectionId)
      if (!currentSection) return current

      const flattenedBeforeDelete = flattenPages(currentSection.pages, 0, true)
      const deletedIndex = flattenedBeforeDelete.findIndex((entry) => entry.page.id === current.selectedPageId)
      if (deletedIndex === -1) return current

      let nextSelectedPageId = current.selectedPageId
      let removed = false
      const nextState = {
        ...current,
        notebooks: current.notebooks.map((item) => ({
          ...item,
          sectionGroups: item.sectionGroups.map((group) => ({
            ...group,
            sections: group.sections.map((entry) => {
              if (entry.id !== current.selectedSectionId) return entry

              const result = removePageById(entry.pages, current.selectedPageId)
              if (!result.page) return entry

              removed = true
              const nextPages =
                result.pages.length > 0
                  ? result.pages
                  : [createStarterPage('Untitled Page', entry.color, '<p>Start writing here.</p>')]
              const flattenedAfterDelete = flattenPages(nextPages, 0, true)
              const fallbackPage =
                flattenedAfterDelete[Math.min(deletedIndex, flattenedAfterDelete.length - 1)]?.page
              nextSelectedPageId = fallbackPage?.id ?? current.selectedPageId
              return { ...entry, pages: nextPages }
            }),
          })),
        })),
        selectedPageId: nextSelectedPageId,
      }

      return removed ? ensureSelection(nextState) : current
    })
  }

  return {
    addPage,
    addPageBelowCurrent,
    addPageWithTitle,
    addSectionGroup,
    addSectionGroupWithName,
    addSubpage,
    addSubpageWithTitle,
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
    createSectionInGroup,
    promoteCurrentPage,
    renameNotebook,
    renameNotebookTo,
    renameSection,
    renameSectionTo,
    renameSectionGroup,
    renameSectionGroupTo,
  }
}
