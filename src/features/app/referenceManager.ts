import type { ReferenceItem, ReferencePerson, ReferenceSource } from '../../app/appTypes.ts'

export type ReferenceStyleOption = {
  id: string
  label: string
}

export const referenceStyleOptions: ReferenceStyleOption[] = [
  { id: 'apa', label: 'APA' },
  { id: 'mla', label: 'MLA' },
  { id: 'chicago', label: 'Chicago' },
  { id: 'ieee', label: 'IEEE' },
]

type CslCreator = {
  family?: string
  given?: string
  literal?: string
}

type CslReference = {
  DOI?: string
  URL?: string
  author?: CslCreator[]
  'container-title'?: string
  containerTitle?: string
  id?: string | number
  issued?: {
    'date-parts'?: Array<Array<number | string>>
  }
  publisher?: string
  title?: string
  type?: string
}

const sourceRank: Record<ReferenceSource, number> = {
  manual: 0,
  'CSL JSON': 1,
  BibTeX: 2,
  RIS: 3,
}

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim()

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const escapeAttribute = (value: string) => escapeHtml(value)

const normalizeBracedValue = (value: string) =>
  normalizeWhitespace(value.replace(/[{}]/g, '').replace(/^["']|["']$/g, ''))

const normalizeReferenceKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

const getReferenceKey = (source: ReferenceSource, rawKey: string, title: string, index: number) => {
  const base = normalizeReferenceKey(rawKey || title || `reference-${index + 1}`)
  return `${source.toLowerCase().replace(/\s+/g, '-')}-${base || index + 1}`
}

const getYearFromValue = (value = '') => value.match(/\b\d{4}\b/)?.[0] ?? ''

const normalizePerson = (value: string): ReferencePerson => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return { name: 'Unknown author' }

  if (normalized.includes(',')) {
    const [lastName, ...rest] = normalized.split(',').map((part) => part.trim())
    const firstName = rest.join(' ')
    return {
      firstName,
      lastName: lastName || undefined,
      name: [firstName, lastName].filter(Boolean).join(' '),
    }
  }

  const parts = normalized.split(' ')
  if (parts.length === 1) return { lastName: normalized, name: normalized }
  const lastName = parts.at(-1) ?? ''
  const firstName = parts.slice(0, -1).join(' ')
  return {
    firstName,
    lastName,
    name: normalized,
  }
}

const normalizePeople = (value = '') =>
  value
    .split(/\s+(?:and|&)\s+/i)
    .map(normalizePerson)
    .filter((person) => person.name || person.lastName)

const cslCreatorToPerson = (creator: CslCreator): ReferencePerson => {
  if (creator.literal?.trim()) return normalizePerson(creator.literal)
  const firstName = creator.given?.trim() ?? ''
  const lastName = creator.family?.trim() ?? ''
  return {
    firstName,
    lastName,
    name: [firstName, lastName].filter(Boolean).join(' ') || lastName || firstName,
  }
}

const getPersonDisplayName = (person: ReferencePerson) =>
  person.name?.trim() || [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || 'Unknown author'

const getPersonCitationName = (person: ReferencePerson) =>
  person.lastName?.trim() || getPersonDisplayName(person).split(' ').at(-1) || 'Unknown author'

export const formatReferenceCitationLabel = (reference: ReferenceItem) => {
  const names = reference.authors.map(getPersonCitationName).filter(Boolean)
  const authorLabel =
    names.length === 0
      ? reference.title
      : names.length === 1
        ? names[0]
        : names.length === 2
          ? `${names[0]} and ${names[1]}`
          : `${names[0]} et al.`

  return [authorLabel, reference.year].filter(Boolean).join(', ')
}

export const formatReferenceBibliographyEntry = (reference: ReferenceItem) => {
  const authors =
    reference.authors.length > 0
      ? reference.authors.map(getPersonDisplayName).join(', ')
      : 'Unknown author'
  const year = reference.year ? `(${reference.year}).` : ''
  const source = reference.containerTitle || reference.publisher || ''
  const locator = reference.doi
    ? `https://doi.org/${reference.doi.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')}`
    : reference.url

  return [authors, year, reference.title, source, locator].filter(Boolean).join(' ')
}

export const getReferenceCreatorSummary = (reference: ReferenceItem) => {
  if (reference.authors.length === 0) return 'Unknown author'
  const names = reference.authors.map(getPersonDisplayName).filter(Boolean)
  if (names.length <= 3) return names.join(', ')
  return `${names.slice(0, 3).join(', ')} et al.`
}

export const getReferencePreview = (reference: ReferenceItem) =>
  formatReferenceBibliographyEntry(reference).replace(/\s+/g, ' ').trim()

export const buildReferenceCitationMarkup = (reference: ReferenceItem, style: string) =>
  `<span class="reference-citation" data-reference-key="${escapeAttribute(reference.id)}" data-reference-style="${escapeAttribute(style)}">(${escapeHtml(formatReferenceCitationLabel(reference))})</span>`

export const buildReferenceMarkup = (reference: ReferenceItem, style: string) => {
  const locator = reference.doi
    ? `https://doi.org/${reference.doi.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')}`
    : reference.url
  const link = locator
    ? `<a href="${escapeAttribute(locator)}" target="_blank" rel="noreferrer">Source</a>`
    : ''

  return `
    <section class="reference-entry" contenteditable="false" data-reference-key="${escapeAttribute(reference.id)}" data-reference-style="${escapeAttribute(style)}">
      <div class="reference-entry-body">${escapeHtml(formatReferenceBibliographyEntry(reference))}</div>
      <div class="reference-entry-meta">
        <span>${escapeHtml([reference.itemType, reference.source].filter(Boolean).join(' - '))}</span>
        ${link}
      </div>
    </section>
    <p></p>
  `
}

export const buildReferenceBibliographyMarkup = (references: ReferenceItem[], style: string) => `
  <section class="reference-bibliography" data-reference-style="${escapeAttribute(style)}">
    <h2>Bibliography</h2>
    ${references.map((reference) => buildReferenceMarkup(reference, style)).join('')}
  </section>
  <p></p>
`

const parseCslJsonPayload = (payload: unknown): ReferenceItem[] => {
  const items = Array.isArray(payload) ? payload : [payload]
  return items
    .map((item, index): ReferenceItem | null => {
      if (!item || typeof item !== 'object') return null
      const raw = item as CslReference
      const title = normalizeWhitespace(raw.title ?? '')
      if (!title) return null

      const year = getYearFromValue(String(raw.issued?.['date-parts']?.[0]?.[0] ?? ''))
      return {
        authors: raw.author?.map(cslCreatorToPerson).filter((person) => getPersonDisplayName(person)) ?? [],
        containerTitle: normalizeWhitespace(raw.containerTitle ?? raw['container-title'] ?? ''),
        doi: normalizeWhitespace(raw.DOI ?? ''),
        id: getReferenceKey('CSL JSON', String(raw.id ?? ''), title, index),
        itemType: normalizeWhitespace(raw.type ?? 'reference'),
        publisher: normalizeWhitespace(raw.publisher ?? ''),
        source: 'CSL JSON',
        title,
        url: normalizeWhitespace(raw.URL ?? ''),
        year,
      }
    })
    .filter((reference): reference is ReferenceItem => reference !== null)
}

const collectJsonReferences = (value: string) => {
  const references: ReferenceItem[] = []
  try {
    references.push(...parseCslJsonPayload(JSON.parse(value)))
    return references
  } catch {
    // Continue with line-oriented import for pasted mixed exports.
  }

  for (const line of value.split(/\r?\n/)) {
    const candidate = line.trim()
    if (!candidate || !/^[{[]/.test(candidate)) continue
    try {
      references.push(...parseCslJsonPayload(JSON.parse(candidate)))
    } catch {
      // Ignore non-JSON lines; other parsers handle BibTeX/RIS below.
    }
  }

  return references
}

const parseBibtexFields = (body: string) => {
  const fields: Record<string, string> = {}
  const fieldPattern = /([a-z][a-z0-9_-]*)\s*=\s*(\{(?:[^{}]|\{[^{}]*\})*}|"[^"]*"|[^,\n]+)\s*,?/gi
  for (const match of body.matchAll(fieldPattern)) {
    fields[match[1].toLowerCase()] = normalizeBracedValue(match[2])
  }
  return fields
}

const collectBibtexReferences = (value: string) => {
  const references: ReferenceItem[] = []
  const entryPattern = /@([a-z]+)\s*\{\s*([^,\s]+)\s*,([\s\S]*?)(?=\n\s*@|\s*$)/gi

  for (const match of value.matchAll(entryPattern)) {
    const fields = parseBibtexFields(match[3])
    const title = fields.title || ''
    if (!title) continue
    const doi = fields.doi ?? ''
    const url = fields.url ?? ''
    references.push({
      authors: normalizePeople(fields.author || fields.editor || ''),
      containerTitle: fields.journal || fields.booktitle || '',
      doi,
      id: getReferenceKey('BibTeX', match[2], title, references.length),
      itemType: match[1],
      publisher: fields.publisher || '',
      source: 'BibTeX',
      title,
      url,
      year: getYearFromValue(fields.year || fields.date || ''),
    })
  }

  return references
}

const collectRisReferences = (value: string) =>
  value
    .split(/(?:^|\r?\n)ER\s+-.*(?:\r?\n|$)/)
    .map((block, index): ReferenceItem | null => {
      if (!/\bTY\s+-/.test(block)) return null
      const fields: Record<string, string[]> = {}
      for (const line of block.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z0-9]{2})\s+-\s*(.*)$/)
        if (!match) continue
        fields[match[1]] = [...(fields[match[1]] ?? []), normalizeWhitespace(match[2])]
      }

      const title = fields.TI?.[0] || fields.T1?.[0] || ''
      if (!title) return null

      return {
        authors: (fields.AU ?? fields.A1 ?? []).map(normalizePerson),
        containerTitle: fields.JO?.[0] || fields.JF?.[0] || fields.T2?.[0] || '',
        doi: fields.DO?.[0] || '',
        id: getReferenceKey('RIS', fields.ID?.[0] ?? '', title, index),
        itemType: fields.TY?.[0] || 'reference',
        publisher: fields.PB?.[0] || '',
        source: 'RIS',
        title,
        url: fields.UR?.[0] || '',
        year: getYearFromValue(fields.PY?.[0] || fields.Y1?.[0] || ''),
      }
    })
    .filter((reference): reference is ReferenceItem => reference !== null)

export const importReferencesFromText = (value: string) => {
  const references = [
    ...collectJsonReferences(value),
    ...collectBibtexReferences(value),
    ...collectRisReferences(value),
  ]
  const seen = new Set<string>()

  return references
    .sort((left, right) => sourceRank[left.source] - sourceRank[right.source])
    .filter((reference) => {
      const key = [reference.title.toLowerCase(), reference.year, reference.doi.toLowerCase()].join('|')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}
