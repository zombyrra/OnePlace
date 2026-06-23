import {
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import type { AppState, Page, ReferenceItem } from '../../app/appModel'
import {
  buildReferenceBibliographyMarkup,
  buildReferenceCitationMarkup,
  buildReferenceMarkup,
  importReferencesFromText,
  referenceStyleOptions,
} from './referenceManager'

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
  const [referenceQuery, setReferenceQuery] = useState('')
  const [referenceStyle, setReferenceStyle] = useState(referenceStyleOptions[0].id)

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
    isReferencesPaneOpen,
    referenceImportDraft,
    referenceImportSummary,
    referenceQuery,
    referenceStyle,
    references,
    removeReference,
    setIsReferencesPaneOpen,
    setReferenceImportDraft,
    setReferenceQuery,
    setReferenceStyle,
  }
}
