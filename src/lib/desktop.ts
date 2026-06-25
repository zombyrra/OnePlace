import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { relaunch } from '@tauri-apps/plugin-process'
import { check } from '@tauri-apps/plugin-updater'

const DATA_KEY = 'oneplace-data'

type DesktopDataAccessDeps = {
  invoke: <T>(command: string, args?: Record<string, unknown>) => Promise<T>
  isTauriRuntime: () => boolean
  localStorage: Pick<Storage, 'getItem' | 'setItem'>
  now?: () => Date
}

export type DesktopUpdateInfo = {
  body?: string
  currentVersion: string
  version: string
}

export type DesktopUpdateProgress =
  | { event: 'Started'; data: { contentLength: number | null } }
  | { event: 'Progress'; data: { chunkLength: number } }
  | { event: 'Finished' }

const isTauriRuntime = () =>
  typeof window !== 'undefined' &&
  (Object.prototype.hasOwnProperty.call(window, '__TAURI_INTERNALS__') ||
    Object.prototype.hasOwnProperty.call(window, '__TAURI__'))

export const createDesktopDataAccess = ({
  invoke,
  isTauriRuntime,
  localStorage,
  now = () => new Date(),
}: DesktopDataAccessDeps) => ({
  loadDesktopData: async (): Promise<string | null> => {
    if (isTauriRuntime()) {
      return await invoke<string | null>('load_data')
    }

    return localStorage.getItem(DATA_KEY)
  },

  saveDesktopData: async (rawData: string): Promise<DesktopSaveResult> => {
    if (isTauriRuntime()) {
      return await invoke<DesktopSaveResult>('save_data', { rawData })
    }

    localStorage.setItem(DATA_KEY, rawData)
    return {
      path: 'localStorage',
      savedAt: now().toISOString(),
    }
  },
})

const desktopDataAccess = createDesktopDataAccess({
  invoke,
  isTauriRuntime,
  localStorage: {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  },
})

export const loadDesktopData = async (): Promise<string | null> => desktopDataAccess.loadDesktopData()

export const saveDesktopData = async (rawData: string): Promise<DesktopSaveResult> =>
  desktopDataAccess.saveDesktopData(rawData)

export const getDesktopAppInfo = async (): Promise<DesktopAppInfo | null> => {
  if (isTauriRuntime()) {
    try {
      return await invoke<DesktopAppInfo>('get_app_info')
    } catch {
      return null
    }
  }

  return null
}

export const checkForDesktopUpdate = async (): Promise<DesktopUpdateInfo | null> => {
  if (!isTauriRuntime()) return null

  const update = await check()
  if (!update) return null

  return {
    body: update.body ?? undefined,
    currentVersion: update.currentVersion,
    version: update.version,
  }
}

export const downloadAndInstallDesktopUpdate = async (
  onEvent?: (event: DesktopUpdateProgress) => void,
): Promise<void> => {
  if (!isTauriRuntime()) return

  const update = await check()
  if (!update) return

  await update.downloadAndInstall((event) => {
    if (event.event === 'Started') {
      onEvent?.({
        event: 'Started',
        data: {
          contentLength: event.data.contentLength ?? null,
        },
      })
      return
    }

    if (event.event === 'Progress') {
      onEvent?.({
        event: 'Progress',
        data: {
          chunkLength: event.data.chunkLength,
        },
      })
      return
    }

    onEvent?.({ event: 'Finished' })
  })

  await relaunch()
}

export const pickDirectory = async (title: string): Promise<string | null> => {
  if (!isTauriRuntime()) return null

  const selected = await open({
    directory: true,
    multiple: false,
    title,
  })

  return typeof selected === 'string' ? selected : null
}

export const pickNotebookDirectory = async (): Promise<string | null> =>
  pickDirectory('Open Notebook Folder')

export const pickNotebookSaveDirectory = async (): Promise<string | null> =>
  pickDirectory('Choose Notebook Save Location')

export const pickOneNoteExportDirectory = async (): Promise<string | null> =>
  pickDirectory('Import OneNote Export Folder')

export const pickExportFilePath = async (defaultPath: string): Promise<string | null> =>
  save({
    defaultPath,
    filters: [
      { name: 'PDF', extensions: ['pdf'] },
      { name: 'HTML', extensions: ['html'] },
      { name: 'Text', extensions: ['txt'] },
    ],
    title: 'Export Page',
  })

export const openNotebookDirectory = async (path: string): Promise<string> =>
  invoke<string>('open_notebook_dir', { path })

export const exportNotebookDirectory = async (
  path: string,
  notebook: string,
): Promise<DesktopSaveResult> => invoke<DesktopSaveResult>('export_notebook_dir', { notebook, path })

export const importOneNoteExportDirectory = async (path: string): Promise<ImportedOneNoteDirectory> =>
  invoke<ImportedOneNoteDirectory>('import_onenote_export_dir', { path })

export const readLocalAssetFile = async (path: string, rootPath: string): Promise<ImportedAssetData> =>
  invoke<ImportedAssetData>('read_local_asset_file', { path, rootPath })

export const exportPageFile = async (
  filePath: string,
  format: 'html' | 'pdf' | 'txt',
  title: string,
  createdAt: string,
  htmlContents: string,
  textContents: string,
): Promise<DesktopSaveResult> =>
  invoke<DesktopSaveResult>('export_page_file', {
    createdAt,
    filePath,
    format,
    htmlContents,
    textContents,
    title,
  })
