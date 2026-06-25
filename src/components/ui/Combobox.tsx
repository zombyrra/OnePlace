import { ChevronDownIcon } from '../Icons'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from './Popover'

/* OneNote-web font / size picker: a select-style combobox (button face +
   scrollable option flyout). Options can be previewed in their own typeface
   via optionFont. Styled by .op-combobox in src/styles/skin/ui/combobox.css. */

export type ComboOption = { value: string; label: string }

type ComboboxProps = {
  value: string
  display?: string
  options: ComboOption[]
  onSelect: (value: string) => void
  ariaLabel: string
  width?: number
  optionFont?: boolean
  className?: string
}

export function Combobox({ value, display, options, onSelect, ariaLabel, width, optionFont, className }: ComboboxProps) {
  const current = display ?? options.find((option) => option.value === value)?.label ?? value
  return (
    <Popover>
      <PopoverTrigger
        aria-label={ariaLabel}
        className={['op-combobox', className].filter(Boolean).join(' ')}
        style={width ? { width } : undefined}
      >
        <span className="op-combobox-value">{current}</span>
        <ChevronDownIcon size={12} />
      </PopoverTrigger>
      <PopoverContent className="op-combobox-list">
        {options.map((option) => (
          <PopoverClose asChild key={option.value}>
            <button
              className={`op-combobox-option ${option.value === value ? 'is-selected' : ''}`.trim()}
              onClick={() => onSelect(option.value)}
              style={optionFont ? { fontFamily: option.value } : undefined}
              type="button"
            >
              {option.label}
            </button>
          </PopoverClose>
        ))}
      </PopoverContent>
    </Popover>
  )
}
