import type {
  AppMeta,
  PageSortMode,
  PageTask,
  ReviewScope,
  SearchFilter,
  SearchScope,
  TaskStatusFilter,
} from './appTypes'

export const ribbonTabs = ['File', 'Home', 'Insert', 'Draw', 'History', 'Review', 'View'] as const
export const RECENT_NOTEBOOKS_KEY = 'oneplace-recent-notebooks'
export const LAST_OPENED_NOTEBOOK_KEY = 'oneplace-last-opened-notebook'

export const stylePresets = [
  {
    id: 'heading-1',
    label: 'Heading 1',
    html: '<h1>Heading 1</h1>',
  },
  {
    id: 'heading-2',
    label: 'Heading 2',
    html: '<h2>Heading 2</h2>',
  },
  {
    id: 'callout',
    label: 'Callout',
    html: '<blockquote>Callout</blockquote>',
  },
  {
    id: 'code-block',
    label: 'Code Block',
    html: '<pre><code>terminal-safe-text</code></pre>',
  },
]

export const fontFamilies = ['Calibri', 'Segoe UI', 'Arial', 'Georgia', 'Times New Roman', 'Consolas']
export const fontSizes = [
  { command: '1', label: '8' },
  { command: '2', label: '10' },
  { command: '3', label: '11' },
  { command: '4', label: '14' },
  { command: '5', label: '18' },
  { command: '6', label: '24' },
]

export const pageTemplates = [
  {
    id: 'meeting-notes',
    label: 'Meeting Notes',
    html: `
      <section class="template-block">
        <h2>Meeting Notes</h2>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Attendees:</strong> </p>
        <h3>Agenda</h3>
        <ul><li></li></ul>
        <h3>Decisions</h3>
        <ul><li></li></ul>
        <h3>Action Items</h3>
        <ul class="checklist"><li><label><input type="checkbox" /> </label></li></ul>
      </section>
    `,
  },
  {
    id: 'project-brief',
    label: 'Project Brief',
    html: `
      <section class="template-block">
        <h2>Project Brief</h2>
        <p><strong>Objective:</strong> </p>
        <p><strong>Owner:</strong> </p>
        <h3>Scope</h3>
        <ul><li></li></ul>
        <h3>Risks</h3>
        <ul><li></li></ul>
        <h3>Timeline</h3>
        <table class="action-table">
          <tbody>
            <tr><th>Milestone</th><th>Date</th><th>Status</th></tr>
            <tr><td></td><td></td><td></td></tr>
          </tbody>
        </table>
      </section>
    `,
  },
]

export const defaultTask = (): PageTask => ({
  dueAt: null,
  status: 'open',
})

export const defaultAppMeta = (): AppMeta => ({
  assets: {},
  pageSortMode: 'manual',
  pageVersions: {},
  recentPageIds: [],
  references: [],
  searchScope: 'all',
})

export const pageSortModeLabels: Record<PageSortMode, string> = {
  manual: 'Manual',
  'updated-desc': 'Newest edited',
  'updated-asc': 'Oldest edited',
  'title-asc': 'Title A-Z',
  'title-desc': 'Title Z-A',
  'created-desc': 'Newest created',
}

export const searchScopeLabels: Record<SearchScope, string> = {
  all: 'All notebooks',
  notebook: 'Current notebook',
  section: 'Current section',
}

export const searchFilterLabels: Record<SearchFilter, string> = {
  all: 'All',
  content: 'Content',
  tag: 'Tags',
  task: 'Tasks',
  title: 'Titles',
}

export const reviewScopeLabels: Record<ReviewScope, string> = {
  all: 'All notebooks',
  notebook: 'Current notebook',
  page: 'Current page',
  section: 'Current section',
}

export const taskStatusLabels: Record<TaskStatusFilter, string> = {
  all: 'All tasks',
  done: 'Completed',
  open: 'Open',
}

export const builtInTags = ['Important', 'Question', 'Follow Up', 'Idea', 'Decision', 'Customer', 'Blocked', 'Urgent']
