import { useState } from 'react'
import type { PageWidthMode } from '../../app/appModel'
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, Menu, MenuContent, MenuItem, MenuTrigger } from '../ui'
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
  WidenPageIcon,
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
  showRuleLines: boolean
  onToggleRuleLines: () => void
  editorZoom: number
  onSetEditorZoom: (zoom: number) => void
  onAdjustEditorZoom: (delta: number) => void
  pageWidthMode: PageWidthMode
  onSetPageWidthMode: (mode: PageWidthMode) => void
  appVersion: string
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
    showRuleLines,
    onToggleRuleLines,
    editorZoom,
    onSetEditorZoom,
    onAdjustEditorZoom,
    pageWidthMode,
    onSetPageWidthMode,
    appVersion,
  } = props
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isLauncherOpen, setIsLauncherOpen] = useState(false)
  const avatarInitial = (workspaceName.trim()[0] ?? 'O').toUpperCase()

  return (
    <>
      <header className="op-header">
        <div className="op-header-left">
          <button
            aria-label="App launcher"
            className="op-header-icon"
            onClick={() => setIsLauncherOpen(true)}
            type="button"
          >
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
          <button
            aria-label="Settings"
            className="op-header-icon"
            onClick={() => setIsSettingsOpen(true)}
            type="button"
          >
            <SettingsIcon size={18} />
          </button>
          <button
            aria-label="Notifications"
            className="op-header-icon"
            onClick={() => setIsNotificationsOpen(true)}
            type="button"
          >
            <BellIcon size={18} />
          </button>
          <button
            aria-label="Profile"
            className="op-avatar"
            onClick={() => setIsProfileOpen(true)}
            type="button"
          >
            {avatarInitial}
          </button>
        </div>
      </header>

      {/* App Launcher */}
      <Dialog onOpenChange={setIsLauncherOpen} open={isLauncherOpen}>
        <DialogContent title="OnePlace">
          <DialogBody>
            <div className="op-launcher">
              <div className="op-launcher-brand">
                <img alt="OnePlace" height={48} src="/oneplace-logo.png" width={48} />
                <div>
                  <strong>OnePlace</strong>
                  <span>Your personal knowledge base</span>
                </div>
              </div>
              <div className="op-launcher-actions">
                <button
                  className="op-launcher-action"
                  onClick={() => { onNewNotebook(); setIsLauncherOpen(false) }}
                  type="button"
                >
                  <FilePlusIcon size={20} />
                  <span>New notebook</span>
                </button>
                <button
                  className="op-launcher-action"
                  onClick={() => { onOpenNotebook(); setIsLauncherOpen(false) }}
                  type="button"
                >
                  <FolderIcon size={20} />
                  <span>Open notebook</span>
                </button>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <button className="op-btn op-btn-secondary" type="button">Close</button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings */}
      <Dialog onOpenChange={setIsSettingsOpen} open={isSettingsOpen}>
        <DialogContent title="Settings">
          <DialogBody>
            <div className="op-settings-list">
              <div className="op-settings-row">
                <div className="op-settings-label">
                  <strong>Rule lines</strong>
                  <span>Show horizontal guide lines in the editor</span>
                </div>
                <button
                  className={`op-toggle ${showRuleLines ? 'on' : ''}`}
                  onClick={onToggleRuleLines}
                  type="button"
                  aria-pressed={showRuleLines}
                >
                  <span className="op-toggle-thumb" />
                </button>
              </div>
              <div className="op-settings-row">
                <div className="op-settings-label">
                  <strong>Page width</strong>
                  <span>Normal or wide layout for the note editor</span>
                </div>
                <div className="op-settings-seg">
                  <button
                    className={pageWidthMode === 'normal' ? 'active' : ''}
                    onClick={() => onSetPageWidthMode('normal')}
                    type="button"
                  >Normal</button>
                  <button
                    className={pageWidthMode === 'wide' ? 'active' : ''}
                    onClick={() => onSetPageWidthMode('wide')}
                    type="button"
                  >
                    <WidenPageIcon size={14} />
                    Wide
                  </button>
                </div>
              </div>
              <div className="op-settings-row">
                <div className="op-settings-label">
                  <strong>Editor zoom</strong>
                  <span>Scale the note editor content</span>
                </div>
                <div className="op-settings-zoom">
                  <button onClick={() => onAdjustEditorZoom(-0.1)} type="button">−</button>
                  <button
                    className="op-settings-zoom-label"
                    onClick={() => onSetEditorZoom(1)}
                    title="Reset to 100%"
                    type="button"
                  >
                    {Math.round(editorZoom * 100)}%
                  </button>
                  <button onClick={() => onAdjustEditorZoom(0.1)} type="button">+</button>
                </div>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <button className="op-btn op-btn-primary" type="button">Done</button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notifications */}
      <Dialog onOpenChange={setIsNotificationsOpen} open={isNotificationsOpen}>
        <DialogContent title="Notifications">
          <DialogBody>
            <div className="op-notifications-empty">
              <BellIcon size={36} />
              <p>You're all caught up — no new notifications.</p>
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <button className="op-btn op-btn-primary" type="button">Close</button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile */}
      <Dialog onOpenChange={setIsProfileOpen} open={isProfileOpen}>
        <DialogContent title="Account">
          <DialogBody>
            <div className="op-profile">
              <div className="op-profile-avatar">{avatarInitial}</div>
              <div className="op-profile-info">
                <strong>{workspaceName}</strong>
                <span>OnePlace {appVersion}</span>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <button className="op-btn op-btn-primary" type="button">Close</button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
