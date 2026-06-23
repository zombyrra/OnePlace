import test from 'node:test'
import assert from 'node:assert/strict'
import {
  addMarkmapChild,
  addMarkmapSibling,
  buildMarkmapCardMarkup,
  buildMarkmapMarkdownFromText,
  countMarkmapTreeNodes,
  createMarkmapTreeFromMarkdown,
  decodeMarkmapMarkdown,
  encodeMarkmapMarkdown,
  getMarkmapTitle,
  removeMarkmapNode,
  serializeMarkmapTreeToMarkdown,
  updateMarkmapNodeLabel,
} from '../src/features/app/markmapFeature.ts'

test('builds a safe portable Markmap card with encoded Markdown source', () => {
  const markdown = '# Research Plan\n\n- Read <papers>\n- Compare "models" & costs'
  const markup = buildMarkmapCardMarkup(markdown)

  assert.match(markup, /class="markmap-card"/)
  assert.match(markup, /contenteditable="false"/)
  assert.match(markup, /data-markmap-markdown="/)
  assert.doesNotMatch(markup, /<svg/i)
  assert.match(markup, /Read &lt;papers&gt;/)
  assert.match(markup, /Compare &quot;models&quot; &amp; costs/)

  const encoded = markup.match(/data-markmap-markdown="([^"]+)"/)?.[1]
  assert.equal(decodeMarkmapMarkdown(encoded ?? ''), markdown)
})

test('normalizes selected note text into a Markmap outline', () => {
  const markdown = buildMarkmapMarkdownFromText('Project Notes', 'Goals\nRisks\nNext steps')

  assert.equal(markdown, '# Project Notes\n\n- Goals\n- Risks\n- Next steps')
})

test('keeps existing Markdown structure and title when available', () => {
  const markdown = '# Existing Map\n\n## Branch\n\n- Leaf'
  const encoded = encodeMarkmapMarkdown(markdown)

  assert.equal(decodeMarkmapMarkdown(encoded), markdown)
  assert.equal(getMarkmapTitle(markdown), 'Existing Map')
  assert.equal(buildMarkmapMarkdownFromText('Fallback', markdown), markdown)
})

test('converts Markdown into an editable tree and serializes it for Markmap', () => {
  const tree = createMarkmapTreeFromMarkdown('# Launch\n\n- Research\n  - Sources\n- Build', 'Fallback')

  assert.equal(tree.label, 'Launch')
  assert.equal(tree.children[0]?.label, 'Research')
  assert.equal(tree.children[0]?.children[0]?.label, 'Sources')
  assert.equal(tree.children[1]?.label, 'Build')
  assert.equal(countMarkmapTreeNodes(tree), 4)
  assert.equal(serializeMarkmapTreeToMarkdown(tree), '# Launch\n\n- Research\n  - Sources\n- Build')
})

test('updates tree nodes without making users edit Markdown', () => {
  const tree = createMarkmapTreeFromMarkdown('# Plan\n\n- First', 'Plan')
  const firstId = tree.children[0]?.id ?? ''
  const withChild = addMarkmapChild(tree, firstId, 'Detail')
  const childId = withChild.children[0]?.children[0]?.id ?? ''
  const withSibling = addMarkmapSibling(withChild, childId, 'Other detail')
  const renamed = updateMarkmapNodeLabel(withSibling, firstId, 'Discovery')
  const pruned = removeMarkmapNode(renamed, childId)

  assert.equal(serializeMarkmapTreeToMarkdown(pruned), '# Plan\n\n- Discovery\n  - Other detail')
})
