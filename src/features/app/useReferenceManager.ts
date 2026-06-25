import {
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { createId, type AppState, type Page, type ReferenceItem } from '../../app/appModel'
import {
  buildReferenceBibliographyMarkup,
  buildReferenceCitationMarkup,
  buildReferenceMarkup,
  importReferenceFromCrossrefWork,
  importReferencesFromText,
  referenceStyleOptions,
  type CrossrefWork,
} from './referenceManager'

export type ReferenceDraft = {
  authors: string
  containerTitle: string
  doi: string
  itemType: string
  publisher: string
  title: string
  url: string
  year: string
}

type UseReferenceManagerArgs = {
  appState: AppState
  insertHtmlAtSelection: (html: string) => void
  isCurrentSectionLocked: boolean
  page?: Page
  setAppState: Dispatch<SetStateAction<AppState>>
  setSaveLabel: (value: string) => void
}

const getReferenceFingerprint = (reference: ReferenceItem) =>
  [reference.title.toLowerCase(), reference.year, reference.doi.toLowerCase(), reference.url.toLowerCase()].join('|')

const CROSSREF_API_ROOT = 'https://api.crossref.org'
const CROSSREF_MAILTO = 'oneplace@local.invalid'

const doiPattern = /\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+\b/i

const extractDoi = (value: string) => {
  const match = value.match(doiPattern)
  return match?.[0].replace(/[.,;)\]]+$/, '') ?? ''
}

const emptyReferenceDraft = (): ReferenceDraft => ({
  authors: '',
  containerTitle: '',
  doi: '',
  itemType: 'article',
  publisher: '',
  title: '',
  url: '',
  year: '',
})

const normalizeDraftValue = (value: string) => value.replace(/\s+/g, ' ').trim()

const parseDraftAuthors = (value: string) =>
  value
    .split(/\s*;\s*|\s+\band\b\s+/i)
    .map(normalizeDraftValue)
    .filter(Boolean)
    .map((name) => {
      const parts = name.split(' ')
      const lastName = parts.length > 1 ? parts.at(-1) : name
      const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : ''
      return {
        firstName,
        lastName,
        name,
      }
    })

const getDraftFromReference = (reference: ReferenceItem): ReferenceDraft => ({
  authors: reference.authors
    .map((author) => author.name || [author.firstName, author.lastName].filter(Boolean).join(' '))
    .filter(Boolean)
    .join('; '),
  containerTitle: reference.containerTitle,
  doi: reference.doi,
  itemType: reference.itemType,
  publisher: reference.publisher,
  title: reference.title,
  url: reference.url,
  year: reference.year,
})

