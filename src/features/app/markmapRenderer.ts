import { Transformer } from 'markmap-lib/no-plugins'
import { Markmap } from 'markmap-view'
import type { IMarkmapOptions } from 'markmap-view'

const transformer = new Transformer()

const defaultMarkmapOptions: Partial<IMarkmapOptions> = {
  autoFit: true,
  duration: 180,
  fitRatio: 0.92,
  initialExpandLevel: 3,
  maxInitialScale: 1.4,
  maxWidth: 260,
  paddingX: 12,
  spacingHorizontal: 64,
  spacingVertical: 8,
  zoom: true,
  pan: true,
}

export type RenderedMarkmap = Markmap

export const renderMarkmapSvg = (
  svg: SVGElement,
  markdown: string,
  options?: Partial<IMarkmapOptions>,
) => {
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild)
  }

  const result = transformer.transform(markdown)
  const markmap = Markmap.create(svg, { ...defaultMarkmapOptions, ...options }, result.root)

  window.requestAnimationFrame(() => {
    void markmap.fit()
  })

  return markmap
}
