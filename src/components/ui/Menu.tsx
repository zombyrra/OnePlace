import * as RMenu from '@radix-ui/react-dropdown-menu'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

/* Fluent / OneNote-web dropdown menu, built on Radix DropdownMenu.
   Gives roving arrow-key focus, type-ahead, Escape + outside-click
   dismissal and focus return for free. Styled by .op-menu in
   src/styles/skin/ui/menu.css (portal-safe, root-scoped). */

export const Menu = RMenu.Root
export const MenuTrigger = RMenu.Trigger

type MenuContentProps = ComponentPropsWithoutRef<typeof RMenu.Content>

export function MenuContent({ children, className, ...props }: MenuContentProps) {
  return (
    <RMenu.Portal>
      <RMenu.Content
        align="start"
        className={['op-menu', className].filter(Boolean).join(' ')}
        collisionPadding={8}
        loop
        sideOffset={4}
        {...props}
      >
        {children}
      </RMenu.Content>
    </RMenu.Portal>
  )
}

type MenuItemProps = ComponentPropsWithoutRef<typeof RMenu.Item> & {
  icon?: ReactNode
  shortcut?: string
}

export function MenuItem({ children, className, icon, shortcut, ...props }: MenuItemProps) {
  return (
    <RMenu.Item className={['op-menu-item', className].filter(Boolean).join(' ')} {...props}>
      <span className="op-menu-item-icon">{icon}</span>
      <span className="op-menu-item-label">{children}</span>
      {shortcut ? <span className="op-menu-item-shortcut">{shortcut}</span> : null}
    </RMenu.Item>
  )
}

export function MenuSeparator() {
  return <RMenu.Separator className="op-menu-sep" />
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <RMenu.Label className="op-menu-label">{children}</RMenu.Label>
}
