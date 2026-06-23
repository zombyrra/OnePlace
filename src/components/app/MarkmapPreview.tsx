import { useEffect, useRef } from 'react'
import { getMarkmapTitle } from '../../features/app/markmapFeature'
import { renderMarkmapSvg, type RenderedMarkmap } from '../../features/app/markmapRenderer'

type MarkmapPreviewProps = {
  markdown: string
}

export function MarkmapPreview({ markdown }: MarkmapPreviewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const markmapRef = useRef<RenderedMarkmap | null>(null)
  const trimmedMarkdown = markdown.trim()

  useEffect(() => {
    const svg = svgRef.current
    markmapRef.current?.destroy()
    markmapRef.current = null

    if (!svg || !trimmedMarkdown) return undefined

    try {
      const markmap = renderMarkmapSvg(svg, trimmedMarkdown)
      markmapRef.current = markmap
    } catch {
      while (svg.firstChild) {
        svg.removeChild(svg.firstChild)
      }
    }

    return () => {
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
