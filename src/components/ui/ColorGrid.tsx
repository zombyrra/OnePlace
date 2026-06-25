import { TEXT_COLORS } from './colors'
import { PopoverClose } from './Popover'

/* Colour swatch grid for the Highlight and Font-colour flyouts, matching
   OneNote's small palette. Rendered inside a <PopoverContent>; each swatch
   is wrapped in PopoverClose so picking a colour dismisses the flyout.
   Styled by .op-colorgrid in src/styles/skin/ui/color-grid.css. */

type ColorGridProps = {
  colors?: string[]
  columns?: number
  clearLabel?: string
  onSelect: (color: string) => void
  onClear?: () => void
}

export function ColorGrid({ colors = TEXT_COLORS, columns = 8, clearLabel, onSelect, onClear }: ColorGridProps) {
  return (
    <div className="op-colorgrid-wrap">
      {clearLabel && onClear ? (
        <PopoverClose asChild>
          <button className="op-colorgrid-clear" onClick={onClear} type="button">
            <span className="op-colorgrid-clear-swatch" />
            {clearLabel}
          </button>
        </PopoverClose>
      ) : null}
      <div className="op-colorgrid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {colors.map((color) => (
          <PopoverClose asChild key={color}>
            <button
              aria-label={color}
              className="op-colorgrid-swatch"
              onClick={() => onSelect(color)}
              style={{ background: color }}
              title={color}
              type="button"
            />
          </PopoverClose>
        ))}
      </div>
    </div>
  )
}
