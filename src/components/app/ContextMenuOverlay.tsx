import { useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ContextMenuState } from '../../app/appModel'

type ContextMenuOverlayProps = {
  contextMenu: ContextMenuState | null
  onRequestClose: () => void
}

/* Fluent contextual menu — portaled to <body>, clamped into the viewport via
   direct DOM positioning, and dismissed on outside-click, Escape, scroll, or
   resize. Styled by .op-context-menu in src/styles/skin/ui/context-menu.css. */
export function ContextMenuOverlay({ contextMenu, onRequestClose }: ContextMenuOverlayProps) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const menu = ref.current
    if (!menu || !contextMenu) return
    const pad = 8
    const left = Math.max(pad, Math.min(contextMenu.x, window.innerWidth - menu.offsetWidth - pad))
    const top = Math.max(pad, Math.min(contextMenu.y, window.innerHeight - menu.offsetHeight - pad))
    menu.style.left = `${left}px`
    menu.style.top = `${top}px`
  }, [contextMenu])

  useEffect(() => {
    if (!contextMenu) return
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onRequestClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onRequestClose()
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onRequestClose)
    window.addEventListener('scroll', onRequestClose, true)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onRequestClose)
      window.removeEventListener('scroll', onRequestClose, true)
    }
  }, [contextMenu, onRequestClose])

  if (!contextMenu) return null

  return createPortal(
    <div className="op-context-menu" ref={ref} role="menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
      {contextMenu.items.map((item) => (
        <button
          className={`op-context-item ${item.danger ? 'danger' : ''}`.trim()}
          disabled={item.disabled}
          key={item.label}
          onClick={() => {
            onRequestClose()
            item.onSelect()
          }}
          role="menuitem"
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  )
}
