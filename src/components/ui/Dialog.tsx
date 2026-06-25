import * as RDialog from '@radix-ui/react-dialog'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

/* Fluent modal dialog primitives, built on Radix Dialog (focus trap,
   scroll lock, Escape + scrim dismissal, a11y title wiring). Styled by
   .op-dialog in src/styles/skin/ui/dialog.css. For the common
   prompt/confirm flows use the imperative service in dialogService.tsx. */

export const Dialog = RDialog.Root
export const DialogTrigger = RDialog.Trigger
export const DialogClose = RDialog.Close

type DialogContentProps = ComponentPropsWithoutRef<typeof RDialog.Content> & {
  title?: ReactNode
  description?: ReactNode
}

export function DialogContent({ children, className, title, description, ...props }: DialogContentProps) {
  return (
    <RDialog.Portal>
      <RDialog.Overlay className="op-dialog-overlay" />
      <RDialog.Content
        aria-describedby={description ? undefined : ''}
        className={['op-dialog', className].filter(Boolean).join(' ')}
        {...props}
      >
        {title ? <RDialog.Title className="op-dialog-title">{title}</RDialog.Title> : null}
        {description ? <RDialog.Description className="op-dialog-message">{description}</RDialog.Description> : null}
        {children}
      </RDialog.Content>
    </RDialog.Portal>
  )
}

export function DialogBody({ children }: { children: ReactNode }) {
  return <div className="op-dialog-body">{children}</div>
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="op-dialog-footer">{children}</div>
}
