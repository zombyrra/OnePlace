import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { AppState, NavigationEntry } from '../../app/appModel'

type UseNavigationHistoryArgs = {
  appState: AppState
  isLoaded: boolean
  setAppState: Dispatch<SetStateAction<AppState>>
}

export const useNavigationHistory = ({
  appState,
  isLoaded,
  setAppState,
}: UseNavigationHistoryArgs) => {
  const [navigationHistory, setNavigationHistory] = useState<NavigationEntry[]>([])
  const [navigationIndex, setNavigationIndex] = useState(-1)
  const isApplyingNavigationRef = useRef(false)
  const trackedRecentPageRef = useRef('')

  useEffect(() => {
    if (!isLoaded || !appState.selectedPageId || trackedRecentPageRef.current === appState.selectedPageId) return

    trackedRecentPageRef.current = appState.selectedPageId
    setAppState((current) => {
      if (current.meta.recentPageIds[0] === current.selectedPageId) return current

      return {
        ...current,
        meta: {
          ...current.meta,
          recentPageIds: [current.selectedPageId, ...current.meta.recentPageIds.filter((id) => id !== current.selectedPageId)].slice(0, 8),
        },
      }
    })
  }, [appState.selectedPageId, isLoaded, setAppState])

  useEffect(() => {
    if (!isLoaded || !appState.selectedNotebookId || !appState.selectedSectionGroupId || !appState.selectedSectionId || !appState.selectedPageId) {
      return
    }

    const nextEntry: NavigationEntry = {
      groupId: appState.selectedSectionGroupId,
      notebookId: appState.selectedNotebookId,
      pageId: appState.selectedPageId,
      sectionId: appState.selectedSectionId,
    }

    if (isApplyingNavigationRef.current) {
      isApplyingNavigationRef.current = false
      return
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNavigationHistory((current) => {
      const active = current[navigationIndex]
      if (
        active &&
        active.notebookId === nextEntry.notebookId &&
        active.groupId === nextEntry.groupId &&
        active.sectionId === nextEntry.sectionId &&
        active.pageId === nextEntry.pageId
      ) {
        return current
      }

      const trimmed = current.slice(0, navigationIndex + 1)
      const nextHistory = [...trimmed, nextEntry].slice(-40)
      const nextIndex = nextHistory.length - 1
      window.setTimeout(() => setNavigationIndex(nextIndex), 0)
      return nextHistory
    })
  }, [
    appState.selectedNotebookId,
    appState.selectedPageId,
    appState.selectedSectionGroupId,
    appState.selectedSectionId,
    isLoaded,
    navigationIndex,
  ])

  const navigateToEntry = (entry: NavigationEntry, suppressHistory = false) => {
    if (suppressHistory) {
      isApplyingNavigationRef.current = true
    }
    setAppState((current) => ({
      ...current,
      notebooks: current.notebooks.map((item) =>
        item.id === entry.notebookId
          ? {
              ...item,
              sectionGroups: item.sectionGroups.map((group) =>
                group.id === entry.groupId ? { ...group, isCollapsed: false } : group,
              ),
            }
          : item,
      ),
      selectedNotebookId: entry.notebookId,
      selectedPageId: entry.pageId,
      selectedSectionGroupId: entry.groupId,
      selectedSectionId: entry.sectionId,
    }))
  }

  return {
    canGoBack: navigationIndex > 0,
    canGoForward: navigationIndex >= 0 && navigationIndex < navigationHistory.length - 1,
    navigateToEntry,
    navigationHistory,
    navigationIndex,
    setNavigationIndex,
    trackedRecentPageRef,
  }
}
