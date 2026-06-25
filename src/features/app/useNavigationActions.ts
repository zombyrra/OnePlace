import { useMemo, type Dispatch, type SetStateAction } from 'react'
import { openNotebookDirectory, pickNotebookDirectory } from '../../lib/desktop'
import {
  findPageLocation,
  flattenPages,
  mergeNotebookIntoState,
  saveLastOpenedNotebookPath,
  saveRecentNotebookEntries,
} from '../../app/appModel'
import type {
  AppState,
  NavigationEntry,
  Notebook,
  Page,
  PageSortMode,
  RibbonTab,
  SearchResult,
  Section,
  TagResult,
  TaskResult,
} from '../../app/appModel'

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))

type UseNavigationActionsArgs = {
  appState: AppState
  navigationHistory: NavigationEntry[]
  navigationIndex: number
  navigateToEntry: (entry: NavigationEntry, suppressHistory?: boolean) => void
  notebook: Notebook | undefined
  page: Page | undefined
  recentNotebookEntries: Array<{ name: string; path: string }>
  section: Section | undefined
  setActiveTab: (tab: RibbonTab) => void
  setAppState: Dispatch<SetStateAction<AppState>>
  setNavigationIndex: Dispatch<SetStateAction<number>>
  setRecentNotebookEntries: (value: Array<{ name: string; path: string }>) => void
  setSaveLabel: (value: string) => void
}

export const useNavigationActions = ({
  appState,
  navigationHistory,
  navigationIndex,
  navigateToEntry,
  notebook,
  page,
  recentNotebookEntries,
  section,
  setActiveTab,
  setAppState,
  setNavigationIndex,
  setRecentNotebookEntries,
  setSaveLabel,
}: UseNavigationActionsArgs) => {
  const selectedPageLocation = useMemo(
    () => (section && page ? findPageLocation(section.pages, page.id) : undefined),
    [page, section],
  )

  const canDeleteNotebook = Boolean(notebook)
  const canDeletePage = Boolean(page)
  const canPromotePage = Boolean(selectedPageLocation?.parentId)
  const canDemotePage = Boolean(selectedPageLocation && selectedPageLocation.index > 0)

  const goBack = () => {
    if (navigationIndex <= 0) return
    const nextIndex = navigationIndex - 1
    const entry = navigationHistory[nextIndex]
    if (!entry) return
    setNavigationIndex(nextIndex)
    navigateToEntry(entry, true)
  }

  const goForward = () => {
    if (navigationIndex >= navigationHistory.length - 1) return
    const nextIndex = navigationIndex + 1
    const entry = navigationHistory[nextIndex]
    if (!entry) return
    setNavigationIndex(nextIndex)
    navigateToEntry(entry, true)
  }

  const selectNotebook = (notebookId: string) => {
    setAppState((current) => {
      const nextNotebook = current.notebooks.find((item) => item.id === notebookId)
      const nextGroup = nextNotebook?.sectionGroups[0]
      const nextSection = nextGroup?.sections[0]
      const nextPage = nextSection?.pages[0]
      if (!nextNotebook) return current
      if (!nextGroup || !nextSection || !nextPage) {
        return { ...current, selectedNotebookId: nextNotebook.id }
      }
      return {
        ...current,
        selectedNotebookId: nextNotebook.id,
        selectedSectionGroupId: nextGroup.id,
        selectedPageId: nextPage.id,
        selectedSectionId: nextSection.id,
      }
    })
  }

  const trackRecentNotebook = (path: string, name: string) => {
    const nextEntries = [{ name, path }, ...recentNotebookEntries.filter((item) => item.path !== path)].slice(0, 8)
    setRecentNotebookEntries(nextEntries)
    saveRecentNotebookEntries(nextEntries)
    saveLastOpenedNotebookPath(path)
  }

  const loadNotebookFromPath = async (path: string) => {
    try {
      const rawNotebook = await openNotebookDirectory(path)
      const openedNotebook = JSON.parse(rawNotebook) as Notebook
      setAppState((current) => mergeNotebookIntoState(current, openedNotebook))
      trackRecentNotebook(path, openedNotebook.name)
      setActiveTab('Home')
      setSaveLabel(`Opened ${openedNotebook.name}`)
    } catch (error) {
      const message = getErrorMessage(error)
      setSaveLabel(`Open failed: ${message}`)
      window.alert(`That folder does not contain a valid notebook.\n\n${message}`)
    }
  }

  const openNotebook = () => {
    void (async () => {
      try {
        const path = await pickNotebookDirectory()
        if (!path) return
        await loadNotebookFromPath(path)
      } catch (error) {
        const message = getErrorMessage(error)
        setSaveLabel(`Open failed: ${message}`)
        window.alert(`Unable to open the folder picker.\n\n${message}`)
      }
    })()
  }

  const selectSection = (groupId: string, sectionId: string) => {
    setAppState((current) => {
      const currentNotebook = current.notebooks.find((item) => item.id === current.selectedNotebookId)
      const nextGroup = currentNotebook?.sectionGroups.find((item) => item.id === groupId)
      const nextSection = nextGroup?.sections.find((item) => item.id === sectionId)
      const nextPage = nextSection?.pages[0]
      if (!nextSection || !nextPage) return current
      return {
        ...current,
        notebooks: current.notebooks.map((item) =>
          item.id === current.selectedNotebookId
            ? {
                ...item,
                sectionGroups: item.sectionGroups.map((group) =>
                  group.id === groupId ? { ...group, isCollapsed: false } : group,
                ),
              }
            : item,
        ),
        selectedPageId: nextPage.id,
        selectedSectionGroupId: nextGroup?.id ?? current.selectedSectionGroupId,
        selectedSectionId: nextSection.id,
      }
    })
  }

  const selectPage = (pageId: string) => {
    setAppState((current) => ({ ...current, selectedPageId: pageId }))
  }

  const openSearchResult = (result: SearchResult) => {
    navigateToEntry({
      groupId: result.groupId,
      notebookId: result.notebookId,
      pageId: result.page.id,
      sectionId: result.sectionId,
    })
  }

  const openTaskResult = (result: TaskResult) => {
    openSearchResult(result)
    setActiveTab('Review')
  }

  const openTagResult = (result: TagResult) => {
    openSearchResult(result)
    setActiveTab('Review')
  }

  const setPageSortMode = (nextMode: PageSortMode) => {
    setAppState((current) => ({
      ...current,
      meta:
        current.meta.pageSortMode === nextMode
          ? current.meta
          : {
              ...current.meta,
              pageSortMode: nextMode,
            },
    }))
  }

  const openLinkedPage = (pageId: string) => {
    const match = appState.notebooks.flatMap((entry) =>
      entry.sectionGroups.flatMap((group) =>
        group.sections.flatMap((part) =>
          flattenPages(part.pages, 0, true)
            .filter((candidate) => candidate.page.id === pageId)
            .map((candidate) => ({
              groupId: group.id,
              notebookId: entry.id,
              pageId: candidate.page.id,
              sectionId: part.id,
            })),
        ),
      ),
    )[0]

    if (!match) return
    navigateToEntry(match)
  }

  return {
    canDeleteNotebook,
    canDeletePage,
    canDemotePage,
    canPromotePage,
    goBack,
    goForward,
    loadNotebookFromPath,
    openLinkedPage,
    openNotebook,
    openSearchResult,
    openTagResult,
    openTaskResult,
    selectNotebook,
    selectPage,
    selectSection,
    selectedPageLocation,
    setPageSortMode,
  }
}
