import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

/* Context, types and the module-level imperative accessor for the Fluent
   dialog service. Kept in a component-free module so feature hooks can
   import { dialogs } without pulling Radix in, and so dialogService.tsx
   stays a clean Fast-Refresh boundary (component-only export). */

export type PromptOptions = {
  title: string
  label?: string
  defaultValue?: string
  placeholder?: string
  confirmText?: string
  cancelText?: string
  multiline?: boolean
}

export type ConfirmOptions = {
  title: string
  message?: ReactNode
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

export type DialogContextValue = {
  prompt: (options: PromptOptions) => Promise<string | null>
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

export const DialogContext = createContext<DialogContextValue | null>(null)

export function useDialogs(): DialogContextValue {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialogs must be used within <DialogProvider>')
  return ctx
}

let activeDialogs: DialogContextValue | null = null

export function registerDialogs(value: DialogContextValue | null) {
  activeDialogs = value
}

/* Falls back to the native globals if the provider isn't mounted (tests). */
export const dialogs = {
  prompt: (options: PromptOptions): Promise<string | null> =>
    activeDialogs
      ? activeDialogs.prompt(options)
      : Promise.resolve(window.prompt(options.title, options.defaultValue ?? '')),
  confirm: (options: ConfirmOptions): Promise<boolean> =>
    activeDialogs
      ? activeDialogs.confirm(options)
      : Promise.resolve(window.confirm(options.title)),
}
