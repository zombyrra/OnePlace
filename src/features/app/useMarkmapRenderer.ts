import { useEffect, type RefObject } from 'react'
import { decodeMarkmapMarkdown, getMarkmapTitle } from './markmapFeature'
import type { RenderedMarkmap } from './markmapRenderer'

export const useMarkmapRenderer = (
  editorRef: RefObject<HTMLDivElement | null>,
  pageId: string | undefined,
  pageContent: string | undefined,
) => {
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return undefined

    let isDisposed = false
    let frameId = 0
    const markmaps: RenderedMarkmap[] = []

    const renderCards = async () => {
      const { renderMarkmapSvg } = await import('./markmapRenderer')
      if (isDisposed) return

      const cards = Array.from(editor.querySelectorAll<HTMLElement>('.markmap-card[data-markmap-markdown]'))

      cards.forEach((card) => {
        const markdown = decodeMarkmapMarkdown(card.dataset.markmapMarkdown ?? '').trim()
        if (!markdown) return

        card.querySelector('.markmap-render')?.remove()

        const renderShell = document.createElement('div')
        renderShell.className = 'markmap-render'
        renderShell.setAttribute('aria-label', 'Mind map')
        renderShell.setAttribute('data-markmap-generated', 'true')

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.setAttribute('aria-label', getMarkmapTitle(markdown))
        svg.setAttribute('role', 'img')
        renderShell.append(svg)
        card.append(renderShell)

        try {
          const markmap = renderMarkmapSvg(svg, markdown, { duration: 0 })
          if (isDisposed) {
            markmap.destroy()
            return
          }
          markmaps.push(markmap)
          card.classList.add('markmap-card-rendered')
        } catch {
          renderShell.remove()
          card.classList.remove('markmap-card-rendered')
        }
      })
    }

    frameId = window.requestAnimationFrame(() => {
      void renderCards()
    })

    return () => {
      isDisposed = true
      if (frameId) window.cancelAnimationFrame(frameId)
      markmaps.forEach((markmap) => markmap.destroy())
      editor.querySelectorAll('.markmap-render').forEach((node) => node.remove())
      editor.querySelectorAll('.markmap-card-rendered').forEach((node) => node.classList.remove('markmap-card-rendered'))
    }
  }, [editorRef, pageId, pageContent])
}
