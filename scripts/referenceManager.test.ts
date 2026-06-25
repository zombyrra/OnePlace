import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildReferenceBibliographyMarkup,
  buildReferenceCitationMarkup,
  formatReferenceCitationLabel,
  importReferenceFromCrossrefWork,
  importReferencesFromText,
} from '../src/features/app/referenceManager.ts'

test('imports CSL JSON, BibTeX, and RIS references', () => {
  const cslJson = JSON.stringify([
    {
      DOI: '10.1000/example',
      author: [{ family: 'Lovelace', given: 'Ada' }],
      containerTitle: 'Journal of Notes',
      id: 'csl-1',
      issued: { 'date-parts': [[2025, 4, 18]] },
      title: 'Local-first citation workflows',
      type: 'article-journal',
      URL: 'https://example.test/local-first',
    },
  ])
  const bibtex = `
    @book{hopper2024,
      title = {Citation Systems for Builders},
      author = {Hopper, Grace},
      year = {2024},
      publisher = {OnePlace Press},
      url = {https://example.test/citation-systems}
    }
  `
  const ris = `
    TY  - JOUR
    ID  - ris-1
    TI  - Practical bibliographies
    AU  - Knuth, Donald
    PY  - 2023
    JO  - Computing Notes
    DO  - 10.1000/ris
    ER  -
  `

  const references = importReferencesFromText(`${cslJson}\n${bibtex}\n${ris}`)

  assert.equal(references.length, 3)
  assert.deepEqual(
    references.map((reference) => reference.title),
    ['Local-first citation workflows', 'Citation Systems for Builders', 'Practical bibliographies'],
  )
  assert.deepEqual(
    references.map((reference) => reference.year),
    ['2025', '2024', '2023'],
  )
  assert.equal(references[0].source, 'CSL JSON')
  assert.equal(references[1].source, 'BibTeX')
  assert.equal(references[2].source, 'RIS')
})

test('renders citation and bibliography markup for native references', () => {
  const [reference] = importReferencesFromText(`
    @article{lovelace2025,
      title = {Local-first citation workflows},
      author = {Lovelace, Ada and Hopper, Grace},
      year = {2025},
      journal = {Journal of Notes},
      doi = {10.1000/example}
    }
  `)

  assert.equal(formatReferenceCitationLabel(reference), 'Lovelace and Hopper, 2025')
  assert.match(buildReferenceCitationMarkup(reference, 'apa'), /data-reference-key="/)
  assert.match(buildReferenceCitationMarkup(reference, 'apa'), />\(Lovelace and Hopper, 2025\)</)

  const bibliography = buildReferenceBibliographyMarkup([reference], 'apa')
  assert.match(bibliography, /class="reference-bibliography"/)
  assert.match(bibliography, /Local-first citation workflows/)
  assert.match(bibliography, /https:\/\/doi\.org\/10\.1000\/example/)
})

test('imports a reference from Crossref work metadata', () => {
  const reference = importReferenceFromCrossrefWork({
    DOI: '10.1000/crossref',
    URL: 'https://example.test/crossref',
    author: [{ given: 'Ada', family: 'Lovelace' }],
    'container-title': ['Journal of Source Lookup'],
    issued: { 'date-parts': [[2026, 6, 25]] },
    publisher: 'OnePlace Press',
    title: ['Automatic citation lookup'],
    type: 'journal-article',
  })

  assert.ok(reference)
  assert.equal(reference.source, 'manual')
  assert.equal(reference.title, 'Automatic citation lookup')
  assert.equal(reference.year, '2026')
  assert.equal(reference.containerTitle, 'Journal of Source Lookup')
  assert.equal(formatReferenceCitationLabel(reference), 'Lovelace, 2026')
})
