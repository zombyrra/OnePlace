import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { normalizeAppState, sanitizePastedHtml } from '../src/app/appModel.ts'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
globalThis.window = dom.window as unknown as Window & typeof globalThis
globalThis.document = dom.window.document
globalThis.DOMParser = dom.window.DOMParser
globalThis.NodeFilter = dom.window.NodeFilter
globalThis.Text = dom.window.Text
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.HTMLImageElement = dom.window.HTMLImageElement
globalThis.HTMLAudioElement = dom.window.HTMLAudioElement
globalThis.HTMLIFrameElement = dom.window.HTMLIFrameElement

const minimalStateWithContent = (content: string) => ({
  meta: {},
  notebooks: [
    {
      color: '#3784d6',
      icon: 'book',
      id: 'notebook-1',
      name: 'Notebook',
      sectionGroups: [
        {
          id: 'group-1',
          name: 'Sections',
          sections: [
            {
              color: '#3784d6',
              id: 'section-1',
              name: 'Section',
              pages: [
                {
                  content,
                  createdAt: '2026-06-23T00:00:00.000Z',
                  id: 'page-1',
                  title: 'Page',
                  updatedAt: '2026-06-23T00:00:00.000Z',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})

test('normalizeAppState sanitizes persisted page content before rendering can hydrate it', () => {
  const state = normalizeAppState(
    minimalStateWithContent(
      '<p>safe</p><script>alert(1)</script><img src="x" onerror="alert(2)"><a href="javascript:alert(3)">bad</a>',
    ),
  )
  const page = state.notebooks[0].sectionGroups[0].sections[0].pages[0]

  assert.equal(page.content.includes('<script'), false)
  assert.equal(page.content.includes('onerror'), false)
  assert.equal(page.content.includes('javascript:'), false)
  assert.match(page.content, /<p>safe<\/p>/)
})

test('sanitizePastedHtml removes active attachment download URLs', () => {
  const html = sanitizePastedHtml(
    '<div class="attachment-card" data-download-url="javascript:alert(1)" data-file-name="safe.txt"><strong class="attachment-title">safe.txt</strong></div>',
  )

  assert.equal(html.includes('javascript:'), false)
  assert.equal(html.includes('data-download-url'), false)
  assert.match(html, /data-file-name="safe.txt"/)
})

test('sanitizePastedHtml preserves safe editor alignment and indent classes', () => {
  const html = sanitizePastedHtml(
    '<p class="op-align-center op-indent-2 unknown-class" style="position:fixed;left:0">Centered note</p>',
  )

  assert.match(html, /class="op-align-center op-indent-2"/)
  assert.equal(html.includes('unknown-class'), false)
  assert.equal(html.includes('style='), false)
})
