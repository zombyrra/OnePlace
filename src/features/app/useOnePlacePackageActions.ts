import { useState, type Dispatch, type SetStateAction } from 'react'
import type { AppState, Notebook } from '../../app/appModel'
import {
  exportOnePlacePackage,
  importOnePlacePackage,
  pickOnePlacePackageFile,
  pickOnePlacePackageSavePath,
} from '../../lib/desktop'
import {
  collectNotebookPackageAssets,
  mergeOnePlacePackageIntoState,
} from './onePlacePackage'

type UseOnePlacePackageActionsArgs = {
  appState: AppState
  notebook: Notebook | undefined
  setActiveTab: (tab: 'Home') => void
  setAppState: Dispatch<SetStateAction<AppState>>
  setSaveLabel: (value: string) => void
}

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))

const packageFileName = (notebook: Notebook) => {
  const safeName =
    notebook.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'notebook'
  return `${safeName}.oneplace`
}

export const useOnePlacePackageActions = ({
  appState,
  notebook,
  setActiveTab,
  setAppState,
  setSaveLabel,
}: UseOnePlacePackageActionsArgs) => {
  const [isOpeningOnePlacePackage, setIsOpeningOnePlacePackage] = useState(false)
  const [isExportingOnePlacePackage, setIsExportingOnePlacePackage] = useState(false)

  const openOnePlacePackage = async () => {
    if (isOpeningOnePlacePackage) return

    const filePath = await pickOnePlacePackageFile()
    if (!filePath) return

    setIsOpeningOnePlacePackage(true)
    try {
      setSaveLabel('Opening OnePlace package...')
      const imported = await importOnePlacePackage(filePath)
      setAppState((current) => mergeOnePlacePackageIntoState(current, imported))
      setActiveTab('Home')
      setSaveLabel(`Opened ${imported.notebooks.length} OnePlace notebook${imported.notebooks.length === 1 ? '' : 's'}`)
    } catch (error) {
      const message = getErrorMessage(error)
      setSaveLabel(`Package open failed: ${message}`)
      window.alert(`Package open failed.\n\n${message}`)
    } finally {
      setIsOpeningOnePlacePackage(false)
    }
  }

  const exportCurrentNotebookPackage = async () => {
    if (!notebook || isExportingOnePlacePackage) return

    const filePath = await pickOnePlacePackageSavePath(packageFileName(notebook))
    if (!filePath) return

    setIsExportingOnePlacePackage(true)
    try {
      setSaveLabel(`Exporting ${notebook.name}...`)
      const assets = collectNotebookPackageAssets(notebook, appState.meta.assets)
      const result = await exportOnePlacePackage(filePath, JSON.stringify(notebook), JSON.stringify(assets))
      setSaveLabel(`Exported package to ${result.path}`)
    } catch (error) {
      const message = getErrorMessage(error)
      setSaveLabel(`Package export failed: ${message}`)
      window.alert(`Package export failed.\n\n${message}`)
    } finally {
      setIsExportingOnePlacePackage(false)
    }
  }

  return {
    exportCurrentNotebookPackage,
    isExportingOnePlacePackage,
    isOpeningOnePlacePackage,
    openOnePlacePackage,
  }
}
