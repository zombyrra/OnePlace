import assert from 'node:assert/strict'
import test from 'node:test'
import {
  countPages,
  clonePageTree,
  createSingleNotebookState,
  createStarterNotebook,
  createStarterPage,
  createStarterState,
  ensureSelection,
  getSelection,
  insertPageRelative,
  movePageWithinSiblings,
} from '../src/app/appModel.ts'

test('createStarterNotebook creates a selectable notebook scaffold', () => {
  const notebook = createStarterNotebook('Replacement Notebook')
  const group = notebook.sectionGroups[0]
  const section = group.sections[0]
  const page = section.pages[0]

  assert.equal(notebook.name, 'Replacement Notebook')
  assert.equal(notebook.sectionGroups.length, 1)
  assert.equal(group.name, 'Sections')
  assert.equal(group.isCollapsed, false)
  assert.equal(section.name, 'New Section')
  assert.equal(countPages(section.pages), 1)
  assert.equal(page.title, 'Untitled Page')
  assert.match(page.content, /Untitled Page notes/)
})

test('createSingleNotebookState replaces an empty hierarchy with selected notebook content', () => {
  const current = createStarterState()
  const state = createSingleNotebookState(
    {
      ...current,
      notebooks: [],
      selectedNotebookId: '',
      selectedPageId: '',
      selectedSectionGroupId: '',
      selectedSectionId: '',
    },
    'Notebook 1',
  )
  const { notebook, page, section, sectionGroup } = getSelection(state)

  assert.equal(state.notebooks.length, 1)
  assert.equal(notebook?.name, 'Notebook 1')
  assert.equal(state.selectedNotebookId, notebook?.id)
  assert.equal(state.selectedSectionGroupId, sectionGroup?.id)
  assert.equal(state.selectedSectionId, section?.id)
  assert.equal(state.selectedPageId, page?.id)
  assert.deepEqual(state.meta.recentPageIds[0], page?.id)
})

test('ensureSelection accepts replacement scaffolds without falling back to sample notebooks', () => {
  const current = createStarterState()
  const replacementState = createSingleNotebookState(current, 'Notebook 1')
  const ensured = ensureSelection(replacementState)

  assert.equal(ensured.notebooks.length, 1)
  assert.equal(ensured.notebooks[0].name, 'Notebook 1')
  assert.equal(ensured.selectedNotebookId, replacementState.selectedNotebookId)
  assert.equal(ensured.selectedPageId, replacementState.selectedPageId)
})

test('insertPageRelative inserts a page below the matching nested page', () => {
  const first = { ...createStarterPage('First'), id: 'first' }
  const child = { ...createStarterPage('Child'), id: 'child' }
  const second = { ...createStarterPage('Second'), id: 'second' }
  const inserted = { ...createStarterPage('Inserted'), id: 'inserted' }
  const pages = [{ ...first, children: [child] }, second]

  const nextPages = insertPageRelative(pages, 'child', inserted, 'after')

  assert.deepEqual(nextPages[0].children.map((page) => page.id), ['child', 'inserted'])
  assert.deepEqual(nextPages.map((page) => page.id), ['first', 'second'])
})

test('movePageWithinSiblings moves a nested page without changing its level', () => {
  const first = { ...createStarterPage('First'), id: 'first' }
  const childOne = { ...createStarterPage('Child One'), id: 'child-one' }
  const childTwo = { ...createStarterPage('Child Two'), id: 'child-two' }
  const childThree = { ...createStarterPage('Child Three'), id: 'child-three' }
  const pages = [{ ...first, children: [childOne, childTwo, childThree] }]

  const result = movePageWithinSiblings(pages, 'child-two', -1)

  assert.equal(result.moved, true)
  assert.deepEqual(result.pages[0].children.map((page) => page.id), ['child-two', 'child-one', 'child-three'])
  assert.equal(result.pages[0].id, 'first')
})

test('clonePageTree creates a copied page tree with fresh page and ink IDs', () => {
  const child = {
    ...createStarterPage('Child'),
    id: 'child',
    inkStrokes: [{ color: '#000', id: 'child-stroke', points: [{ x: 1, y: 2 }], width: 2 }],
  }
  const page = {
    ...createStarterPage('Parent'),
    children: [child],
    id: 'parent',
    inkStrokes: [{ color: '#111', id: 'parent-stroke', points: [{ x: 3, y: 4 }], width: 3 }],
    tags: ['Important'],
    task: { dueAt: null, status: 'open' as const },
  }

  const cloned = clonePageTree(page, '2026-06-25T06:30:00.000Z')

  assert.notEqual(cloned.id, page.id)
  assert.notEqual(cloned.children[0].id, child.id)
  assert.notEqual(cloned.inkStrokes[0].id, page.inkStrokes[0].id)
  assert.notEqual(cloned.children[0].inkStrokes[0].id, child.inkStrokes[0].id)
  assert.deepEqual(cloned.tags, ['Important'])
  assert.deepEqual(cloned.task, { dueAt: null, status: 'open' })
  assert.equal(cloned.createdAt, '2026-06-25T06:30:00.000Z')
  assert.equal(cloned.updatedAt, '2026-06-25T06:30:00.000Z')
})
