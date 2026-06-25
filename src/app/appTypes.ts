export type Page = {
  accent: string
  children: Page[]
  content: string
  createdAt: string
  id: string
  inkStrokes: InkStroke[]
  isCollapsed: boolean
  snippet: string
  tags: string[]
  task: PageTask | null
  title: string
  updatedAt: string
}

export type PageUpdate = Partial<Page> | ((page: Page) => Partial<Page>)

export type Section = {
  color: string
  id: string
  passwordHash: string | null
  passwordHint: string
  name: string
  pages: Page[]
}

export type InkPoint = {
  x: number
  y: number
}

export type InkStroke = {
  color: string
  id: string
  points: InkPoint[]
  width: number
}

export type PageTask = {
  dueAt: string | null
  status: 'done' | 'open'
}

export type SectionGroup = {
  id: string
  isCollapsed: boolean
  name: string
  sections: Section[]
}

export type Notebook = {
  color: string
  icon: string
  id: string
  name: string
  sectionGroups: SectionGroup[]
}

export type SearchScope = 'section' | 'notebook' | 'all'
export type SearchFilter = 'all' | 'content' | 'tag' | 'task' | 'title'
export type ReviewScope = 'page' | SearchScope

export type PageSortMode = 'manual' | 'updated-desc' | 'updated-asc' | 'title-asc' | 'title-desc' | 'created-desc'

export type AppAsset = {
  createdAt: string
  dataUrl: string
  id: string
  kind: 'audio' | 'file' | 'image' | 'printout'
  mimeType: string
  name: string
  sizeLabel: string
}

export type PageVersion = {
  content: string
  id: string
  savedAt: string
  title: string
}

export type ReferenceSource = 'BibTeX' | 'CSL JSON' | 'RIS' | 'manual'

export type ReferencePerson = {
  firstName?: string
  lastName?: string
  name?: string
}

export type ReferenceItem = {
  authors: ReferencePerson[]
  containerTitle: string
  doi: string
  id: string
  itemType: string
  publisher: string
  source: ReferenceSource
  title: string
  url: string
  year: string
}

export type AppMeta = {
  assets: Record<string, AppAsset>
  pageSortMode: PageSortMode
  pageVersions: Record<string, PageVersion[]>
  recentPageIds: string[]
  references: ReferenceItem[]
  searchScope: SearchScope
}

export type ContextMenuItem = {
  danger?: boolean
  disabled?: boolean
  label: string
  onSelect: () => void
}

export type ContextMenuState = {
  items: ContextMenuItem[]
  x: number
  y: number
}

export type AppState = {
  meta: AppMeta
  notebooks: Notebook[]
  selectedNotebookId: string
  selectedPageId: string
  selectedSectionGroupId: string
  selectedSectionId: string
}

export type SearchResult = {
  groupId: string
  groupName: string
  isSubpage: boolean
  matchedFields?: SearchFilter[]
  matchSnippet?: string
  notebookId: string
  notebookName: string
  page: Page
  score?: number
  sectionId: string
  sectionName: string
}

export type TaskStatusFilter = 'all' | 'done' | 'open'

export type TaskResult = SearchResult & {
  isOverdue: boolean
}

export type TagResult = SearchResult & {
  matchedTag: string
}

export type CopilotMessage = {
  id: string
  prompt: string
  response: string
}

export type PageWidthMode = 'normal' | 'wide'

export type VisiblePage = {
  depth: number
  page: Page
}

export type PageLocation = {
  depth: number
  index: number
  page: Page
  parentId?: string
}

export type DragState =
  | { type: 'notebook'; notebookId: string }
  | { type: 'section-group'; groupId: string }
  | { type: 'section'; groupId: string; sectionId: string }
  | { type: 'page'; pageId: string }

export type DropTarget =
  | { type: 'notebook'; notebookId: string; position: 'before' | 'after' }
  | { type: 'section-group'; groupId: string; position: 'before' | 'after' }
  | { type: 'section'; groupId: string; position: 'inside' }
  | { type: 'section'; groupId: string; sectionId: string; position: 'before' | 'after' }
  | { type: 'page'; pageId: string; position: 'before' | 'after' }

export type DragPosition = {
  x: number
  y: number
}

export type RecentNotebookEntry = {
  name: string
  path: string
}

export type NavigationEntry = {
  groupId: string
  notebookId: string
  pageId: string
  sectionId: string
}

export type AudioInputDevice = {
  deviceId: string
  label: string
}

export type RibbonTab = 'File' | 'Home' | 'Insert' | 'Draw' | 'View' | 'Help'
