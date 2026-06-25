import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import * as RDialog from '@radix-ui/react-dialog'
import { DialogContext, registerDialogs } from './dialogContext'
import type { ConfirmOptions, DialogContextValue, PromptOptions } from './dialogContext'

/* Imperative replacement for window.prompt / window.confirm, rendered as a
   single Fluent modal dialog. Wrap the app in <DialogProvider>; feature code
   calls dialogs.prompt / dialogs.confirm (see dialogContext.ts). */

type PromptRequest = {
  kind: 'prompt'
  id: number
  title: string
  label?: string
  placeholder?: string
  confirmText: string
  cancelText: string
  multiline: boolean
  value: string
}

type ConfirmRequest = {
  kind: 'confirm'
  id: number
  title: string
  message?: ReactNode
  confirmText: string
  cancelText: string
  danger: boolean
}

type ActiveRequest = PromptRequest | ConfirmRequest

export function DialogProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveRequest | null>(null)
  const resolverRef = useRef<((result: string | boolean | null) => void) | null>(null)
  const idRef = useRef(0)

  const settle = useCallback((result: string | boolean | null) => {
    const resolve = resolverRef.current
    resolverRef.current = null
    setActive(null)
    resolve?.(result)
  }, [])

  const prompt = useCallback(
    (options: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        resolverRef.current = resolve as (result: string | boolean | null) => void
        idRef.current += 1
        setActive({
          kind: 'prompt',
          id: idRef.current,
          title: options.title,
          label: options.label,
          placeholder: options.placeholder,
          confirmText: options.confirmText ?? 'OK',
          cancelText: options.cancelText ?? 'Cancel',
          multiline: options.multiline ?? false,
          value: options.defaultValue ?? '',
        })
      }),
    [],
  )

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolverRef.current = resolve as (result: string | boolean | null) => void
        idRef.current += 1
        setActive({
          kind: 'confirm',
          id: idRef.current,
          title: options.title,
          message: options.message,
          confirmText: options.confirmText ?? 'OK',
          cancelText: options.cancelText ?? 'Cancel',
          danger: options.danger ?? false,
        })
      }),
    [],
  )

  const value = useMemo<DialogContextValue>(() => ({ prompt, confirm }), [prompt, confirm])

  useEffect(() => {
    registerDialogs(value)
    return () => registerDialogs(null)
  }, [value])

  const cancelResult = active?.kind === 'prompt' ? null : false
  const accept = () => settle(active?.kind === 'prompt' ? active.value : true)

  return (
    <DialogContext.Provider value={value}>
      {children}
      <RDialog.Root
        open={active != null}
        onOpenChange={(open) => {
          if (!open) settle(cancelResult)
        }}
      >
        <RDialog.Portal>
          <RDialog.Overlay className="op-dialog-overlay" />
          <RDialog.Content
            aria-describedby=""
            className="op-dialog"
            onOpenAutoFocus={(event) => {
              if (active?.kind === 'confirm') event.preventDefault()
            }}
          >
            {active ? (
              <>
                <RDialog.Title className="op-dialog-title">{active.title}</RDialog.Title>
                <div className="op-dialog-body">
                  {active.kind === 'prompt' ? (
                    <label className="op-dialog-field">
                      {active.label ? <span className="op-dialog-label">{active.label}</span> : null}
                      {active.multiline ? (
                        <textarea
                          autoFocus
                          className="op-dialog-input op-dialog-textarea"
                          onChange={(event) =>
                            setActive((current) =>
                              current && current.kind === 'prompt'
                                ? { ...current, value: event.target.value }
                                : current,
                            )
                          }
                          placeholder={active.placeholder}
                          rows={4}
                          value={active.value}
                        />
                      ) : (
                        <input
                          autoFocus
                          className="op-dialog-input"
                          onChange={(event) =>
                            setActive((current) =>
                              current && current.kind === 'prompt'
                                ? { ...current, value: event.target.value }
                                : current,
                            )
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              accept()
                            }
                          }}
                          placeholder={active.placeholder}
                          value={active.value}
                        />
                      )}
                    </label>
                  ) : active.message ? (
                    <div className="op-dialog-message">{active.message}</div>
                  ) : null}
                </div>
                <div className="op-dialog-footer">
                  <button className="op-btn op-btn-secondary" onClick={() => settle(cancelResult)} type="button">
                    {active.cancelText}
                  </button>
                  <button
                    className={`op-btn op-btn-primary ${active.kind === 'confirm' && active.danger ? 'op-btn-danger' : ''}`.trim()}
                    onClick={accept}
                    type="button"
                  >
                    {active.confirmText}
                  </button>
                </div>
              </>
            ) : null}
          </RDialog.Content>
        </RDialog.Portal>
      </RDialog.Root>
    </DialogContext.Provider>
  )
}
