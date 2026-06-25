import type { ReactNode } from 'react'
import { ChevronDownIcon } from '../Icons'
import { Menu, MenuContent, MenuTrigger } from './Menu'
import { Popover, PopoverContent, PopoverTrigger } from './Popover'

/* Ribbon control faces for the OneNote-web ribbon.
   - RibbonButton: a plain command (icon over label, or icon-only).
   - SplitButton:  a command whose caret opens a Radix DropdownMenu. With
     split=true the main action and caret are separate hit targets (OneNote
     "split button"); otherwise the whole face opens the menu.
   - PopoverButton: same shape but the caret opens a Radix Popover, for
     non-list surfaces (colour grids, the table-size picker).
   Styled by .op-ribbon-btn / .op-split in src/styles/skin/ui/split-button.css. */

type Variant = 'large' | 'compact' | 'icon'

type FaceProps = {
  icon?: ReactNode
  label?: ReactNode
  title?: string
  variant?: Variant
  active?: boolean
  disabled?: boolean
}

function Face({ icon, label, variant = 'compact' }: Pick<FaceProps, 'icon' | 'label' | 'variant'>) {
  return (
    <>
      {icon ? <span className={`op-ribbon-btn-icon op-icon-${variant}`}>{icon}</span> : null}
      {label ? <span className="op-ribbon-btn-label">{label}</span> : null}
    </>
  )
}

export function RibbonButton({ icon, label, title, variant = 'compact', active, disabled, onClick }: FaceProps & { onClick?: () => void }) {
  return (
    <button
      className={`op-ribbon-btn op-ribbon-btn-${variant} ${active ? 'is-active' : ''}`.trim()}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type="button"
    >
      <Face icon={icon} label={label} variant={variant} />
    </button>
  )
}

type SurfaceButtonProps = FaceProps & {
  children: ReactNode
  onClick?: () => void
  split?: boolean
  surfaceClassName?: string
  caretLabel?: string
  align?: 'start' | 'center' | 'end'
}

export function SplitButton({
  icon, label, title, variant = 'compact', active, disabled, children, onClick,
  split = false, surfaceClassName, caretLabel = 'More options', align = 'start',
}: SurfaceButtonProps) {
  if (split) {
    return (
      <div className={`op-split op-split-${variant} ${active ? 'is-active' : ''} ${disabled ? 'is-disabled' : ''}`.trim()}>
        <button className="op-split-main" disabled={disabled} onClick={onClick} title={title} type="button">
          <Face icon={icon} label={label} variant={variant} />
        </button>
        <Menu>
          <MenuTrigger asChild>
            <button aria-label={caretLabel} className="op-split-caret" disabled={disabled} type="button">
              <ChevronDownIcon size={12} />
            </button>
          </MenuTrigger>
          <MenuContent align={align} className={surfaceClassName}>{children}</MenuContent>
        </Menu>
      </div>
    )
  }
  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          className={`op-ribbon-btn op-ribbon-btn-${variant} op-has-caret ${active ? 'is-active' : ''}`.trim()}
          disabled={disabled}
          title={title}
          type="button"
        >
          <Face icon={icon} label={label} variant={variant} />
          <ChevronDownIcon className="op-ribbon-btn-caret" size={12} />
        </button>
      </MenuTrigger>
      <MenuContent align={align} className={surfaceClassName}>{children}</MenuContent>
    </Menu>
  )
}

export function PopoverButton({
  icon, label, title, variant = 'compact', active, disabled, children, onClick,
  split = false, surfaceClassName, caretLabel = 'More options', align = 'start',
}: SurfaceButtonProps) {
  if (split) {
    return (
      <div className={`op-split op-split-${variant} ${active ? 'is-active' : ''} ${disabled ? 'is-disabled' : ''}`.trim()}>
        <button className="op-split-main" disabled={disabled} onClick={onClick} title={title} type="button">
          <Face icon={icon} label={label} variant={variant} />
        </button>
        <Popover>
          <PopoverTrigger asChild>
            <button aria-label={caretLabel} className="op-split-caret" disabled={disabled} type="button">
              <ChevronDownIcon size={12} />
            </button>
          </PopoverTrigger>
          <PopoverContent align={align} className={surfaceClassName}>{children}</PopoverContent>
        </Popover>
      </div>
    )
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`op-ribbon-btn op-ribbon-btn-${variant} op-has-caret ${active ? 'is-active' : ''}`.trim()}
          disabled={disabled}
          title={title}
          type="button"
        >
          <Face icon={icon} label={label} variant={variant} />
          <ChevronDownIcon className="op-ribbon-btn-caret" size={12} />
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className={surfaceClassName}>{children}</PopoverContent>
    </Popover>
  )
}
