import * as RPopover from '@radix-ui/react-popover'
import type { ComponentPropsWithoutRef } from 'react'

/* Fluent / OneNote-web flyout, built on Radix Popover. Used for surfaces
   that aren't simple action lists — colour grids, the table-size picker,
   the font/size combobox lists. Styled by .op-popover in
   src/styles/skin/ui/popover.css. */

export const Popover = RPopover.Root
export const PopoverTrigger = RPopover.Trigger
export const PopoverClose = RPopover.Close
export const PopoverAnchor = RPopover.Anchor

type PopoverContentProps = ComponentPropsWithoutRef<typeof RPopover.Content>

export function PopoverContent({ children, className, ...props }: PopoverContentProps) {
  return (
    <RPopover.Portal>
      <RPopover.Content
        align="start"
        className={['op-popover', className].filter(Boolean).join(' ')}
        collisionPadding={8}
        sideOffset={4}
        {...props}
      >
        {children}
      </RPopover.Content>
    </RPopover.Portal>
  )
}
