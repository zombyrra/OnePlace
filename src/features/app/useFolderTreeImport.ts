import { useState, type Dispatch, type SetStateAction } from 'react'
import type { AppState } from '../../app/appModel'
import {
  importFolderTreeDirectory,
  pickFolderTreeDirectory,
} from '../../lib/desktop'
import {
  buildFolderTreeImport,
  mergeFolderTreeImportIntoState,
} from './folderTreeImport'

type UseFolderTreeImportArgs = {
  setActiveTab: (tab: 'Home') => void
  setAppState: Dispatch<SetStateAction<AppState>>
  setSaveLabel: (value: string) => void
}

export type FolderTreeImportFromPathOptions = {
  intro?: string
}

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))

const buildFolderTreeImportPrompt = (intro?: string) =>
  [
    ...(intro ? [intro, ''] : []),
    'Import this folder into OnePlace?',
    '',
    'OnePlace will copy the files into its workspace, preserve folder paths as sections, and leave the original folder unchanged.',
    'This is not live sync with the original folder.',
  ].join('\n')

export const useFolderTreeImport = ({
  setActiveTab,
  setAppState,
  setSaveLabel,
}: UseFolderTreeImportArgs) => {
  const [isImportingFolderTree, setIsImportingFolderTree] = useState(false)

  const importFolderTreeFromPath = async (
    selectedPath: string,
    options: FolderTreeImportFromPathOptions = {},
  ) => {
    if (isImportingFolderTree) return

    const shouldImport = window.confirm(buildFolderTreeImportPrompt(options.intro))
    if (!shouldImport) return

    setIsImportingFolderTree(true)
    try {
      setSaveLabel('Scanning folder tree...')
      const directory = await importFolderTreeDirectory(selectedPath)
      setSaveLabel(`Importing ${directory.name}...`)
      const imported = buildFolderTreeImport(directory)
      setAppState((current) => mergeFolderTreeImportIntoState(current, imported))
      setActiveTab('Home')
      setSaveLabel(
        `Imported ${directory.files.length} file${directory.files.length === 1 ? '' : 's'} from ${directory.name}`,
      )
    } catch (error) {
      const message = getErrorMessage(error)
      setSaveLabel(`Folder import failed: ${message}`)
      window.alert(`Folder import failed.\n\n${message}`)
    } finally {
      setIsImportingFolderTree(false)
    }
  }

  const importFolderTree = async () => {
    if (isImportingFolderTree) return

    const selectedPath = await pickFolderTreeDirectory()
    if (!selectedPath) return

    await importFolderTreeFromPath(selectedPath)
  }

  return {
    importFolderTree,
    importFolderTreeFromPath,
    isImportingFolderTree,
  }
}
