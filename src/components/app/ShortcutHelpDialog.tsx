import {
  oneNoteShortcutGroups,
  oneNoteShortcutReferenceUrl,
  type ShortcutSupport,
} from '../../features/app/oneNoteShortcuts'
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter } from '../ui'

type ShortcutHelpDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const supportLabels: Record<ShortcutSupport, string> = {
  partial: 'Partial',
  supported: 'Ready',
  'not-applicable': 'N/A',
}

export function ShortcutHelpDialog({ open, onOpenChange }: ShortcutHelpDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="shortcut-help-dialog" title="OneNote Keyboard Shortcuts">
        <DialogBody>
          <div className="shortcut-help-intro">
            <span>Matched to Microsoft OneNote for Windows where OnePlace has the same feature.</span>
            <a href={oneNoteShortcutReferenceUrl} rel="noreferrer" target="_blank">
              Microsoft reference
            </a>
          </div>
          <div className="shortcut-help-groups">
            {oneNoteShortcutGroups.map((group) => (
              <section className="shortcut-help-group" key={group.title}>
                <h3>{group.title}</h3>
                <div className="shortcut-help-list">
                  {group.shortcuts.map((shortcut) => (
                    <article className="shortcut-help-row" key={`${group.title}-${shortcut.action}`}>
                      <div className="shortcut-help-keys">
                        {shortcut.keys.map((key) => (
                          <kbd key={key}>{key}</kbd>
                        ))}
                      </div>
                      <div className="shortcut-help-copy">
                        <strong>{shortcut.action}</strong>
                        {shortcut.note ? <span>{shortcut.note}</span> : null}
                      </div>
                      <span className={`shortcut-help-status ${shortcut.support}`}>
                        {supportLabels[shortcut.support]}
                      </span>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <button className="op-btn op-btn-primary" type="button">
              Close
            </button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

