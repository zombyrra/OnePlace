import * as RTooltip from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

/* Lightweight Fluent tooltip. Wrap the whole app once in <TooltipProvider>,
   then use <Tooltip label="...">{trigger}</Tooltip>. Styled by .op-tooltip
   in src/styles/skin/ui/tooltip.css. */

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RTooltip.Provider delayDuration={450} skipDelayDuration={300}>
      {children}
    </RTooltip.Provider>
  )
}

type TooltipProps = {
  label: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export function Tooltip({ label, children, side = 'bottom' }: TooltipProps) {
  if (!label) return <>{children}</>
  return (
    <RTooltip.Root>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content className="op-tooltip" side={side} sideOffset={6}>
          {label}
          <RTooltip.Arrow className="op-tooltip-arrow" height={5} width={10} />
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  )
}
