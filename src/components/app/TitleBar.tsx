import { Menu, MenuContent, MenuItem, MenuTrigger } from '../ui'
import {
  AppGridIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BellIcon,
  ChevronDownIcon,
  FilePlusIcon,
  FolderIcon,
  SaveIcon,
  SettingsIcon,
  UndoIcon,
} from '../Icons'

type TitleBarProps = {
  windowTitle: string
  workspaceName: string
  canGoBack: boolean
  canGoForward: boolean
  onSave: () => void
  onUndo: () => void
  onGoBack: () => void
  onGoForward: () => void
  onNewNotebook: () => void
  onOpenNotebook: () => void
}

/* OneNote-web app header (row A): app launcher + quick access, the notebook
   switcher, and the account cluster. Content search lives in the command
   bar (row B); see CommandBar.tsx. */
export function TitleBar(props: TitleBarProps) {
  const {
    windowTitle,
    workspaceName,
    canGoBack,
    canGoForward,
    onSave,
    onUndo,
    onGoBack,
    onGoForward,
    onNewNotebook,
    onOpenNotebook,
  } = props
  const avatarInitial = (workspaceName.trim()[0] ?? 'O').toUpperCase()

  return (
    <header className="op-header">
      <div className="op-header-left">
        <button aria-label="App launcher" className="op-header-icon" type="button">
          <AppGridIcon size={18} />
        </button>
        <div className="op-quick-access">
          <button className="op-header-icon" onClick={onSave} title="Save" type="button">
            <SaveIcon size={15} />
          </button>
          <button className="op-header-icon" onClick={onUndo} title="Undo" type="button">
            <UndoIcon size={15} />
          </button>
          <button className="op-header-icon" disabled={!canGoBack} onClick={onGoBack} title="Back" type="button">
            <ArrowLeftIcon size={15} />
          </button>
          <button className="op-header-icon" disabled={!canGoForward} onClick={onGoForward} title="Forward" type="button">
            <ArrowRightIcon size={15} />
          </button>
        </div>
        <Menu>
          <MenuTrigger asChild>
            <button className="op-notebook-switch" title={windowTitle} type="button">
              <img alt="OnePlace" height={20} src="/oneplace-logo.png" width={20} />
              <span className="op-notebook-name">{workspaceName}</span>
              <ChevronDownIcon size={12} />
            </button>
          </MenuTrigger>
          <MenuContent>
            <MenuItem icon={<FilePlusIcon size={16} />} onSelect={onNewNotebook}>
              New notebook
            </MenuItem>
            <MenuItem icon={<FolderIcon size={16} />} onSelect={onOpenNotebook}>
              Open notebook
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
      <div className="op-header-right">
        <button aria-label="Settings" className="op-header-icon" type="button">
          <SettingsIcon size={18} />
        </button>
        <button aria-label="Notifications" className="op-header-icon" type="button">
          <BellIcon size={18} />
        </button>
        <button className="op-avatar" type="button">
          {avatarInitial}
        </button>
      </div>
    </header>
  )
}
