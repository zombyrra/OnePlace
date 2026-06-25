import assert from 'node:assert/strict'
import test from 'node:test'
import {
  countPages,
  createSingleNotebookState,
  createStarterNotebook,
  createStarterState,
  ensureSelection,
  getSelection,
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
