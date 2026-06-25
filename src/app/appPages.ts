import type { PointerEvent as ReactPointerEvent } from 'react'
import { buildSnippet, createId } from './appFormatting'
import type { Page, PageLocation, PageSortMode, Section, SectionGroup, VisiblePage } from './appTypes'

export const sortPagesTree = (pages: Page[], mode: PageSortMode): Page[] => {
  if (mode === 'manual') return pages

  const comparePages = (left: Page, right: Page) => {
    switch (mode) {
      case 'updated-desc':
        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      case 'updated-asc':
        return new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()
      case 'title-asc':
        return left.title.localeCompare(right.title)
      case 'title-desc':
        return right.title.localeCompare(left.title)
      case 'created-desc':
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      default:
        return 0
    }
  }

  return [...pages].sort(comparePages).map((page) => ({
    ...page,
    children: sortPagesTree(page.children, mode),
  }))
}

export const createSectionGroup = (name: string, sections: Section[] = []): SectionGroup => ({
  id: createId(),
  isCollapsed: false,
  name,
  sections,
})

export const flattenPages = (pages: Page[], depth = 0, includeCollapsedChildren = false): VisiblePage[] =>
  pages.flatMap((page) => [
    { depth, page },
    ...(includeCollapsedChildren || !page.isCollapsed ? flattenPages(page.children, depth + 1, includeCollapsedChildren) : []),
  ])

export const findPageById = (pages: Page[], pageId: string): Page | undefined => {
  for (const page of pages) {
    if (page.id === pageId) return page
    const childMatch = findPageById(page.children, pageId)
    if (childMatch) return childMatch
  }
  return undefined
}

export const clonePageTree = (page: Page, timestamp = new Date().toISOString()): Page => ({
  ...page,
  children: page.children.map((child) => clonePageTree(child, timestamp)),
  createdAt: timestamp,
  id: createId(),
  inkStrokes: page.inkStrokes.map((stroke) => ({
    ...stroke,
    id: createId(),
    points: stroke.points.map((point) => ({ ...point })),
  })),
  snippet: buildSnippet(page.title, page.content, timestamp),
  tags: [...page.tags],
  task: page.task ? { ...page.task } : null,
  updatedAt: timestamp,
})

export const updateNestedPages = (pages: Page[], pageId: string, updater: (page: Page) => Page): Page[] =>
  pages.map((page) =>
    page.id === pageId ? updater(page) : { ...page, children: updateNestedPages(page.children, pageId, updater) },
  )

export const reorderItems = <T extends { id: string }>(
  items: T[],
  draggedId: string,
  targetId: string,
  position: 'before' | 'after' = 'after',
): T[] => {
  const draggedIndex = items.findIndex((item) => item.id === draggedId)
  const targetIndex = items.findIndex((item) => item.id === targetId)
  if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return items

  const draggedItem = items[draggedIndex]
  const nextItems = items.filter((item) => item.id !== draggedId)
  const resolvedTargetIndex = nextItems.findIndex((item) => item.id === targetId)
  const insertIndex = resolvedTargetIndex + (position === 'after' ? 1 : 0)
  nextItems.splice(insertIndex, 0, draggedItem)
  return nextItems
}

export const removePageById = (pages: Page[], pageId: string): { page?: Page; pages: Page[] } => {
  const nextPages: Page[] = []

  for (const page of pages) {
    if (page.id === pageId) {
      return { page, pages: [...nextPages, ...pages.slice(nextPages.length + 1)] }
    }

    const nested = removePageById(page.children, pageId)
    if (nested.page) {
      nextPages.push({ ...page, children: nested.pages })
      return { page: nested.page, pages: [...nextPages, ...pages.slice(nextPages.length)] }
    }

    nextPages.push(page)
  }

  return { pages }
}

export const insertPageRelative = (
  pages: Page[],
  targetId: string,
  pageToInsert: Page,
  position: 'before' | 'after',
): Page[] =>
  pages.flatMap((page) => {
    if (page.id === targetId) {
      return position === 'before' ? [pageToInsert, page] : [page, pageToInsert]
    }

    if (findPageById(page.children, targetId)) {
      return [{ ...page, children: insertPageRelative(page.children, targetId, pageToInsert, position) }]
    }

    return [page]
  })

export const movePageWithinSiblings = (
  pages: Page[],
  pageId: string,
  direction: -1 | 1,
): { moved: boolean; pages: Page[] } => {
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index]

    if (page.id === pageId) {
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= pages.length) return { moved: false, pages }

      const nextPages = [...pages]
      const [movedPage] = nextPages.splice(index, 1)
      nextPages.splice(targetIndex, 0, movedPage)
      return { moved: true, pages: nextPages }
    }

    const nested = movePageWithinSiblings(page.children, pageId, direction)
    if (nested.moved) {
      const nextPages = [...pages]
      nextPages[index] = { ...page, isCollapsed: false, children: nested.pages }
      return { moved: true, pages: nextPages }
    }
  }

  return { moved: false, pages }
}

export const pageContainsId = (page: Page, targetId: string): boolean =>
  page.id === targetId || page.children.some((child) => pageContainsId(child, targetId))

export const hasChildPageSelected = (page: Page, selectedPageId: string) =>
  page.children.some((child) => pageContainsId(child, selectedPageId))

export const getDropPosition = (event: ReactPointerEvent<HTMLElement>): 'before' | 'after' => {
  const bounds = event.currentTarget.getBoundingClientRect()
  return event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after'
}

export const countPages = (pages: Page[]) => flattenPages(pages, 0, true).length

export const findPageLocation = (
  pages: Page[],
  pageId: string,
  depth = 0,
  parentId?: string,
): PageLocation | undefined => {
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index]
    if (page.id === pageId) {
      return { depth, index, page, parentId }
    }

    const nested = findPageLocation(page.children, pageId, depth + 1, page.id)
    if (nested) return nested
  }

  return undefined
}

export const promotePageOneLevel = (pages: Page[], pageId: string): { moved: boolean; pages: Page[] } => {
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index]
    const childIndex = page.children.findIndex((child) => child.id === pageId)

    if (childIndex !== -1) {
      const promotedPage = page.children[childIndex]
      const nextSiblings = [...pages]
      nextSiblings[index] = {
        ...page,
        children: page.children.filter((_, candidateIndex) => candidateIndex !== childIndex),
      }
      nextSiblings.splice(index + 1, 0, promotedPage)
      return { moved: true, pages: nextSiblings }
    }

    const nested = promotePageOneLevel(page.children, pageId)
    if (nested.moved) {
      const nextSiblings = [...pages]
      nextSiblings[index] = { ...page, isCollapsed: false, children: nested.pages }
      return { moved: true, pages: nextSiblings }
    }
  }

  return { moved: false, pages }
}

export const demotePageOneLevel = (pages: Page[], pageId: string): { moved: boolean; pages: Page[] } => {
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index]

    if (page.id === pageId) {
      if (index === 0) return { moved: false, pages }

      const nextSiblings = [...pages]
      const [movedPage] = nextSiblings.splice(index, 1)
      const previousPage = nextSiblings[index - 1]
      nextSiblings[index - 1] = {
        ...previousPage,
        isCollapsed: false,
        children: [...previousPage.children, movedPage],
      }
      return { moved: true, pages: nextSiblings }
    }

    const nested = demotePageOneLevel(page.children, pageId)
    if (nested.moved) {
      const nextSiblings = [...pages]
      nextSiblings[index] = { ...page, isCollapsed: false, children: nested.pages }
      return { moved: true, pages: nextSiblings }
    }
  }

  return { moved: false, pages }
}
