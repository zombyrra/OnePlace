import type { Dispatch, SetStateAction } from 'react'
import {
  buildSnippet,
  findPageById,
  getDropPosition,
  hasChildPageSelected,
  insertPageRelative,
  pageContainsId,
  removePageById,
  reorderItems,
  updateNestedPages,
} from '../../app/appModel'
import type { AppState, DragState, DropTarget, Notebook, Page, PageUpdate, Section } from '../../app/appModel'

type Args = {
  clearDragState: (suppressClick?: boolean) => void
  dragState: DragState | null
  notebook: Notebook | undefined
  page: Page | undefined
  section: Section | undefined
  setAppState: Dispatch<SetStateAction<AppState>>
  setDropTarget: Dispatch<SetStateAction<DropTarget | null>>
}

export const useWorkspaceTreeActions = ({
  clearDragState,
  dragState,
  notebook,
  page,
  section,
  setAppState,
  setDropTarget,
}: Args) => {
  const setNotebookDropTarget = (event: React.PointerEvent<HTMLElement>, notebookId: string) => {
    if (!dragState || dragState.type !== 'notebook') return
    event.preventDefault()
    event.stopPropagation()
    setDropTarget({ type: 'notebook', notebookId, position: getDropPosition(event) })
  }

  const moveNotebook = (targetNotebookId: string, position: 'before' | 'after') => {
    if (!dragState || dragState.type !== 'notebook' || dragState.notebookId === targetNotebookId) {
      return
    }

    setAppState((current) => ({
      ...current,
      notebooks: reorderItems(current.notebooks, dragState.notebookId, targetNotebookId, position),
    }))
    clearDragState(true)
  }

  const setSectionGroupDropTarget = (event: React.PointerEvent<HTMLElement>, groupId: string) => {
    if (!dragState || dragState.type !== 'section-group') return
    event.preventDefault()
    event.stopPropagation()
    setDropTarget({ type: 'section-group', groupId, position: getDropPosition(event) })
  }

  const setSectionDropTarget = (
    event: React.PointerEvent<HTMLElement>,
    groupId: string,
    sectionId: string,
  ) => {
    if (!dragState || dragState.type !== 'section') return
    event.preventDefault()
    event.stopPropagation()
    setDropTarget({ type: 'section', groupId, sectionId, position: getDropPosition(event) })
  }

  const setSectionGroupInsideDropTarget = (event: React.PointerEvent<HTMLElement>, groupId: string) => {
    if (!dragState || dragState.type !== 'section') return
    event.preventDefault()
    setDropTarget({ type: 'section', groupId, position: 'inside' })
  }

  const setPageDropTarget = (event: React.PointerEvent<HTMLElement>, pageId: string) => {
    if (!dragState || dragState.type !== 'page') return
    const draggedPage = section ? findPageById(section.pages, dragState.pageId) : undefined
    if (!draggedPage || dragState.pageId === pageId || pageContainsId(draggedPage, pageId)) {
      setDropTarget(null)
      return
    }

    event.preventDefault()
    event.stopPropagation()
    setDropTarget({ type: 'page', pageId, position: getDropPosition(event) })
  }

  const moveSectionGroup = (targetGroupId: string, position: 'before' | 'after') => {
    if (!notebook || !dragState || dragState.type !== 'section-group' || dragState.groupId === targetGroupId) {
      return
    }

    setAppState((current) => ({
      ...current,
      notebooks: current.notebooks.map((item) =>
        item.id === current.selectedNotebookId
          ? {
              ...item,
              sectionGroups: reorderItems(item.sectionGroups, dragState.groupId, targetGroupId, position),
            }
          : item,
      ),
    }))
    clearDragState(true)
  }

  const moveSection = (
    targetGroupId: string,
    targetSectionId: string,
    position: 'before' | 'after',
  ) => {
    if (!notebook || !dragState || dragState.type !== 'section') return
    if (dragState.groupId === targetGroupId && dragState.sectionId === targetSectionId) return

    setAppState((current) => {
      const currentNotebook = current.notebooks.find((item) => item.id === current.selectedNotebookId)
      if (!currentNotebook) return current

      const sourceGroup = currentNotebook.sectionGroups.find((group) => group.id === dragState.groupId)
      const draggedSection = sourceGroup?.sections.find((item) => item.id === dragState.sectionId)
      if (!sourceGroup || !draggedSection) return current

      return {
        ...current,
        notebooks: current.notebooks.map((item) => {
          if (item.id !== current.selectedNotebookId) return item

          let sectionToInsert: Section | null = null
          const strippedGroups = item.sectionGroups.map((group) => {
            if (group.id !== dragState.groupId) return group
            const remainingSections = group.sections.filter((entry) => {
              const keep = entry.id !== dragState.sectionId
              if (!keep) sectionToInsert = entry
              return keep
            })
            return { ...group, sections: remainingSections }
          })

          if (!sectionToInsert) return item

          return {
            ...item,
            sectionGroups: strippedGroups.map((group) => {
              if (group.id !== targetGroupId) return group
              return {
                ...group,
                isCollapsed: false,
                sections: reorderItems(
                  [...group.sections, sectionToInsert as Section],
                  dragState.sectionId,
                  targetSectionId,
                  position,
                ),
              }
            }),
          }
        }),
        selectedSectionGroupId: targetGroupId,
        selectedSectionId: draggedSection.id,
      }
    })
    clearDragState(true)
  }

  const moveSectionToGroup = (targetGroupId: string) => {
    if (!notebook || !dragState || dragState.type !== 'section') return
    if (dragState.groupId === targetGroupId) return

    setAppState((current) => {
      const currentNotebook = current.notebooks.find((item) => item.id === current.selectedNotebookId)
      if (!currentNotebook) return current

      const sourceGroup = currentNotebook.sectionGroups.find((group) => group.id === dragState.groupId)
      const draggedSection = sourceGroup?.sections.find((item) => item.id === dragState.sectionId)
      if (!draggedSection) return current

      return {
        ...current,
        notebooks: current.notebooks.map((item) => {
          if (item.id !== current.selectedNotebookId) return item

          let sectionToMove: Section | null = null
          const groupsWithoutDraggedSection = item.sectionGroups.map((group) => {
            if (group.id !== dragState.groupId) return group
            return {
              ...group,
              sections: group.sections.filter((entry) => {
                const keep = entry.id !== dragState.sectionId
                if (!keep) sectionToMove = entry
                return keep
              }),
            }
          })

          if (!sectionToMove) return item

          return {
            ...item,
            sectionGroups: groupsWithoutDraggedSection.map((group) =>
              group.id === targetGroupId
                ? { ...group, isCollapsed: false, sections: [...group.sections, sectionToMove as Section] }
                : group,
            ),
          }
        }),
        selectedSectionGroupId: targetGroupId,
        selectedSectionId: draggedSection.id,
      }
    })
    clearDragState(true)
  }

  const toggleSectionGroupCollapse = (groupId: string) => {
    setAppState((current) => ({
      ...current,
      notebooks: current.notebooks.map((item) =>
        item.id === current.selectedNotebookId
          ? {
              ...item,
              sectionGroups: item.sectionGroups.map((group) =>
                group.id === groupId ? { ...group, isCollapsed: !group.isCollapsed } : group,
              ),
            }
          : item,
      ),
    }))
  }

  const movePage = (targetPageId: string, position: 'before' | 'after') => {
    if (!section || !dragState || dragState.type !== 'page' || dragState.pageId === targetPageId) return

    setAppState((current) => {
      let movedPage: Page | undefined
      const nextState = {
        ...current,
        notebooks: current.notebooks.map((item) => ({
          ...item,
          sectionGroups: item.sectionGroups.map((group) => ({
            ...group,
            sections: group.sections.map((entry) => {
              if (entry.id !== current.selectedSectionId) return entry

              const removed = removePageById(entry.pages, dragState.pageId)
              movedPage = removed.page
              if (!movedPage || pageContainsId(movedPage, targetPageId)) {
                movedPage = undefined
                return entry
              }
              return {
                ...entry,
                pages: insertPageRelative(removed.pages, targetPageId, movedPage, position),
              }
            }),
          })),
        })),
        selectedPageId: dragState.pageId,
      }
      return movedPage ? nextState : current
    })
    clearDragState(true)
  }

  const togglePageCollapse = (pageId: string) => {
    setAppState((current) => {
      let nextSelectedPageId = current.selectedPageId

      return {
        ...current,
        notebooks: current.notebooks.map((item) => ({
          ...item,
          sectionGroups: item.sectionGroups.map((group) => ({
            ...group,
            sections: group.sections.map((entry) => {
              if (entry.id !== current.selectedSectionId) return entry

              return {
                ...entry,
                pages: updateNestedPages(entry.pages, pageId, (note) => {
                  const nextCollapsed = !note.isCollapsed
                  if (nextCollapsed && hasChildPageSelected(note, current.selectedPageId)) {
                    nextSelectedPageId = note.id
                  }

                  return {
                    ...note,
                    isCollapsed: nextCollapsed,
                  }
                }),
              }
            }),
          })),
        })),
        selectedPageId: nextSelectedPageId,
      }
    })
  }

  const updatePage = (updates: PageUpdate) => {
    if (!page) return
    setAppState((current) => ({
      ...current,
      notebooks: current.notebooks.map((item) => ({
        ...item,
        sectionGroups: item.sectionGroups.map((group) => ({
          ...group,
          sections: group.sections.map((entry) => ({
            ...entry,
            pages: updateNestedPages(entry.pages, current.selectedPageId, (note) => {
              const resolvedUpdates = typeof updates === 'function' ? updates(note) : updates
              const nextTitle = typeof resolvedUpdates.title === 'string' ? resolvedUpdates.title : note.title
              const nextContent = typeof resolvedUpdates.content === 'string' ? resolvedUpdates.content : note.content
              const nextUpdatedAt = new Date().toISOString()
              return {
                ...note,
                ...resolvedUpdates,
                snippet: buildSnippet(nextTitle, nextContent, nextUpdatedAt),
                updatedAt: nextUpdatedAt,
              }
            }),
          })),
        })),
      })),
    }))
  }

  return {
    moveNotebook,
    movePage,
    moveSection,
    moveSectionGroup,
    moveSectionToGroup,
    setNotebookDropTarget,
    setPageDropTarget,
    setSectionDropTarget,
    setSectionGroupDropTarget,
    setSectionGroupInsideDropTarget,
    togglePageCollapse,
    toggleSectionGroupCollapse,
    updatePage,
  }
}
