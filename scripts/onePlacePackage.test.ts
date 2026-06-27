import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import {
  collectNotebookPackageAssets,
  mergeOnePlacePackageIntoState,
} from '../src/features/app/onePlacePackage.ts'
import { createStarterState } from '../src/app/appModel.ts'
import type { AppAsset, Notebook } from '../src/app/appModel.ts'

globalThis.DOMParser = new JSDOM('').window.DOMParser

const notebook: Notebook = {
  color: '#3784d6',
  icon: 'folder',
  id: 'notebook-1',
  name: 'Case Notebook',
  sectionGroups: [
    {
      id: 'group-1',
      isCollapsed: false,
      name: 'Sections',
      sections: [
        {
          color: '#3784d6',
          id: 'section-1',
          name: 'Pleadings',
          pages: [
            {
              accent: '#3784d6',
              children: [],
              content: '<p data-asset-id="asset-1">Complaint</p><p data-asset-id="missing-asset">Missing</p>',
              createdAt: '2026-06-27T00:00:00.000Z',
              id: 'page-1',
              inkStrokes: [],
              isCollapsed: false,
              snippet: 'Complaint',
              tags: [],
              task: null,
              title: 'Complaint',
              updatedAt: '2026-06-27T00:00:00.000Z',
            },
          ],
          passwordHash: null,
          passwordHint: '',
        },
      ],
    },
  ],
}

const assets: Record<string, AppAsset> = {
  'asset-1': {
    createdAt: '2026-06-27T00:00:00.000Z',
    dataUrl: 'data:application/pdf;base64,JVBERi0xLjc=',
    id: 'asset-1',
    kind: 'printout',
    mimeType: 'application/pdf',
    name: 'Complaint.pdf',
    sizeLabel: '8 KB',
  },
  unused: {
    createdAt: '2026-06-27T00:00:00.000Z',
    dataUrl: 'data:text/plain;base64,dW51c2Vk',
    id: 'unused',
    kind: 'file',
    mimeType: 'text/plain',
    name: 'unused.txt',
    sizeLabel: '1 KB',
  },
}

test('collectNotebookPackageAssets returns only assets referenced by notebook pages', () => {
  assert.deepEqual(collectNotebookPackageAssets(notebook, assets), [assets['asset-1']])
})

test('mergeOnePlacePackageIntoState imports notebooks and assets then selects first imported page', () => {
  const state = createStarterState()
  const merged = mergeOnePlacePackageIntoState(state, {
    assets: [assets['asset-1']],
    notebooks: [notebook],
  })

  assert.equal(merged.notebooks.some((item) => item.id === 'notebook-1'), true)
  assert.equal(merged.meta.assets['asset-1'].name, 'Complaint.pdf')
  assert.equal(merged.selectedNotebookId, 'notebook-1')
  assert.equal(merged.selectedSectionGroupId, 'group-1')
  assert.equal(merged.selectedSectionId, 'section-1')
  assert.equal(merged.selectedPageId, 'page-1')
})

test('mergeOnePlacePackageIntoState ignores invalid imported notebooks without adding starter state', () => {
  const state = createStarterState()
  const merged = mergeOnePlacePackageIntoState(state, {
    assets: [assets['asset-1']],
    notebooks: [{ id: 'invalid-notebook' }],
  })

  assert.deepEqual(merged, state)
})

test('mergeOnePlacePackageIntoState does not merge unsafe imported assets', () => {
  const state = createStarterState()
  const merged = mergeOnePlacePackageIntoState(state, {
    assets: [
      {
        ...assets.unused,
        dataUrl: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
        id: 'unsafe-asset',
        name: 'unsafe.html',
      },
    ],
    notebooks: [notebook],
  })

  assert.equal(merged.meta.assets['unsafe-asset'], undefined)
})

test('mergeOnePlacePackageIntoState does not replace current notebooks with invalid raw import ids', () => {
  const state = createStarterState()
  const currentNotebookId = state.notebooks[0].id
  const merged = mergeOnePlacePackageIntoState(state, {
    assets: [],
    notebooks: [notebook, { id: currentNotebookId }],
  })

  assert.equal(merged.notebooks.some((item) => item.id === currentNotebookId), true)
  assert.equal(merged.notebooks.some((item) => item.id === 'notebook-1'), true)
  assert.equal(merged.selectedNotebookId, 'notebook-1')
})

test('mergeOnePlacePackageIntoState remaps imported ids that collide with current data', () => {
  const state = createStarterState()
  const currentNotebook = {
    ...notebook,
    name: 'Current Case Notebook',
  }
  const currentAsset = {
    ...assets['asset-1'],
    name: 'Current Complaint.pdf',
  }
  const currentState = {
    ...state,
    meta: {
      ...state.meta,
      assets: {
        'asset-1': currentAsset,
      },
    },
    notebooks: [currentNotebook],
    selectedNotebookId: currentNotebook.id,
    selectedPageId: 'page-1',
    selectedSectionGroupId: 'group-1',
    selectedSectionId: 'section-1',
  }

  const merged = mergeOnePlacePackageIntoState(currentState, {
    assets: [assets['asset-1']],
    notebooks: [
      {
        ...notebook,
        name: 'Imported Case Notebook',
      },
    ],
  })

  assert.equal(merged.notebooks.length, 2)
  assert.equal(merged.notebooks[0].id, 'notebook-1')
  assert.equal(merged.notebooks[0].name, 'Current Case Notebook')

  const importedNotebook = merged.notebooks[1]
  assert.notEqual(importedNotebook.id, 'notebook-1')
  assert.equal(importedNotebook.name, 'Imported Case Notebook')
  assert.equal(merged.selectedNotebookId, importedNotebook.id)

  const importedPage = importedNotebook.sectionGroups[0].sections[0].pages[0]
  assert.notEqual(importedPage.id, 'page-1')
  assert.equal(merged.selectedPageId, importedPage.id)

  const importedAssetId = importedPage.content.match(/data-asset-id="([^"]+)"/)?.[1]
  assert.ok(importedAssetId)
  assert.notEqual(importedAssetId, 'asset-1')
  assert.equal(merged.meta.assets['asset-1'].name, 'Current Complaint.pdf')
  assert.equal(merged.meta.assets[importedAssetId].name, 'Complaint.pdf')
})
