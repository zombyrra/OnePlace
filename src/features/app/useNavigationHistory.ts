import { useCallback, useEffect, useReducer, useRef, type Dispatch, type SetStateAction } from 'react'
import type { AppState, NavigationEntry } from '../../app/appModel'

type UseNavigationHistoryArgs = {
  appState: AppState
  isLoaded: boolean
  setAppState: Dispatch<SetStateAction<AppState>>
}

type NavigationHistoryState = {
  entries: NavigationEntry[]
  index: number
}

type NavigationHistoryAction =
  | { type: 'record'; entry: NavigationEntry }
  | { type: 'setIndex'; value: SetStateAction<number> }

const sameNavigationEntry = (left: NavigationEntry | undefined, right: NavigationEntry) =>
  Boolean(
    left &&
      left.notebookId === right.notebookId &&
      left.groupId === right.groupId &&
      left.sectionId === right.sectionId &&
      left.pageId === right.pageId,
  )

const navigationHistoryReducer = (
  state: NavigationHistoryState,
  action: NavigationHistoryAction,
): NavigationHistoryState => {
  if (action.type === 'setIndex') {
    const nextIndex = typeof action.value === 'function' ? action.value(state.index) : action.value
    return nextIndex === state.index ? state : { ...state, index: nextIndex }
  }

  if (sameNavigationEntry(state.entries[state.index], action.entry)) return state

  const trimmedEntries = state.entries.slice(0, state.index + 1)
  const entries = [...trimmedEntries, action.entry].slice(-40)
  return {
    entries,
    index: entries.length - 1,
  }
}

export const useNavigationHistory = ({
  appState,
  isLoaded,
  setAppState,
}: UseNavigationHistoryArgs) => {
  const [navigationState, dispatchNavigationHistory] = useReducer(navigationHistoryReducer, {
    entries: [],
    index: -1,
  })
  const isApplyingNavigationRef = useRef(false)
  const trackedRecentPageRef = useRef('')
  const navigationHistory = navigationState.entries
  const navigationIndex = navigationState.index
  const setNavigationIndex = useCallback<Dispatch<SetStateAction<number>>>((value) => {
    dispatchNavigationHistory({ type: 'setIndex', value })
  }, [])

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

    dispatchNavigationHistory({ type: 'record', entry: nextEntry })
  }, [
    appState.selectedNotebookId,
    appState.selectedPageId,
    appState.selectedSectionGroupId,
    appState.selectedSectionId,
    isLoaded,
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
