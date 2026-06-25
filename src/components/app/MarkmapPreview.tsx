import { useEffect, useRef } from 'react'
import { getMarkmapTitle } from '../../features/app/markmapFeature'
import type { RenderedMarkmap } from '../../features/app/markmapRenderer'

type MarkmapPreviewProps = {
  markdown: string
}

export function MarkmapPreview({ markdown }: MarkmapPreviewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const markmapRef = useRef<RenderedMarkmap | null>(null)
  const trimmedMarkdown = markdown.trim()

  useEffect(() => {
    const svg = svgRef.current
    let isDisposed = false
    markmapRef.current?.destroy()
    markmapRef.current = null

    if (!svg || !trimmedMarkdown) return undefined

    const renderPreview = async () => {
      try {
        const { renderMarkmapSvg } = await import('../../features/app/markmapRenderer')
        if (isDisposed || svgRef.current !== svg) return

        const markmap = renderMarkmapSvg(svg, trimmedMarkdown)
        if (isDisposed) {
          markmap.destroy()
          return
        }

        markmapRef.current = markmap
      } catch {
        if (isDisposed) return
        while (svg.firstChild) {
          svg.removeChild(svg.firstChild)
        }
      }
    }

    void renderPreview()

    return () => {
      isDisposed = true
      markmapRef.current?.destroy()
      markmapRef.current = null
    }
  }, [trimmedMarkdown])

  if (!trimmedMarkdown) {
    return <div className="markmap-empty">No Markdown</div>
  }

  return (
    <div className="markmap-preview" aria-label={getMarkmapTitle(trimmedMarkdown)}>
      <svg ref={svgRef} />
    </div>
  )
}
