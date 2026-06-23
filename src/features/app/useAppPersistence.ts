import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import {
  checkForDesktopUpdate,
  downloadAndInstallDesktopUpdate,
  getDesktopAppInfo,
  loadDesktopData,
  openNotebookDirectory,
  saveDesktopData,
} from '../../lib/desktop'
import {
  LAST_OPENED_NOTEBOOK_KEY,
  createStarterState,
  formatDate,
  loadLastOpenedNotebookPath,
  loadRecentNotebookEntries,
  mergeNotebookIntoState,
  normalizeAppState,
} from '../../app/appModel'
import type { AppState, Notebook, RecentNotebookEntry } from '../../app/appModel'

type UseAppPersistenceArgs = {
  appState: AppState
  isLoaded: boolean
  setAppInfo: (value: DesktopAppInfo | null) => void
  setAppState: Dispatch<SetStateAction<AppState>>
  setIsCheckingForUpdates: (value: boolean) => void
  setIsDirty: (value: boolean) => void
  setIsLoaded: (value: boolean) => void
  setRecentNotebookEntries: (value: RecentNotebookEntry[]) => void
  setSaveLabel: (value: string) => void
  isCheckingForUpdatesRef: MutableRefObject<boolean>
  lastSavedPayloadRef: MutableRefObject<string>
  saveTimerRef: MutableRefObject<number | null>
  trackedRecentPageRef: MutableRefObject<string>
}

const buildUpdatePrompt = (version: string, body?: string) =>
  [
    `OnePlace ${version} is available.`,
    '',
    body?.trim() || 'An application update is ready to install.',
    '',
    'Install now? The app will restart after the update.',
  ].join('\n')

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))

const downloadAndInstallUpdate = async (
  version: string,
  setSaveLabel: (value: string) => void,
  cancelled?: () => boolean,
) => {
  let downloaded = 0
  let contentLength = 0
  setSaveLabel(`Downloading update ${version}...`)
  await downloadAndInstallDesktopUpdate((event) => {
    if (cancelled?.()) return

    if (event.event === 'Started') {
      contentLength = event.data.contentLength ?? 0
      downloaded = 0
      setSaveLabel(`Downloading update ${version}...`)
      return
    }

    if (event.event === 'Progress') {
      downloaded += event.data.chunkLength
      if (contentLength > 0) {
        const percent = Math.min(100, Math.round((downloaded / contentLength) * 100))
        setSaveLabel(`Installing update ${version}... ${percent}%`)
      }
      return
    }

    setSaveLabel(`Restarting into OnePlace ${version}...`)
  })
}

export const useAppPersistence = ({
  appState,
  isLoaded,
  setAppInfo,
  setAppState,
  setIsCheckingForUpdates,
  setIsDirty,
  setIsLoaded,
  setRecentNotebookEntries,
  setSaveLabel,
  isCheckingForUpdatesRef,
  lastSavedPayloadRef,
  saveTimerRef,
  trackedRecentPageRef,
}: UseAppPersistenceArgs) => {
  const saveAttemptRef = useRef(0)

  useEffect(() => {
    const load = async () => {
      try {
        setRecentNotebookEntries(loadRecentNotebookEntries())
        const [rawData, info] = await Promise.all([loadDesktopData(), getDesktopAppInfo()])
        if (info) setAppInfo(info)
        let nextState = rawData ? normalizeAppState(JSON.parse(rawData)) : createStarterState()
        const lastOpenedPath = loadLastOpenedNotebookPath()
        if (lastOpenedPath) {
          try {
            const rawNotebook = await openNotebookDirectory(lastOpenedPath)
            nextState = mergeNotebookIntoState(nextState, JSON.parse(rawNotebook) as Notebook)
          } catch {
            localStorage.removeItem(LAST_OPENED_NOTEBOOK_KEY)
          }
        }
        setAppState(nextState)
        lastSavedPayloadRef.current = JSON.stringify(nextState)
        trackedRecentPageRef.current = nextState.selectedPageId
        setIsDirty(false)
        setSaveLabel('All changes saved')
      } catch {
        setSaveLabel('Loaded sample notebook')
      } finally {
        setIsLoaded(true)
      }
    }

    void load()
  }, [
    lastSavedPayloadRef,
    setAppInfo,
    setAppState,
    setIsDirty,
    setIsLoaded,
    setRecentNotebookEntries,
    setSaveLabel,
    trackedRecentPageRef,
  ])

  useEffect(() => {
    if (!isLoaded) return

    const payload = JSON.stringify(appState)
    if (payload === lastSavedPayloadRef.current) {
      setIsDirty(false)
      return
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
    }

    setIsDirty(true)
    setSaveLabel('Saving...')
    const saveAttempt = saveAttemptRef.current + 1
    saveAttemptRef.current = saveAttempt

    saveTimerRef.current = window.setTimeout(() => {
      void saveDesktopData(payload).then((result) => {
        if (saveAttempt !== saveAttemptRef.current) return
        lastSavedPayloadRef.current = payload
        setIsDirty(false)
        setSaveLabel(`Saved ${formatDate(result.savedAt)}`)
      }).catch((error) => {
        if (saveAttempt !== saveAttemptRef.current) return
        setIsDirty(true)
        setSaveLabel(`Save failed: ${getErrorMessage(error)}`)
      })
    }, 250)

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
      }
    }
  }, [appState, isLoaded, lastSavedPayloadRef, saveTimerRef, setIsDirty, setSaveLabel])

  useEffect(() => {
    if (!isLoaded) return
    let cancelled = false

    const checkForUpdatesOnLaunch = async () => {
      if (isCheckingForUpdatesRef.current) return

      isCheckingForUpdatesRef.current = true
      setIsCheckingForUpdates(true)

      try {
        const update = await checkForDesktopUpdate()
        if (!update || cancelled) return

        const shouldInstall = window.confirm(buildUpdatePrompt(update.version, update.body))
        if (!shouldInstall) {
          setSaveLabel(`Update available: ${update.version}`)
          return
        }

        await downloadAndInstallUpdate(update.version, setSaveLabel, () => cancelled)
      } catch {
        if (!cancelled) setSaveLabel('Update check failed')
      } finally {
        isCheckingForUpdatesRef.current = false
        if (!cancelled) setIsCheckingForUpdates(false)
      }
    }

    void checkForUpdatesOnLaunch()

    return () => {
      cancelled = true
    }
  }, [isCheckingForUpdatesRef, isLoaded, setIsCheckingForUpdates, setSaveLabel])

  const runUpdateCheck = async (mode: 'automatic' | 'manual' = 'manual') => {
    if (isCheckingForUpdatesRef.current) return

    isCheckingForUpdatesRef.current = true
    setIsCheckingForUpdates(true)

    try {
      const update = await checkForDesktopUpdate()
      if (!update) {
        if (mode === 'manual') setSaveLabel('OnePlace is up to date')
        return
      }

      const shouldInstall = window.confirm(buildUpdatePrompt(update.version, update.body))
      if (!shouldInstall) {
        setSaveLabel(`Update available: ${update.version}`)
        return
      }

      await downloadAndInstallUpdate(update.version, setSaveLabel)
    } catch {
      setSaveLabel('Update check failed')
    } finally {
      isCheckingForUpdatesRef.current = false
      setIsCheckingForUpdates(false)
    }
  }

  return { runUpdateCheck }
}
