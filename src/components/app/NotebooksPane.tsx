import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react'
import { useState } from 'react'
import type {
  AppState,
  ContextMenuItem,
  DragState,
  DropTarget,
  Notebook,
  Section,
} from '../../app/appModel'
import { ChevronDownIcon, EditIcon, NotebookStackIcon, SectionBookIcon, SettingsIcon } from '../Icons'

type DragHandler = (event: ReactPointerEvent<HTMLElement>, nextState: DragState) => void
type DropHandler = (event: ReactPointerEvent<HTMLElement>) => void
type NotebookDropTargetHandler = (event: ReactPointerEvent<HTMLElement>, notebookId: string) => void
type SectionDropTargetHandler = (
  event: ReactPointerEvent<HTMLElement>,
  groupId: string,
  sectionId: string,
) => void
type SectionGroupInsideDropTargetHandler = (
  event: ReactPointerEvent<HTMLElement>,
  groupId: string,
) => void

type NotebooksPaneProps = {
  appState: AppState
  notebook?: Notebook
  section?: Section
  dragState: DragState | null
  dropTarget: DropTarget | null
  isNotebookPaneVisible: boolean
  isCheckingForUpdates: boolean
  canDeleteNotebook: boolean
  createNotebook: () => void
  addSectionGroupWithName: (name: string) => void
  createSectionInGroup: (groupId: string, name: string) => void
  consumeSuppressedClick: () => boolean
  selectNotebook: (id: string) => void
  selectSection: (groupId: string, sectionId: string) => void
  beginDrag: DragHandler
  allowDrop: DropHandler
  setNotebookDropTarget: NotebookDropTargetHandler
  moveNotebook: (id: string, position: 'before' | 'after') => void
  openContextMenu: (event: ReactMouseEvent<HTMLElement>, items: ContextMenuItem[]) => void
  renameNotebookTo: (id: string, name: string) => void
  renameSectionGroupTo: (groupId: string, name: string) => void
  renameSectionTo: (groupId: string, sectionId: string, name: string) => void
  deleteNotebook: (id: string) => void
  setSectionGroupInsideDropTarget: SectionGroupInsideDropTargetHandler
  moveSectionToGroup: (groupId: string) => void
  setSectionDropTarget: SectionDropTargetHandler
  moveSection: (groupId: string, sectionId: string, position: 'before' | 'after') => void
  toggleSectionGroupCollapse: (groupId: string) => void
  runUpdateCheck: (mode?: 'automatic' | 'manual') => Promise<void> | void
  renderNotebookIcon: (notebook: Notebook) => ReactNode
}

