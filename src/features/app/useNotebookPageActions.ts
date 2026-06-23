import type { Dispatch, SetStateAction } from 'react'
import {
  buildSnippet,
  createId,
  demotePageOneLevel,
  ensureSelection,
  flattenPages,
  promotePageOneLevel,
  removePageById,
  updateNestedPages,
} from '../../app/appModel'
import type { AppState, Notebook, Page, Section, SectionGroup } from '../../app/appModel'

type Args = {
  appState: AppState
  canDeleteNotebook: boolean
  canDeletePage: boolean
  canDeleteSection: boolean
  canDeleteSectionGroup: boolean
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
  canDeleteNotebook,
  canDeletePage,
  canDeleteSection,
  canDeleteSectionGroup,
  canDemotePage,
  canPromotePage,
  notebook,
  page,
  section,
  sectionGroup,
  setAppState,
}: Args) => {
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

  const promptCreateSection = (groupId?: string) => {
    const targetGroupId = groupId ?? sectionGroup?.id
    if (!targetGroupId) return
    const name = window.prompt('New section name', 'New Section')?.trim()
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

  const deleteNotebook = (notebookId: string) => {
    if (!canDeleteNotebook) {
      window.alert('Keep at least one notebook until notebook bootstrap parity is finished.')
      return
    }

    const currentNotebook = appState.notebooks.find((item) => item.id === notebookId)
    if (!currentNotebook) return
    if (!window.confirm(`Delete notebook "${currentNotebook.name}" and all of its sections and pages?`)) {
      return
    }

    setAppState((current) =>
      ensureSelection({
        ...current,
        notebooks: current.notebooks.filter((item) => item.id !== notebookId),
      }),
    )
  }

  const deleteSectionGroup = (groupId: string) => {
    if (!notebook) return
    if (!canDeleteSectionGroup) {
      window.alert('Keep at least one section group in this notebook for now.')
      return
    }

    const group = notebook.sectionGroups.find((item) => item.id === groupId)
    if (!group) return
    if (!window.confirm(`Delete section group "${group.name}" and everything inside it?`)) {
      return
    }

    setAppState((current) =>
      ensureSelection({
        ...current,
        notebooks: current.notebooks.map((item) =>
          item.id === current.selectedNotebookId
            ? {
                ...item,
                sectionGroups: item.sectionGroups.filter((entry) => entry.id !== groupId),
              }
            : item,
        ),
      }),
    )
  }

  const deleteSection = (groupId: string, sectionId: string) => {
    if (!sectionGroup) return
    if (!canDeleteSection) {
      window.alert('Keep at least one section in this section group for now.')
      return
    }

    const group = notebook?.sectionGroups.find((item) => item.id === groupId)
    const currentSection = group?.sections.find((item) => item.id === sectionId)
    if (!currentSection) return
    if (!window.confirm(`Delete section "${currentSection.name}" and all of its pages?`)) {
      return
    }

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
                        sections: entry.sections.filter((part) => part.id !== sectionId),
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
      const now = new Date().toISOString()
      const nextPage: Page = {
        accent: section.color,
        children: [],
        content: '',
        createdAt: now,
        id: createId(),
        inkStrokes: [],
        isCollapsed: false,
        snippet: buildSnippet('Untitled Page', '', now),
        tags: [],
        task: null,
        title: 'Untitled Page',
        updatedAt: now,
      }
      return {
        ...current,
        notebooks: current.notebooks.map((item) => ({
          ...item,
          sectionGroups: item.sectionGroups.map((group) => ({
            ...group,
            sections: group.sections.map((entry) =>
              entry.id === current.selectedSectionId
                ? { ...entry, pages: [nextPage, ...entry.pages] }
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
      const now = new Date().toISOString()
      const nextPage: Page = {
        accent: section.color,
        children: [],
        content: '',
        createdAt: now,
        id: createId(),
        inkStrokes: [],
        isCollapsed: false,
        snippet: buildSnippet(nextTitle, '', now),
        tags: [],
        task: null,
        title: nextTitle,
        updatedAt: now,
      }
      return {
        ...current,
        notebooks: current.notebooks.map((item) => ({
          ...item,
          sectionGroups: item.sectionGroups.map((group) => ({
            ...group,
            sections: group.sections.map((entry) =>
              entry.id === current.selectedSectionId
                ? { ...entry, pages: [nextPage, ...entry.pages] }
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
      const now = new Date().toISOString()
      const nextPage: Page = {
        accent: page.accent,
        children: [],
        content: '',
        createdAt: now,
        id: createId(),
        inkStrokes: [],
        isCollapsed: false,
        snippet: buildSnippet('Untitled Subpage', '', now),
        tags: [],
        task: null,
        title: 'Untitled Subpage',
        updatedAt: now,
      }
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
      const now = new Date().toISOString()
      const nextPage: Page = {
        accent: page.accent,
        children: [],
        content: '',
        createdAt: now,
        id: createId(),
        inkStrokes: [],
        isCollapsed: false,
        snippet: buildSnippet(nextTitle, '', now),
        tags: [],
        task: null,
        title: nextTitle,
        updatedAt: now,
      }
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

  const deleteCurrentPage = () => {
    if (!section || !page) return
    if (!canDeletePage) {
      window.alert('Keep at least one page in this section for now.')
      return
    }
    if (!window.confirm(`Delete page "${page.title}"?`)) return

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
              const flattenedAfterDelete = flattenPages(result.pages, 0, true)
              const fallbackPage =
                flattenedAfterDelete[Math.min(deletedIndex, flattenedAfterDelete.length - 1)]?.page
              nextSelectedPageId = fallbackPage?.id ?? current.selectedPageId
              return { ...entry, pages: result.pages }
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
