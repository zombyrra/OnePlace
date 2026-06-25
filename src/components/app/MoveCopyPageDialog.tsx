import { useState } from 'react'
import type { MoveCopyPageMode, MoveCopyPageTarget } from '../../features/app/useNotebookPageActions'
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter } from '../ui'

export type MoveCopyPageDestination = MoveCopyPageTarget & {
  id: string
  label: string
}

type MoveCopyPageDialogProps = {
  destinations: MoveCopyPageDestination[]
  onOpenChange: (open: boolean) => void
  onSubmit: (mode: MoveCopyPageMode, target: MoveCopyPageTarget) => void
  open: boolean
  pageTitle: string
}

export function MoveCopyPageDialog({
  destinations,
  onOpenChange,
  onSubmit,
  open,
  pageTitle,
}: MoveCopyPageDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      {open ? (
        <MoveCopyPageDialogContent
          destinations={destinations}
          onSubmit={onSubmit}
          pageTitle={pageTitle}
        />
      ) : null}
    </Dialog>
  )
}

function MoveCopyPageDialogContent({
  destinations,
  onSubmit,
  pageTitle,
}: Pick<MoveCopyPageDialogProps, 'destinations' | 'onSubmit' | 'pageTitle'>) {
  const [mode, setMode] = useState<MoveCopyPageMode>('move')
  const [selectedDestinationId, setSelectedDestinationId] = useState(() => destinations[0]?.id ?? '')

  const selectedDestination =
    destinations.find((destination) => destination.id === selectedDestinationId) ?? destinations[0]

  return (
    <DialogContent className="move-copy-page-dialog" title="Move or Copy Page">
      <DialogBody>
        <div className="move-copy-page-summary">
          <span>Current page</span>
          <strong>{pageTitle || 'Untitled Page'}</strong>
        </div>
        <div className="move-copy-mode" role="group" aria-label="Move or copy">
          <button
            aria-pressed={mode === 'move'}
            className={mode === 'move' ? 'active' : ''}
            onClick={() => setMode('move')}
            type="button"
          >
            Move
          </button>
          <button
            aria-pressed={mode === 'copy'}
            className={mode === 'copy' ? 'active' : ''}
            onClick={() => setMode('copy')}
            type="button"
          >
            Copy
          </button>
        </div>
        <div className="move-copy-destinations" role="listbox" aria-label="Destination section">
          {destinations.map((destination) => (
            <button
              aria-selected={destination.id === selectedDestination?.id}
              className={destination.id === selectedDestination?.id ? 'active' : ''}
              key={destination.id}
              onClick={() => setSelectedDestinationId(destination.id)}
              role="option"
              type="button"
            >
              {destination.label}
            </button>
          ))}
        </div>
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <button className="op-btn op-btn-secondary" type="button">
            Cancel
          </button>
        </DialogClose>
        <button
          className="op-btn op-btn-primary"
          disabled={!selectedDestination}
          onClick={() => {
            if (!selectedDestination) return
            onSubmit(mode, selectedDestination)
          }}
          type="button"
        >
          {mode === 'move' ? 'Move' : 'Copy'}
        </button>
      </DialogFooter>
    </DialogContent>
  )
}