export function NotebooksPane(props: NotebooksPaneProps) {
  const {
    appState,
    notebook,
    section,
    dragState,
    dropTarget,
    isNotebookPaneVisible,
    isCheckingForUpdates,
    canDeleteNotebook,
    createNotebook,
    addSectionGroupWithName,
    createSectionInGroup,
    consumeSuppressedClick,
    selectNotebook,
    selectSection,
    beginDrag,
    allowDrop,
    setNotebookDropTarget,
    moveNotebook,
    openContextMenu,
    renameNotebookTo,
    renameSectionGroupTo,
    renameSectionTo,
    deleteNotebook,
    setSectionGroupInsideDropTarget,
    moveSectionToGroup,
    setSectionDropTarget,
    moveSection,
    toggleSectionGroupCollapse,
    runUpdateCheck,
    renderNotebookIcon,
  } = props
  const [editingNotebookId, setEditingNotebookId] = useState<string | null>(null)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingSectionKey, setEditingSectionKey] = useState<string | null>(null)
  const [creatingSectionGroup, setCreatingSectionGroup] = useState(false)
  const [creatingSectionInGroupId, setCreatingSectionInGroupId] = useState<string | null>(null)
  const [inlineDraft, setInlineDraft] = useState('')

  const startNotebookRename = (notebookId: string, name: string) => {
    setEditingNotebookId(notebookId)
    setEditingGroupId(null)
    setEditingSectionKey(null)
    setCreatingSectionGroup(false)
    setCreatingSectionInGroupId(null)
    setInlineDraft(name)
  }

  const startGroupRename = (groupId: string, name: string) => {
    setEditingNotebookId(null)
    setEditingGroupId(groupId)
    setEditingSectionKey(null)
    setCreatingSectionGroup(false)
    setCreatingSectionInGroupId(null)
    setInlineDraft(name)
  }

  const startSectionRename = (groupId: string, sectionId: string, name: string) => {
    setEditingNotebookId(null)
    setEditingGroupId(null)
    setEditingSectionKey(`${groupId}:${sectionId}`)
    setCreatingSectionGroup(false)
    setCreatingSectionInGroupId(null)
    setInlineDraft(name)
  }

  const startSectionGroupCreate = () => {
    setEditingNotebookId(null)
    setEditingGroupId(null)
    setEditingSectionKey(null)
    setCreatingSectionGroup(true)
    setCreatingSectionInGroupId(null)
    setInlineDraft(`Section Group ${(notebook?.sectionGroups.length ?? 0) + 1}`)
  }

  const startSectionCreate = (groupId: string) => {
    setEditingNotebookId(null)
    setEditingGroupId(null)
    setEditingSectionKey(null)
    setCreatingSectionGroup(false)
    setCreatingSectionInGroupId(groupId)
    setInlineDraft('New Section')
  }

  const cancelInlineEdit = () => {
    setEditingNotebookId(null)
    setEditingGroupId(null)
    setEditingSectionKey(null)
    setCreatingSectionGroup(false)
    setCreatingSectionInGroupId(null)
    setInlineDraft('')
  }

  const handleInlineKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>, onCommit: () => void) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      onCommit()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      cancelInlineEdit()
    }
  }

  return (
    <aside className="notebooks-pane" hidden={!isNotebookPaneVisible}>
      <div className="pane-heading">
        <span className="heading-icon">
          <NotebookStackIcon size={18} />
        </span>
        <div className="pane-heading-copy">
          <span className="pane-kicker">NOTEBOOKS</span>
          <strong>My Notebooks</strong>
        </div>
        <button className="pane-heading-action" onClick={createNotebook} type="button">
          <NotebookStackIcon size={14} />
          <span>New</span>
        </button>
        <button
          className="pane-heading-action"
          disabled={!notebook}
          onClick={() => {
            if (notebook?.sectionGroups[0]?.id) startSectionCreate(notebook.sectionGroups[0].id)
          }}
          type="button"
        >
          <SectionBookIcon size={14} />
          <span>Section</span>
        </button>
        <button className="pane-heading-action" disabled={!notebook} onClick={startSectionGroupCreate} type="button">
          <NotebookStackIcon size={14} />
          <span>Group</span>
        </button>
        <span className="pane-count">{appState.notebooks.length}</span>
      </div>
      {creatingSectionGroup ? (
        <div className="tree-inline-editor-shell">
          <input
            autoFocus
            className="tree-inline-editor"
            onBlur={() => {
              addSectionGroupWithName(inlineDraft)
              cancelInlineEdit()
            }}
            onChange={(event) => setInlineDraft(event.target.value)}
            onKeyDown={(event) => handleInlineKeyDown(event, () => {
              addSectionGroupWithName(inlineDraft)
              cancelInlineEdit()
            })}
            type="text"
            value={inlineDraft}
          />
        </div>
      ) : null}
      <div className="notebook-tree">
        {appState.notebooks.map((item) => {
          const isSelectedNotebook = item.id === notebook?.id

          return (
            <div key={item.id} className={`notebook-tree-group ${isSelectedNotebook ? 'active' : ''}`}>
              <div className="notebook-row">
                {editingNotebookId === item.id ? (
                  <div className="notebook-item active">
                    <span className="notebook-glyph">{renderNotebookIcon(item)}</span>
                    <input
                      autoFocus
                      className="tree-inline-editor tree-inline-editor-compact"
                      onBlur={() => {
                        renameNotebookTo(item.id, inlineDraft)
                        cancelInlineEdit()
                      }}
                      onChange={(event) => setInlineDraft(event.target.value)}
                      onKeyDown={(event) => handleInlineKeyDown(event, () => {
                        renameNotebookTo(item.id, inlineDraft)
                        cancelInlineEdit()
                      })}
                      type="text"
                      value={inlineDraft}
                    />
                  </div>
                ) : (
                  <button
                    className={`notebook-item ${item.id === notebook?.id ? 'active' : ''} ${dragState?.type === 'notebook' && dragState.notebookId === item.id ? 'dragging' : ''} ${dropTarget?.type === 'notebook' && dropTarget.notebookId === item.id && dropTarget.position === 'before' ? 'drop-before' : ''} ${dropTarget?.type === 'notebook' && dropTarget.notebookId === item.id && dropTarget.position === 'after' ? 'drop-after' : ''}`}
                    onClick={() => {
                      if (consumeSuppressedClick()) return
                      selectNotebook(item.id)
                    }}
                    onDoubleClick={() => startNotebookRename(item.id, item.name)}
                    onPointerDown={(event) => beginDrag(event, { type: 'notebook', notebookId: item.id })}
                    onPointerEnter={allowDrop}
                    onPointerMove={(event) => setNotebookDropTarget(event, item.id)}
                    onPointerUp={() => {
                      if (dropTarget?.type === 'notebook' && dropTarget.notebookId === item.id) {
                        moveNotebook(item.id, dropTarget.position)
                      }
                    }}
                    onContextMenu={(event) => {
                      selectNotebook(item.id)
                      openContextMenu(event, [
                        { label: 'Rename notebook', onSelect: () => startNotebookRename(item.id, item.name) },
                        { label: 'New section group', onSelect: startSectionGroupCreate },
                        {
                          danger: true,
                          disabled: !canDeleteNotebook,
                          label: 'Delete notebook',
                          onSelect: () => deleteNotebook(item.id),
                        },
                      ])
                    }}
                    type="button"
                  >
                    <span className="notebook-glyph">{renderNotebookIcon(item)}</span>
                    <span>{item.name}</span>
                  </button>
                )}
                <div className="notebook-actions">
                  <button className="notebook-action-button" onClick={() => startNotebookRename(item.id, item.name)} title="Rename notebook" type="button">
                    <EditIcon size={14} />
                  </button>
                  <button
                    className="notebook-action-button"
                    onClick={() => {
                      selectNotebook(item.id)
                      if (item.sectionGroups[0]?.id) {
                        window.setTimeout(() => startSectionCreate(item.sectionGroups[0].id), 0)
                      }
                    }}
                    title="New section"
                    type="button"
                  >
                    <SectionBookIcon size={14} />
                  </button>
                </div>
              </div>
              {isSelectedNotebook ? (
                <div className="notebook-sections">
                  <div className="notebook-quick-actions">
                    <button className="notebook-new-group" onClick={startSectionGroupCreate} type="button">
                      + Group
                    </button>
                  </div>
                  {item.sectionGroups.map((group) => {
                    const isGroupInsideDropTarget =
                      dropTarget?.type === 'section' &&
                      dropTarget.groupId === group.id &&
                      dropTarget.position === 'inside'

                    return (
                      <div
                        key={group.id}
                        className={`section-group ${group.isCollapsed ? 'collapsed' : ''} ${isGroupInsideDropTarget ? 'drop-inside' : ''}`}
                      >
                        <div
                          className="section-group-header notebook-section-group-label"
                          onDoubleClick={() => startGroupRename(group.id, group.name)}
                          onPointerEnter={(event) => {
                            if (item.id !== notebook?.id) return
                            allowDrop(event)
                            setSectionGroupInsideDropTarget(event, group.id)
                          }}
                          onPointerMove={(event) => {
                            if (item.id !== notebook?.id) return
                            setSectionGroupInsideDropTarget(event, group.id)
                          }}
                          onPointerUp={() => {
                            if (
                              item.id === notebook?.id &&
                              dropTarget?.type === 'section' &&
                              dropTarget.groupId === group.id &&
                              dropTarget.position === 'inside'
                            ) {
                              moveSectionToGroup(group.id)
                            }
                          }}
                        >
                          <button
                            className={`section-group-toggle ${group.isCollapsed ? 'collapsed' : ''}`}
                            onClick={() => toggleSectionGroupCollapse(group.id)}
                            type="button"
                          >
                            <ChevronDownIcon size={12} />
                          </button>
                          {editingGroupId === group.id ? (
                            <input
                              autoFocus
                              className="tree-inline-editor tree-inline-editor-compact"
                              onBlur={() => {
                                renameSectionGroupTo(group.id, inlineDraft)
                                cancelInlineEdit()
                              }}
                              onChange={(event) => setInlineDraft(event.target.value)}
                              onKeyDown={(event) => handleInlineKeyDown(event, () => {
                                renameSectionGroupTo(group.id, inlineDraft)
                                cancelInlineEdit()
                              })}
                              type="text"
                              value={inlineDraft}
                            />
                          ) : (
                            <div className="section-group-button">{group.name}</div>
                          )}
                          <div className="section-group-actions">
                            <button
                              className="section-group-add-button"
                              onClick={() => startSectionCreate(group.id)}
                              title="Add section"
                              type="button"
                            >
                              +
                            </button>
                            <button
                              className="section-group-rename-button"
                              onClick={() => startGroupRename(group.id, group.name)}
                              title="Rename group"
                              type="button"
                            >
                              <EditIcon size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="section-group-sections">
                          {group.sections.length === 0 && creatingSectionInGroupId !== group.id ? (
                            <button
                              className="empty-section-group-action"
                              onClick={() => startSectionCreate(group.id)}
                              type="button"
                            >
                              + Add section
                            </button>
                          ) : null}
                          {group.sections.map((entry) => {
                          const isSectionDropTarget =
                            dropTarget?.type === 'section' &&
                            'sectionId' in dropTarget &&
                            dropTarget.sectionId === entry.id

                          return (
                            <div key={entry.id} className="section-item-row">
                              {editingSectionKey === `${group.id}:${entry.id}` ? (
                                <div className="notebook-section-link section-item active">
                                  <span className="section-color" style={{ backgroundColor: entry.color }} />
                                  <input
                                    autoFocus
                                    className="tree-inline-editor tree-inline-editor-compact"
                                    onBlur={() => {
                                      renameSectionTo(group.id, entry.id, inlineDraft)
                                      cancelInlineEdit()
                                    }}
                                    onChange={(event) => setInlineDraft(event.target.value)}
                                    onKeyDown={(event) => handleInlineKeyDown(event, () => {
                                      renameSectionTo(group.id, entry.id, inlineDraft)
                                      cancelInlineEdit()
                                    })}
                                    type="text"
                                    value={inlineDraft}
                                  />
                                </div>
                              ) : (
                                <button
                                  className={`notebook-section-link section-item ${item.id === notebook?.id && entry.id === section?.id ? 'active' : ''} ${dragState?.type === 'section' && dragState.sectionId === entry.id ? 'dragging' : ''} ${isSectionDropTarget && dropTarget.position === 'before' ? 'drop-before' : ''} ${isSectionDropTarget && dropTarget.position === 'after' ? 'drop-after' : ''}`}
                                  onClick={() => {
                                    selectNotebook(item.id)
                                    selectSection(group.id, entry.id)
                                  }}
                                  onDoubleClick={() => startSectionRename(group.id, entry.id, entry.name)}
                                  onPointerDown={(event) => {
                                    if (item.id !== notebook?.id) return
                                    beginDrag(event, { type: 'section', groupId: group.id, sectionId: entry.id })
                                  }}
                                  onPointerEnter={allowDrop}
                                  onPointerMove={(event) => {
                                    if (item.id !== notebook?.id) return
                                    setSectionDropTarget(event, group.id, entry.id)
                                  }}
                                  onPointerUp={() => {
                                    if (item.id === notebook?.id && isSectionDropTarget) {
                                      moveSection(group.id, entry.id, dropTarget.position)
                                    }
                                  }}
                                  type="button"
                                >
                                  <span className="section-color" style={{ backgroundColor: entry.color }} />
                                  <span>{entry.name}</span>
                                </button>
                              )}
                              <button
                                className="section-rename-button"
                                onClick={() => startSectionRename(group.id, entry.id, entry.name)}
                                title="Rename section"
                                type="button"
                              >
                                <EditIcon size={14} />
                              </button>
                            </div>
                          )
                        })}
                        {creatingSectionInGroupId === group.id ? (
                          <div className="tree-inline-editor-shell nested">
                            <input
                              autoFocus
                              className="tree-inline-editor"
                              onBlur={() => {
                                createSectionInGroup(group.id, inlineDraft)
                                cancelInlineEdit()
                              }}
                              onChange={(event) => setInlineDraft(event.target.value)}
                              onKeyDown={(event) => handleInlineKeyDown(event, () => {
                                createSectionInGroup(group.id, inlineDraft)
                                cancelInlineEdit()
                              })}
                              type="text"
                              value={inlineDraft}
                            />
                          </div>
                        ) : null}
                        </div>
                        <div
                          className="notebook-section-group-dropzone"
                          onPointerEnter={(event) => {
                            if (item.id !== notebook?.id) return
                            allowDrop(event)
                            setSectionGroupInsideDropTarget(event, group.id)
                          }}
                          onPointerMove={(event) => {
                            if (item.id !== notebook?.id) return
                            setSectionGroupInsideDropTarget(event, group.id)
                          }}
                          onPointerUp={() => {
                            if (
                              item.id === notebook?.id &&
                              dropTarget?.type === 'section' &&
                              dropTarget.groupId === group.id &&
                              dropTarget.position === 'inside'
                            ) {
                              moveSectionToGroup(group.id)
                            }
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
      <div className="pane-footer">
        <button
          className="settings-button"
          onClick={() => void runUpdateCheck('manual')}
          type="button"
        >
          <SettingsIcon size={16} />
          <span>{isCheckingForUpdates ? 'Checking...' : 'Check for updates'}</span>
        </button>
      </div>
    </aside>
  )
}
