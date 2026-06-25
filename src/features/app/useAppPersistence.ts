import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import {
  checkForDesktopUpdate,
  clearCloudSync,
  configureCloudSync,
  downloadAndInstallDesktopUpdate,
  getCloudSyncStatus,
  getDesktopAppInfo,
  listWorkspaceBackups,
  loadDesktopData,
  openNotebookDirectory,
  pickCloudSaveDirectory,
  restoreCloudWorkspace,
  restoreWorkspaceBackup,
  saveDesktopData,
  syncCloudWorkspace,
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
  setBackupSnapshots: (value: DesktopBackupSnapshot[]) => void
  setCloudSyncStatus: (value: DesktopCloudSyncStatus) => void
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
  setBackupSnapshots,
  setCloudSyncStatus,
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
  const appStateRef = useRef(appState)
  const saveAttemptRef = useRef(0)

  useEffect(() => {
    appStateRef.current = appState
  }, [appState])

  const flushPendingSave = useCallback(
    async ({ silent = false, throwOnError = false } = {}) => {
      if (!isLoaded) return

      const payload = JSON.stringify(appStateRef.current)
      if (payload === lastSavedPayloadRef.current) {
        if (!silent) setIsDirty(false)
        return
      }

      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }

      const saveAttempt = saveAttemptRef.current + 1
      saveAttemptRef.current = saveAttempt

      if (!silent) {
        setIsDirty(true)
        setSaveLabel('Saving...')
      }

      try {
        const result = await saveDesktopData(payload)
        if (saveAttempt !== saveAttemptRef.current) return
        lastSavedPayloadRef.current = payload
        if (result.cloudPath || result.cloudSavedAt || result.cloudError) {
          setCloudSyncStatus({
            enabled: Boolean(result.cloudPath),
            lastError: result.cloudError ?? null,
            lastSyncedAt: result.cloudSavedAt ?? null,
            path: result.cloudPath ?? null,
          })
        }
        void listWorkspaceBackups().then(setBackupSnapshots).catch(() => undefined)
        if (!silent) {
          setIsDirty(false)
          if (result.cloudError) {
            setSaveLabel(`Saved locally; cloud failed: ${result.cloudError}`)
          } else if (result.cloudSavedAt) {
            setSaveLabel(`Saved ${formatDate(result.savedAt)} + cloud ${formatDate(result.cloudSavedAt)}`)
          } else {
            setSaveLabel(`Saved ${formatDate(result.savedAt)}`)
          }
        }
      } catch (error) {
        if (saveAttempt === saveAttemptRef.current && !silent) {
          setIsDirty(true)
          setSaveLabel(`Save failed: ${getErrorMessage(error)}`)
        }
        if (throwOnError) throw error
      }
    },
    [isLoaded, lastSavedPayloadRef, saveTimerRef, setBackupSnapshots, setCloudSyncStatus, setIsDirty, setSaveLabel],
  )

  const applyRestoredWorkspace = useCallback(
    (rawData: string, label: string) => {
      const nextState = normalizeAppState(JSON.parse(rawData))
      const payload = JSON.stringify(nextState)
      setAppState(nextState)
      lastSavedPayloadRef.current = payload
      appStateRef.current = nextState
      trackedRecentPageRef.current = nextState.selectedPageId
      setIsDirty(false)
      setIsLoaded(true)
      setSaveLabel(label)
    },
    [lastSavedPayloadRef, setAppState, setIsDirty, setIsLoaded, setSaveLabel, trackedRecentPageRef],
  )

  const refreshWorkspaceBackups = useCallback(async () => {
    try {
      const backups = await listWorkspaceBackups()
      setBackupSnapshots(backups)
      return backups
    } catch (error) {
      setSaveLabel(`Backup list failed: ${getErrorMessage(error)}`)
      return []
    }
  }, [setBackupSnapshots, setSaveLabel])

  useEffect(() => {
    const load = async () => {
      try {
        setRecentNotebookEntries(loadRecentNotebookEntries())
        const [rawData, info, backups, cloudStatus] = await Promise.all([
          loadDesktopData(),
          getDesktopAppInfo(),
          listWorkspaceBackups(),
          getCloudSyncStatus(),
        ])
        if (info) setAppInfo(info)
        setBackupSnapshots(backups)
        setCloudSyncStatus(cloudStatus)
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
        setIsLoaded(true)
      } catch (error) {
        setIsDirty(true)
        setIsLoaded(false)
        setSaveLabel(`Load failed: ${getErrorMessage(error)}`)
      }
    }

    void load()
  }, [
    lastSavedPayloadRef,
    setAppInfo,
    setAppState,
    setBackupSnapshots,
    setCloudSyncStatus,
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
    saveTimerRef.current = window.setTimeout(() => {
      void flushPendingSave()
    }, 250)

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
      }
    }
  }, [appState, flushPendingSave, isLoaded, lastSavedPayloadRef, saveTimerRef, setIsDirty, setSaveLabel])

  useEffect(() => {
    if (!isLoaded) return

    const flushBeforeExit = () => {
      void flushPendingSave({ silent: true })
    }

    window.addEventListener('beforeunload', flushBeforeExit)
    window.addEventListener('pagehide', flushBeforeExit)

    return () => {
      window.removeEventListener('beforeunload', flushBeforeExit)
      window.removeEventListener('pagehide', flushBeforeExit)
    }
  }, [flushPendingSave, isLoaded])

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

        await flushPendingSave({ throwOnError: true })
        await downloadAndInstallUpdate(update.version, setSaveLabel, () => cancelled)
      } catch (error) {
        if (!cancelled) setSaveLabel(`Update failed: ${getErrorMessage(error)}`)
      } finally {
        isCheckingForUpdatesRef.current = false
        if (!cancelled) setIsCheckingForUpdates(false)
      }
    }

    void checkForUpdatesOnLaunch()

    return () => {
      cancelled = true
    }
  }, [flushPendingSave, isCheckingForUpdatesRef, isLoaded, setIsCheckingForUpdates, setSaveLabel])

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

      await flushPendingSave({ throwOnError: true })
      await downloadAndInstallUpdate(update.version, setSaveLabel)
    } catch (error) {
      setSaveLabel(`Update failed: ${getErrorMessage(error)}`)
    } finally {
      isCheckingForUpdatesRef.current = false
      setIsCheckingForUpdates(false)
    }
  }

  const chooseCloudSyncFolder = async () => {
    try {
      const path = await pickCloudSaveDirectory()
      if (!path) return
      setSaveLabel('Configuring cloud save...')
      const status = await configureCloudSync(path)
      setCloudSyncStatus(status)
      setSaveLabel(status.lastError ? `Cloud save failed: ${status.lastError}` : 'Cloud save connected')
    } catch (error) {
      setSaveLabel(`Cloud save failed: ${getErrorMessage(error)}`)
    }
  }

  const syncCloudNow = async () => {
    try {
      await flushPendingSave({ throwOnError: true })
      setSaveLabel('Syncing cloud save...')
      const status = await syncCloudWorkspace()
      setCloudSyncStatus(status)
      setSaveLabel(status.lastError ? `Cloud save failed: ${status.lastError}` : 'Cloud save synced')
    } catch (error) {
      setSaveLabel(`Cloud save failed: ${getErrorMessage(error)}`)
    }
  }

  const disableCloudSync = async () => {
    try {
      const status = await clearCloudSync()
      setCloudSyncStatus(status)
      setSaveLabel('Cloud save disconnected')
    } catch (error) {
      setSaveLabel(`Cloud save failed: ${getErrorMessage(error)}`)
    }
  }

  const restoreCloudSave = async () => {
    if (!window.confirm('Restore the cloud-saved workspace? Your current workspace will be saved as a backup first.')) {
      return
    }

    try {
      const restored = await restoreCloudWorkspace()
      applyRestoredWorkspace(restored.rawData, `Restored cloud save ${formatDate(restored.restoredAt)}`)
      await refreshWorkspaceBackups()
    } catch (error) {
      setSaveLabel(`Cloud restore failed: ${getErrorMessage(error)}`)
    }
  }

  const restoreBackupSnapshot = async (backupId: string) => {
    if (!window.confirm('Restore this backup snapshot? Your current workspace will be saved as a backup first.')) {
      return
    }

    try {
      const restored = await restoreWorkspaceBackup(backupId)
      applyRestoredWorkspace(restored.rawData, `Restored backup ${formatDate(restored.restoredAt)}`)
      await refreshWorkspaceBackups()
    } catch (error) {
      setSaveLabel(`Backup restore failed: ${getErrorMessage(error)}`)
    }
  }

  return {
    chooseCloudSyncFolder,
    disableCloudSync,
    refreshWorkspaceBackups,
    restoreBackupSnapshot,
    restoreCloudSave,
    runUpdateCheck,
    syncCloudNow,
  }
}