export const useReferenceManager = ({
  appState,
  insertHtmlAtSelection,
  isCurrentSectionLocked,
  page,
  setAppState,
  setSaveLabel,
}: UseReferenceManagerArgs) => {
  const [isReferencesPaneOpen, setIsReferencesPaneOpen] = useState(false)
  const [referenceImportDraft, setReferenceImportDraft] = useState('')
  const [referenceImportSummary, setReferenceImportSummary] = useState('Import BibTeX, RIS, or CSL JSON exports.')
  const [referenceLookupDraft, setReferenceLookupDraft] = useState('')
  const [isLookingUpReference, setIsLookingUpReference] = useState(false)
  const [referenceQuery, setReferenceQuery] = useState('')
  const [referenceStyle, setReferenceStyle] = useState(referenceStyleOptions[0].id)
  const [editingReferenceId, setEditingReferenceId] = useState<string | null>(null)
  const [manualReferenceDraft, setManualReferenceDraft] = useState<ReferenceDraft>(() => emptyReferenceDraft())

  const references = appState.meta.references
  const filteredReferences = useMemo(() => {
    const query = referenceQuery.trim().toLowerCase()
    if (!query) return references

    return references.filter((reference) =>
      [
        reference.title,
        reference.year,
        reference.containerTitle,
        reference.publisher,
        reference.doi,
        reference.url,
        reference.itemType,
        reference.authors.map((author) => author.name || `${author.firstName ?? ''} ${author.lastName ?? ''}`).join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [referenceQuery, references])

  const importReferenceText = (value: string) => {
    const imported = importReferencesFromText(value)
    if (imported.length === 0) {
      setReferenceImportSummary('No references found. Paste BibTeX, RIS, or CSL JSON export text.')
      return
    }

    let inserted = 0
    setAppState((current) => {
      const seen = new Set(current.meta.references.map(getReferenceFingerprint))
      const nextReferences = [...current.meta.references]

      for (const reference of imported) {
        const fingerprint = getReferenceFingerprint(reference)
        if (seen.has(fingerprint)) continue
        seen.add(fingerprint)
        nextReferences.push(reference)
        inserted += 1
      }

      return {
        ...current,
        meta: {
          ...current.meta,
          references: nextReferences,
        },
      }
    })

    setReferenceImportDraft('')
    setReferenceImportSummary(
      inserted > 0
        ? `Imported ${inserted} reference${inserted === 1 ? '' : 's'}`
        : 'Those references are already in your library',
    )
    setSaveLabel(
      inserted > 0
        ? `Imported ${inserted} reference${inserted === 1 ? '' : 's'}`
        : 'Reference library already up to date',
    )
  }

  const addReferenceItem = (reference: ReferenceItem, action = 'Added') => {
    const nextFingerprint = getReferenceFingerprint(reference)
    let saved = false
    let duplicate = false

    setAppState((current) => {
      const duplicateReference = current.meta.references.find(
        (item) => item.id !== reference.id && getReferenceFingerprint(item) === nextFingerprint,
      )
      if (duplicateReference) {
        duplicate = true
        return current
      }

      return {
        ...current,
        meta: {
          ...current.meta,
          references: [...current.meta.references, reference],
        },
      }
    })

    if (duplicate) {
      setReferenceImportSummary('That reference is already in your library.')
      setSaveLabel('Reference already exists')
      return false
    }

    saved = true
    if (saved) {
      setReferenceImportSummary(`${action} ${reference.title}`)
      setSaveLabel(`${action} reference`)
    }
    return true
  }

  const fetchCrossrefWork = async (value: string) => {
    const query = normalizeDraftValue(value)
    const doi = extractDoi(query)
    const params = new URLSearchParams({ mailto: CROSSREF_MAILTO })
    const url = doi
      ? `${CROSSREF_API_ROOT}/works/${encodeURIComponent(doi)}?${params.toString()}`
      : `${CROSSREF_API_ROOT}/works?${new URLSearchParams({
          mailto: CROSSREF_MAILTO,
          rows: '1',
          'query.bibliographic': query,
        }).toString()}`

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 7000)
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new Error(`Crossref responded with ${response.status}`)
      }

      const payload = await response.json()
      const message = payload?.message
      return doi ? message as CrossrefWork | undefined : message?.items?.[0] as CrossrefWork | undefined
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  const addReferenceByLookup = async () => {
    const lookup = normalizeDraftValue(referenceLookupDraft)
    if (!lookup) {
      setReferenceImportSummary('Paste a DOI, article URL, or citation to look up.')
      return
    }

    setIsLookingUpReference(true)
    setReferenceImportSummary('Looking up source metadata...')
    try {
      const work = await fetchCrossrefWork(lookup)
      const reference = work ? importReferenceFromCrossrefWork(work, /^https?:\/\//i.test(lookup) ? lookup : '') : null
      if (!reference) {
        setManualReferenceDraft((current) => ({
          ...current,
          title: /^https?:\/\//i.test(lookup) ? new URL(lookup).hostname.replace(/^www\./, '') : current.title,
          url: /^https?:\/\//i.test(lookup) ? lookup : current.url,
        }))
        setReferenceImportSummary('No metadata found. I put what I could into the editor below.')
        setSaveLabel('Reference lookup needs details')
        return
      }

      if (addReferenceItem(reference)) {
        setReferenceLookupDraft('')
      }
    } catch {
      setReferenceImportSummary('Could not look up that source. Check the DOI or URL, or add details below.')
      setSaveLabel('Reference lookup failed')
    } finally {
      setIsLookingUpReference(false)
    }
  }

  const removeReference = (referenceId: string) => {
    setAppState((current) => ({
      ...current,
      meta: {
        ...current.meta,
        references: current.meta.references.filter((reference) => reference.id !== referenceId),
      },
    }))
    setSaveLabel('Removed reference')
  }

  const setManualReferenceField = (field: keyof ReferenceDraft, value: string) => {
    setManualReferenceDraft((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const resetManualReferenceDraft = () => {
    setEditingReferenceId(null)
    setManualReferenceDraft(emptyReferenceDraft())
  }

  const editReference = (reference: ReferenceItem) => {
    setEditingReferenceId(reference.id)
    setManualReferenceDraft(getDraftFromReference(reference))
    setReferenceImportSummary(`Editing ${reference.title}`)
  }

  const saveManualReference = () => {
    const title = normalizeDraftValue(manualReferenceDraft.title)
    if (!title) {
      setReferenceImportSummary('Add a title before saving the reference.')
      return
    }

    const nextReference: ReferenceItem = {
      authors: parseDraftAuthors(manualReferenceDraft.authors),
      containerTitle: normalizeDraftValue(manualReferenceDraft.containerTitle),
      doi: normalizeDraftValue(manualReferenceDraft.doi),
      id: editingReferenceId ?? `manual-${createId()}`,
      itemType: normalizeDraftValue(manualReferenceDraft.itemType) || 'reference',
      publisher: normalizeDraftValue(manualReferenceDraft.publisher),
      source: 'manual',
      title,
      url: normalizeDraftValue(manualReferenceDraft.url),
      year: normalizeDraftValue(manualReferenceDraft.year).match(/\b\d{4}\b/)?.[0] ?? normalizeDraftValue(manualReferenceDraft.year),
    }

    const nextFingerprint = getReferenceFingerprint(nextReference)
    let saved = false
    let duplicate = false

    setAppState((current) => {
      const duplicateReference = current.meta.references.find(
        (reference) => reference.id !== nextReference.id && getReferenceFingerprint(reference) === nextFingerprint,
      )
      if (duplicateReference) {
        duplicate = true
        return current
      }

      const exists = current.meta.references.some((reference) => reference.id === nextReference.id)
      const references = exists
        ? current.meta.references.map((reference) => (reference.id === nextReference.id ? nextReference : reference))
        : [...current.meta.references, nextReference]
      saved = true

      return {
        ...current,
        meta: {
          ...current.meta,
          references,
        },
      }
    })

    if (duplicate) {
      setReferenceImportSummary('That reference is already in your library.')
      setSaveLabel('Reference already exists')
      return
    }

    if (saved) {
      const action = editingReferenceId ? 'Updated' : 'Added'
      resetManualReferenceDraft()
      setReferenceImportSummary(`${action} ${title}`)
      setSaveLabel(`${action} reference`)
    }
  }

  const canInsertReference = Boolean(page) && !isCurrentSectionLocked

  const insertReferenceCitation = (reference: ReferenceItem) => {
    if (!canInsertReference) return
    insertHtmlAtSelection(buildReferenceCitationMarkup(reference, referenceStyle))
    setSaveLabel(`Inserted citation for ${reference.title}`)
  }

  const insertReferenceEntry = (reference: ReferenceItem) => {
    if (!canInsertReference) return
    insertHtmlAtSelection(buildReferenceMarkup(reference, referenceStyle))
    setSaveLabel(`Inserted reference for ${reference.title}`)
  }

  const insertReferenceBibliography = () => {
    if (!canInsertReference || filteredReferences.length === 0) return
    insertHtmlAtSelection(buildReferenceBibliographyMarkup(filteredReferences, referenceStyle))
    setSaveLabel(
      `Inserted ${filteredReferences.length} reference${filteredReferences.length === 1 ? '' : 's'}`,
    )
  }

  return {
    canInsertReference,
    filteredReferences,
    importReferenceText,
    insertReferenceBibliography,
    insertReferenceCitation,
    insertReferenceEntry,
    editReference,
    editingReferenceId,
    addReferenceByLookup,
    isLookingUpReference,
    isReferencesPaneOpen,
    manualReferenceDraft,
    referenceImportDraft,
    referenceImportSummary,
    referenceLookupDraft,
    referenceQuery,
    referenceStyle,
    references,
    removeReference,
    resetManualReferenceDraft,
    saveManualReference,
    setIsReferencesPaneOpen,
    setReferenceImportDraft,
    setManualReferenceField,
    setReferenceLookupDraft,
    setReferenceQuery,
    setReferenceStyle,
  }
}
