import { useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import {
  buildSearchSnippet,
  builtInTags,
  extractSnippetText,
  flattenPages,
  sortPagesTree,
} from '../../app/appModel'
import type {
  AppState,
  Notebook,
  Page,
  PageSortMode,
  PageTask,
  SearchFilter,
  SearchResult,
  SearchScope,
  Section,
  SectionGroup,
  TagResult,
  TaskResult,
  TaskStatusFilter,
  VisiblePage,
} from '../../app/appModel'

type UseWorkspaceSearchArgs = {
  appState: AppState
  isCurrentSectionLocked: boolean
  notebook: Notebook | undefined
  pageSortMode: PageSortMode
  query: string
  searchFilter: SearchFilter
  searchScope: SearchScope
  section: Section | undefined
  sectionGroup: SectionGroup | undefined
  selectedTagFilter: string
  setAppState: Dispatch<SetStateAction<AppState>>
  tagPaneScope: SearchScope
  taskPaneScope: SearchScope
  taskStatusFilter: TaskStatusFilter
}

const getSearchMatch = (
  targetPage: Page,
  notebookName: string,
  groupName: string,
  sectionName: string,
  needle: string,
  filter: SearchFilter,
) => {
  const titleText = targetPage.title.trim()
  const contentText = `${targetPage.snippet} ${extractSnippetText(targetPage.content)}`.replace(/\s+/g, ' ').trim()
  const tagText = targetPage.tags.join(' ').trim()
  const taskText = [targetPage.task?.status ?? '', targetPage.task?.dueAt ?? ''].join(' ').trim()
  const locationText = `${notebookName} ${groupName} ${sectionName}`.trim()

  const fields: Array<{ field: SearchFilter; text: string; score: number }> = [
    { field: 'title', score: 5, text: titleText },
    { field: 'content', score: 3, text: `${contentText} ${locationText}`.trim() },
    { field: 'tag', score: 4, text: tagText },
    { field: 'task', score: 4, text: taskText },
  ]

  const allowedFields = filter === 'all' ? fields : fields.filter((entry) => entry.field === filter)
  const matchedFields = allowedFields
    .filter((entry) => entry.text.toLowerCase().includes(needle))
    .map((entry) => entry.field)

  if (matchedFields.length === 0) return null

  const score = allowedFields
    .filter((entry) => matchedFields.includes(entry.field))
    .reduce((total, entry) => total + entry.score, 0)

  const snippetSource = matchedFields.includes('title')
    ? titleText
    : matchedFields.includes('tag')
      ? tagText
      : matchedFields.includes('task')
        ? taskText
        : contentText

  return {
    matchedFields,
    matchSnippet: buildSearchSnippet(snippetSource || contentText || titleText, needle),
    score,
  }
}

export const renderHighlightedText = (text: string, needle: string) => {
  if (!needle) return text
  const lowerText = text.toLowerCase()
  const lowerNeedle = needle.toLowerCase()
  const parts: ReactNode[] = []
  let cursor = 0
  let index = lowerText.indexOf(lowerNeedle)

  while (index !== -1) {
    if (index > cursor) {
      parts.push(<span key={`${cursor}-text`}>{text.slice(cursor, index)}</span>)
    }
    parts.push(
      <mark key={`${index}-mark`} className="search-highlight">
        {text.slice(index, index + needle.length)}
      </mark>,
    )
    cursor = index + needle.length
    index = lowerText.indexOf(lowerNeedle, cursor)
  }

  if (cursor < text.length) {
    parts.push(<span key={`${cursor}-tail`}>{text.slice(cursor)}</span>)
  }

  return parts.length > 0 ? parts : text
}

export const useWorkspaceSearch = ({
  appState,
  isCurrentSectionLocked,
  notebook,
  pageSortMode,
  query,
  searchFilter,
  searchScope,
  section,
  sectionGroup,
  selectedTagFilter,
  setAppState,
  tagPaneScope,
  taskPaneScope,
  taskStatusFilter,
}: UseWorkspaceSearchArgs) => {
  const [taskResultsComputedAt] = useState(() => new Date().toISOString())

  const visiblePages = useMemo<VisiblePage[]>(() => {
    if (!section || isCurrentSectionLocked) return []
    const sortedPages = sortPagesTree(section.pages, pageSortMode)
    const needle = query.trim().toLowerCase()
    const flattened = flattenPages(sortedPages, 0, Boolean(needle && searchScope === 'section'))
    if (!needle || searchScope !== 'section') return flattened

    return flattened.filter(({ page: item }) =>
      Boolean(getSearchMatch(item, notebook?.name ?? '', sectionGroup?.name ?? '', section.name, needle, searchFilter)),
    )
  }, [isCurrentSectionLocked, notebook?.name, pageSortMode, query, searchFilter, searchScope, section, sectionGroup?.name])

  const searchResults = useMemo<SearchResult[]>(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return []

    const notebookTargets =
      searchScope === 'section'
        ? notebook && sectionGroup && section
          ? [notebook]
          : []
        : searchScope === 'notebook' && notebook
          ? [notebook]
          : appState.notebooks

    const results = notebookTargets.flatMap((entry) =>
      entry.sectionGroups.flatMap((group) =>
        group.sections.flatMap((part) => {
          if (
            searchScope === 'section' &&
            (entry.id !== notebook?.id || group.id !== sectionGroup?.id || part.id !== section?.id)
          ) {
            return []
          }

          return flattenPages(sortPagesTree(part.pages, pageSortMode), 0, true).flatMap((item) => {
            const match = getSearchMatch(item.page, entry.name, group.name, part.name, needle, searchFilter)
            if (!match) return []
            return [
              {
                groupId: group.id,
                groupName: group.name,
                isSubpage: item.depth > 0,
                matchedFields: match.matchedFields,
                matchSnippet: match.matchSnippet,
                notebookId: entry.id,
                notebookName: entry.name,
                page: item.page,
                score: match.score,
                sectionId: part.id,
                sectionName: part.name,
              } satisfies SearchResult,
            ]
          })
        }),
      ),
    )

    return results.sort(
      (left, right) =>
        (right.score ?? 0) - (left.score ?? 0) ||
        new Date(right.page.updatedAt).getTime() - new Date(left.page.updatedAt).getTime(),
    )
  }, [appState.notebooks, notebook, pageSortMode, query, searchFilter, searchScope, section, sectionGroup])

  const taskResults = useMemo<TaskResult[]>(() => {
    const notebookTargets =
      taskPaneScope === 'section'
        ? notebook && sectionGroup && section
          ? [notebook]
          : []
        : taskPaneScope === 'notebook' && notebook
          ? [notebook]
          : appState.notebooks

    const results = notebookTargets.flatMap((entry) =>
      entry.sectionGroups.flatMap((group) =>
        group.sections.flatMap((part) => {
          if (
            taskPaneScope === 'section' &&
            (entry.id !== notebook?.id || group.id !== sectionGroup?.id || part.id !== section?.id)
          ) {
            return []
          }

          return flattenPages(sortPagesTree(part.pages, pageSortMode), 0, true)
            .filter((item) => item.page.task)
            .filter((item) => taskStatusFilter === 'all' || item.page.task?.status === taskStatusFilter)
            .map(
              (item): TaskResult => ({
                groupId: group.id,
                groupName: group.name,
                isOverdue:
                  Boolean(item.page.task?.dueAt) &&
                  item.page.task?.status === 'open' &&
                  (item.page.task?.dueAt ?? '') < taskResultsComputedAt,
                isSubpage: item.depth > 0,
                notebookId: entry.id,
                notebookName: entry.name,
                page: item.page,
                sectionId: part.id,
                sectionName: part.name,
              }),
            )
        }),
      ),
    )

    return results.sort((left, right) => {
      const leftDue = left.page.task?.dueAt ? new Date(left.page.task.dueAt).getTime() : Number.MAX_SAFE_INTEGER
      const rightDue = right.page.task?.dueAt ? new Date(right.page.task.dueAt).getTime() : Number.MAX_SAFE_INTEGER
      if (leftDue !== rightDue) return leftDue - rightDue
      return new Date(right.page.updatedAt).getTime() - new Date(left.page.updatedAt).getTime()
    })
  }, [appState.notebooks, notebook, pageSortMode, section, sectionGroup, taskPaneScope, taskResultsComputedAt, taskStatusFilter])

  const taskSummary = useMemo(
    () =>
      appState.notebooks
        .flatMap((entry) =>
          entry.sectionGroups.flatMap((group) =>
            group.sections.flatMap((part) => flattenPages(part.pages, 0, true).map((item) => item.page.task)),
          ),
        )
        .filter((task): task is PageTask => Boolean(task))
        .reduce(
          (summary, task) => ({
            all: summary.all + 1,
            done: summary.done + (task.status === 'done' ? 1 : 0),
            open: summary.open + (task.status === 'open' ? 1 : 0),
          }),
          { all: 0, done: 0, open: 0 },
        ),
    [appState.notebooks],
  )

  const tagCatalog = useMemo(() => {
    const notebookTargets =
      tagPaneScope === 'section'
        ? notebook && sectionGroup && section
          ? [notebook]
          : []
        : tagPaneScope === 'notebook' && notebook
          ? [notebook]
          : appState.notebooks

    const counts = new Map<string, number>()
    notebookTargets.forEach((entry) =>
      entry.sectionGroups.forEach((group) =>
        group.sections.forEach((part) => {
          if (
            tagPaneScope === 'section' &&
            (entry.id !== notebook?.id || group.id !== sectionGroup?.id || part.id !== section?.id)
          ) {
            return
          }

          flattenPages(part.pages, 0, true).forEach((item) => {
            item.page.tags.forEach((tag) => {
              counts.set(tag, (counts.get(tag) ?? 0) + 1)
            })
          })
        }),
      ),
    )

    return [...new Set([...builtInTags, ...counts.keys()])]
      .map((tag) => ({ count: counts.get(tag) ?? 0, tag }))
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count
        return left.tag.localeCompare(right.tag)
      })
  }, [appState.notebooks, notebook, section, sectionGroup, tagPaneScope])

  const tagResults = useMemo<TagResult[]>(() => {
    if (!selectedTagFilter) return []

    const notebookTargets =
      tagPaneScope === 'section'
        ? notebook && sectionGroup && section
          ? [notebook]
          : []
        : tagPaneScope === 'notebook' && notebook
          ? [notebook]
          : appState.notebooks

    const normalizedFilter = selectedTagFilter.toLocaleLowerCase()
    const results = notebookTargets.flatMap((entry) =>
      entry.sectionGroups.flatMap((group) =>
        group.sections.flatMap((part) => {
          if (
            tagPaneScope === 'section' &&
            (entry.id !== notebook?.id || group.id !== sectionGroup?.id || part.id !== section?.id)
          ) {
            return []
          }

          return flattenPages(sortPagesTree(part.pages, pageSortMode), 0, true)
            .filter((item) => item.page.tags.some((tag) => tag.toLocaleLowerCase() === normalizedFilter))
            .map(
              (item): TagResult => ({
                groupId: group.id,
                groupName: group.name,
                isSubpage: item.depth > 0,
                matchedTag: selectedTagFilter,
                notebookId: entry.id,
                notebookName: entry.name,
                page: item.page,
                sectionId: part.id,
                sectionName: part.name,
              }),
            )
        }),
      ),
    )

    return results.sort(
      (left, right) => new Date(right.page.updatedAt).getTime() - new Date(left.page.updatedAt).getTime(),
    )
  }, [appState.notebooks, notebook, pageSortMode, section, sectionGroup, selectedTagFilter, tagPaneScope])

  const recentPages = useMemo(
    () =>
      appState.meta.recentPageIds
        .map((pageId) =>
          appState.notebooks.flatMap((entry) =>
            entry.sectionGroups.flatMap((group) =>
              group.sections.flatMap((part) =>
                flattenPages(part.pages, 0, true)
                  .filter((item) => item.page.id === pageId)
                  .map((item) => ({
                    groupId: group.id,
                    groupName: group.name,
                    notebookId: entry.id,
                    notebookName: entry.name,
                    page: item.page,
                    sectionId: part.id,
                    sectionName: part.name,
                  })),
              ),
            ),
          )[0] ?? null,
        )
        .filter(
          (
            item,
          ): item is Omit<SearchResult, 'isSubpage'> & {
            page: Page
          } => item !== null,
        ),
    [appState.meta.recentPageIds, appState.notebooks],
  )

  const toggleSearchScope = () =>
    setAppState((current) => ({
      ...current,
      meta: {
        ...current.meta,
        searchScope:
          current.meta.searchScope === 'all'
            ? 'notebook'
            : current.meta.searchScope === 'notebook'
              ? 'section'
              : 'all',
      },
    }))

  const setSearchScope = (searchScope: SearchScope) =>
    setAppState((current) => ({
      ...current,
      meta: {
        ...current.meta,
        searchScope,
      },
    }))

  return {
    recentPages,
    searchResults,
    setSearchScope,
    tagCatalog,
    tagResults,
    taskResults,
    taskSummary,
    toggleSearchScope,
    visiblePages,
  }
}
