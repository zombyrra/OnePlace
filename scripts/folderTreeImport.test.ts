import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import { buildFolderTreeImport } from '../src/features/app/folderTreeImport.ts'

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

test('folder tree import preserves folders and embeds mixed file assets', () => {
  const imported = buildFolderTreeImport({
    directories: ['Pleadings', 'Pleadings/Motions', 'Empty Folder'],
    files: [
      {
        absolutePath: 'C:/Cases/Acme/overview.txt',
        dataUrl: 'data:text/plain;base64,T3ZlcnZpZXc=',
        extension: 'txt',
        kind: 'file',
        mimeType: 'text/plain',
        modifiedAt: '2026-06-24T14:00:00.000Z',
        name: 'overview.txt',
        relativeDir: '',
        relativePath: 'overview.txt',
        size: 8,
      },
      {
        absolutePath: 'C:/Cases/Acme/Pleadings/Complaint.pdf',
        dataUrl: 'data:application/pdf;base64,JVBERi0x',
        extension: 'pdf',
        kind: 'printout',
        mimeType: 'application/pdf',
        modifiedAt: '2026-06-24T15:00:00.000Z',
        name: 'Complaint.pdf',
        relativeDir: 'Pleadings',
        relativePath: 'Pleadings/Complaint.pdf',
        size: 1024,
      },
      {
        absolutePath: 'C:/Cases/Acme/Pleadings/Motions/Exhibit A.jpg',
        dataUrl: 'data:image/jpeg;base64,/9j/4AAQ',
        extension: 'jpg',
        kind: 'image',
        mimeType: 'image/jpeg',
        modifiedAt: '2026-06-24T16:00:00.000Z',
        name: 'Exhibit A.jpg',
        relativeDir: 'Pleadings/Motions',
        relativePath: 'Pleadings/Motions/Exhibit A.jpg',
        size: 2048,
      },
      {
        absolutePath: 'C:/Cases/Acme/Discovery/native-file.docx',
        dataUrl: 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBA==',
        extension: 'docx',
        kind: 'file',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        modifiedAt: '2026-06-24T17:00:00.000Z',
        name: 'native-file.docx',
        relativeDir: 'Discovery',
        relativePath: 'Discovery/native-file.docx',
        size: 4096,
      },
    ],
    name: 'Acme Legal Case',
    path: 'C:/Cases/Acme',
  })

  assert.equal(imported.notebook.name, 'Acme Legal Case')
  assert.equal(imported.notebook.sectionGroups[0].name, 'Imported Folder Tree')
  assert.deepEqual(
    imported.notebook.sectionGroups[0].sections.map((section) => section.name),
    ['Root Folder', 'Discovery', 'Empty Folder', 'Pleadings', 'Pleadings / Motions'],
  )

  const discovery = imported.notebook.sectionGroups[0].sections.find((section) => section.name === 'Discovery')
  const empty = imported.notebook.sectionGroups[0].sections.find((section) => section.name === 'Empty Folder')
  const motions = imported.notebook.sectionGroups[0].sections.find((section) => section.name === 'Pleadings / Motions')
  const pleadings = imported.notebook.sectionGroups[0].sections.find((section) => section.name === 'Pleadings')

  assert.equal(discovery?.pages[0].title, 'native-file.docx')
  assert.match(discovery?.pages[0].content ?? '', /attachment-card/)
  assert.equal(empty?.pages[0].title, 'Empty Folder')
  assert.match(empty?.pages[0].content ?? '', /No files were found/)
  assert.match(motions?.pages[0].content ?? '', /embedded-image/)
  assert.match(pleadings?.pages[0].content ?? '', /printout-card/)
  assert.equal(imported.assets.length, 4)
  assert.equal(imported.assets.some((asset) => asset.kind === 'printout' && asset.name === 'Complaint.pdf'), true)
})
